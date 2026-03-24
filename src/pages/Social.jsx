import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, MapPin, Search, Calendar, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import ErrorBox from '../components/ErrorBox';
import { formatEventDate } from '../utils/formatters';

const ACTIVITY_TYPE_LABELS = { paseo: 'Paseo', playdate: 'Playdate', entrenamiento: 'Entrenamiento', voluntariado: 'Voluntariado', otro: 'Otro' };

const Social = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('perfiles');
    const [profiles, setProfiles] = useState([]);
    const [events, setEvents] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [{ data: profilesData }, { data: eventsData }, { data: activitiesData }] = await Promise.all([
                    supabase.from('profiles').select('id, display_name, avatar_url, location, stats').limit(20),
                    supabase.from('events').select('id, title, event_date, event_time, location, image_url, activity_type').eq('activity_type', 'evento').order('event_date', { ascending: true }).limit(10),
                    supabase.from('events').select('id, title, event_date, event_time, location, image_url, activity_type').neq('activity_type', 'evento').order('event_date', { ascending: true }).limit(10),
                ]);
                setProfiles(profilesData || []);
                setEvents(eventsData || []);
                setActivities(activitiesData || []);
            } catch (err) {
                setLoadError('No se pudieron cargar los datos. Intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleConnect = async (e, targetUserId) => {
        e.stopPropagation();
        if (!user) return;

        // Check if conversation already exists between these two users
        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
            .limit(1);

        if (existing && existing.length > 0) {
            navigate('/chat/' + existing[0].id);
            return;
        }

        // Get target profile info
        const targetProfile = profiles.find(p => p.id === targetUserId);
        const { data: myProfile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();

        // Create new conversation
        const { data: newConv, error } = await supabase.from('conversations').insert({
            user1_id: user.id,
            user2_id: targetUserId,
            participant_name: targetProfile?.display_name || 'Usuario',
            participant_avatar: targetProfile?.avatar_url || null,
            last_message: '',
            unread_count: 0,
        }).select().single();

        if (!error && newConv) {
            navigate('/chat/' + newConv.id);
        }
    };

    return (
        <div style={styles.container} className="fade-in">
            <AppBar
                title="Modo Social"
                backTo="/home"
                rightAction={
                    <button style={{ background: 'none', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <Search size={24} color="var(--color-text-dark)" />
                    </button>
                }
            />

            <div style={styles.tabsContainer}>
                <button
                    style={{ ...styles.tabBtn, ...(activeTab === 'perfiles' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('perfiles')}
                >
                    Perfiles
                </button>
                <button
                    style={{ ...styles.tabBtn, ...(activeTab === 'eventos' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('eventos')}
                >
                    Eventos
                </button>
                <button
                    style={{ ...styles.tabBtn, ...(activeTab === 'actividades' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('actividades')}
                >
                    Actividades
                </button>
            </div>

            <div style={styles.contentArea}>
                {loadError ? (
                    <ErrorBox message={loadError} />
                ) : loading ? (
                    <LoadingState />
                ) : activeTab === 'perfiles' ? (
                    <div style={styles.feed}>
                        <div style={styles.filterSection}>
                        </div>
                        {profiles.length === 0 ? (
                            <p style={styles.emptyText}>No hay perfiles disponibles aún.</p>
                        ) : (
                            profiles.map(profile => (
                                <div key={profile.id} style={styles.profileCard} onClick={() => navigate(`/users/${profile.id}`)}>
                                    <img
                                        src={getAvatarUrl(profile.avatar_url, profile.id)}
                                        alt={profile.display_name}
                                        style={styles.profileImg}
                                        loading="lazy"
                                    />
                                    <div style={styles.profileInfo}>
                                        <div style={styles.cardHeader}>
                                            <h3 style={styles.petName}>{profile.display_name || 'Usuario'}</h3>
                                            {profile.location && (
                                                <span style={styles.distanceBadge}>
                                                    <MapPin size={12} style={{ marginRight: '2px' }} />
                                                    {profile.location}
                                                </span>
                                            )}
                                        </div>
                                        <p style={styles.breed}>
                                            {profile.stats?.pets || 0} mascotas · {profile.stats?.friends || 0} amigos
                                        </p>
                                        <p style={styles.activity}>
                                            {profile.stats?.impacts || 0} impactos en la comunidad
                                        </p>
                                        <button style={styles.connectBtn} onClick={(e) => handleConnect(e, profile.id)}>Conectar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : activeTab === 'eventos' ? (
                    <div style={styles.feed}>
                        {events.length === 0 ? (
                            <div style={styles.emptyEvents}>
                                <img
                                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80"
                                    alt="Dogs playing"
                                    style={styles.emptyImg}
                                    loading="lazy"
                                />
                                <h3>Sin eventos cercanos</h3>
                                <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
                                    No hay juntas de mascotas programadas esta semana.
                                </p>
                                <button style={styles.createEventBtn} onClick={() => navigate('/create-event')}>Crear un Evento</button>
                            </div>
                        ) : (
                            events.map(ev => (
                                <div key={ev.id} style={styles.eventCard} onClick={() => navigate(`/events/${ev.id}`)}>
                                    {ev.image_url && (
                                        <img src={ev.image_url} alt={ev.title} style={styles.eventImg} loading="lazy" />
                                    )}
                                    <div style={styles.eventInfo}>
                                        <h4 style={styles.eventTitle}>{ev.title}</h4>
                                        <div style={styles.eventMeta}>
                                            <Calendar size={14} color="var(--color-primary)" />
                                            <span style={styles.eventMetaText}>
                                                {formatEventDate(ev.event_date)} · {ev.event_time?.slice(0, 5)} hrs
                                            </span>
                                        </div>
                                        <div style={styles.eventMeta}>
                                            <MapPin size={14} color="var(--color-primary)" />
                                            <span style={styles.eventMetaText}>{ev.location}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <button style={styles.createEventBtn} onClick={() => navigate('/create-event')}>
                            + Crear nuevo evento
                        </button>
                    </div>
                ) : activeTab === 'actividades' ? (
                    <div style={styles.feed}>
                        {activities.length === 0 ? (
                            <p style={styles.emptyText}>No hay actividades propuestas aún.</p>
                        ) : (
                            activities.map(act => (
                                <div key={act.id} style={styles.eventCard} onClick={() => navigate(`/events/${act.id}`)}>
                                    {act.image_url && (
                                        <img src={act.image_url} alt={act.title} style={styles.eventImg} loading="lazy" />
                                    )}
                                    <div style={styles.eventInfo}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h4 style={styles.eventTitle}>{act.title}</h4>
                                            <span style={styles.activityBadge}>{ACTIVITY_TYPE_LABELS[act.activity_type] || act.activity_type}</span>
                                        </div>
                                        <div style={styles.eventMeta}>
                                            <Calendar size={14} color="var(--color-primary)" />
                                            <span style={styles.eventMetaText}>
                                                {formatEventDate(act.event_date)} · {act.event_time?.slice(0, 5)} hrs
                                            </span>
                                        </div>
                                        <div style={styles.eventMeta}>
                                            <MapPin size={14} color="var(--color-primary)" />
                                            <span style={styles.eventMetaText}>{act.location}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <button style={styles.createEventBtn} onClick={() => navigate('/activities/new')}>
                            + Proponer actividad
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
    },
    tabsContainer: {
        display: 'flex',
        backgroundColor: '#fff',
        padding: '0 1rem',
        borderBottom: '1px solid #eee'
    },
    tabBtn: {
        flex: 1,
        background: 'none',
        border: 'none',
        padding: '1rem',
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        cursor: 'pointer',
        borderRadius: 0,
        borderBottom: '3px solid transparent'
    },
    activeTab: {
        color: 'var(--color-social)',
        borderBottom: '3px solid var(--color-social)'
    },
    contentArea: {
        flex: 1,
        padding: '1rem',
        overflowY: 'auto'
    },
    loadingText: { color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' },
    emptyText: { color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' },
    feed: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        paddingBottom: '2rem'
    },
    filterSection: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '0.5rem'
    },
    filterBtn: {
        background: '#eefdf2',
        color: 'var(--color-social)',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: 'auto',
        cursor: 'pointer'
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column'
    },
    profileImg: {
        width: '100%',
        height: '200px',
        objectFit: 'cover'
    },
    profileInfo: {
        padding: '1.2rem'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.2rem'
    },
    petName: {
        fontSize: '1.4rem',
        fontWeight: 'bold',
        margin: 0
    },
    distanceBadge: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        padding: '0.3rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
        fontWeight: '600'
    },
    breed: {
        fontSize: '0.9rem',
        color: 'var(--color-social)',
        fontWeight: '600',
        marginBottom: '0.4rem'
    },
    activity: {
        fontSize: '0.95rem',
        color: 'var(--color-text-dark)',
        marginBottom: '1rem',
        lineHeight: 1.4
    },
    connectBtn: {
        width: '100%',
        backgroundColor: 'var(--color-social)',
        color: '#fff',
        border: 'none',
        padding: '0.8rem',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 'bold',
    },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        cursor: 'pointer',
    },
    eventImg: {
        width: '100%',
        height: '140px',
        objectFit: 'cover',
    },
    eventInfo: {
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    eventTitle: {
        fontSize: '1rem',
        fontWeight: 'bold',
        margin: 0,
        color: 'var(--color-text-dark)',
    },
    eventMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
    eventMetaText: {
        fontSize: '0.85rem',
        color: 'var(--color-text-light)',
    },
    emptyEvents: {
        textAlign: 'center',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyImg: {
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        objectFit: 'cover',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
    },
    createEventBtn: {
        backgroundColor: 'var(--color-social)',
        color: '#fff',
        width: 'auto',
        padding: '1rem 2rem',
        borderRadius: '50px',
        marginTop: '1rem',
        alignSelf: 'center',
    },
    activityBadge: {
        padding: '0.2rem 0.6rem',
        borderRadius: '12px',
        backgroundColor: '#eefdf2',
        color: 'var(--color-social)',
        fontSize: '0.75rem',
        fontWeight: '600',
        flexShrink: 0,
    },
};

export default Social;
