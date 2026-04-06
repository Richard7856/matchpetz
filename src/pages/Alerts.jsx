import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import { formatRelativeDate } from '../utils/formatters';
import { ALERTS_STORAGE_KEY } from '../constants/storage';

const getLocalAlerts = () => {
    try {
        return JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

const Alerts = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAlerts = async () => {
            const url = import.meta.env.VITE_SUPABASE_URL;
            if (url) {
                try {
                    const { data: list, error } = await supabase
                        .from('alerts')
                        .select('id, pet_name, pet_type, description, image_url, zone_address, reward, created_at')
                        .order('created_at', { ascending: false })
                        .limit(30);

                    if (!error && list) {
                        const local = getLocalAlerts();
                        setAlerts([...list, ...local.filter(l => !list.find(r => r.id === l.id))]);
                    } else {
                        setAlerts(getLocalAlerts());
                    }
                } catch (e) {
                    setAlerts(getLocalAlerts());
                }
            } else {
                setAlerts(getLocalAlerts());
            }
            setLoading(false);
        };
        loadAlerts();
    }, []);

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Alertas" backTo="/home" />

            <p style={styles.subtitle}>Mascotas perdidas reportadas por la comunidad. Ayuda a encontrarlas.</p>

            {loading ? (
                <LoadingState message="Cargando alertas..." />
            ) : alerts.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={styles.emptyText}>No hay alertas publicadas aún.</p>
                    <p style={styles.emptySubtext}>Sé el primero en reportar una mascota perdida.</p>
                    <button style={styles.emptyBtn} onClick={() => navigate('/alerts/new')}>Crear alerta</button>
                </div>
            ) : (
                <div style={styles.list}>
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            style={styles.card}
                            onClick={() => navigate(`/alerts/${alert.id}`)}
                        >
                            <div style={styles.cardImageWrap}>
                                <img
                                    src={alert.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80'}
                                    alt={alert.pet_name}
                                    style={styles.cardImage}
                                    loading="lazy"
                                />
                                {alert.reward != null && alert.reward > 0 && (
                                    <div style={styles.rewardBadge}>
                                        <DollarSign size={14} />
                                        <span>{Number(alert.reward).toLocaleString('es-MX')}</span>
                                    </div>
                                )}
                            </div>
                            <div style={styles.cardBody}>
                                <h3 style={styles.petName}>{alert.pet_name} · {alert.pet_type}</h3>
                                <p style={styles.description}>{alert.description}</p>
                                <div style={styles.zoneRow}>
                                    <MapPin size={14} color="var(--color-primary)" />
                                    <span style={styles.zoneText}>{alert.zone_address || 'Zona no especificada'}</span>
                                </div>
                                <span style={styles.time}>{formatRelativeDate(alert.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button style={styles.fab} onClick={() => navigate('/alerts/new')} title="Nueva alerta">
                <Plus size={28} color="#fff" />
            </button>

        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        padding: '0 1rem 1rem',
    },
    subtitle: {
        fontSize: '0.95rem',
        color: 'var(--color-text-light)',
        marginBottom: '1.25rem',
    },
    loading: {
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--color-text-light)',
    },
    emptyState: { textAlign: 'center', padding: '2rem' },
    emptyText: { fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-dark)', marginBottom: '0.5rem' },
    emptySubtext: { fontSize: '0.95rem', color: 'var(--color-text-light)', marginBottom: '1.5rem' },
    emptyBtn: { padding: '0.75rem 1.5rem', borderRadius: '50px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        display: 'flex',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardImageWrap: {
        width: '120px',
        minHeight: '120px',
        position: 'relative',
        flexShrink: 0,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        minHeight: '120px',
    },
    rewardBadge: {
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    cardBody: {
        flex: 1,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    petName: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        margin: 0,
        color: 'var(--color-text-dark)',
    },
    description: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    zoneRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginTop: 'auto',
    },
    zoneText: {
        fontSize: '0.85rem',
        color: 'var(--color-text-dark)',
    },
    time: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
    },
    fab: {
        position: 'fixed',
        bottom: '90px',
        right: '1.5rem',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        border: 'none',
        padding: 0,
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(238, 157, 43, 0.5)',
        zIndex: 50,
    },
};

export default Alerts;
