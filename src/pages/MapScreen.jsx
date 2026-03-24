import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import {
    Search, MapPin, Coffee, HeartPulse, Home, Plus,
    Stethoscope, Building2, Baby, Scissors, Footprints, Dumbbell,
    LocateFixed, Star, Map as MapIcon, List,
} from 'lucide-react';
import { supabase } from '../supabase';
import LoadingState from '../components/LoadingState';

/* ── Haversine: distancia en km entre dos puntos geográficos ── */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // radio de la Tierra en km
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RADIUS_OPTIONS = [
    { label: '1km', value: 1 },
    { label: '3km', value: 3 },
    { label: '5km', value: 5 },
    { label: '10km', value: 10 },
    { label: 'Todos', value: 0 },
];

const DEFAULT_CENTER = [19.4326, -99.1332]; // CDMX
const DEFAULT_ZOOM = 13;

const FILTER_OPTIONS = [
    'Parques', 'Cafés', 'Vets', 'Refugios',
    'Clínicas', 'Hoteles', 'Grooming', 'Guarderías', 'Entrenadores',
];
const FILTER_TO_TYPE = {
    Parques: 'parque', Cafés: 'cafe', Vets: 'vet', Refugios: 'refugio',
    Clínicas: 'clinica', Hoteles: 'hotel', Grooming: 'grooming',
    Guarderías: 'guarderia', Entrenadores: 'entrenador',
};
const TYPE_LABELS = {
    parque: 'Parque', cafe: 'Café', vet: 'Vet', refugio: 'Refugio',
    veterinaria: 'Veterinaria', clinica: 'Clínica', hotel: 'Hotel',
    cafeteria: 'Cafetería', guarderia: 'Guardería', grooming: 'Grooming',
    entrenador: 'Entrenador', paseador: 'Paseador',
};

const iconColors = {
    parque: '#13ec5b', cafe: '#ee9d2b', vet: '#ff4b4b', refugio: '#8b5cf6',
    veterinaria: '#4caf50', clinica: '#2196f3', hotel: '#00897b',
    cafeteria: '#ff9800', guarderia: '#00bcd4', grooming: '#e91e63',
    entrenador: '#9c27b0', paseador: '#ff7043',
};

const ICON_MAP = {
    parque: MapPin, cafe: Coffee, vet: HeartPulse, refugio: Home,
    veterinaria: HeartPulse, clinica: Stethoscope, hotel: Building2,
    cafeteria: Coffee, guarderia: Baby, grooming: Scissors,
    entrenador: Dumbbell, paseador: Footprints,
};

function PlaceIcon({ type, size = 24 }) {
    const color = iconColors[type] || '#888';
    const Icon = ICON_MAP[type] || MapPin;
    return <Icon size={size} color={color} />;
}

/* ── Services directory constants ── */
const SERVICE_FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'vet', label: 'Veterinario' },
    { key: 'hotel', label: 'Hotel' },
    { key: 'grooming', label: 'Peluquería' },
    { key: 'walker', label: 'Paseador' },
    { key: 'trainer', label: 'Entrenador' },
    { key: 'spa', label: 'Spa' },
];
const SERVICE_TYPE_COLORS = {
    vet: { bg: '#e8f5e9', color: '#2e7d32' },
    hotel: { bg: '#e3f2fd', color: '#1565c0' },
    grooming: { bg: '#fce4ec', color: '#c62828' },
    walker: { bg: '#fff8e1', color: '#f57f17' },
    trainer: { bg: '#f3e5f5', color: '#6a1b9a' },
    spa: { bg: '#fff3e0', color: '#e65100' },
};
const SERVICE_TYPE_LABELS = {
    vet: 'Veterinario', hotel: 'Hotel', grooming: 'Peluquería',
    walker: 'Paseador', trainer: 'Entrenador', spa: 'Spa',
};

const StarRating = ({ rating }) => {
    const full = Math.floor(rating);
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} fill={i <= full ? '#ee9d2b' : 'none'} color={i <= full ? '#ee9d2b' : '#ccc'} />
            ))}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginLeft: '2px' }}>{rating}</span>
        </span>
    );
};

const MapScreen = ({ embedded = false }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('lugares'); // 'lugares' | 'directorio'
    const [activeFilter, setActiveFilter] = useState('Parques');
    const [radius, setRadius] = useState(0);
    const [userPosition, setUserPosition] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [places, setPlaces] = useState([]);
    const [loadingPlaces, setLoadingPlaces] = useState(true);
    // Services directory state
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [servicesLoaded, setServicesLoaded] = useState(false);
    const [serviceFilter, setServiceFilter] = useState('all');

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase.from('places').select('id, type, name, address, lat, lng').order('name');
            if (!error && data) setPlaces(data);
            else setPlaces([]);
            setLoadingPlaces(false);
        };
        load();
    }, []);

    // Lazy-load services only when switching to Directorio
    useEffect(() => {
        if (viewMode !== 'directorio' || servicesLoaded) return;
        const load = async () => {
            setServicesLoading(true);
            const { data, error } = await supabase.from('services').select('id, name, type, description, address, lat, lng, rating, image_url, user_id').order('rating', { ascending: false }).limit(50);
            setServices(data || []);
            setServicesLoaded(true);
            setServicesLoading(false);
        };
        load();
    }, [viewMode, servicesLoaded]);

    useEffect(() => {
        if (!mapReady) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
                () => {},
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, [mapReady]);

    const currentType = FILTER_TO_TYPE[activeFilter];
    const filteredPlaces = places.filter((p) => {
        if (p.type !== currentType) return false;
        if (radius > 0 && userPosition) {
            const dist = haversineDistance(userPosition[0], userPosition[1], p.lat, p.lng);
            if (dist > radius) return false;
        }
        return true;
    });
    const center = userPosition || DEFAULT_CENTER;

    const filteredServices = serviceFilter === 'all'
        ? services
        : services.filter((s) => s.type === serviceFilter);

    return (
        <div style={styles.container} className="fade-in">
            {/* ── View mode toggle ── */}
            <div style={styles.viewToggle}>
                <button
                    style={{ ...styles.toggleBtn, ...(viewMode === 'lugares' ? styles.toggleBtnActive : {}) }}
                    onClick={() => setViewMode('lugares')}
                >
                    <MapIcon size={16} /> Lugares
                </button>
                <button
                    style={{ ...styles.toggleBtn, ...(viewMode === 'directorio' ? styles.toggleBtnActive : {}) }}
                    onClick={() => setViewMode('directorio')}
                >
                    <List size={16} /> Directorio
                </button>
            </div>

            {viewMode === 'lugares' ? (
                /* ══════ LUGARES VIEW (map + places list) ══════ */
                <>
                    <div style={styles.mapWrapper}>
                        <MapContainer
                            center={center}
                            zoom={DEFAULT_ZOOM}
                            style={styles.map}
                            scrollWheelZoom={true}
                            whenReady={() => setMapReady(true)}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {userPosition && (
                                <Marker position={userPosition}>
                                    <Popup>Tu ubicación</Popup>
                                </Marker>
                            )}
                            {userPosition && radius > 0 && (
                                <Circle
                                    center={userPosition}
                                    radius={radius * 1000}
                                    pathOptions={{ color: '#ee9d2b', fillColor: '#ee9d2b', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }}
                                />
                            )}
                            {filteredPlaces.map((place) => (
                                <Marker key={place.id} position={[place.lat, place.lng]}>
                                    <Popup>
                                        <strong>{place.name}</strong>
                                        <br />
                                        {TYPE_LABELS[place.type] || place.type}
                                        {place.address && (
                                            <>
                                                <br />
                                                <small>{place.address}</small>
                                            </>
                                        )}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>

                        <div style={styles.overlay}>
                            <div style={styles.searchBar}>
                                <Search size={20} color="var(--color-text-light)" />
                                <input type="text" placeholder="Buscar lugares pet friendly..." style={styles.searchInput} readOnly />
                            </div>
                            <div style={styles.chipsContainer}>
                                {FILTER_OPTIONS.map((filter) => (
                                    <button
                                        key={filter}
                                        style={{ ...styles.chip, ...(activeFilter === filter ? styles.activeChip : {}) }}
                                        onClick={() => setActiveFilter(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            <div style={styles.radiusRow}>
                                <LocateFixed size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                                {RADIUS_OPTIONS.map(({ label, value }) => (
                                    <button
                                        key={value}
                                        style={{ ...styles.radiusChip, ...(radius === value ? styles.radiusChipActive : {}) }}
                                        onClick={() => setRadius(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {radius > 0 && !userPosition && (
                                <div style={styles.locationHint}>
                                    Activa ubicación para filtrar por zona
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.placesList}>
                        <div style={styles.listHeader}>
                            <h3>{activeFilter}</h3>
                            <button type="button" style={styles.addPlaceBtn} onClick={() => navigate('/map/new')}>
                                <Plus size={20} /> Agregar lugar
                            </button>
                        </div>
                        {loadingPlaces ? (
                            <p style={styles.loadingText}>Cargando...</p>
                        ) : filteredPlaces.length === 0 ? (
                            <p style={styles.emptyText}>No hay lugares de este tipo. ¡Agrega uno!</p>
                        ) : (
                            filteredPlaces.map((place) => {
                                const dist = userPosition
                                    ? haversineDistance(userPosition[0], userPosition[1], place.lat, place.lng)
                                    : null;
                                return (
                                    <div key={place.id} style={styles.placeItem}>
                                        <div style={{ ...styles.placeIconBg, backgroundColor: `${iconColors[place.type] || '#ccc'}22` }}>
                                            <PlaceIcon type={place.type} />
                                        </div>
                                        <div style={styles.placeInfo}>
                                            <h4 style={styles.placeName}>{place.name}</h4>
                                            <p style={styles.placeType}>
                                                {TYPE_LABELS[place.type]} {place.address ? `· ${place.address}` : ''}
                                            </p>
                                        </div>
                                        {dist !== null && (
                                            <span style={styles.distanceBadge}>
                                                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            ) : (
                /* ══════ DIRECTORIO VIEW (services grid) ══════ */
                <div style={styles.directorioContainer}>
                    <div style={styles.dirHeader}>
                        <h2 style={styles.dirTitle}>Servicios</h2>
                        <button style={styles.dirAddBtn} onClick={() => navigate('/services/new')}>
                            <Plus size={18} /> Publicar
                        </button>
                    </div>
                    <div style={styles.dirFilters}>
                        {SERVICE_FILTERS.map((f) => (
                            <button
                                key={f.key}
                                style={{ ...styles.dirChip, ...(serviceFilter === f.key ? styles.dirChipActive : {}) }}
                                onClick={() => setServiceFilter(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div style={styles.dirScroll}>
                        {servicesLoading ? (
                            <LoadingState message="Cargando servicios..." />
                        ) : filteredServices.length === 0 ? (
                            <p style={styles.emptyText}>No hay servicios en esta categoría.</p>
                        ) : (
                            <div style={styles.dirGrid}>
                                {filteredServices.map((s) => {
                                    const tc = SERVICE_TYPE_COLORS[s.type] || { bg: '#f5f5f5', color: '#555' };
                                    return (
                                        <div key={s.id} style={styles.dirCard} onClick={() => navigate(`/services/${s.id}`)}>
                                            <div
                                                style={{
                                                    ...styles.dirCardImg,
                                                    backgroundImage: s.image_url ? `url(${s.image_url})` : 'none',
                                                    backgroundColor: s.image_url ? 'transparent' : '#eee',
                                                }}
                                            >
                                                <span style={{ ...styles.dirBadge, backgroundColor: tc.bg, color: tc.color }}>
                                                    {SERVICE_TYPE_LABELS[s.type] || s.type}
                                                </span>
                                            </div>
                                            <div style={styles.dirCardBody}>
                                                <p style={styles.dirCardName}>{s.name}</p>
                                                {s.rating > 0 && <StarRating rating={Number(s.rating)} />}
                                                {s.location && (
                                                    <div style={styles.dirCardMeta}>
                                                        <MapPin size={11} color="var(--color-text-light)" />
                                                        <span style={styles.dirCardMetaText}>{s.location}</span>
                                                    </div>
                                                )}
                                                {s.price_range && <p style={styles.dirPrice}>{s.price_range}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
        overflow: 'hidden',
    },
    /* ── View toggle ── */
    viewToggle: {
        flexShrink: 0,
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 1rem 0.5rem',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
    },
    toggleBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.6rem',
        borderRadius: '12px',
        border: '1.5px solid #e0e0e0',
        backgroundColor: '#fff',
        color: 'var(--color-text-light)',
        fontSize: '0.88rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: 'auto',
        transition: 'all 0.2s',
    },
    toggleBtnActive: {
        backgroundColor: 'var(--color-primary)',
        borderColor: 'var(--color-primary)',
        color: '#fff',
    },
    mapWrapper: {
        flexShrink: 0,
        height: '38vh',
        minHeight: 200,
        position: 'relative',
    },
    map: {
        height: '100%',
        width: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '1rem 1rem 0.5rem',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
        zIndex: 1000,
        pointerEvents: 'none',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '0.8rem 1rem',
        gap: '0.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        marginBottom: '0.75rem',
        pointerEvents: 'auto',
    },
    searchInput: {
        border: 'none',
        outline: 'none',
        fontSize: '1rem',
        width: '100%',
        color: 'var(--color-text-dark)',
    },
    chipsContainer: {
        display: 'flex',
        gap: '0.8rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        pointerEvents: 'auto',
    },
    radiusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        pointerEvents: 'auto',
    },
    radiusChip: {
        background: 'rgba(255,255,255,0.85)',
        border: '1.5px solid #e0e0e0',
        padding: '0.35rem 0.8rem',
        borderRadius: '16px',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        width: 'auto',
    },
    radiusChipActive: {
        background: 'var(--color-primary)',
        border: '1.5px solid var(--color-primary)',
        color: '#fff',
    },
    locationHint: {
        marginTop: '0.4rem',
        padding: '0.3rem 0.6rem',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        fontSize: '0.75rem',
        color: 'var(--color-primary)',
        fontWeight: '600',
        pointerEvents: 'auto',
    },
    chip: {
        background: '#fff',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
    },
    activeChip: {
        background: 'var(--color-social)',
        color: '#fff',
    },
    placesList: {
        flex: 1,
        minHeight: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '1.5rem',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.05)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    addPlaceBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        borderRadius: '24px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    loadingText: { margin: 0, color: 'var(--color-text-light)', fontSize: '0.95rem' },
    emptyText: { margin: 0, color: 'var(--color-text-light)', fontSize: '0.95rem' },
    placeItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f0f0f0',
    },
    placeIconBg: {
        width: '50px',
        height: '50px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeInfo: { flex: 1 },
    placeName: { fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.2rem' },
    placeType: { fontSize: '0.9rem', color: 'var(--color-text-light)' },
    distanceBadge: {
        flexShrink: 0,
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'var(--color-primary)',
        backgroundColor: '#fff8ee',
        padding: '0.25rem 0.6rem',
        borderRadius: '12px',
    },
    /* ── Directorio view styles ── */
    directorioContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    dirHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem 0.5rem',
        flexShrink: 0,
    },
    dirTitle: {
        fontSize: 'var(--font-size-page-title)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    dirAddBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 0.9rem',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: 'auto',
    },
    dirFilters: {
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        padding: '0.5rem 1rem',
        flexShrink: 0,
        scrollbarWidth: 'none',
    },
    dirChip: {
        flexShrink: 0,
        padding: '0.4rem 1rem',
        borderRadius: '20px',
        border: '1.5px solid #ddd',
        background: '#fff',
        color: 'var(--color-text-light)',
        fontSize: '0.82rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: 'auto',
    },
    dirChipActive: {
        backgroundColor: 'var(--color-primary)',
        borderColor: 'var(--color-primary)',
        color: '#fff',
    },
    dirScroll: {
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 1rem 1rem',
    },
    dirGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
    },
    dirCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-soft)',
        cursor: 'pointer',
    },
    dirCardImg: {
        width: '100%',
        height: '110px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
    },
    dirBadge: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        fontSize: '0.68rem',
        fontWeight: '700',
        padding: '2px 8px',
        borderRadius: '12px',
    },
    dirCardBody: {
        padding: '0.6rem 0.75rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
    },
    dirCardName: {
        fontSize: '0.88rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
        margin: 0,
        lineHeight: 1.2,
    },
    dirCardMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        marginTop: '2px',
    },
    dirCardMetaText: {
        fontSize: '0.72rem',
        color: 'var(--color-text-light)',
    },
    dirPrice: {
        fontSize: '0.78rem',
        fontWeight: '600',
        color: 'var(--color-primary)',
        margin: 0,
    },
};

export default MapScreen;
