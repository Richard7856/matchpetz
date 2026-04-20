import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    MessageCircle, UserPlus, UserCheck, MapPin,
    Calendar, ShoppingBag, Grid3x3, ChevronRight,
} from 'lucide-react';
import { Heart, PawPrint, StorefrontIcon, Storefront } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG } from '../constants/roles';
import SocialLinks from '../components/SocialLinks';
import ReviewSection from '../components/ReviewSection';
import LoadingState from '../components/LoadingState';
import { formatEventDate } from '../utils/formatters';

/**
 * UserProfile — vista del perfil de otro usuario.
 * Rediseño: header Instagram + tabs Posts / Mascotas / Eventos / Tienda.
 */
const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();

    const [profile, setProfile] = useState(null);
    const [pets, setPets] = useState([]);
    const [roles, setRoles] = useState([]);
    const [posts, setPosts] = useState([]);
    const [events, setEvents] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

    useEffect(() => {
        const load = async () => {
            const [
                profileRes, petsRes, rolesRes,
                followersRes, followingRes,
                postsRes, eventsRes, productsRes,
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', id).single(),
                supabase.from('pets').select('id, name, species, breed, gender, image_url, images').eq('owner_id', id).limit(12),
                supabase.from('business_roles').select('*').eq('user_id', id).eq('status', 'approved'),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
                supabase.from('posts').select('id, image_url, caption, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
                supabase.from('events').select('id, title, event_date, image_url, location').eq('creator_id', id).order('event_date', { ascending: false }).limit(10),
                supabase.from('marketplace_products').select('id, title, price, images').eq('seller_id', id).eq('is_active', true).limit(12),
            ]);

            setProfile(profileRes.data);
            setPets(petsRes.data || []);
            setRoles(rolesRes.data || []);
            setFollowerCount(followersRes.count || 0);
            setFollowingCount(followingRes.count || 0);
            setPosts(postsRes.data || []);
            setEvents(eventsRes.data || []);
            setProducts(productsRes.data || []);

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
    const hasStore = products.length > 0;

    // Tabs dinámicos: siempre Posts y Mascotas, condicional Eventos y Tienda
    const TABS = [
        { key: 'posts',    label: 'Posts',    icon: <Grid3x3 size={16} /> },
        { key: 'mascotas', label: 'Mascotas', icon: <PawPrint size={16} weight="fill" /> },
        ...(events.length > 0   ? [{ key: 'eventos', label: 'Eventos', icon: <Calendar size={16} /> }] : []),
        ...(hasStore             ? [{ key: 'tienda',  label: 'Tienda',  icon: <Storefront size={16} weight="fill" /> }] : []),
    ];

    // ── Header gradient — usa colores de la marca ──────────────────────────
    const bannerGradient = profile.cover_url
        ? `url(${profile.cover_url})`
        : 'linear-gradient(135deg, #ee9d2b 0%, #f472b6 60%, #a855f7 100%)';

    return (
        <div style={s.container} className="fade-in">
            <AppBar title={profile.display_name || 'Perfil'} />

            {/* ── Banner + avatar ── */}
            <div style={{ ...s.banner, background: bannerGradient }} />

            <div style={s.avatarWrap}>
                <div style={s.avatarRing}>
                    <img src={getAvatarUrl(profile.avatar_url, profile.id)} alt="" style={s.avatar} />
                </div>
            </div>

            <div style={s.content}>
                {/* ── Info principal ── */}
                <div style={s.nameBlock}>
                    <h2 style={s.userName}>{profile.display_name || 'Usuario'}</h2>
                    {profile.location && (
                        <div style={s.locationRow}>
                            <MapPin size={13} color="#9ca3af" />
                            <span style={s.locationText}>{profile.location}</span>
                        </div>
                    )}
                    {profile.bio && <p style={s.bio}>{profile.bio}</p>}

                    {/* Roles de negocio como badges */}
                    {roles.length > 0 && (
                        <div style={s.roleBadges}>
                            {roles.map(r => {
                                const cfg = ROLE_CONFIG[r.role_type] || {};
                                return (
                                    <span key={r.id} style={{ ...s.roleBadge, backgroundColor: cfg.color + '22', color: cfg.color || '#666' }}>
                                        {cfg.label || r.role_type}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Stats ── */}
                <div style={s.statsRow}>
                    <div style={s.statBox}>
                        <span style={s.statValue}>{posts.length}</span>
                        <span style={s.statLabel}>Posts</span>
                    </div>
                    <div style={s.statDivider} />
                    <div style={s.statBox}>
                        <span style={s.statValue}>{followerCount}</span>
                        <span style={s.statLabel}>Seguidores</span>
                    </div>
                    <div style={s.statDivider} />
                    <div style={s.statBox}>
                        <span style={s.statValue}>{followingCount}</span>
                        <span style={s.statLabel}>Siguiendo</span>
                    </div>
                    {pets.length > 0 && <>
                        <div style={s.statDivider} />
                        <div style={s.statBox}>
                            <span style={s.statValue}>{pets.length}</span>
                            <span style={s.statLabel}>Mascotas</span>
                        </div>
                    </>}
                </div>

                {/* ── Social links ── */}
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

                {/* ── Botones de acción ── */}
                {!isSelf && (
                    <div style={s.btnRow}>
                        <button
                            style={isFollowing ? s.followingBtn : s.followBtn}
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                        >
                            {isFollowing
                                ? <><UserCheck size={16} /> Siguiendo</>
                                : <><UserPlus size={16} /> Seguir</>}
                        </button>
                        <button style={s.msgBtn} onClick={handleSendMessage}>
                            <MessageCircle size={16} />
                            Mensaje
                        </button>
                    </div>
                )}

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

                {/* ── Tab: Posts ── */}
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

                {/* ── Tab: Mascotas ── */}
                {activeTab === 'mascotas' && (
                    pets.length === 0
                        ? <Empty text="Sin mascotas registradas" />
                        : <div style={s.petGrid}>
                            {pets.map(pet => {
                                const img = pet.images?.[0] || pet.image_url || '';
                                return (
                                    <div key={pet.id} style={s.petCard} onClick={() => navigate(`/pets/${pet.id}`)}>
                                        <div style={{ ...s.petImg, backgroundImage: img ? `url(${img})` : 'none' }} />
                                        <div style={s.petInfo}>
                                            <span style={s.petName}>{pet.name}</span>
                                            <span style={s.petBreed}>{pet.breed || pet.species || ''}</span>
                                            {pet.gender && <span style={s.petGender}>{pet.gender}</span>}
                                        </div>
                                        <ChevronRight size={16} color="#ccc" />
                                    </div>
                                );
                            })}
                        </div>
                )}

                {/* ── Tab: Eventos ── */}
                {activeTab === 'eventos' && (
                    events.length === 0
                        ? <Empty text="Sin eventos creados" />
                        : <div style={s.eventList}>
                            {events.map(ev => (
                                <div key={ev.id} style={s.eventCard} onClick={() => navigate(`/events/${ev.id}`)}>
                                    {ev.image_url && (
                                        <img src={ev.image_url} alt={ev.title} style={s.eventImg} loading="lazy" />
                                    )}
                                    <div style={s.eventInfo}>
                                        <span style={s.eventTitle}>{ev.title}</span>
                                        <div style={s.eventMeta}>
                                            <Calendar size={12} color="#9ca3af" />
                                            <span>{formatEventDate(ev.event_date)}</span>
                                        </div>
                                        {ev.location && (
                                            <div style={s.eventMeta}>
                                                <MapPin size={12} color="#9ca3af" />
                                                <span>{ev.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} color="#ccc" />
                                </div>
                            ))}
                        </div>
                )}

                {/* ── Tab: Tienda ── */}
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
                                            <span style={s.productName}>{p.title}</span>
                                            <span style={s.productPrice}>${p.price?.toLocaleString('es-MX')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                )}

                {/* ── Reseñas — siempre al fondo ── */}
                <div style={{ marginTop: '1.5rem' }}>
                    <ReviewSection entityType="profile" entityId={id} />
                </div>
            </div>
        </div>
    );
};

// Pequeño componente de estado vacío para los tabs
const Empty = ({ text }) => (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af', fontSize: '0.9rem' }}>
        {text}
    </div>
);

const BANNER_H = 120;
const AVATAR_D = 88;
const AVATAR_OFFSET = AVATAR_D / 2; // cuánto sube el avatar sobre el banner

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
    // ── Banner ──
    banner: {
        height: BANNER_H,
        width: '100%',
        flexShrink: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    // ── Avatar flotando sobre el banner ──
    avatarWrap: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: -(AVATAR_OFFSET),
        marginBottom: 4,
        position: 'relative',
        zIndex: 2,
    },
    avatarRing: {
        width: AVATAR_D + 8,
        height: AVATAR_D + 8,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ee9d2b, #f472b6)',
        padding: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    },
    avatar: {
        width: '100%', height: '100%',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid #fff',
    },
    content: {
        flex: 1,
        padding: '0 1rem 2rem',
        display: 'flex',
        flexDirection: 'column',
    },
    // ── Info ──
    nameBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        marginBottom: '1rem',
        textAlign: 'center',
    },
    userName: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    locationRow: {
        display: 'flex', alignItems: 'center', gap: '0.25rem',
    },
    locationText: {
        fontSize: '0.82rem',
        color: '#9ca3af',
    },
    bio: {
        fontSize: '0.88rem',
        color: 'var(--color-text-light)',
        lineHeight: 1.5,
        maxWidth: 320,
        margin: '0.25rem 0 0',
    },
    roleBadges: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
        justifyContent: 'center',
        marginTop: '0.35rem',
    },
    roleBadge: {
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 20,
    },
    // ── Stats ──
    statsRow: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: '0.85rem 0.5rem',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    },
    statBox: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: '1.15rem', fontWeight: 800,
        color: 'var(--color-text-dark)', lineHeight: 1,
    },
    statLabel: {
        fontSize: '0.72rem', color: '#9ca3af', marginTop: 3,
    },
    statDivider: {
        width: 1, height: 28, backgroundColor: '#f0f0f0',
    },
    // ── Social links ──
    socialWrap: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '0.75rem',
    },
    // ── Action buttons ──
    btnRow: {
        display: 'flex', gap: '0.5rem',
        marginBottom: '1rem',
    },
    followBtn: {
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        backgroundColor: 'var(--color-primary)', color: '#fff',
        border: 'none', padding: '0.75rem', borderRadius: 14,
        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    followingBtn: {
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        backgroundColor: '#f0f0f0', color: 'var(--color-text-dark)',
        border: 'none', padding: '0.75rem', borderRadius: 14,
        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    msgBtn: {
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        backgroundColor: '#fff', color: 'var(--color-primary)',
        border: '2px solid var(--color-primary)', padding: '0.75rem', borderRadius: 14,
        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    // ── Tabs ──
    tabBar: {
        display: 'flex',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: '0.25rem',
        gap: '0.2rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    tab: {
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
        padding: '0.55rem 0.25rem',
        borderRadius: 10,
        border: 'none', background: 'none',
        fontSize: '0.75rem', fontWeight: 600,
        color: 'var(--color-text-light)',
        cursor: 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap',
    },
    tabActive: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
    },
    // ── Posts grid — 3 columnas tipo Instagram ──
    postGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2,
        borderRadius: 14,
        overflow: 'hidden',
    },
    postCell: {
        aspectRatio: '1',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f0f0f0',
        cursor: 'pointer',
    },
    // ── Mascotas grid ──
    petGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    petCard: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        backgroundColor: '#fff', padding: '0.65rem 0.85rem',
        borderRadius: 16, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    petImg: {
        width: 52, height: 52, borderRadius: 12,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#f0e6d3', flexShrink: 0,
    },
    petInfo: {
        flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
    },
    petName: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-dark)' },
    petBreed: { fontSize: '0.78rem', color: '#9ca3af' },
    petGender: {
        fontSize: '0.68rem', fontWeight: 600,
        backgroundColor: '#f3f4f6', color: '#6b7280',
        padding: '1px 7px', borderRadius: 8, alignSelf: 'flex-start',
    },
    // ── Eventos list ──
    eventList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    eventCard: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        backgroundColor: '#fff', borderRadius: 16,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    eventImg: {
        width: 68, height: 68, objectFit: 'cover', flexShrink: 0,
    },
    eventInfo: {
        flex: 1, display: 'flex', flexDirection: 'column', gap: 3,
        padding: '0.6rem 0', minWidth: 0,
    },
    eventTitle: {
        fontSize: '0.9rem', fontWeight: 700,
        color: 'var(--color-text-dark)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    eventMeta: {
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.75rem', color: '#9ca3af',
    },
    // ── Tienda grid ──
    productGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem',
    },
    productCard: {
        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
    productName: {
        fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-dark)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    productPrice: {
        fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-primary)',
    },
};

export default UserProfile;
