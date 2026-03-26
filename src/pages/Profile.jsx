import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronRight, Heart, Trash2, Plus, PawPrint, Camera, Lock, Grid3X3, MessageCircle, Award } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../constants/roles';
import SocialLinks from '../components/SocialLinks';
import LoadingState from '../components/LoadingState';
import PostDetail from '../components/PostDetail';
import StoryViewer from '../components/StoryViewer';

const TABS = [
    { key: 'posts', icon: Grid3X3, label: 'Posts' },
    { key: 'mascotas', icon: PawPrint, label: 'Mascotas' },
    { key: 'adopciones', icon: Heart, label: 'Adopciones' },
    { key: 'config', icon: Settings, label: 'Config' },
];

const Profile = () => {
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [myPets, setMyPets] = useState([]);
    const [myPersonalPets, setMyPersonalPets] = useState([]);
    const [myRoles, setMyRoles] = useState([]);
    const [myAdoptions, setMyAdoptions] = useState([]);
    const [userPosts, setUserPosts] = useState([]);
    const [likedSet, setLikedSet] = useState(new Set());
    const [myStories, setMyStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [activeTab, setActiveTab] = useState('posts');
    const [selectedPost, setSelectedPost] = useState(null);
    const [storyViewer, setStoryViewer] = useState(false);
    const [uploadingStory, setUploadingStory] = useState(false);
    const storyFileRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const [profileRes, petsRes, rolesRes, personalPetsRes, adoptionConvsRes, postsRes, likesRes, storiesRes] = await Promise.all([
                    supabase.from('profiles').select('id, display_name, email, avatar_url, stats, instagram, facebook, twitter, tiktok, location').eq('id', user.id).single(),
                    supabase.from('adoption_pets').select('id, name, type, image_url, status').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('business_roles').select('id, role_type, business_name, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('pets').select('id, name, species, breed, image_url').eq('owner_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('conversations').select('id, user2_id, last_message, participant_name, created_at').eq('user1_id', user.id).like('last_message', 'Me interesa adoptar a %').order('created_at', { ascending: false }).limit(20),
                    supabase.from('posts').select('id, image_url, caption, location, likes_count, comments_count, visibility, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('post_likes').select('post_id').eq('user_id', user.id),
                    supabase.from('stories').select('id, image_url, created_at').eq('user_id', user.id).gt('expires_at', new Date().toISOString()),
                ]);
                if (profileRes.error) throw profileRes.error;
                setProfile(profileRes.data || null);
                setMyPets(petsRes.data || []);
                setMyPersonalPets(personalPetsRes.data || []);
                setMyRoles(rolesRes.data || []);
                setMyAdoptions(adoptionConvsRes.data || []);
                setUserPosts(postsRes.data || []);
                setLikedSet(new Set((likesRes.data || []).map(l => l.post_id)));
                setMyStories(storiesRes.data || []);
            } catch (err) {
                setLoadError('No se pudo cargar el perfil.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    const handleLikeToggle = useCallback((postId, nowLiked) => {
        setUserPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + (nowLiked ? 1 : -1) } : p));
        setLikedSet((prev) => { const next = new Set(prev); nowLiked ? next.add(postId) : next.delete(postId); return next; });
    }, []);

    const openPost = (post) => {
        setSelectedPost({
            ...post,
            _liked: likedSet.has(post.id),
            _authorName: profile?.display_name || 'Tu',
            _authorAvatar: profile?.avatar_url || '',
        });
    };

    const handleStoryUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploadingStory(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${user.id}/stories/${Date.now()}.${ext}`;
            await supabase.storage.from('matchpet-images').upload(path, file, { cacheControl: '3600', upsert: false });
            const { data: { publicUrl } } = supabase.storage.from('matchpet-images').getPublicUrl(path);
            await supabase.from('stories').insert({ user_id: user.id, image_url: publicUrl });
            setMyStories(prev => [...prev, { id: Date.now().toString(), image_url: publicUrl, created_at: new Date().toISOString() }]);
        } catch {
            // Story upload failed — silent
        } finally {
            setUploadingStory(false);
            if (storyFileRef.current) storyFileRef.current.value = '';
        }
    };

    const displayName = profile?.display_name || 'Usuario';
    const avatarUrl = profile?.avatar_url || '';
    const hasStory = myStories.length > 0;

    if (loading) return <div style={st.container}><LoadingState message="Cargando perfil..." /></div>;
    if (loadError) return <div style={st.container}><div style={{ padding: '2rem', textAlign: 'center', color: '#e53935' }}>{loadError}</div></div>;

    return (
        <div style={st.container} className="fade-in">
            <input ref={storyFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStoryUpload} />

            {/* Header */}
            <div style={st.header}>
                <div style={st.headerTop}>
                    <h2 style={st.headerTitle}>{displayName}</h2>
                    <button style={st.editBtn} onClick={() => navigate('/profile/edit')}>
                        <Settings size={20} color="var(--color-text-dark)" />
                    </button>
                </div>

                <div style={st.profileRow}>
                    {/* Avatar with story ring */}
                    <div style={st.avatarWrap} onClick={() => {
                        if (hasStory) setStoryViewer(true);
                        else storyFileRef.current?.click();
                    }}>
                        <div style={{ ...st.avatarRing, ...(hasStory ? st.activeRing : st.noRing) }}>
                            <img src={getAvatarUrl(avatarUrl)} alt="" style={st.avatar} />
                        </div>
                        {!hasStory && (
                            <div style={st.addStoryBadge}>
                                <Plus size={12} color="#fff" />
                            </div>
                        )}
                        {uploadingStory && <div style={st.uploadingOverlay}>...</div>}
                    </div>

                    {/* Stats */}
                    <div style={st.statsRow}>
                        <div style={st.statBox}>
                            <span style={st.statValue}>{userPosts.length}</span>
                            <span style={st.statLabel}>Posts</span>
                        </div>
                        <div style={st.statBox}>
                            <span style={st.statValue}>{myPersonalPets.length + myPets.length}</span>
                            <span style={st.statLabel}>Mascotas</span>
                        </div>
                        <div style={st.statBox}>
                            <span style={st.statValue}>{myAdoptions.length}</span>
                            <span style={st.statLabel}>Adopciones</span>
                        </div>
                    </div>
                </div>

                {profile?.location && <p style={st.bio}>{profile.location}</p>}
                <SocialLinks profile={profile} size={18} />
            </div>

            {/* Tab bar */}
            <div style={st.tabBar}>
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                        <button key={tab.key} style={{ ...st.tab, ...(active ? st.tabActive : {}) }} onClick={() => setActiveTab(tab.key)}>
                            <Icon size={22} color={active ? 'var(--color-primary)' : 'var(--color-text-light)'} />
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div style={st.tabContent}>
                {activeTab === 'posts' && (
                    <>
                        {userPosts.length === 0 ? (
                            <div style={st.emptyTab}>
                                <Camera size={40} color="#ccc" />
                                <p style={st.emptyText}>Aun no tienes publicaciones</p>
                                <button style={st.emptyBtn} onClick={() => navigate('/posts/new')}>Crear publicacion</button>
                            </div>
                        ) : (
                            <div style={st.grid}>
                                {userPosts.map((post) => (
                                    <div key={post.id} style={st.gridCell} onClick={() => openPost(post)}>
                                        <img src={post.image_url} alt="" style={st.gridImage} loading="lazy" />
                                        {post.visibility === 'private' && (
                                            <div style={st.lockBadge}><Lock size={12} color="#fff" /></div>
                                        )}
                                        <div style={st.gridOverlay}>
                                            {(post.likes_count > 0) && (
                                                <div style={st.gridStat}><Heart size={12} fill={likedSet.has(post.id) ? '#fff' : 'none'} color="#fff" /><span style={st.gridStatText}>{post.likes_count}</span></div>
                                            )}
                                            {post.comments_count > 0 && (
                                                <div style={st.gridStat}><MessageCircle size={12} color="#fff" /><span style={st.gridStatText}>{post.comments_count}</span></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button style={st.fab} onClick={() => navigate('/posts/new')}><Plus size={24} color="#fff" /></button>
                    </>
                )}

                {activeTab === 'mascotas' && (
                    <div style={st.listPad}>
                        {myPersonalPets.length > 0 && (
                            <>
                                <h4 style={st.sectionTitle}>Mis Mascotas</h4>
                                {myPersonalPets.map((pet) => (
                                    <div key={pet.id} style={st.listItem} onClick={() => navigate(`/pets/${pet.id}`)}>
                                        <div style={{ ...st.listThumb, backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundColor: pet.image_url ? 'transparent' : '#f0f0f0' }}>
                                            {!pet.image_url && <PawPrint size={20} color="#ccc" />}
                                        </div>
                                        <div style={{ flex: 1 }}><span style={st.listName}>{pet.name}</span><span style={st.listSub}>{pet.species} {pet.breed ? `· ${pet.breed}` : ''}</span></div>
                                        <ChevronRight size={18} color="var(--color-text-light)" />
                                    </div>
                                ))}
                            </>
                        )}
                        {myPets.length > 0 && (
                            <>
                                <h4 style={{ ...st.sectionTitle, marginTop: '1.5rem' }}>En adopcion</h4>
                                {myPets.map((pet) => (
                                    <div key={pet.id} style={st.listItem}>
                                        <div style={{ ...st.listThumb, backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundColor: pet.image_url ? 'transparent' : '#fff0e6' }}>
                                            {!pet.image_url && <Heart size={20} color="var(--color-primary)" />}
                                        </div>
                                        <div style={{ flex: 1 }}><span style={st.listName}>{pet.name}</span><span style={st.listSub}>{pet.type} · {pet.status}</span></div>
                                        <button style={st.deleteBtn} onClick={async () => {
                                            if (!window.confirm(`Eliminar a ${pet.name} de adopcion?`)) return;
                                            const { error } = await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                            if (!error) setMyPets(prev => prev.filter(p => p.id !== pet.id));
                                        }}><Trash2 size={16} color="#e53935" /></button>
                                    </div>
                                ))}
                            </>
                        )}
                        <div style={st.addRow}>
                            <button style={st.addBtn} onClick={() => navigate('/pets/new')}><Plus size={16} /> Agregar mascota</button>
                            <button style={st.addBtn} onClick={() => navigate('/adoption/new')}><Heart size={16} /> Publicar en adopcion</button>
                        </div>
                    </div>
                )}

                {activeTab === 'adopciones' && (
                    <div style={st.listPad}>
                        {myAdoptions.length === 0 ? (
                            <div style={st.emptyTab}><Heart size={40} color="#ccc" /><p style={st.emptyText}>Aun no has contactado mascotas en adopcion</p><button style={st.emptyBtn} onClick={() => navigate('/adoption')}>Explorar adopciones</button></div>
                        ) : (
                            <>
                                <h4 style={st.sectionTitle}>Mascotas que te interesan ({myAdoptions.length})</h4>
                                {myAdoptions.map((conv) => {
                                    const petName = conv.last_message?.replace('Me interesa adoptar a ', '') || 'Mascota';
                                    return (
                                        <div key={conv.id} style={st.listItem} onClick={() => navigate(`/chat/${conv.id}`)}>
                                            <div style={{ ...st.listThumb, backgroundColor: '#fce4ec' }}><Heart size={20} color="#e91e63" /></div>
                                            <div style={{ flex: 1 }}><span style={st.listName}>{petName}</span><span style={st.listSub}><MessageCircle size={11} style={{ verticalAlign: 'middle' }} /> Contactado · {conv.participant_name || 'Usuario'}</span></div>
                                            <ChevronRight size={18} color="var(--color-text-light)" />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'config' && (
                    <div style={st.listPad}>
                        {myRoles.length > 0 && (
                            <>
                                <h4 style={st.sectionTitle}>Roles de Negocio</h4>
                                {myRoles.map((role) => {
                                    const cfg = ROLE_CONFIG[role.role_type] || {};
                                    return (
                                        <div key={role.id} style={st.listItem} onClick={() => navigate('/dashboard')}>
                                            <div style={{ ...st.listThumb, backgroundColor: '#fff0e6' }}>
                                                {cfg.icon ? <cfg.icon size={20} color="var(--color-primary)" /> : <Award size={20} color="var(--color-primary)" />}
                                            </div>
                                            <div style={{ flex: 1 }}><span style={st.listName}>{role.business_name}</span><span style={st.listSub}>{cfg.label || role.role_type}</span></div>
                                            <ChevronRight size={18} color="var(--color-text-light)" />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        <button style={{ ...st.listItem, justifyContent: 'center', border: '2px dashed #e0e0e0', boxShadow: 'none' }} onClick={() => navigate('/activate-role')}>
                            <Plus size={18} color="var(--color-primary)" />
                            <span style={{ color: 'var(--color-primary)', fontWeight: '600', marginLeft: '0.4rem' }}>Activar rol de negocio</span>
                        </button>

                        <div style={st.listItem} onClick={() => navigate('/settings')}>
                            <div style={{ ...st.listThumb, backgroundColor: '#f3f4f6' }}>
                                <Settings size={20} color="var(--color-text-light)" />
                            </div>
                            <div style={{ flex: 1 }}><span style={st.listName}>Configuracion</span><span style={st.listSub}>Notificaciones, cuenta, informacion</span></div>
                            <ChevronRight size={18} color="var(--color-text-light)" />
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                                <a href="/legal.html#terminos" target="_blank" rel="noopener noreferrer" style={st.legalLink}>Terminos y Condiciones</a>
                                <a href="/legal.html#privacidad" target="_blank" rel="noopener noreferrer" style={st.legalLink}>Politica de Privacidad</a>
                            </div>
                            <a href="/delete-account.html" target="_blank" rel="noopener noreferrer" style={{ ...st.legalLink, display: 'block', textAlign: 'center', marginBottom: '1.5rem' }}>Eliminar mi cuenta</a>
                        </div>
                        <button style={st.logoutBtn} onClick={handleLogout}><LogOut size={20} /> Cerrar Sesion</button>
                    </div>
                )}
            </div>

            {selectedPost && <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} user={user} profile={profile} onLikeToggle={handleLikeToggle} onDelete={(id) => setUserPosts(prev => prev.filter(p => p.id !== id))} />}
            {storyViewer && myStories.length > 0 && <StoryViewer userStories={[{ user_id: user.id, display_name: displayName, avatar_url: avatarUrl, stories: myStories }]} initialUserIndex={0} onClose={() => setStoryViewer(false)} />}
        </div>
    );
};

const st = {
    container: { minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' },
    header: { backgroundColor: '#fff', padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid #f0f0f0' },
    headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
    headerTitle: { fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--color-text-dark)' },
    editBtn: { background: 'none', border: 'none', padding: '0.3rem', width: 'auto', cursor: 'pointer', display: 'flex' },
    profileRow: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' },
    avatarWrap: { position: 'relative', cursor: 'pointer', flexShrink: 0 },
    avatarRing: { width: '86px', height: '86px', borderRadius: '50%', padding: '3px' },
    activeRing: { background: 'linear-gradient(135deg, #ee9d2b, #e91e63, #ee9d2b)' },
    noRing: { background: '#e0e0e0' },
    avatar: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' },
    addStoryBadge: { position: 'absolute', bottom: '2px', right: '2px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    uploadingOverlay: { position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem' },
    statsRow: { display: 'flex', gap: '1.5rem', flex: 1, justifyContent: 'space-around' },
    statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    statValue: { fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-text-dark)' },
    statLabel: { fontSize: '0.75rem', color: 'var(--color-text-light)' },
    bio: { fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.25rem' },
    tabBar: { display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 5 },
    tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' },
    tabActive: { borderBottomColor: 'var(--color-primary)' },
    tabContent: { flex: 1, position: 'relative' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', padding: '2px' },
    gridCell: { position: 'relative', aspectRatio: '1/1', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#eee' },
    gridImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.45))', display: 'flex', alignItems: 'center', gap: '8px' },
    gridStat: { display: 'flex', alignItems: 'center', gap: '3px' },
    gridStatText: { fontSize: '0.7rem', fontWeight: '700', color: '#fff' },
    lockBadge: { position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    fab: { position: 'fixed', bottom: '5.5rem', right: '1.25rem', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(238,157,43,0.4)', cursor: 'pointer', zIndex: 4 },
    listPad: { padding: '1rem' },
    sectionTitle: { fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-dark)', marginBottom: '0.75rem' },
    listItem: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '0.85rem', borderRadius: '14px', marginBottom: '0.6rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer', gap: '0.75rem' },
    listThumb: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 },
    listName: { fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-text-dark)', display: 'block' },
    listSub: { fontSize: '0.78rem', color: 'var(--color-text-light)' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', width: 'auto', display: 'flex' },
    addRow: { display: 'flex', gap: '0.75rem', marginTop: '1rem' },
    addBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.75rem', border: '2px dashed #e0e0e0', borderRadius: '14px', background: 'none', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary)', cursor: 'pointer' },
    emptyTab: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' },
    emptyText: { fontSize: '0.95rem', color: 'var(--color-text-light)', textAlign: 'center' },
    emptyBtn: { padding: '0.65rem 1.5rem', borderRadius: '50px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' },
    legalLink: { color: 'var(--color-text-light)', fontSize: '0.85rem', textDecoration: 'none' },
    logoutBtn: { width: '100%', backgroundColor: 'transparent', color: '#ff4b4b', border: '2px solid #ff4b4b', padding: '0.85rem', borderRadius: '50px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem' },
};

export default Profile;
