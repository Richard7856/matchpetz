import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';

const MAP_CENTER = [19.4326, -99.1332];
const MAP_ZOOM = 12;

// Public types: anyone can create
const PUBLIC_PLACE_TYPES = [
    { value: 'parque', label: 'Parque' },
    { value: 'cafe', label: 'Café' },
    { value: 'vet', label: 'Veterinaria' },
    { value: 'refugio', label: 'Refugio' },
];

// Business types: require matching active role
const BUSINESS_PLACE_TYPES = [
    { value: 'veterinaria', label: 'Veterinaria (negocio)', role: 'veterinaria' },
    { value: 'entrenador', label: 'Centro de Entrenamiento', role: 'entrenador' },
    { value: 'clinica', label: 'Clínica', role: 'clinica' },
    { value: 'hotel', label: 'Hotel de Mascotas', role: 'hotel' },
    { value: 'cafeteria', label: 'Cafetería Pet Friendly', role: 'cafeteria' },
    { value: 'guarderia', label: 'Guardería', role: 'guarderia' },
    { value: 'grooming', label: 'Grooming / Peluquería', role: 'grooming' },
    { value: 'paseador', label: 'Punto de Paseo', role: 'paseador' },
];

function MapClickToMarker({ onSelect, position }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    if (position == null) return null;
    return <Marker position={position} />;
}

function FlyToPosition({ position }) {
    const map = useMap();
    React.useEffect(() => {
        if (position && position[0] != null && position[1] != null) {
            map.flyTo(position, 15, { duration: 0.8 });
        }
    }, [map, position]);
    return null;
}

const CreatePlace = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [form, setForm] = useState({
        name: '',
        type: 'parque',
        address: '',
        lat: null,
        lng: null,
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);

    useEffect(() => {
        const loadRoles = async () => {
            if (!user) return;
            const { data: roles } = await supabase
                .from('business_roles')
                .select('role_type')
                .eq('user_id', user.id)
                .eq('status', 'approved');
            setUserRoles((roles || []).map(r => r.role_type));
        };
        loadRoles();
    }, [user]);

    const availablePlaceTypes = [
        ...PUBLIC_PLACE_TYPES,
        ...BUSINESS_PLACE_TYPES.filter(t => userRoles.includes(t.role)),
    ];

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleMapSelect = (lat, lng) => {
        handleChange('lat', lat);
        handleChange('lng', lng);
        setLocationError(null);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Tu navegador no soporta geolocalización.');
            return;
        }
        setLocationLoading(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                handleChange('lat', pos.coords.latitude);
                handleChange('lng', pos.coords.longitude);
                setLocationLoading(false);
            },
            () => {
                setLocationError('No se pudo obtener tu ubicación.');
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Escribe el nombre del lugar.');
            return;
        }
        if (form.lat == null || form.lng == null) {
            setError('Marca la ubicación en el mapa o usa "Usar mi ubicación".');
            return;
        }
        setSending(true);
        setError(null);
        const payload = {
            name: form.name.trim(),
            type: form.type,
            address: form.address.trim() || null,
            lat: form.lat,
            lng: form.lng,
            created_by: user?.id || null,
        };
        const { error: err } = await supabase.from('places').insert(payload);
        if (err) {
            setError(err.message || 'No se pudo guardar. ¿Ejecutaste la migración 003?');
            setSending(false);
            return;
        }
        navigate('/map');
        setSending(false);
    };

    const markerPosition = form.lat != null && form.lng != null ? [form.lat, form.lng] : null;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Agregar lugar" backTo="/map" />

            <form onSubmit={handleSubmit} style={styles.form}>
                {error && <p style={styles.error}>{error}</p>}

                <div style={styles.field}>
                    <label style={styles.label}>Nombre del lugar *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Ej. Parque Bicentenario"
                        style={styles.input}
                        required
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Tipo</label>
                    <select
                        value={form.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        style={styles.input}
                    >
                        {availablePlaceTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Dirección (opcional)</label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Ej. Av. 5 de Mayo, Del Valle"
                        style={styles.input}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>
                        <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Ubicación en el mapa *
                    </label>
                    <div style={styles.mapActions}>
                        <button
                            type="button"
                            style={styles.useLocationBtn}
                            onClick={handleUseMyLocation}
                            disabled={locationLoading}
                        >
                            <Navigation size={18} />
                            {locationLoading ? 'Obteniendo...' : 'Usar mi ubicación'}
                        </button>
                    </div>
                    {locationError && <p style={styles.locationError}>{locationError}</p>}
                    <div style={styles.mapWrap}>
                        <MapContainer
                            center={markerPosition || MAP_CENTER}
                            zoom={MAP_ZOOM}
                            style={{ height: '100%', width: '100%', borderRadius: 16 }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <FlyToPosition position={markerPosition} />
                            <MapClickToMarker onSelect={handleMapSelect} position={markerPosition} />
                        </MapContainer>
                        {!markerPosition && (
                            <span style={styles.mapHint}>Toca el mapa para marcar</span>
                        )}
                    </div>
                </div>

                <button type="submit" style={styles.submitBtn} disabled={sending}>
                    {sending ? 'Guardando...' : 'Guardar lugar'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        padding: '0 1rem 1rem',
    },
    form: { flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    error: { margin: 0, color: '#dc2626', fontSize: '0.9rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-dark)' },
    input: {
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: 12,
        border: '1px solid #e0e0e0',
        fontSize: '1rem',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
    },
    mapActions: { marginBottom: '0.25rem' },
    useLocationBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        borderRadius: 24,
        border: '1px solid var(--color-primary)',
        backgroundColor: '#fff',
        color: 'var(--color-primary)',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    locationError: { margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#dc2626' },
    mapWrap: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    mapHint: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        pointerEvents: 'none',
        zIndex: 500,
    },
    submitBtn: {
        marginTop: '0.5rem',
        padding: '1rem',
        borderRadius: 50,
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
};

export default CreatePlace;
