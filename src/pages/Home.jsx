import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart, ShoppingBag, CalendarCheck, AlertTriangle,
    MapPin, MessageSquare, ChevronRight, Users, PawPrint
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';
import StoriesRow from '../components/StoriesRow';
import Onboarding from '../components/Onboarding';
import logoImg from '/logo.png';

/**
 * Home — pantalla principal limpia.
 * Muestra KPIs de actividad de la comunidad + accesos rápidos a las features core.
 * Eventos movidos a /comunidad para no saturar esta pantalla.
 */
const Home = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { user, profile } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('matchpetz_onboarded'));
    const [unreadChats, setUnreadChats] = useState(0);
    const [kpis, setKpis] = useState({ adoption: 0, likes: 0, followers: 0, alerts: 0 });
    const [kpisLoading, setKpisLoading] = useState(true);

    // ── Unread chat badge para el AppBar ──────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const fetch = async () => {
            const { data } = await supabase
                .from('conversations')
                .select('unread_count')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .gt('unread_count', 0);
            if (data) setUnreadChats(data.reduce((s, c) => s + (c.unread_count || 0), 0));
        };
        fetch();
        const ch = supabase.channel('home-chat-badge')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetch)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [user]);

    // ── KPIs: adopciones, likes recibidos, seguidores, alertas ───────────────
    useEffect(() => {
        if (!user) { setKpisLoading(false); return; }
        const loadKpis = async () => {
            try {
                const [adoptionRes, followersRes, alertsRes, myPetsRes] = await Promise.all([
                    // Mascotas disponibles en adopción
                    supabase.from('adoption_pets')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'available'),
                    // Mis seguidores
                    supabase.from('user_follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('following_id', user.id),
                    // Alertas activas (último mes)
                    supabase.from('alerts')
                        .select('*', { count: 'exact', head: true })
                        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
                    // Mis mascotas (para contar likes recibidos)
                    supabase.from('pets').select('id').eq('owner_id', user.id),
                ]);

                // Likes recibidos en mis mascotas
                let likesCount = 0;
                const petIds = (myPetsRes.data || []).map(p => p.id);
                if (petIds.length > 0) {
                    const { count } = await supabase
                        .from('pet_swipes')
                        .select('*', { count: 'exact', head: true })
                        .in('target_pet_id', petIds)
                        .eq('direction', 'right');
                    likesCount = count || 0;
                }

                setKpis({
                    adoption:  adoptionRes.count  || 0,
                    followers: followersRes.count  || 0,
                    alerts:    alertsRes.count     || 0,
                    likes:     likesCount,
                });
            } catch {
                // KPIs no son críticos — mostrar 0 si falla
            } finally {
                setKpisLoading(false);
            }
        };
        loadKpis();
    }, [user]);

    const firstName = profile?.display_name?.split(' ')[0] || 'ahí';

    // ── Quick actions (secundarias — core está en hero y nav) ────────────────
    const ACTION_ITEMS = [
        { path: '/alerts',       bg: '#ffebee', icon: <AlertTriangle size={22} color="#e53935" />, label: 'Alertas'  },
        { path: '/marketplace',  bg: '#e8f5e9', icon: <ShoppingBag   size={22} color="#4caf50" />, label: 'Tienda'   },
        { path: '/appointments', bg: '#e3f2fd', icon: <CalendarCheck size={22} color="#2196f3" />, label: 'Citas'    },
        { path: '/map',          bg: '#f3e5f5', icon: <MapPin        size={22} color="#9c27b0" />, label: 'Mapa'     },
    ];

    // ── KPI card definitions ─────────────────────────────────────────────────
    const KPI_ITEMS = [
        {
            key: 'adoption', label: 'En adopción', value: kpis.adoption,
            icon: <Heart size={20} color="#e8567a" fill="#e8567a" />,
            bg: '#fdf2f8', color: '#e8567a', path: '/adoption',
        },
        {
            key: 'likes', label: 'Likes recibidos', value: kpis.likes,
            icon: <PawPrint size={20} color="#ee9d2b" fill="#ee9d2b" />,
            bg: '#fffbeb', color: '#ee9d2b', path: '/match',
        },
        {
            key: 'followers', label: 'Seguidores', value: kpis.followers,
            icon: <Users size={20} color="#6366f1" />,
            bg: '#eef2ff', color: '#6366f1', path: '/profile',
        },
        {
            key: 'alerts', label: 'Alertas activas', value: kpis.alerts,
            icon: <AlertTriangle size={20} color="#ef4444" />,
            bg: '#fff1f2', color: '#ef4444', path: '/alerts',
        },
    ];

    if (showOnboarding) {
        return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    // ── Render ───────────────────────────────────────────────────────────────
    const mobileContent = (
        <>
            <StoriesRow />

            {/* Saludo personalizado */}
            <div style={styles.greeting}>
                <span style={styles.greetingText}>Hola, {firstName} 👋</span>
                <span style={styles.greetingSub}>¿Qué hacemos hoy?</span>
            </div>

            {/* KPIs 2×2 */}
            <div style={styles.kpiGrid}>
                {KPI_ITEMS.map(({ key, label, value, icon, bg, color, path }) => (
                    <div key={key} style={styles.kpiCard} onClick={() => navigate(path)}>
                        <div style={{ ...styles.kpiIconWrap, backgroundColor: bg }}>
                            {icon}
                        </div>
                        <span style={{ ...styles.kpiValue, color }}>
                            {kpisLoading ? '—' : value}
                        </span>
                        <span style={styles.kpiLabel}>{label}</span>
                    </div>
                ))}
            </div>

            {/* Hero cards — Match + Adopción */}
            <div style={styles.heroRow}>
                <div style={styles.heroCardMatch} onClick={() => navigate('/match')}>
                    <div style={styles.heroEmoji}>🐾</div>
                    <div style={styles.heroText}>
                        <span style={styles.heroTitle}>Buscar pareja</span>
                        <span style={styles.heroSub}>Encuentra el match ideal</span>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                </div>
                <div style={styles.heroCardAdopt} onClick={() => navigate('/adoption')}>
                    <div style={styles.heroEmoji}>🏠</div>
                    <div style={styles.heroText}>
                        <span style={styles.heroTitle}>Adoptar</span>
                        <span style={styles.heroSub}>Dale un hogar a alguien</span>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                </div>
            </div>

            {/* Quick actions secundarias */}
            <div style={styles.quickActions}>
                {ACTION_ITEMS.map(({ path, bg, icon, label }) => (
                    <div key={path} style={styles.actionItem} onClick={() => navigate(path)}>
                        <div style={{ ...styles.actionIcon, backgroundColor: bg }}>{icon}</div>
                        <span style={styles.actionLabel}>{label}</span>
                    </div>
                ))}
            </div>
        </>
    );

    const desktopContent = (
        <div style={styles.desktopLayout}>
            <div style={styles.desktopMain}>
                <div style={styles.greeting}>
                    <span style={styles.greetingText}>Hola, {firstName} 👋</span>
                    <span style={styles.greetingSub}>¿Qué hacemos hoy?</span>
                </div>
                <div style={styles.kpiGrid}>
                    {KPI_ITEMS.map(({ key, label, value, icon, bg, color, path }) => (
                        <div key={key} style={styles.kpiCard} onClick={() => navigate(path)}>
                            <div style={{ ...styles.kpiIconWrap, backgroundColor: bg }}>{icon}</div>
                            <span style={{ ...styles.kpiValue, color }}>{kpisLoading ? '—' : value}</span>
                            <span style={styles.kpiLabel}>{label}</span>
                        </div>
                    ))}
                </div>
                <div style={styles.heroRow}>
                    <div style={styles.heroCardMatch} onClick={() => navigate('/match')}>
                        <div style={styles.heroEmoji}>🐾</div>
                        <div style={styles.heroText}>
                            <span style={styles.heroTitle}>Buscar pareja</span>
                            <span style={styles.heroSub}>Encuentra el match ideal</span>
                        </div>
                        <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                    </div>
                    <div style={styles.heroCardAdopt} onClick={() => navigate('/adoption')}>
                        <div style={styles.heroEmoji}>🏠</div>
                        <div style={styles.heroText}>
                            <span style={styles.heroTitle}>Adoptar</span>
                            <span style={styles.heroSub}>Dale un hogar a alguien</span>
                        </div>
                        <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                    </div>
                </div>
            </div>
            <div style={styles.desktopSidebar}>
                <h3 style={styles.sidebarTitle}>Accesos rápidos</h3>
                <div style={styles.sidebarActions}>
                    {ACTION_ITEMS.map(({ path, bg, icon, label }) => (
                        <button key={path} style={styles.sidebarBtn} onClick={() => navigate(path)}>
                            <div style={{ ...styles.sidebarIcon, backgroundColor: bg }}>{icon}</div>
                            <span style={styles.sidebarLabel}>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div style={styles.container} className="fade-in">
            {/* AppBar con chat badge */}
            <div style={styles.appBar}>
                <img src={logoImg} alt="MatchPetz" style={styles.logoImg} onClick={() => navigate('/home')} />
                <h2 style={styles.appTitle}>MatchPetz</h2>
                {/* Chat accesible desde aquí — liberamos la tab de nav para Comunidad */}
                <button style={styles.chatBtn} onClick={() => navigate('/inbox')}>
                    <MessageSquare size={22} color="var(--color-text-light)" />
                    {unreadChats > 0 && (
                        <span style={styles.chatBadge}>{unreadChats > 9 ? '9+' : unreadChats}</span>
                    )}
                </button>
                <NotificationBell />
            </div>

            {isMobile ? mobileContent : desktopContent}
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-soft, #f5f5f5)',
        padding: '0.75rem 1rem 1rem',
    },
    appBar: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0.25rem 0 0.75rem',
        gap: '0.5rem',
    },
    logoImg: {
        width: 36, height: 36,
        borderRadius: 10, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(238,157,43,0.2)',
        flexShrink: 0,
    },
    appTitle: {
        flex: 1,
        fontSize: '1.2rem',
        fontWeight: 800,
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    chatBtn: {
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.35rem',
        display: 'flex',
        alignItems: 'center',
    },
    chatBadge: {
        position: 'absolute',
        top: 0, right: 0,
        minWidth: 16, height: 16,
        borderRadius: 8,
        backgroundColor: '#ff4b4b',
        color: '#fff',
        fontSize: '0.6rem',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
        border: '2px solid var(--color-bg-soft, #f5f5f5)',
    },
    // ── Greeting ──
    greeting: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginBottom: '1rem',
    },
    greetingText: {
        fontSize: '1.25rem',
        fontWeight: 800,
        color: 'var(--color-text-dark)',
    },
    greetingSub: {
        fontSize: '0.85rem',
        color: 'var(--color-text-light)',
    },
    // ── KPI grid 2×2 ──
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.65rem',
        marginBottom: '1rem',
    },
    kpiCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: '1rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    },
    kpiIconWrap: {
        width: 36, height: 36,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    kpiValue: {
        fontSize: '1.6rem',
        fontWeight: 900,
        lineHeight: 1,
    },
    kpiLabel: {
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--color-text-light)',
    },
    // ── Hero cards ──
    heroRow: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1rem',
    },
    heroCardMatch: {
        flex: 1,
        background: 'linear-gradient(135deg, #ee9d2b, #ffb703)',
        borderRadius: 20,
        padding: '1rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(238,157,43,0.35)',
        minHeight: 72,
    },
    heroCardAdopt: {
        flex: 1,
        background: 'linear-gradient(135deg, #e8567a, #f472b6)',
        borderRadius: 20,
        padding: '1rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(232,86,122,0.3)',
        minHeight: 72,
    },
    heroEmoji: { fontSize: '1.5rem', flexShrink: 0 },
    heroText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
    heroTitle: { color: '#fff', fontWeight: 800, fontSize: '0.92rem' },
    heroSub:   { color: 'rgba(255,255,255,0.82)', fontSize: '0.7rem', fontWeight: 500 },
    // ── Quick actions ──
    quickActions: {
        display: 'flex',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        padding: '0.85rem 0.5rem',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    },
    actionItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
    },
    actionIcon: {
        width: 44, height: 44,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--color-text-dark)',
    },
    // ── Desktop ──
    desktopLayout: { display: 'flex', flex: 1, gap: '1.5rem', alignItems: 'flex-start' },
    desktopMain:   { flex: 1, minWidth: 0 },
    desktopSidebar: {
        width: 260, flexShrink: 0,
        backgroundColor: '#fff',
        borderRadius: 20, padding: '1.25rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    },
    sidebarTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-dark)', margin: '0 0 1rem' },
    sidebarActions: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    sidebarBtn: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'none', border: 'none', padding: '0.5rem 0.25rem',
        borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
    },
    sidebarIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sidebarLabel: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-dark)' },
};

export default Home;
