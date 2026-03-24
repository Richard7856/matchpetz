import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Calendar, Star, MessageSquare, Users, Heart,
    CheckCheck, Trash2,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import { formatRelativeDate } from '../utils/formatters';

const TYPE_CONFIG = {
    appointment: { icon: Calendar, color: '#2196f3', bg: '#e3f2fd', label: 'Cita' },
    review: { icon: Star, color: '#ff9800', bg: '#fff3e0', label: 'Reseña' },
    message: { icon: MessageSquare, color: '#13ec5b', bg: '#e8f5e9', label: 'Mensaje' },
    event: { icon: Users, color: '#9c27b0', bg: '#f3e5f5', label: 'Evento' },
    adoption: { icon: Heart, color: '#e91e63', bg: '#fce4ec', label: 'Adopcion' },
};

const Notifications = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (!error && data) setNotifications(data);
            setLoading(false);
        };
        load();
    }, [user]);

    const markAllRead = async () => {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length === 0) return;
        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const markRead = async (id) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const handleClick = (notif) => {
        if (!notif.read) markRead(notif.id);
        // Navigate based on type + entity_id
        if (notif.entity_id) {
            switch (notif.type) {
                case 'appointment': navigate('/appointments'); break;
                case 'event': navigate(`/events/${notif.entity_id}`); break;
                case 'message': navigate(`/chat/${notif.entity_id}`); break;
                case 'adoption': navigate(`/chat/${notif.entity_id}`); break;
                default: break;
            }
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Notificaciones" backTo="/home" />

            {unreadCount > 0 && (
                <button style={styles.markAllBtn} onClick={markAllRead}>
                    <CheckCheck size={16} />
                    Marcar todas como leídas ({unreadCount})
                </button>
            )}

            {loading ? (
                <LoadingState message="Cargando notificaciones..." />
            ) : notifications.length === 0 ? (
                <div style={styles.emptyState}>
                    <Bell size={56} color="#ddd" />
                    <p style={styles.emptyTitle}>Sin notificaciones</p>
                    <p style={styles.emptySubtext}>Aquí aparecerán tus citas, mensajes, reseñas y eventos</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {notifications.map((notif) => {
                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.event;
                        const Icon = config.icon;
                        return (
                            <div
                                key={notif.id}
                                style={{
                                    ...styles.card,
                                    backgroundColor: notif.read ? '#fff' : '#fffcf5',
                                    borderLeft: notif.read ? '4px solid transparent' : `4px solid ${config.color}`,
                                }}
                                onClick={() => handleClick(notif)}
                            >
                                <div style={{ ...styles.iconWrap, backgroundColor: config.bg }}>
                                    <Icon size={20} color={config.color} />
                                </div>
                                <div style={styles.content}>
                                    <div style={styles.topRow}>
                                        <span style={styles.typeLabel}>{config.label}</span>
                                        <span style={styles.time}>{formatRelativeDate(notif.created_at)}</span>
                                    </div>
                                    <h4 style={styles.title}>{notif.title}</h4>
                                    {notif.body && <p style={styles.body}>{notif.body}</p>}
                                </div>
                                {!notif.read && <div style={styles.unreadDot} />}
                            </div>
                        );
                    })}
                </div>
            )}
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
    markAllBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.6rem 1rem',
        marginBottom: '1rem',
        borderRadius: '14px',
        border: '1.5px solid var(--color-primary)',
        backgroundColor: '#fff',
        color: 'var(--color-primary)',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: 'auto',
        alignSelf: 'flex-end',
    },
    emptyState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '3rem 2rem',
    },
    emptyTitle: {
        fontSize: '1.15rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
    },
    emptySubtext: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        textAlign: 'center',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
    },
    card: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
    },
    iconWrap: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    topRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.2rem',
    },
    typeLabel: {
        fontSize: '0.72rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--color-text-light)',
    },
    time: {
        fontSize: '0.72rem',
        color: 'var(--color-text-light)',
    },
    title: {
        fontSize: '0.95rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
        margin: 0,
        lineHeight: 1.3,
    },
    body: {
        fontSize: '0.85rem',
        color: 'var(--color-text-light)',
        marginTop: '0.15rem',
        lineHeight: 1.4,
    },
    unreadDot: {
        width: '9px',
        height: '9px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        flexShrink: 0,
        marginTop: '0.3rem',
    },
};

export default Notifications;
