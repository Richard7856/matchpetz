import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, CheckCircle, MapPin, Plus, Filter, Users, ImageIcon
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl } from '../utils/avatar';
import { formatEventDate, formatTimeSlot } from '../utils/formatters';
import LoadingState from '../components/LoadingState';
import ErrorBox from '../components/ErrorBox';
import Explore from './Explore';

/**
 * Comunidad — agrupa Eventos y Social feed en una sola tab.
 * Eventos: lista de eventos con inscripción.
 * Social: embed del feed de posts de Explore.
 */
const Comunidad = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [mainTab, setMainTab] = useState('eventos'); // 'eventos' | 'social'
    const [eventTab, setEventTab] = useState('upcoming');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const todayNoon = useMemo(() => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    }, []);

    useEffect(() => {
        if (mainTab !== 'eventos') return;
        const load = async () => {
            setLoading(true);
            try {
                const { data: list, error: err } = await supabase
                    .from('events')
                    .select('id, title, event_date, event_time, location, image_url, creator_name, creator_avatar_url, creator_id, created_at')
                    .order('event_date', { ascending: true })
                    .limit(50);
                let attendeeIds = [];
                if (user) {
                    const { data: rows } = await supabase
                        .from('event_attendees').select('event_id').eq('user_id', user.id);
                    attendeeIds = (rows || []).map(r => r.event_id);
                }
                if (!err && list) {
                    setEvents(list.map(ev => ({ ...ev, attending: attendeeIds.includes(ev.id) })));
                } else {
                    setError('No se pudieron cargar los eventos.');
                }
            } catch {
                setError('No se pudieron cargar los eventos.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, mainTab]);

    const toggleAttendance = async (e, eventId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        const ev = events.find(x => x.id === eventId);
        if (!ev) return;
        if (ev.attending) {
            const { error: err } = await supabase.from('event_attendees')
                .delete().eq('event_id', eventId).eq('user_id', user.id);
            if (!err) setEvents(events.map(x => x.id === eventId ? { ...x, attending: false } : x));
        } else {
            const { error: err } = await supabase.from('event_attendees')
                .insert({ event_id: eventId, user_id: user.id });
            if (!err) setEvents(events.map(x => x.id === eventId ? { ...x, attending: true } : x));
        }
    };

    const filteredEvents = useMemo(() => events.filter(ev => {
        const d = new Date((ev.event_date || '') + 'T12:00:00');
        if (eventTab === 'upcoming') return d >= todayNoon;
        if (eventTab === 'past')     return d < todayNoon;
        if (eventTab === 'mine')     return ev.attending;
        return true;
    }), [events, eventTab, todayNoon]);

    const EVENT_TABS = [
        { key: 'upcoming', label: 'Próximos',  icon: <Calendar size={13} /> },
        { key: 'mine',     label: 'Inscritos', icon: <Users size={13} /> },
        { key: 'past',     label: 'Pasados',   icon: <Filter size={13} /> },
    ];

    const renderEvent = (event) => {
        const evDate = new Date((event.event_date || '') + 'T12:00:00');
        const isPast  = evDate < todayNoon;
        const isToday = evDate.toDateString() === todayNoon.toDateString();
        return (
            <div
                key={event.id}
                style={{ ...styles.eventCard, opacity: isPast ? 0.72 : 1 }}
                onClick={() => navigate(`/events/${event.id}`)}
            >
                <div style={styles.eventHeader}>
                    <img src={getAvatarUrl(event.creator_avatar_url)} alt="" style={styles.avatar} loading="lazy" />
                    <span style={styles.creatorName}>{event.creator_name} creó un evento</span>
                    {isPast  && <span style={styles.badgePast}>Pasado</span>}
                    {isToday && !isPast && <span style={styles.badgeToday}>Hoy</span>}
                </div>
                <img
                    src={event.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80'}
                    alt={event.title}
                    style={styles.eventImg}
                    loading="lazy"
                />
                <div style={styles.eventBody}>
                    <h4 style={styles.eventTitle}>{event.title}</h4>
                    <div style={styles.metaRow}>
                        <Calendar size={13} color="#9ca3af" />
                        <span>{formatEventDate(event.event_date)} · {formatTimeSlot(event.event_time)} hrs</span>
                    </div>
                    <div style={styles.metaRow}>
                        <MapPin size={13} color="#9ca3af" />
                        <span>{event.location}</span>
                    </div>
                    {!isPast && (
                        <button
                            style={{
                                ...styles.rsvpBtn,
                                background: event.attending ? '#eefdf2' : 'var(--color-social, #22c55e)',
                                color:      event.attending ? 'var(--color-social, #22c55e)' : '#fff',
                                border:     event.attending ? '2px solid var(--color-social, #22c55e)' : 'none',
                            }}
                            onClick={e => toggleAttendance(e, event.id)}
                        >
                            {event.attending ? <><CheckCircle size={16} /> Asistiré</> : 'Inscribirme'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container} className="fade-in">
            {/* ── AppBar ── */}
            <div style={styles.appBar}>
                <h2 style={styles.title}>Comunidad</h2>
                <button
                    style={styles.createBtn}
                    onClick={() => navigate(mainTab === 'eventos' ? '/create-event' : '/posts/new')}
                >
                    <Plus size={18} color="#fff" />
                </button>
            </div>

            {/* ── Main tabs ── */}
            <div style={styles.mainTabs}>
                <button
                    style={{ ...styles.mainTab, ...(mainTab === 'eventos' ? styles.mainTabActive : {}) }}
                    onClick={() => setMainTab('eventos')}
                >
                    <Calendar size={15} />
                    Eventos
                </button>
                <button
                    style={{ ...styles.mainTab, ...(mainTab === 'social' ? styles.mainTabActive : {}) }}
                    onClick={() => setMainTab('social')}
                >
                    <ImageIcon size={15} />
                    Social
                </button>
            </div>

            {/* ── Eventos tab ── */}
            {mainTab === 'eventos' && (
                <>
                    <div style={styles.eventTabsRow}>
                        {EVENT_TABS.map(t => (
                            <button
                                key={t.key}
                                style={{ ...styles.eventTabBtn, ...(eventTab === t.key ? styles.eventTabActive : {}) }}
                                onClick={() => setEventTab(t.key)}
                            >
                                {t.icon} {t.label}
                                {t.key === 'mine' && events.filter(e => e.attending).length > 0 && (
                                    <span style={styles.tabBadge}>{events.filter(e => e.attending).length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    {error   ? <ErrorBox message={error} /> :
                     loading ? <LoadingState message="Cargando eventos..." /> :
                     filteredEvents.length === 0 ? (
                        <div style={styles.empty}>
                            <p style={styles.emptyText}>
                                {eventTab === 'upcoming' && 'No hay eventos próximos'}
                                {eventTab === 'past'     && 'No hay eventos pasados'}
                                {eventTab === 'mine'     && 'No estás inscrito en ningún evento'}
                            </p>
                            <button style={styles.emptyBtn} onClick={() => navigate('/create-event')}>
                                <Plus size={16} /> Crear el primero
                            </button>
                        </div>
                    ) : (
                        <div style={styles.eventsList}>{filteredEvents.map(renderEvent)}</div>
                    )}
                </>
            )}

            {/* ── Social tab — embed Explore sin header propio ── */}
            {mainTab === 'social' && (
                <div style={styles.socialWrap}>
                    <Explore embedded={true} />
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
        backgroundColor: 'var(--color-bg-soft, #f5f5f5)',
    },
    appBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-bg-soft, #f5f5f5)',
    },
    title: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    createBtn: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ee9d2b, #ffb703)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 3px 10px rgba(238,157,43,0.4)',
    },
    // ── Main tabs (Eventos / Social) ──
    mainTabs: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0 1rem 0.75rem',
    },
    mainTab: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.6rem 0',
        borderRadius: 14,
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--color-text-light)',
        cursor: 'pointer',
    },
    mainTabActive: {
        background: 'var(--color-primary, #ee9d2b)',
        borderColor: 'var(--color-primary, #ee9d2b)',
        color: '#fff',
    },
    // ── Event sub-tabs ──
    eventTabsRow: {
        display: 'flex',
        gap: '0.4rem',
        padding: '0 1rem 0.75rem',
        overflowX: 'auto',
    },
    eventTabBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.4rem 0.85rem',
        borderRadius: 20,
        border: '1.5px solid #e0e0e0',
        background: '#fff',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--color-text-light)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    eventTabActive: {
        background: 'var(--color-primary, #ee9d2b)',
        color: '#fff',
        borderColor: 'var(--color-primary, #ee9d2b)',
    },
    tabBadge: {
        background: '#fff',
        color: 'var(--color-primary)',
        fontSize: '0.65rem',
        fontWeight: 800,
        borderRadius: 8,
        padding: '1px 5px',
    },
    eventsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0 1rem 1rem',
    },
    // ── Event card ──
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        cursor: 'pointer',
    },
    eventHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 0.9rem 0.5rem',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
    },
    creatorName: {
        flex: 1,
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
        fontWeight: 500,
    },
    badgePast: {
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 8,
        background: '#f0f0f0',
        color: '#888',
    },
    badgeToday: {
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 8,
        background: '#fff3e0',
        color: '#ee9d2b',
    },
    eventImg: {
        width: '100%',
        height: 160,
        objectFit: 'cover',
        display: 'block',
    },
    eventBody: {
        padding: '0.75rem 0.9rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
    },
    eventTitle: {
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
    },
    rsvpBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        marginTop: '0.5rem',
        padding: '0.6rem',
        borderRadius: 12,
        fontSize: '0.9rem',
        fontWeight: 700,
        cursor: 'pointer',
        width: '100%',
        fontFamily: 'inherit',
    },
    // ── Empty state ──
    empty: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1rem',
        gap: '0.75rem',
    },
    emptyText: {
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        textAlign: 'center',
        margin: 0,
    },
    emptyBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.65rem 1.25rem',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontSize: '0.9rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    // ── Social tab wrapper ──
    socialWrap: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
};

export default Comunidad;
