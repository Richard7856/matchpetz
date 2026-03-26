import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG } from '../constants/roles';
import SocialLinks from '../components/SocialLinks';
import ReviewSection from '../components/ReviewSection';
import LoadingState from '../components/LoadingState';

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [pets, setPets] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);
    const [postCount, setPostCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            const queries = [
                supabase.from('profiles').select('*').eq('id', id).single(),
                supabase.from('pets').select('id, name, species, breed, image_url').eq('owner_id', id),
                supabase.from('business_roles').select('*').eq('user_id', id).eq('status', 'approved'),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
                supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
                supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', id),
            ];
            if (user) {
                queries.push(supabase.from('user_follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle());
            }
            const results = await Promise.all(queries);
            setProfile(results[0].data);
            setPets(results[1].data || []);
            setRoles(results[2].data || []);
            setFollowerCount(results[3].count || 0);
            setFollowingCount(results[4].count || 0);
            setPostCount(results[5].count || 0);
            if (user) {
                setIsFollowing(!!results[6].data);
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
            // Notify the user being followed
            const displayName = authProfile?.display_name || 'Alguien';
            supabase.from('notifications').insert({
                user_id: id,
                type: 'message',
                title: `${displayName} te empezo a seguir`,
                body: '',
            });
        }
        setFollowLoading(false);
    };

    const handleSendMessage = async () => {
        if (!user || user.id === id) return;

        // Check if conversation already exists
        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${id}),and(user1_id.eq.${id},user2_id.eq.${user.id})`)
            .limit(1);

        if (existing && existing.length > 0) {
            navigate('/chat/' + existing[0].id);
            return;
        }

        // Create new conversation
        const { data: newConv, error } = await supabase.from('conversations').insert({
            user1_id: user.id,
            user2_id: id,
            participant_name: profile?.display_name || 'Usuario',
            participant_avatar: profile?.avatar_url || null,
            last_message: '',
            unread_count: 0,
        }).select().single();

        if (!error && newConv) {
            navigate('/chat/' + newConv.id);
        }
    };

    if (loading) return <div style={styles.loading}><LoadingState /></div>;
    if (!profile) return <div style={styles.loading}>Perfil no encontrado</div>;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Perfil" />

            <div style={styles.content}>
                <div style={styles.profileCard}>
                    <div style={styles.avatarSection}>
                        <img
                            src={getAvatarUrl(profile.avatar_url, profile.id)}
                            alt=""
                            style={styles.avatar}
                        />
                        <div style={{ flex: 1 }}>
                            <h3 style={styles.userName}>{profile.display_name || 'Usuario'}</h3>
                            {profile.location && <p style={styles.location}>{profile.location}</p>}
                            <SocialLinks
                                instagram={profile.instagram}
                                facebook={profile.facebook}
                                twitter={profile.twitter}
                                tiktok={profile.tiktok}
                            />
                        </div>
                    </div>

                    <div style={styles.btnRow}>
                        {user && user.id !== id && (
                            <button
                                style={isFollowing ? styles.followingBtn : styles.followBtn}
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                            >
                                {isFollowing ? <><UserCheck size={16} /> Siguiendo</> : <><UserPlus size={16} /> Seguir</>}
                            </button>
                        )}
                        <button style={styles.messageBtn} onClick={handleSendMessage}>
                            <MessageCircle size={18} />
                            Enviar mensaje
                        </button>
                    </div>

                    <div style={styles.statsRow}>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{postCount}</span>
                            <span style={styles.statLabel}>Posts</span>
                        </div>
                        <div style={styles.statDivider} />
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{followerCount}</span>
                            <span style={styles.statLabel}>Seguidores</span>
                        </div>
                        <div style={styles.statDivider} />
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{followingCount}</span>
                            <span style={styles.statLabel}>Siguiendo</span>
                        </div>
                    </div>
                </div>

                {pets.length > 0 && (
                    <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>Mascotas</h4>
                        {pets.map((pet) => (
                            <div key={pet.id} style={styles.petCard} onClick={() => navigate(`/pets/${pet.id}`)}>
                                <div style={{ ...styles.petImg, backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundColor: '#f0e6d3' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{pet.name}</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                                </div>
                                <ChevronRight size={20} color="var(--color-text-light)" />
                            </div>
                        ))}
                    </div>
                )}

                {roles.length > 0 && (
                    <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>Roles de Negocio</h4>
                        {roles.map((role) => {
                            const cfg = ROLE_CONFIG[role.role_type] || {};
                            const RoleIcon = cfg.Icon;
                            return (
                                <div key={role.id} style={styles.roleCard}>
                                    <div style={{ ...styles.roleIconBg, backgroundColor: cfg.color || '#f5f5f5' }}>
                                        {RoleIcon && <RoleIcon size={20} color="#555" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{role.business_name}</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>{cfg.label || role.role_type}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={styles.section}>
                    <ReviewSection entityType="profile" entityId={id} />
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' },
    content: { padding: '1.5rem', flex: 1, overflowY: 'auto' },
    profileCard: { backgroundColor: '#fff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '1.5rem' },
    avatarSection: { display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' },
    avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' },
    userName: { fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0.2rem' },
    location: { fontSize: '0.9rem', color: 'var(--color-text-light)', margin: '0 0 0.5rem' },
    statsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '1.25rem' },
    statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
    statValue: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-dark)' },
    statLabel: { fontSize: '0.8rem', color: 'var(--color-text-light)' },
    statDivider: { width: '1px', height: '30px', backgroundColor: '#f0f0f0' },
    section: { marginBottom: '1.5rem' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--color-text-dark)' },
    petCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '16px', marginBottom: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer' },
    petImg: { width: 48, height: 48, borderRadius: '12px', backgroundSize: 'cover', backgroundPosition: 'center' },
    roleCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '16px', marginBottom: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
    roleIconBg: { width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    btnRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.25rem',
    },
    followBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '0.8rem',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    followingBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        backgroundColor: '#f0f0f0',
        color: 'var(--color-text-dark)',
        border: 'none',
        padding: '0.8rem',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    messageBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '0.8rem',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
};

export default UserProfile;
