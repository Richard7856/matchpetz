import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, DollarSign, Navigation } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import ImageUpload from '../components/ImageUpload';
import { ALERTS_STORAGE_KEY } from '../constants/storage';
import { PET_TYPES } from '../constants/petTypes';

const MAP_CENTER = [19.4326, -99.1332];
const MAP_ZOOM = 12;

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

// PET_TYPES imported from constants

const CreateAlert = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sending, setSending] = useState(false);
    const [customPetType, setCustomPetType] = useState('');
    const [form, setForm] = useState({
        petName: '',
        petType: 'perro',
        description: '',
        reward: '',
        zoneAddress: '',
        zoneLat: null,
        zoneLng: null,
        imageUrl: '',
    });
    const [mapMarked, setMapMarked] = useState(false);
    const [showLocalNotice, setShowLocalNotice] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleMapSelect = (lat, lng) => {
        handleChange('zoneLat', lat);
        handleChange('zoneLng', lng);
        setMapMarked(true);
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
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                handleChange('zoneLat', lat);
                handleChange('zoneLng', lng);
                setMapMarked(true);
                setLocationLoading(false);
            },
            () => {
                setLocationError('No se pudo obtener tu ubicación. Revisa los permisos.');
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const markerPosition = form.zoneLat != null && form.zoneLng != null ? [form.zoneLat, form.zoneLng] : null;

    const saveToLocal = (alert) => {
        const list = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || '[]');
        list.unshift({
            ...alert,
            id: 'local_' + Date.now(),
            created_at: new Date().toISOString(),
        });
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(list));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.petName.trim() || !form.description.trim()) return;
        setSending(true);

        const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';

        const payload = {
            pet_name: form.petName.trim(),
            pet_type: form.petType === 'otro' && customPetType.trim() ? customPetType.trim() : form.petType,
            description: form.description.trim(),
            reward: form.reward ? parseFloat(form.reward) : null,
            zone_address: form.zoneAddress.trim() || null,
            zone_lat: form.zoneLat ?? null,
            zone_lng: form.zoneLng ?? null,
            image_url: form.imageUrl.trim() || null,
            user_name: userName,
            user_id: user?.id || null,
        };

        try {
            const url = import.meta.env.VITE_SUPABASE_URL;
            if (url && user) {
                const { error } = await supabase.from('alerts').insert(payload);
                if (error) throw error;
            } else {
                saveToLocal({ ...payload, created_at: new Date().toISOString() });
                if (!user) setShowLocalNotice(true);
            }
            if (user) navigate('/alerts');
        } catch (err) {
            saveToLocal({ ...payload, created_at: new Date().toISOString() });
            setShowLocalNotice(true);
        }
        setSending(false);
    };

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Nueva alerta" backTo="/alerts" />

            {showLocalNotice && (
                <div style={styles.localNotice}>
                    <p style={styles.localNoticeText}>Alerta guardada en este dispositivo. Inicia sesión para que se publique para toda la comunidad.</p>
                    <button type="button" style={styles.localNoticeBtn} onClick={() => navigate('/alerts')}>Ver alertas</button>
                </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.field}>
                    <label style={styles.label}>Nombre de la mascota *</label>
                    <input
                        type="text"
                        value={form.petName}
                        onChange={(e) => handleChange('petName', e.target.value)}
                        placeholder="Ej. Max, Luna"
                        style={styles.input}
                        required
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Tipo de mascota</label>
                    <div style={styles.chipGroup}>
                        {PET_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                style={{
                                    ...styles.chip,
                                    ...(form.petType === t.value ? styles.chipActive : {}),
                                }}
                                onClick={() => handleChange('petType', t.value)}
                            >
                                {t.emoji} {t.label}
                            </button>
                        ))}
                    </div>
                    {form.petType === 'otro' && (
                        <input
                            style={{ ...styles.input, marginTop: '0.5rem' }}
                            value={customPetType}
                            onChange={(e) => setCustomPetType(e.target.value)}
                            placeholder="Especifica el tipo de mascota..."
                        />
                    )}
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Descripción *</label>
                    <textarea
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Rasgos físicos, collar, comportamiento..."
                        style={styles.textarea}
                        rows={3}
                        required
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>
                        <DollarSign size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Recompensa (opcional)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="100"
                        value={form.reward}
                        onChange={(e) => handleChange('reward', e.target.value)}
                        placeholder="Monto en pesos"
                        style={styles.input}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>
                        <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Dirección o zona donde se perdió
                    </label>
                    <input
                        type="text"
                        value={form.zoneAddress}
                        onChange={(e) => handleChange('zoneAddress', e.target.value)}
                        placeholder="Ej. Parque Bicentenario, Col. Del Valle"
                        style={styles.input}
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Marcar zona en el mapa (opcional)</label>
                    <div style={styles.mapActions}>
                        <p style={styles.hint}>Toca el mapa o usa tu ubicación actual.</p>
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
                    <div style={styles.mapPlaceholder}>
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
                        {!mapMarked && (
                            <span style={styles.mapHint}>Toca el mapa para marcar</span>
                        )}
                    </div>
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Foto de la mascota</label>
                    {user ? (
                        <ImageUpload
                            currentImageUrl={form.imageUrl}
                            onUpload={(url) => handleChange('imageUrl', url)}
                            folder="alerts"
                            shape="square"
                            size={140}
                            placeholder="Subir foto"
                        />
                    ) : (
                        <input
                            type="url"
                            value={form.imageUrl}
                            onChange={(e) => handleChange('imageUrl', e.target.value)}
                            placeholder="URL de foto (https://...)"
                            style={styles.input}
                        />
                    )}
                </div>

                <button type="submit" style={styles.submitBtn} disabled={sending}>
                    {sending ? 'Publicando...' : 'Publicar alerta'}
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
    form: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
    },
    hint: {
        fontSize: '0.85rem',
        color: 'var(--color-text-light)',
        margin: 0,
    },
    input: {
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        fontSize: '1rem',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        fontSize: '1rem',
        backgroundColor: '#fff',
        resize: 'vertical',
        minHeight: '80px',
        boxSizing: 'border-box',
    },
    chipGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    chip: {
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        border: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        cursor: 'pointer',
    },
    chipActive: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        borderColor: 'var(--color-primary)',
    },
    mapActions: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.25rem',
    },
    useLocationBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        borderRadius: '24px',
        border: '1px solid var(--color-primary)',
        backgroundColor: '#fff',
        color: 'var(--color-primary)',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    locationError: {
        margin: '0 0 0.5rem 0',
        fontSize: '0.85rem',
        color: '#dc2626',
    },
    mapPlaceholder: {
        width: '100%',
        height: '220px',
        borderRadius: '16px',
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
        borderRadius: '50px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    localNotice: {
        backgroundColor: '#fff8eb',
        border: '1px solid var(--color-primary)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
    },
    localNoticeText: { margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--color-text-dark)' },
    localNoticeBtn: {
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default CreateAlert;
