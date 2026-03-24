import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Calendar, Clock, CheckCircle, Users, MessageCircle, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import ReviewSection from '../components/ReviewSection';
import AttendeePreview from '../components/AttendeePreview';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import ErrorBox from '../components/ErrorBox';
import { formatEventDate, formatTimeSlot } from '../utils/formatters';

const ACTIVITY_TYPE_LABELS = { evento: 'Evento', paseo: 'Paseo', playdate: 'Playdate', entrenamiento: 'Entrenamiento', voluntariado: 'Voluntariado', otro: 'Otro' };

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const [event, setEvent] = useState(null);
    const [attending, setAttending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [attendeeCount, setAttendeeCount] = useState(0);
    const [attendees, setAttendees] = useState([]);
    const [selectedAttendee, setSelectedAttendee] = useState(null);
    const [groupConvId, setGroupConvId] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!id) { setLoading(false); return; }
            try {
                // Fetch event + attendee count (visible to all)
                const [{ data: ev, error }, { count }] = await Promise.all([
                    supabase.from('events').select('id, title, description, event_date, event_time, location, image_url, creator_name, creator_avatar_url, creator_id, activity_type, lat, lng, max_attendees').eq('id', id).single(),
                    supabase.from('event_attendees').select('user_id', { count: 'exact', head: true }).eq('event_id', id),
                ]);

                if (!error && ev) {
                    setEvent(ev);
                    setAttendeeCount(count || 0);

                    if (user) {
                        const { data: row } = await supabase
                            .from('event_attendees')
                            .select('user_id')
                            .eq('event_id', id)
                            .eq('user_id', user.id)
                            .single();
                        const isAttending = !!row;
                        setAttending(isAttending);

                        if (isAttending) {
                            await loadAttendeeData();
                        }
                    }
                } else {
                    setEvent(null);
                }
            } catch (err) {
                setLoadError('No se pudo cargar el evento. Intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, user]);

    const loadAttendeeData = async () => {
        // Fetch attendee user_ids then profiles
        const { data: rows } = await supabase
            .from('event_attendees')
            .select('user_id')
            .eq('event_id', id);

        if (rows && rows.length > 0) {
            const ids = rows.map(r => r.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url')
                .in('id', ids);
            setAttendees(profiles || []);
        } else {
            setAttendees([]);
        }

        // Check for group conversation
        const { data: groupConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('event_id', id)
            .eq('is_group', true)
            .maybeSingle();

        if (groupConv) {
            setGroupConvId(groupConv.id);
        }
    };

    const handleToggleAttend = async () => {
        if (!user || !event) return;
        setToggling(true);
        try {
            if (attending) {
                // Un-attend
                await supabase.from('event_attendees').delete().eq('event_id', event.id).eq('user_id', user.id);
                setAttending(false);
                setAttendees([]);
                setGroupConvId(null);
                // Remove from group participants
                if (groupConvId) {
                    await supabase.from('conversation_participants').delete()
                        .eq('conversation_id', groupConvId)
                        .eq('user_id', user.id);
                }
                setAttendeeCount(c => Math.max(0, c - 1));
            } else {
                // Attend
                await supabase.from('event_attendees').insert({ event_id: event.id, user_id: user.id });
                setAttending(true);
                setAttendeeCount(c => c + 1);

                // Find or create group conversation
                let convId = null;
                const { data: existingConv } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('is_group', true)
                    .maybeSingle();

                if (existingConv) {
                    convId = existingConv.id;
                } else {
                    const { data: newConv } = await supabase.from('conversations').insert({
                        is_group: true,
                        event_id: event.id,
                        group_name: event.title,
                        group_avatar_url: event.image_url || null,
                        last_message: '',
                        unread_count: 0,
                    }).select('id').single();
                    if (newConv) convId = newConv.id;
                }

                if (convId) {
                    setGroupConvId(convId);
                    // Add as participant (upsert with fallback)
                    const { error: upsertErr } = await supabase.from('conversation_participants')
                        .upsert({ conversation_id: convId, user_id: user.id }, { onConflict: 'conversation_id,user_id' });
                    if (upsertErr) {
                        // Fallback: try plain insert
                        await supabase.from('conversation_participants')
                            .insert({ conversation_id: convId, user_id: user.id });
                    }
                }

                await loadAttendeeData();
            }
        } catch (err) {
        }
        setToggling(false);
    };

    if (loading) return <div style={styles.container}><LoadingState /></div>;
    if (loadError) {
        return (
            <div style={styles.container}>
                <AppBar title="Evento" backTo="/home" />
                <div style={{ padding: '1rem' }}><ErrorBox message={loadError} /></div>
            </div>
        );
    }
    if (!event) {
        return (
            <div style={styles.container}>
                <AppBar title="Evento" backTo="/home" />
                <p style={styles.notFound}>No se encontró este evento.</p>
            </div>
        );
    }

    // ── Event status computation ──
    const eventDateObj = event.event_date ? new Date(event.event_date + 'T12:00:00') : null;
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);
    const isPastEvent = eventDateObj ? eventDateObj < todayNoon : false;
    const isToday = eventDateObj ? eventDateObj.toDateString() === todayNoon.toDateString() : false;
    const isFull = event.max_attendees && attendeeCount >= event.max_attendees && !attending;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Evento" backTo="/home" />

            <div style={styles.scrollArea}>
                <div style={styles.imageWrap}>
                    <img
                        src={event.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80'}
                        alt={event.title}
                        style={styles.image}
                        loading="lazy"
                    />
                </div>

                <div style={styles.body}>
                    {/* ── Info Card ── */}
                    <div style={styles.sectionCard}>
                        <div style={styles.creatorRow}>
                            <img src={getAvatarUrl(event.creator_avatar_url, event.creator_id)} alt="" style={styles.creatorAvatar} loading="lazy" />
                            <span style={styles.creatorName}>{event.creator_name} creó este evento</span>
                        </div>

                        <h1 style={styles.eventTitle}>{event.title}</h1>

                        {/* Status badge */}
                        <div style={{
                            ...styles.statusBadge,
                            backgroundColor: isPastEvent ? '#f5f5f5' : isToday ? '#fff3e0' : '#e8f5e9',
                            color: isPastEvent ? '#999' : isToday ? '#e65100' : '#2e7d32',
                        }}>
                            {isPastEvent ? 'Evento pasado' : isToday ? 'Hoy' : 'Próximo evento'}
                        </div>

                        {event.activity_type && event.activity_type !== 'evento' && (
                            <span style={styles.activityBadge}>{ACTIVITY_TYPE_LABELS[event.activity_type] || event.activity_type}</span>
                        )}

                        <div style={styles.meta}>
                            <div style={styles.metaItem}>
                                <Calendar size={18} color="var(--color-primary)" />
                                <span>{formatEventDate(event.event_date, true)}</span>
                            </div>
                            <div style={styles.metaItem}>
                                <Clock size={18} color="var(--color-primary)" />
                                <span>{formatTimeSlot(event.event_time)} hrs</span>
                            </div>
                            <div style={styles.metaItem}>
                                <MapPin size={18} color="var(--color-primary)" />
                                <span>{event.location}</span>
                            </div>
                            <div style={styles.metaItem}>
                                <Users size={18} color="var(--color-primary)" />
                                <span>
                                    {attendeeCount} asistente{attendeeCount !== 1 ? 's' : ''}
                                    {event.max_attendees ? ` / ${event.max_attendees} máx.` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Description Card ── */}
                    {event.description && (
                        <div style={styles.sectionCard}>
                            <p style={styles.description}>{event.description}</p>
                        </div>
                    )}

                    {/* ── Optional Map Card ── */}
                    {event.lat != null && event.lng != null && (
                        <div style={styles.sectionCard}>
                            <div style={styles.mapWrap}>
                                <MapContainer
                                    center={[Number(event.lat), Number(event.lng)]}
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
                                    <Marker position={[Number(event.lat), Number(event.lng)]}>
                                        <Popup>{event.location}</Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </div>
                    )}

                    {/* ── Action Card ── */}
                    <div style={styles.sectionCard}>
                        <button
                            style={{
                                ...styles.attendBtn,
                                ...(attending ? styles.attendBtnActive : {}),
                                ...(((isPastEvent && !attending) || isFull) ? styles.attendBtnDisabled : {}),
                            }}
                            onClick={handleToggleAttend}
                            disabled={toggling || (isPastEvent && !attending) || isFull}
                        >
                            {isFull
                                ? 'Evento lleno'
                                : isPastEvent && !attending
                                    ? 'Este evento ya pasó'
                                    : attending
                                        ? <><CheckCircle size={20} /> Ya me inscribí</>
                                        : 'Inscribirme a este evento'
                            }
                        </button>

                        {/* Group chat button — always visible for attendees */}
                        {attending && (
                            <button
                                style={styles.chatBtn}
                                onClick={async () => {
                                    if (groupConvId) {
                                        navigate(`/chat/${groupConvId}`);
                                        return;
                                    }
                                    const { data: existing } = await supabase
                                        .from('conversations').select('id')
                                        .eq('event_id', event.id).eq('is_group', true).maybeSingle();
                                    let convId = existing?.id;
                                    if (!convId) {
                                        const { data: created } = await supabase.from('conversations').insert({
                                            is_group: true, event_id: event.id,
                                            group_name: event.title, group_avatar_url: event.image_url || null,
                                            last_message: '', unread_count: 0,
                                        }).select('id').single();
                                        convId = created?.id;
                                    }
                                    if (convId) {
                                        await supabase.from('conversation_participants')
                                            .upsert({ conversation_id: convId, user_id: user.id }, { onConflict: 'conversation_id,user_id' });
                                        setGroupConvId(convId);
                                        navigate(`/chat/${convId}`);
                                    }
                                }}
                            >
                                <MessageCircle size={20} />
                                Chat del evento
                            </button>
                        )}
                    </div>

                    {/* ── Attendees Card ── */}
                    {attending && attendees.length > 0 && (
                        <div style={styles.sectionCard}>
                            <h3 style={styles.attendeesTitle}>Asistentes ({attendees.length})</h3>
                            <div style={styles.attendeesGrid}>
                                {attendees.map(a => (
                                    <div key={a.id} style={styles.attendeeItem} onClick={() => setSelectedAttendee(a.id)}>
                                        <img
                                            src={getAvatarUrl(a.avatar_url, a.id)}
                                            alt={a.display_name}
                                            style={styles.attendeeAvatar}
                                            loading="lazy"
                                        />
                                        <span style={styles.attendeeName}>
                                            {(a.display_name || 'Usuario').split(' ')[0]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Reviews Card ── */}
                    <div style={styles.sectionCard}>
                        {attending ? (
                            isPastEvent ? (
                                <ReviewSection entityType="event" entityId={id} />
                            ) : (
                                <>
                                    <p style={styles.reviewPendingMsg}>
                                        <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                        Podrás dejar tu reseña después del evento
                                    </p>
                                    <ReviewSection entityType="event" entityId={id} showForm={false} />
                                </>
                            )
                        ) : (
                            <ReviewSection entityType="event" entityId={id} showForm={false} />
                        )}
                    </div>
                </div>
            </div>

            {selectedAttendee && (
                <AttendeePreview userId={selectedAttendee} onClose={() => setSelectedAttendee(null)} />
            )}
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' },
    scrollArea: { flex: 1, overflowY: 'auto' },
    notFound: { padding: '2rem', color: 'var(--color-text-light)' },
    imageWrap: { width: '100%', height: 220, backgroundColor: '#e0e0e0' },
    image: { width: '100%', height: '100%', objectFit: 'cover' },
    body: { padding: '0.75rem 1rem', flex: 1 },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    },
    creatorRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
    creatorAvatar: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' },
    creatorName: { fontSize: '0.9rem', color: 'var(--color-text-light)', fontWeight: '600' },
    eventTitle: { fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.75rem 0', color: 'var(--color-text-dark)' },
    statusBadge: {
        display: 'inline-block',
        padding: '0.3rem 0.8rem',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
        marginRight: '0.5rem',
    },
    meta: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--color-text-dark)' },
    description: { fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-dark)', margin: 0 },
    mapWrap: { height: 180, borderRadius: '12px', overflow: 'hidden' },
    map: { height: '100%', width: '100%', borderRadius: '12px' },
    attendBtn: {
        width: '100%',
        padding: '1rem',
        borderRadius: '50px',
        border: 'none',
        backgroundColor: 'var(--color-social)',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
    },
    attendBtnActive: {
        backgroundColor: '#e8f5e9',
        color: 'var(--color-social)',
        border: '2px solid var(--color-social)',
    },
    attendBtnDisabled: {
        backgroundColor: '#e0e0e0',
        color: '#999',
        cursor: 'not-allowed',
    },
    activityBadge: {
        display: 'inline-block',
        padding: '0.3rem 0.8rem',
        borderRadius: '20px',
        backgroundColor: '#eefdf2',
        color: 'var(--color-social)',
        fontSize: '0.85rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
    },
    chatBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.9rem',
        borderRadius: '50px',
        border: '2px solid var(--color-primary)',
        backgroundColor: '#fff',
        color: 'var(--color-primary)',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '0.75rem',
    },
    attendeesTitle: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
        marginBottom: '0.75rem',
        margin: '0 0 0.75rem 0',
    },
    attendeesGrid: {
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        scrollbarWidth: 'none',
    },
    attendeeItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        cursor: 'pointer',
        minWidth: 64,
    },
    attendeeAvatar: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid #fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    attendeeName: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
        textAlign: 'center',
        maxWidth: 64,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    reviewPendingMsg: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        fontStyle: 'italic',
        marginBottom: '1rem',
        margin: '0 0 1rem 0',
        display: 'flex',
        alignItems: 'center',
    },
};

export default EventDetail;
