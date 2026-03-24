import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const NotificationBell = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchCount = async () => {
            const { count, error } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false);
            if (!error) setUnread(count || 0);
        };

        fetchCount();

        const channel = supabase
            .channel('notif-bell')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT' && !payload.new.read) {
                        setUnread(prev => prev + 1);
                    } else if (payload.eventType === 'UPDATE' && payload.new.read && !payload.old?.read) {
                        setUnread(prev => Math.max(0, prev - 1));
                    } else if (payload.eventType === 'DELETE') {
                        fetchCount();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <button
            type="button"
            style={styles.btn}
            onClick={() => navigate('/notifications')}
            aria-label="Notificaciones"
        >
            <Bell size={22} color="var(--color-text-light)" />
            {unread > 0 && (
                <span style={styles.badge}>
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </button>
    );
};

const styles = {
    btn: {
        background: 'none',
        border: 'none',
        padding: '0.4rem',
        width: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '50%',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: '2px',
        right: '0px',
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: '#ff4b4b',
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        lineHeight: 1,
        border: '2px solid var(--color-bg-soft)',
    },
};

export default NotificationBell;
