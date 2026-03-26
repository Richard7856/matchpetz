import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';
import LoadingState from '../components/LoadingState';
import PostDetail from '../components/PostDetail';

/* ═══════════════════════════════════════════════
   Explore — Instagram-style grid
   ═══════════════════════════════════════════════ */
const Explore = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [likedSet, setLikedSet] = useState(new Set());

    /* load posts + user likes */
    useEffect(() => {
        const load = async () => {
            try {
                const { data: postList, error } = await supabase
                    .from('posts')
                    .select('*, profiles!posts_user_id_profiles_fkey(display_name, avatar_url)')
                    .eq('visibility', 'public')
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (!error && postList) {
                    const enriched = postList.map((p) => ({
                        ...p,
                        _authorName: p.profiles?.display_name || 'Usuario',
                        _authorAvatar: p.profiles?.avatar_url || '',
                    }));
                    setPosts(enriched);
                } else if (error) {
                }

                /* fetch user's likes */
                if (user) {
                    const { data: likes } = await supabase
                        .from('post_likes')
                        .select('post_id')
                        .eq('user_id', user.id);
                    if (likes) setLikedSet(new Set(likes.map((l) => l.post_id)));
                }
            } catch (err) {
                console.warn('Posts load error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    /* optimistic like callback from PostDetail */
    const handleLikeToggle = useCallback((postId, nowLiked) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, likes_count: (p.likes_count || 0) + (nowLiked ? 1 : -1) }
                    : p,
            ),
        );
        setLikedSet((prev) => {
            const next = new Set(prev);
            if (nowLiked) next.add(postId);
            else next.delete(postId);
            return next;
        });
    }, []);

    const openPost = (post) => {
        setSelectedPost({ ...post, _liked: likedSet.has(post.id) });
    };

    return (
        <div style={styles.container} className="fade-in">
            {/* Header — hidden when embedded in Discover */}
            {!embedded && (
                <div style={styles.header}>
                    <h2 style={styles.title}>Explorar</h2>
                    <div style={styles.headerRight}>
                        <NotificationBell />
                        <button style={styles.cameraBtn} onClick={() => navigate('/posts/new')}>
                            <Camera size={22} color="var(--color-text-dark)" />
                        </button>
                    </div>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <LoadingState message="Cargando publicaciones..." />
            ) : posts.length === 0 ? (
                <div style={styles.emptyState}>
                    <Camera size={48} color="#ccc" />
                    <p style={styles.emptyTitle}>No hay publicaciones aún</p>
                    <p style={styles.emptySubtext}>Sé el primero en compartir una foto de tu mascota.</p>
                    <button style={styles.emptyBtn} onClick={() => navigate('/posts/new')}>
                        Crear publicación
                    </button>
                </div>
            ) : (
                <div style={styles.grid}>
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            style={styles.gridCell}
                            onClick={() => openPost(post)}
                        >
                            <img src={post.image_url} alt="" style={styles.gridImage} loading="lazy" />
                            {/* like overlay */}
                            <div style={styles.gridOverlay}>
                                {(post.likes_count > 0 || likedSet.has(post.id)) && (
                                    <div style={styles.gridLikes}>
                                        <Heart
                                            size={13}
                                            fill={likedSet.has(post.id) ? '#fff' : 'none'}
                                            color="#fff"
                                        />
                                        <span style={styles.gridLikesText}>{post.likes_count || 0}</span>
                                    </div>
                                )}
                                {post.comments_count > 0 && (
                                    <div style={styles.gridLikes}>
                                        <MessageCircle size={13} color="#fff" />
                                        <span style={styles.gridLikesText}>{post.comments_count}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetail
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    user={user}
                    profile={profile}
                    onLikeToggle={handleLikeToggle}
                />
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════
   Styles — Grid
   ═══════════════════════════════════════════════ */
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg-soft)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
    },
    title: {
        fontSize: 'var(--font-size-page-title)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    cameraBtn: {
        background: 'none',
        border: 'none',
        padding: '0.4rem',
        width: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '50%',
    },
    /* grid */
    grid: {
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px',
        padding: '2px',
        alignContent: 'start',
    },
    gridCell: {
        position: 'relative',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: '#eee',
    },
    gridImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    gridOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 6px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: 0.9,
    },
    gridLikes: {
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
    },
    gridLikesText: {
        fontSize: '0.7rem',
        fontWeight: '700',
        color: '#fff',
    },
    /* empty state */
    emptyState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '0.75rem',
    },
    emptyTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
    },
    emptySubtext: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        textAlign: 'center',
    },
    emptyBtn: {
        marginTop: '0.5rem',
        padding: '0.7rem 1.5rem',
        borderRadius: '50px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
};


export default Explore;
