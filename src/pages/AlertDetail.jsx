import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, DollarSign, MessageCircle, Loader } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ALERTS_STORAGE_KEY } from '../constants/storage';


const AlertDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [contacting, setContacting] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (id?.startsWith('local_')) {
                const list = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || '[]');
                const found = list.find((a) => a.id === id);
                setAlert(found || null);
            } else if (id) {
                try {
                    const { data, error } = await supabase
                        .from('alerts')
                        .select('id, pet_name, pet_type, description, reward, zone_address, zone_lat, zone_lng, image_url, user_id, user_name, created_at')
                        .eq('id', id)
                        .maybeSingle();

                    if (!error && data) {
                        setAlert(data);
                    } else {
                        setAlert(null);
                    }
                } catch {
                    setAlert(null);
                }
            } else {
                setAlert(null);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const handleContact = async () => {
        if (!user || !alert?.user_id || contacting) return;

        // Don't chat with yourself
        if (alert.user_id === user.id) return;

        setContacting(true);
        try {
            // Check if a conversation already exists between these two users
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .or(
                    `and(user1_id.eq.${user.id},user2_id.eq.${alert.user_id}),and(user1_id.eq.${alert.user_id},user2_id.eq.${user.id})`
                )
                .not('is_group', 'is', true)
                .maybeSingle();

            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }

            // Create new conversation
            const myName = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    user1_id: user.id,
                    user2_id: alert.user_id,
                    participant_name: alert.user_name || 'Usuario',
                    last_message: null,
                    is_group: false,
                })
                .select('id')
                .single();

            if (error) {
                return;
            }

            navigate(`/chat/${newConv.id}`);
        } catch (err) {
            console.warn('Contact error:', err);
        } finally {
            setContacting(false);
        }
    };

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!alert) {
        return (
            <div style={styles.container}>
                <AppBar title="Alerta" backTo="/alerts" />
                <p style={styles.notFound}>No se encontro esta alerta.</p>
            </div>
        );
    }

    const petName = alert.pet_name ?? alert.petName;
    const petType = alert.pet_type ?? alert.petType;
    const userName = alert.user_name ?? alert.userName;
    const zoneAddress = alert.zone_address ?? alert.zoneAddress;
    const imageUrl = alert.image_url ?? alert.imageUrl;
    const isOwnAlert = user && alert.user_id === user?.id;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Mascota perdida" backTo="/alerts" />

            <div style={styles.imageWrap}>
                <img
                    src={imageUrl || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80'}
                    alt={petName}
                    style={styles.image}
                    loading="lazy"
                />
                {alert.reward != null && alert.reward > 0 && (
                    <div style={styles.rewardBadge}>
                        <DollarSign size={18} />
                        <span>Recompensa: ${Number(alert.reward).toLocaleString('es-MX')}</span>
                    </div>
                )}
            </div>

            <div style={styles.body}>
                <h1 style={styles.petName}>{petName} · {petType}</h1>
                {userName && <p style={styles.userName}>Reportado por {userName}</p>}
                <p style={styles.description}>{alert.description}</p>

                <div style={styles.section}>
                    <div style={styles.zoneRow}>
                        <MapPin size={20} color="var(--color-primary)" />
                        <span style={styles.zoneLabel}>Zona donde se perdio</span>
                    </div>
                    <p style={styles.zoneAddress}>{zoneAddress || 'Zona no especificada'}</p>
                    {(alert.zone_lat != null && alert.zone_lng != null) && (
                        <div style={styles.mapWrap}>
                            <MapContainer
                                center={[Number(alert.zone_lat), Number(alert.zone_lng)]}
                                zoom={15}
                                style={styles.map}
                                scrollWheelZoom={false}
                                dragging={true}
                                zoomControl={true}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[Number(alert.zone_lat), Number(alert.zone_lng)]}>
                                    <Popup>Zona donde se perdio</Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                    )}
                </div>

                {user && !isOwnAlert && (
                    <button
                        style={styles.contactBtn}
                        onClick={handleContact}
                        disabled={contacting}
                    >
                        {contacting ? (
                            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <MessageCircle size={20} />
                        )}
                        {contacting ? 'Conectando...' : 'Contactar a quien reporto'}
                    </button>
                )}

                {!user && (
                    <button
                        style={styles.contactBtn}
                        onClick={() => navigate('/login')}
                    >
                        <MessageCircle size={20} />
                        Inicia sesion para contactar
                    </button>
                )}

                {isOwnAlert && (
                    <div style={styles.ownAlertNote}>
                        Esta es tu alerta
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
    },
    loading: {
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-text-light)',
    },
    notFound: { padding: '2rem', color: 'var(--color-text-light)' },
    imageWrap: {
        position: 'relative',
        width: '100%',
        height: '280px',
        backgroundColor: '#e0e0e0',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    rewardBadge: {
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        padding: '0.5rem 1rem',
        borderRadius: '24px',
        fontSize: '1rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    body: { padding: '1.25rem', flex: 1 },
    petName: { fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--color-text-dark)' },
    userName: { fontSize: '0.9rem', color: 'var(--color-text-light)', margin: '0 0 1rem 0' },
    description: { fontSize: '1rem', color: 'var(--color-text-dark)', lineHeight: 1.5, marginBottom: '1.5rem' },
    section: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '1rem',
        marginBottom: '1.5rem',
    },
    zoneRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
    zoneLabel: { fontWeight: '600', color: 'var(--color-text-dark)' },
    zoneAddress: { margin: 0, color: 'var(--color-text-light)', fontSize: '0.95rem' },
    mapWrap: {
        marginTop: '1rem',
        height: '200px',
        borderRadius: '12px',
        overflow: 'hidden',
    },
    map: {
        height: '100%',
        width: '100%',
        borderRadius: '12px',
    },
    contactBtn: {
        width: '100%',
        padding: '1rem',
        borderRadius: '50px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
    },
    ownAlertNote: {
        textAlign: 'center',
        padding: '1rem',
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
    },
};

export default AlertDetail;
