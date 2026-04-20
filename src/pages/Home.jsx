import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Calendar, CheckCircle, AlertTriangle, Plus, CalendarCheck, MapPin, Filter, Users, PawPrint, ChevronRight } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/LoadingState';
import { sendPush } from '../utils/pushNotify';
import ErrorBox from '../components/ErrorBox';
import NotificationBell from '../components/NotificationBell';
import StoriesRow from '../components/StoriesRow';
import { formatEventDate, formatTimeSlot } from '../utils/formatters';
import Onboarding from '../components/Onboarding';
import logoImg from '/logo.png';

const Home = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState(null);
    const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past' | 'mine'
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('matchpetz_onboarded'));

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const { data: list, error } = await supabase
                    .from('events')
                    .select('id, title, event_date, event_time, location, image_url, creator_name, creator_avatar_url, creator_id, created_at')
                    .order('event_date', { ascending: true })
                    .limit(50);
                let attendeeIds = [];
                if (user) {
                    const { data: rows } = await supabase.from('event_attendees').select('event_id').eq('user_id', user.id);
                    attendeeIds = (rows || []).map((r) => r.event_id);
                }
                if (!error && list) {
                    setEvents(list.map((ev) => ({ ...ev, attending: attendeeIds.includes(ev.id) })));
                } else {
                    setEvents([]);
                }
            } catch (err) {
                setEventsError('No se pudieron cargar los eventos.');
            } finally {
                setEventsLoading(false);
            }
        };
        loadEvents();
    }, [user]);

    const toggleAttendance = async (e, eventId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        const ev = events.find((x) => x.id === eventId);
        if (!ev) return;
        if (ev.attending) {
            const { error } = await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', user.id);
            if (!error) setEvents(events.map((x) => (x.id === eventId ? { ...x, attending: false } : x)));
        } else {
            const { error } = await supabase.from('event_attendees').insert({ event_id: eventId, user_id: user.id });
            if (!error) {
                setEvents(events.map((x) => (x.id === eventId ? { ...x, attending: true } : x)));
                // Notify event creator — in-app + push (fire-and-forget)
                if (ev.creator_id && ev.creator_id !== user.id) {
                    const { data: myProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
                    const notifTitle = `${myProfile?.display_name || 'Alguien'} se inscribio a tu evento`;
                    supabase.from('notifications').insert({
                        user_id: ev.creator_id,
                        type: 'event',
                        title: notifTitle,
                        body: ev.title,
                        entity_id: ev.id,
                    }).catch(() => { /* notificacion no critica, ignorar fallo */ });
                    sendPush(ev.creator_id, notifTitle, ev.title, { type: 'event', entity_id: ev.id });
                }
            }
        }
    };

    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);

    const filteredEvents = useMemo(() => {
        return events.filter((ev) => {
            const evDate = new Date((ev.event_date || '') + 'T12:00:00');
            if (tab === 'upcoming') return evDate >= todayNoon;
            if (tab === 'past') return evDate < todayNoon;
            if (tab === 'mine') return ev.attending;
            return true;
        });
    }, [events, tab]);

    // Secondary quick actions — Adoption + Match are now hero cards above
    const ACTION_ITEMS = [
        { path: '/alerts',       bg: '#ffebee', icon: <AlertTriangle size={24} color="#e53935" />,                                label: 'Alertas' },
        { path: '/marketplace',  bg: '#e8f5e9', icon: <ShoppingBag size={24} color="#4caf50" />,                                  label: 'Tienda' },
        { path: '/appointments', bg: '#e3f2fd', icon: <CalendarCheck size={24} color="#2196f3" />,                                label: 'Citas' },
        { path: '/map',          bg: '#f3e5f5', icon: <MapPin size={24} color="#9c27b0" />,                                       label: 'Mapa' },
    ];

    const TABS = [
        { key: 'upcoming', label: 'Proximos', icon: <Calendar size={14} /> },
        { key: 'mine', label: 'Inscritos', icon: <Users size={14} /> },
        { key: 'past', label: 'Pasados', icon: <Filter size={14} /> },
    ];

    const renderEventCard = (event) => {
        const evDate = new Date((event.event_date || '') + 'T12:00:00');
        const isPast = evDate < todayNoon;
        const isToday = evDate.toDateString() === todayNoon.toDateString();

        return (
            <div key={event.id} style={{ ...styles.eventCard, opacity: isPast ? 0.7 : 1 }} onClick={() => navigate(`/events/${event.id}`)}>
                <div style={styles.eventHeader}>
                    <img src={getAvatarUrl(event.creator_avatar_url)} alt="" style={styles.creatorAvatar} loading="lazy" />
                    <span style={styles.creatorName}>{event.creator_name} creo un evento</span>
                    {isPast && <span style={styles.badgePast}>Pasado</span>}
                    {isToday && !isPast && <span style={styles.badgeToday}>Hoy</span>}
                </div>
                <img src={event.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80'} alt={event.title} style={styles.eventImage} loading="lazy" />
                <div style={styles.eventDetails}>
                    <h4 style={styles.eventTitle}>{event.title}</h4>
                    <div style={styles.eventMeta}>
                        <div style={styles.metaItem}>
                            <Calendar size={14} />
                            <span>{formatEventDate(event.event_date)} • {formatTimeSlot(event.event_time)} hrs</span>
                        </div>
                        <div style={styles.metaItem}>
                            <MapPin size={14} />
                            <span>{event.location}</span>
                        </div>
                    </div>
                    {!isPast && (
                        <button
                            type="button"
                            style={{
                                ...styles.rsvpBtn,
                                backgroundColor: event.attending ? '#eefdf2' : 'var(--color-social)',
                                color: event.attending ? 'var(--color-social)' : '#fff',
                                border: event.attending ? '2px solid var(--color-social)' : 'none'
                            }}
                            onClick={(e) => toggleAttendance(e, event.id)}
                        >
                            {event.attending ? <><CheckCircle size={18} /> Asistire</> : 'Inscribirme'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (showOnboarding) {
        return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.appBar}>
                <img src={logoImg} alt="MatchPetz" style={styles.logoImg} onClick={() => navigate('/home')} />
                <h2 style={{ ...styles.title, flex: 1 }}>MatchPetz</h2>
                <NotificationBell />
            </div>

            {isMobile ? (
                <>
                    <StoriesRow />

                    {/* ── Hero features: Match + Adopción ── */}
                    <div style={styles.heroRow}>
                        {/* Match / Buscar pareja */}
                        <div style={styles.heroCardMatch} onClick={() => navigate('/match')}>
                            <div style={styles.heroEmoji}>🐾</div>
                            <div style={styles.heroText}>
                                <span style={styles.heroTitle}>Buscar pareja</span>
                                <span style={styles.heroSub}>Encuentra el match ideal</span>
                            </div>
                            <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                        </div>

                        {/* Adopción */}
                        <div style={styles.heroCardAdopt} onClick={() => navigate('/adoption')}>
                            <div style={styles.heroEmoji}>🏠</div>
                            <div style={styles.heroText}>
                                <span style={styles.heroTitle}>Adoptar</span>
                                <span style={styles.heroSub}>Dale un hogar a alguien</span>
                            </div>
                            <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                        </div>
                    </div>

                    <div style={styles.quickActions}>
                        {ACTION_ITEMS.map(({ path, bg, icon, label }) => (
                            <div key={path} style={styles.actionItem} onClick={() => navigate(path)}>
                                <div style={{ ...styles.actionIcon, backgroundColor: bg }}>{icon}</div>
                                <span style={styles.actionLabel}>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Events section */}
                    <div style={styles.feedHeader}>
                        <h3 style={styles.feedTitle}>Eventos</h3>
                    </div>

                    {/* Tabs */}
                    <div style={styles.tabsRow}>
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabActive : {}) }}
                                onClick={() => setTab(t.key)}
                            >
                                {t.icon}
                                {t.label}
                                {t.key === 'mine' && events.filter(e => e.attending).length > 0 && (
                                    <span style={styles.tabBadge}>{events.filter(e => e.attending).length}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Create event centered */}
                    <button type="button" style={styles.createEventBtnFull} onClick={() => navigate('/create-event')}>
                        <Plus size={18} />
                        Crear evento
                    </button>

                    {eventsError ? (
                        <ErrorBox message={eventsError} />
                    ) : eventsLoading ? (
                        <LoadingState message="Cargando eventos..." />
                    ) : filteredEvents.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p style={styles.emptyText}>
                                {tab === 'upcoming' && 'No hay eventos proximos'}
                                {tab === 'past' && 'No hay eventos pasados'}
                                {tab === 'mine' && 'No estas inscrito en ningun evento'}
                            </p>
                        </div>
                    ) : (
                        <div style={styles.eventsList}>{filteredEvents.map(renderEventCard)}</div>
                    )}
                </>
            ) : (
                <div style={styles.desktopLayout}>
                    <div style={styles.desktopMain}>
                        <div style={styles.feedHeader}>
                            <h3 style={styles.feedTitle}>Eventos</h3>
                            <button type="button" style={styles.createEventBtnSmall} onClick={() => navigate('/create-event')}>
                                <Plus size={16} /> Crear evento
                            </button>
                        </div>
                        <div style={styles.tabsRow}>
                            {TABS.map((t) => (
                                <button key={t.key} style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabActive : {}) }} onClick={() => setTab(t.key)}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                        {eventsError ? (
                            <ErrorBox message={eventsError} />
                        ) : eventsLoading ? (
                            <LoadingState message="Cargando eventos..." />
                        ) : filteredEvents.length === 0 ? (
                            <div style={styles.emptyState}><p style={styles.emptyText}>No hay eventos en esta seccion</p></div>
                        ) : (
                            <div style={styles.eventsList}>{filteredEvents.map(renderEventCard)}</div>
                        )}
                    </div>
                    <div style={styles.desktopSidebar}>
                        <h3 style={styles.sidebarTitle}>Accesos rapidos</h3>
                        <div style={styles.sidebarActions}>
                            {ACTION_ITEMS.map(({ path, bg, icon, label }) => (
                                <button key={path} style={styles.sidebarActionBtn} onClick={() => navigate(path)}>
                                    <div style={{ ...styles.sidebarActionIcon, backgroundColor: bg }}>{icon}</div>
                                    <span style={styles.sidebarActionLabel}>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
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
        backgroundColor: 'var(--color-bg-soft)',
        padding: '0.75rem 1rem 1rem',
    },
    appBar: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 0 0.75rem',
        gap: '0.75rem',
    },
    logoImg: {
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(238,157,43,0.2)',
    },
    title: {
        fontSize: 'var(--font-size-page-title)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-dark)',
    },
    // ── Hero cards (Match + Adopción) ──
    heroRow: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1rem',
    },
    heroCardMatch: {
        flex: 1,
        background: 'linear-gradient(135deg, #ee9d2b 0%, #ffb703 100%)',
        borderRadius: 20,
        padding: '1rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(238,157,43,0.35)',
        transition: 'transform 0.15s',
        minHeight: 72,
    },
    heroCardAdopt: {
        flex: 1,
        background: 'linear-gradient(135deg, #e8567a 0%, #f472b6 100%)',
        borderRadius: 20,
        padding: '1rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(232,86,122,0.3)',
        transition: 'transform 0.15s',
        minHeight: 72,
    },
    heroEmoji: {
        fontSize: '1.6rem',
        flexShrink: 0,
    },
    heroText: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    heroTitle: {
        color: '#fff',
        fontWeight: 800,
        fontSize: '0.95rem',
        lineHeight: 1.2,
    },
    heroSub: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: '0.72rem',
        fontWeight: 500,
    },
    // ── Quick actions (secondary) ──
    quickActions: {
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-around',
        gap: '0.5rem',
        backgroundColor: 'var(--color-surface)',
        padding: '0.85rem 0.5rem',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-neu)',
        marginBottom: '1rem',
    },
    actionItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
    },
    actionIcon: {
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '4px 4px 10px rgba(0,0,0,0.07), -3px -3px 8px rgba(255,255,255,0.95)',
    },
    actionLabel: {
        fontWeight: '600',
        fontSize: '0.8rem',
        color: 'var(--color-text-dark)',
    },
    desktopLayout: { display: 'flex', flex: 1, gap: '1.5rem', alignItems: 'flex-start' },
    desktopMain: { flex: 1, minWidth: 0 },
    desktopSidebar: {
        width: '260px', flexShrink: 0, backgroundColor: 'var(--color-surface)',
        borderRadius: '20px', padding: '1.25rem', boxShadow: 'var(--shadow-neu)',
    },
    sidebarTitle: { fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-text-dark)', margin: '0 0 1rem 0' },
    sidebarActions: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    sidebarActionBtn: {
        display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'none',
        border: 'none', padding: '0.5rem 0.25rem', borderRadius: '12px', cursor: 'pointer', width: '100%', textAlign: 'left',
    },
    sidebarActionIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sidebarActionLabel: { fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-dark)' },
    feedHeader: {
        flexShrink: 0, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '0.5rem',
    },
    feedTitle: { fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: 'var(--color-text-dark)' },
    /* Tabs */
    tabsRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        overflowX: 'auto',
    },
    tabBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 0.9rem',
        borderRadius: '20px',
        border: '1.5px solid #e0e0e0',
        background: '#fff',
        fontSize: '0.82rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },
    tabActive: {
        background: 'var(--color-primary)',
        color: '#fff',
        borderColor: 'var(--color-primary)',
    },
    tabBadge: {
        background: '#fff',
        color: 'var(--color-primary)',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
        marginLeft: '0.15rem',
    },
    /* Create event button */
    createEventBtnFull: {
        width: '100%',
        padding: '0.7rem',
        borderRadius: '14px',
        border: 'none',
        background: 'linear-gradient(135deg, var(--color-social), #2e7d32)',
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 12px rgba(76,175,80,0.25)',
    },
    createEventBtnSmall: {
        padding: '0.45rem 1rem',
        borderRadius: '14px',
        border: 'none',
        backgroundColor: 'var(--color-social)',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
    },
    emptyState: { textAlign: 'center', padding: '2rem 1rem' },
    emptyText: { color: 'var(--color-text-light)', fontSize: '0.9rem' },
    eventsList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    eventCard: {
        backgroundColor: 'var(--color-surface)', borderRadius: '20px', overflow: 'hidden',
        boxShadow: '5px 5px 12px rgba(0,0,0,0.06), -4px -4px 10px rgba(255,255,255,0.9)',
        border: '1px solid rgba(255,255,255,0.6)',
        display: 'flex', flexDirection: 'column', cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    eventHeader: {
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem',
    },
    creatorAvatar: { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' },
    creatorName: { fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-dark)', flex: 1 },
    badgePast: {
        fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.6rem',
        borderRadius: '12px', background: '#f5f5f5', color: '#999',
    },
    badgeToday: {
        fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.6rem',
        borderRadius: '12px', background: '#fff3e0', color: '#e65100',
    },
    eventImage: { width: '100%', height: '160px', objectFit: 'cover' },
    eventDetails: { padding: '1rem' },
    eventTitle: { margin: '0 0 0.6rem 0', fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--color-text-dark)' },
    eventMeta: { display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem', color: 'var(--color-text-light)' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' },
    rsvpBtn: {
        width: '100%', padding: '0.7rem', borderRadius: '14px', fontWeight: 'bold',
        fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.4rem', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-soft)',
    },
};

export default Home;
