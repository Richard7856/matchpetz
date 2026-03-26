import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, MessageSquare, User } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const NAV_ITEMS = [
    { path: '/home', icon: Home, label: 'Inicio' },
    { path: '/discover', icon: Compass, label: 'Descubrir' },
    { path: '/inbox', icon: MessageSquare, label: 'Chats' },
    { path: '/profile', icon: User, label: 'Perfil' },
];

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const path = location.pathname;
    const [unreadChats, setUnreadChats] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            const { data } = await supabase
                .from('conversations')
                .select('unread_count')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .gt('unread_count', 0);
            if (data) setUnreadChats(data.reduce((sum, c) => sum + (c.unread_count || 0), 0));
        };
        fetchUnread();

        const channel = supabase
            .channel('bottomnav-unread')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => { fetchUnread(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (!isMobile) {
        return (
            <div style={styles.sidebar}>
                <div style={styles.sidebarBrand}>
                    <span style={styles.brandText}>MatchPetz</span>
                </div>
                {NAV_ITEMS.map(({ path: itemPath, icon: Icon, label }) => {
                    const isActive = path === itemPath;
                    return (
                        <button
                            key={itemPath}
                            style={{ ...styles.sidebarItem, ...(isActive ? styles.sidebarItemActive : {}) }}
                            onClick={() => navigate(itemPath)}
                        >
                            <div style={styles.iconWrap}>
                                <Icon size={22} color={isActive ? 'var(--color-primary)' : 'var(--color-text-light)'} />
                                {itemPath === '/inbox' && unreadChats > 0 && <span style={styles.badge}>{unreadChats > 9 ? '9+' : unreadChats}</span>}
                            </div>
                            <span style={{ ...styles.sidebarLabel, color: isActive ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div style={styles.navBar}>
            {NAV_ITEMS.map(({ path: itemPath, icon: Icon, label }) => {
                const isActive = path === itemPath;
                const color = isActive ? 'var(--color-primary)' : 'var(--color-text-light)';
                return (
                    <button key={itemPath} style={styles.navItem} onClick={() => navigate(itemPath)}>
                        {isActive && <div style={styles.activeIndicator} />}
                        <div style={styles.iconWrap}>
                            <Icon size={22} color={color} />
                            {itemPath === '/inbox' && unreadChats > 0 && <span style={styles.badge}>{unreadChats > 9 ? '9+' : unreadChats}</span>}
                        </div>
                        <span style={{ ...styles.navLabel, color, fontWeight: isActive ? '700' : '600' }}>{label}</span>
                    </button>
                );
            })}
        </div>
    );
};

const styles = {
    // Mobile bottom nav
    navBar: {
        width: '100%',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'var(--color-background, #fdfdfd)',
        padding: '0.5rem 0 calc(0.6rem + env(safe-area-inset-bottom, 0px))',
        borderTop: 'none',
        boxShadow: '0 -6px 16px rgba(0,0,0,0.06), 0 -2px 6px rgba(255,255,255,0.4)',
        zIndex: 100,
    },
    navItem: {
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        cursor: 'pointer',
        padding: '0.25rem 0.5rem',
        width: 'auto',
        minHeight: '48px',
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        top: '-1px',
        width: '24px',
        height: '3px',
        borderRadius: '0 0 3px 3px',
        backgroundColor: 'var(--color-primary)',
    },
    iconWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: '-6px',
        right: '-10px',
        minWidth: '16px',
        height: '16px',
        borderRadius: '8px',
        backgroundColor: '#ff4b4b',
        color: '#fff',
        fontSize: '0.6rem',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
        lineHeight: 1,
        border: '2px solid #fff',
    },
    navLabel: {
        fontSize: '0.7rem',
        fontWeight: '600',
    },
    // Desktop sidebar
    sidebar: {
        width: '220px',
        height: '100vh',
        flexShrink: 0,
        backgroundColor: '#fff',
        borderRight: '1px solid #eee',
        boxShadow: '2px 0 14px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        overflowY: 'auto',
    },
    sidebarBrand: {
        padding: '1.5rem',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: '0.5rem',
    },
    brandText: {
        fontSize: '1.4rem',
        fontWeight: '800',
        color: 'var(--color-primary)',
    },
    sidebarItem: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1.5rem',
        background: 'none',
        border: 'none',
        borderRadius: '12px',
        margin: '0.15rem 0.75rem',
        width: 'calc(100% - 1.5rem)',
        cursor: 'pointer',
        justifyContent: 'flex-start',
        transition: 'background-color 0.15s',
    },
    sidebarItemActive: {
        backgroundColor: '#fff8ee',
    },
    sidebarLabel: {
        fontSize: '0.95rem',
        fontWeight: '600',
    },
};

export default BottomNav;
