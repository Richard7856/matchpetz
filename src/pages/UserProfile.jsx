import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    MessageCircle, UserPlus, UserCheck, MapPin,
    Calendar, Grid3x3, ChevronRight, Heart as HeartLucide,
} from 'lucide-react';
import { PawPrint, Storefront } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG } from '../constants/roles';
import SocialLinks from '../components/SocialLinks';
import LoadingState from '../components/LoadingState';
import { formatEventDate } from '../utils/formatters';

/**
 * UserProfile — perfil de otro usuario.
 * Header limpio con avatar + info, stats, botones compactos,
 * tabs: Posts · Mascotas · Adopción · Eventos · Tienda.
 * Sin reseñas — la interacción es a través de posts y chat.
 */
const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();

    const [profile, setProfile]         = useState(null);
    const [pets, setPets]               = useState([]);
    const [adoptionPets, setAdoptionPets] = useState([]);
    const [roles, setRoles]             = useState([]);
    const [posts, setPosts]             = useState([]);
    const [events, setEvents]           = useState([]);
    const [products, setProducts]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount]   = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading]   = useState(false);
    const [activeTab, setActiveTab]     = useState('posts');

    useEffect(() => {
        const load = async () => {
            const [
                profileRes, petsRes, rolesRes,
                followersRes, followingRes,
                postsRes, eventsRes, productsRes, adoptionRes,
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', id).single(),
                supabase.from('pets').select('id, name, species, breed, gender, image_url, images').eq('owner_id', id).limit(12),
                supabase.from('business_roles').select('*').eq('user_id', id).eq('status', 'approved'),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
                supabase.from('posts').select('id, image_url, caption, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
                supabase.from('events').select('id, title, event_date, image_url, location').eq('creator_id', id).order('event_date', { ascending: false }).limit(10),
                supabase.from('marketplace_products').select('id, title, price, images').eq('seller_id', id).eq('is_active', true).limit(12),
                supabase.from('adoption_pets').select('id, name, age, type, breed, image_url, images, location').eq('user_id', id).eq('status', 'disponible').limit(10),
            ]);

            setProfile(profileRes.data);
            setPets(petsRes.data || []);
            setRoles(rolesRes.data || []);
            setFollowerCount(followersRes.count || 0);
            setFollowingCount(followingRes.count || 0);
            setPosts(postsRes.data || []);
            setEvents(eventsRes.data || []);
            setProducts(productsRes.data || []);
            setAdoptionPets(adoptionRes.data || []);

            if (user) {
                const { data: followRow } = await supabase
                    .from('user_follows').select('id')
                    .eq('follower_id', user.id).eq('following_id', id).maybeSingle();
                setIsFollowing(!!followRow);
            }
            setLoading(false);
        };
        load();
    }, [id, user]);

    const handleFollowToggle = async () => {
        if (!user || user.id === id || followLoading) return;
        setFollowLoading(true);
        if (isFollowing) {
            await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', id);
            setIsFollowing(false);
            setFollowerCount(c => Math.max(0, c - 1));
        } else {
            await supabase.from('user_follows').insert({ follower_id: user.id, following_id: id });
            setIsFollowing(true);
            setFollowerCount(c => c + 1);
            supabase.from('notifications').insert({
                user_id: id, type: 'message',
                title: `${authProfile?.display_name || 'Alguien'} te empezó a seguir`, body: '',
            });
        }
        setFollowLoading(false);
    };

    const handleSendMessage = async () => {
        if (!user || user.id === id) return;
        const { data: existing } = await supabase
            .from('conversations').select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${id}),and(user1_id.eq.${id},user2_id.eq.${user.id})`)
            .limit(1);
        if (existing?.length > 0) { navigate('/chat/' + existing[0].id); return; }
        const { data: newConv, error } = await supabase.from('conversations').insert({
            user1_id: user.id, user2_id: id,
            participant_name: profile?.display_name || 'Usuario',
            participant_avatar: profile?.avatar_url || null,
            last_message: '', unread_count: 0,
        }).select().single();
        if (!error && newConv) navigate('/chat/' + newConv.id);
    };

    if (loading) return <div style={s.loading}><LoadingState /></div>;
    if (!profile) return <div style={s.loading}>Perfil no encontrado</div>;

    const isSelf = user?.id === id;

    const TABS = [
        { key: 'posts',    label: 'Posts',     icon: <Grid3x3 size={14} /> },
        { key: 'mascotas', label: 'Mascotas',  icon: <PawPrint size={14} weight="fill" /> },
        ...(adoptionPets.length > 0 ? [{ key: 'adopcion', label: 'Adopción', icon: <HeartLucide size={14} /> }] : []),
        ...(events.length > 0       ? [{ key: 'eventos',  label: 'Eventos',  icon: <Calendar size={14} /> }] : []),
        ...(products.length > 0     ? [{ key: 'tienda',   label: 'Tienda',   icon: <Storefront size={14} weight="fill" /> }] : []),
    ];

    return (
        <div style={s.container} className="fade-in">
            <AppBar title={profile.display_name || 'Perfil'} />

            {/* ── Header card: avatar + info + stats + botones ── */}
            <div style={s.headerCard}>

                {/* Avatar + nombre lado a lado */}
                <div style={s.avatarRow}>
                    <div style={s.avatarRing}>
                        <img src={getAvatarUrl(profile.avatar_url, profile.id)} alt="" style={s.avatar} />
                    </div>
                    <div style={s.nameBlock}>
                        <h2 style={s.userName}>{profile.display_name || 'Usuario'}</h2>
                        {profile.location && (
                            <div style={s.locationRow}>
                                <MapPin size={12} color="#9ca3af" />
                                <span style={s.locationText}>{profile.location}</span>
                            </div>
                        )}
                        {/* Roles como badges pequeños */}
                        {roles.length > 0 && (
                            <div style={s.roleBadges}>
                                {roles.map(r => {
                                    const cfg = ROLE_CONFIG[r.role_type] || {};
                                    return (
                                        <span key={r.id} style={{ ...s.roleBadge, backgroundColor: (cfg.color || '#888') + '22', color: cfg.color || '#666' }}>
                                            {cfg.label || r.role_type}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {profile.bio && <p style={s.bio}>{profile.bio}</p>}

                {/* Stats inline */}
                <div style={s.statsRow}>
                    {[
                        { v: posts.length,    l: 'Posts' },
                        { v: followerCount,   l: 'Seguidores' },
                        { v: followingCount,  l: 'Siguiendo' },
                        ...(pets.length > 0 ? [{ v: pets.length, l: 'Mascotas' }] : []),
                    ].map((item, i, arr) => (
                        <React.Fragment key={item.l}>
                            <div style={s.statBox}>
                                <span style={s.statValue}>{item.v}</span>
                                <span style={s.statLabel}>{item.l}</span>
                            </div>
                            {i < arr.length - 1 && <div style={s.statDivider} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Redes sociales */}
                {(profile.instagram || profile.facebook || profile.twitter || profile.tiktok) && (
                    <div style={s.socialWrap}>
                        <SocialLinks
                            instagram={profile.instagram}
                            facebook={profile.facebook}
                            twitter={profile.twitter}
                            tiktok={profile.tiktok}
                        />
                    </div>
                )}

                {/* Botones — solo si no es el propio usuario */}
                {!isSelf && (
                    <div style={s.btnRow}>
                        <button
                            style={isFollowing ? s.followingBtn : s.followBtn}
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                        >
                            {isFollowing
                                ? <><UserCheck size={15} /> Siguiendo</>
                                : <><UserPlus size={15} /> Seguir</>}
                        </button>
                        <button style={s.msgBtn} onClick={handleSendMessage}>
                            <MessageCircle size={15} />
                            Mensaje
                        </button>
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div style={s.tabBar}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.icon}
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Contenido del tab activo ── */}
            <div style={s.tabContent}>

                {/* Posts — grid 3 col tipo Instagram */}
                {activeTab === 'posts' && (
                    posts.length === 0
                        ? <Empty text="Sin publicaciones aún" />
                        : <div style={s.postGrid}>
                            {posts.map(p => (
                                <div
                                    key={p.id}
                                    style={{ ...s.postCell, backgroundImage: `url(${p.image_url})` }}
                                />
                            ))}
                        </div>
                )}

                {/* Mascotas */}
                {activeTab === 'mascotas' && (
                    pets.length === 0
                        ? <Empty text="Sin mascotas registradas" />
                        : <div style={s.listCol}>
                            {pets.map(pet => {
                                const img = pet.images?.[0] || pet.image_url || '';
                                return (
                                    <div key={pet.id} style={s.listCard} onClick={() => navigate(`/pets/${pet.id}`)}>
                                        <div style={{ ...s.listThumb, backgroundImage: img ? `url(${img})` : 'none' }} />
                                        <div style={s.listInfo}>
                                            <span style={s.listTitle}>{pet.name}</span>
                                            <span style={s.listSub}>{pet.breed || pet.species || ''}</span>
                                            {pet.gender && <span style={s.chip}>{pet.gender}</span>}
                                        </div>
                                        <ChevronRight size={16} color="#d1d5db" />
                                    </div>
                                );
                            })}
                        </div>
                )}

                {/* Adopción */}
                {activeTab === 'adopcion' && (
                    adoptionPets.length === 0
                        ? <Empty text="Sin mascotas en adopción" />
                        : <div style={s.adoptGrid}>
                            {adoptionPets.map(p => {
                                const img = p.images?.[0] || p.image_url || '';
                                return (
                                    <div key={p.id} style={s.adoptCard} onClick={() => navigate(`/adoption/${p.id}`)}>
                                        <div style={{ ...s.adoptImg, backgroundImage: img ? `url(${img})` : 'none' }} />
                                        <div style={s.adoptInfo}>
                                            <span style={s.listTitle}>{p.name}</span>
                                            <span style={s.listSub}>{p.breed || p.type}</span>
                                            {p.age && <span style={{ ...s.chip, backgroundColor: '#e8f5e9', color: '#388e3c' }}>{p.age}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                )}

                {/* Eventos */}
                {activeTab === 'eventos' && (
                    events.length === 0
                        ? <Empty text="Sin eventos creados" />
                        : <div style={s.listCol}>
                            {events.map(ev => (
                                <div key={ev.id} style={s.listCard} onClick={() => navigate(`/events/${ev.id}`)}>
                                    {ev.image_url
                                        ? <img src={ev.image_url} alt={ev.title} style={s.listThumb} loading="lazy" />
                                        : <div style={{ ...s.listThumb, backgroundColor: '#fff8ee' }} />}
                                    <div style={s.listInfo}>
                                        <span style={s.listTitle}>{ev.title}</span>
                                        <div style={s.metaRow}>
                                            <Calendar size={11} color="#9ca3af" />
                                            <span style={s.listSub}>{formatEventDate(ev.event_date)}</span>
                                        </div>
                                        {ev.location && (
                                            <div style={s.metaRow}>
                                                <MapPin size={11} color="#9ca3af" />
                                                <span style={s.listSub}>{ev.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} color="#d1d5db" />
                                </div>
                            ))}
                        </div>
                )}

                {/* Tienda */}
                {activeTab === 'tienda' && (
                    products.length === 0
                        ? <Empty text="Sin productos disponibles" />
                        : <div style={s.productGrid}>
                            {products.map(p => {
                                const img = p.images?.[0] || '';
                                return (
                                    <div key={p.id} style={s.productCard} onClick={() => navigate(`/products/${p.id}`)}>
                                        <div style={{ ...s.productImg, backgroundImage: img ? `url(${img})` : 'none' }} />
                                        <div style={s.productInfo}>
                                            <span style={s.listTitle}>{p.title}</span>
                                            <span style={s.productPrice}>${p.price?.toLocaleString('es-MX')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                )}
            </div>
        </div>
    );
};

const Empty = ({ text }) => (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af', fontSize: '0.88rem' }}>
        {text}
    </div>
);

const s = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-soft, #f5f5f5)',
    },
    loading: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--color-text-light)',
    },

    // ── Header card blanca: todo el info del usuario ──
    headerCard: {
        backgroundColor: '#fff',
        margin: '0.75rem 0.9rem 0',
        borderRadius: 20,
        padding: '1rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },

    // Avatar + nombre lado a lado (como en Comunidad/eventCard)
    avatarRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
    },
    avatarRing: {
        width: 68, height: 68,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ee9d2b, #f472b6)',
        padding: 2.5,
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(238,157,43,0.25)',
    },
    avatar: {
        width: '100%', height: '100%',
        borderRadius: '50%', objectFit: 'cover',
        border: '2px solid #fff',
    },
    nameBlock: {
        flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
    },
    userName: {
        fontSize: '1.1rem', fontWeight: 800,
        color: 'var(--color-text-dark)', margin: 0,
    },
    locationRow: {
        display: 'flex', alignItems: 'center', gap: '0.2rem',
    },
    locationText: {
        fontSize: '0.78rem', color: '#9ca3af',
    },
    roleBadges: {
        display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: 2,
    },
    roleBadge: {
        fontSize: '0.65rem', fontWeight: 700,
        padding: '2px 8px', borderRadius: 20,
    },
    bio: {
        fontSize: '0.83rem', color: 'var(--color-text-light)',
        lineHeight: 1.45, margin: 0,
    },

    // Stats
    statsRow: {
        display: 'flex', alignItems: 'center',
        borderTop: '1px solid #f5f5f5',
        paddingTop: '0.65rem',
    },
    statBox: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
    },
    statValue: {
        fontSize: '1rem', fontWeight: 800,
        color: 'var(--color-text-dark)', lineHeight: 1,
    },
    statLabel: {
        fontSize: '0.66rem', color: '#9ca3af', marginTop: 2,
    },
    statDivider: {
        width: 1, height: 20, backgroundColor: '#f0f0f0',
    },

    // Social
    socialWrap: {
        display: 'flex', justifyContent: 'flex-start',
    },

    // Botones — mismo tamaño que los chips de Comunidad
    btnRow: {
        display: 'flex', gap: '0.5rem',
    },
    followBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        backgroundColor: 'var(--color-primary)', color: '#fff',
        border: 'none', padding: '0.5rem 1.1rem', borderRadius: 20,
        fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 2px 8px rgba(238,157,43,0.3)',
    },
    followingBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        backgroundColor: '#f5f5f5', color: '#6b7280',
        border: '1.5px solid #e5e7eb', padding: '0.5rem 1.1rem', borderRadius: 20,
        fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    // Mensaje — gris oscuro para diferenciarlo del follow naranja
    msgBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        backgroundColor: '#1f2937', color: '#fff',
        border: 'none', padding: '0.5rem 1.1rem', borderRadius: 20,
        fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },

    // ── Tab bar — fuera de la card, mismo estilo que Comunidad ──
    tabBar: {
        display: 'flex',
        gap: '0.35rem',
        padding: '0.75rem 0.9rem 0',
        overflowX: 'auto',
        scrollbarWidth: 'none',
    },
    tab: {
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.42rem 0.85rem',
        borderRadius: 20,
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        fontSize: '0.78rem', fontWeight: 600,
        color: 'var(--color-text-light)',
        cursor: 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap', flexShrink: 0,
    },
    tabActive: {
        backgroundColor: 'var(--color-primary)',
        borderColor: 'var(--color-primary)',
        color: '#fff',
    },
    tabContent: {
        padding: '0.75rem 0.9rem 2rem',
    },

    // ── Posts grid 3 col ──
    postGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2, borderRadius: 14, overflow: 'hidden',
    },
    postCell: {
        aspectRatio: '1',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#f0f0f0', cursor: 'pointer',
    },

    // ── Lista genérica (mascotas, eventos) ──
    listCol: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    listCard: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        backgroundColor: '#fff', padding: '0.6rem 0.75rem',
        borderRadius: 16, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    listThumb: {
        width: 52, height: 52, borderRadius: 12,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#f0f0f0', flexShrink: 0,
        objectFit: 'cover',
    },
    listInfo: {
        flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
    },
    listTitle: {
        fontSize: '0.9rem', fontWeight: 700,
        color: 'var(--color-text-dark)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    listSub: { fontSize: '0.75rem', color: '#9ca3af' },
    chip: {
        fontSize: '0.65rem', fontWeight: 700,
        backgroundColor: '#f3f4f6', color: '#6b7280',
        padding: '1px 7px', borderRadius: 8,
        alignSelf: 'flex-start',
    },
    metaRow: {
        display: 'flex', alignItems: 'center', gap: '0.25rem',
    },

    // ── Adopción grid 2 col ──
    adoptGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem',
    },
    adoptCard: {
        backgroundColor: '#fff', borderRadius: 16,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    adoptImg: {
        width: '100%', aspectRatio: '1',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#f5f5f5',
    },
    adoptInfo: {
        padding: '0.5rem 0.65rem 0.65rem',
        display: 'flex', flexDirection: 'column', gap: 3,
    },

    // ── Tienda ──
    productGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem',
    },
    productCard: {
        backgroundColor: '#fff', borderRadius: 16,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    productImg: {
        width: '100%', aspectRatio: '1',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#f5f5f5',
    },
    productInfo: {
        padding: '0.5rem 0.65rem 0.65rem',
        display: 'flex', flexDirection: 'column', gap: 2,
    },
    productPrice: {
        fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-primary)',
    },
};

export default UserProfile;
