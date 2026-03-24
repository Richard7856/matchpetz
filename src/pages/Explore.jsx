import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, MapPin, X, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';
import LoadingState from '../components/LoadingState';
import { timeAgo } from '../utils/formatters';

/* ═══════════════════════════════════════════════
   PostDetail — bottom-sheet modal
   ═══════════════════════════════════════════════ */
const PostDetail = ({ post, onClose, user, profile, onLikeToggle }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [liked, setLiked] = useState(post._liked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showHeart, setShowHeart] = useState(false);
    const commentsEndRef = useRef(null);
    const lastTapRef = useRef(0);

    /* load comments */
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('post_comments')
                .select('*')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });
            if (data) setComments(data);
        };
        load();

        /* realtime */
        const channel = supabase
            .channel(`comments-${post.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${post.id}` }, (payload) => {
                setComments((prev) => {
                    if (prev.find((c) => c.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [post.id]);

    /* scroll to bottom when new comments arrive */
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments.length]);

    /* like toggle */
    const toggleLike = async () => {
        if (!user) return;
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount((c) => c + (wasLiked ? -1 : 1));
        onLikeToggle(post.id, !wasLiked);

        if (wasLiked) {
            await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        } else {
            await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        }
    };

    /* double-tap like */
    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (!liked) toggleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        }
        lastTapRef.current = now;
    };

    /* submit comment */
    const submitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || sending) return;
        setSending(true);
        const savedText = newComment.trim();
        const optimistic = {
            id: `temp-${Date.now()}`,
            post_id: post.id,
            user_id: user.id,
            user_name: profile?.display_name || 'Tú',
            user_avatar: profile?.avatar_url || '',
            content: savedText,
            created_at: new Date().toISOString(),
        };
        setComments((prev) => [...prev, optimistic]);
        setNewComment('');

        const { error } = await supabase.from('post_comments').insert({
            post_id: post.id,
            user_id: user.id,
            user_name: profile?.display_name || 'Usuario',
            user_avatar: profile?.avatar_url || '',
            content: savedText,
        });
        if (error) {
            setComments((prev) => prev.filter(c => c.id !== optimistic.id));
            setNewComment(savedText);
        }
        setSending(false);
    };

    /* prevent body scroll */
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.sheet} onClick={(e) => e.stopPropagation()}>
                {/* drag indicator */}
                <div style={modalStyles.dragBar}><div style={modalStyles.dragHandle} /></div>

                {/* close button */}
                <button style={modalStyles.closeBtn} onClick={onClose}>
                    <X size={20} color="#666" />
                </button>

                <div style={modalStyles.scrollArea}>
                    {/* author header */}
                    <div style={modalStyles.authorRow}>
                        <img
                            src={getAvatarUrl(post._authorAvatar)}
                            alt=""
                            style={modalStyles.authorAvatar}
                            loading="lazy"
                        />
                        <div>
                            <p style={modalStyles.authorName}>{post._authorName || 'Usuario'}</p>
                            <span style={modalStyles.authorTime}>{timeAgo(post.created_at)}</span>
                        </div>
                    </div>

                    {/* image */}
                    <div style={modalStyles.imageWrap} onClick={handleDoubleTap}>
                        <img src={post.image_url} alt="" style={modalStyles.image} loading="lazy" />
                        {showHeart && (
                            <div className="heartBurst" style={modalStyles.heartBurst}>
                                <Heart size={80} fill="#fff" color="#fff" />
                            </div>
                        )}
                    </div>

                    {/* actions */}
                    <div style={modalStyles.actions}>
                        <button style={modalStyles.actionBtn} onClick={toggleLike}>
                            <Heart
                                size={24}
                                fill={liked ? '#e53935' : 'none'}
                                color={liked ? '#e53935' : 'var(--color-text-dark)'}
                            />
                            <span style={{ ...modalStyles.actionCount, color: liked ? '#e53935' : 'var(--color-text-dark)' }}>
                                {likesCount}
                            </span>
                        </button>
                        <div style={modalStyles.actionBtn}>
                            <MessageCircle size={22} color="var(--color-text-dark)" />
                            <span style={modalStyles.actionCount}>{comments.length}</span>
                        </div>
                    </div>

                    {/* caption */}
                    {post.caption && (
                        <p style={modalStyles.caption}>
                            <strong>{post._authorName || 'Usuario'}</strong>{' '}
                            {post.caption}
                        </p>
                    )}
                    {post.location && (
                        <div style={modalStyles.locationRow}>
                            <MapPin size={13} color="var(--color-primary)" />
                            <span style={modalStyles.locationText}>{post.location}</span>
                        </div>
                    )}

                    {/* comments */}
                    <div style={modalStyles.commentsSection}>
                        {comments.length === 0 && (
                            <p style={modalStyles.noComments}>Sé el primero en comentar</p>
                        )}
                        {comments.map((c) => (
                            <div key={c.id} style={modalStyles.comment}>
                                <img
                                    src={getAvatarUrl(c.user_avatar)}
                                    alt=""
                                    style={modalStyles.commentAvatar}
                                    loading="lazy"
                                />
                                <div style={modalStyles.commentBody}>
                                    <span style={modalStyles.commentUser}>{c.user_name}</span>
                                    <span style={modalStyles.commentText}>{c.content}</span>
                                    <span style={modalStyles.commentTime}>{timeAgo(c.created_at)}</span>
                                </div>
                            </div>
                        ))}
                        <div ref={commentsEndRef} />
                    </div>
                </div>

                {/* comment input */}
                {user && (
                    <form style={modalStyles.commentForm} onSubmit={submitComment}>
                        <img
                            src={getAvatarUrl(profile?.avatar_url)}
                            alt=""
                            style={modalStyles.commentInputAvatar}
                            loading="lazy"
                        />
                        <input
                            style={modalStyles.commentInput}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escribe un comentario..."
                        />
                        <button
                            type="submit"
                            style={{
                                ...modalStyles.sendBtn,
                                opacity: newComment.trim() ? 1 : 0.4,
                            }}
                            disabled={!newComment.trim() || sending}
                        >
                            <Send size={18} color="var(--color-primary)" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

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

/* ═══════════════════════════════════════════════
   Styles — PostDetail Modal
   ═══════════════════════════════════════════════ */
const modalStyles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
    },
    sheet: {
        width: '100%',
        maxWidth: '480px',
        maxHeight: '92vh',
        backgroundColor: '#fff',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'slideUp 0.3s ease',
    },
    dragBar: {
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0 4px',
        flexShrink: 0,
    },
    dragHandle: {
        width: '36px',
        height: '4px',
        borderRadius: '2px',
        backgroundColor: '#d0d0d0',
    },
    closeBtn: {
        position: 'absolute',
        top: '10px',
        right: '12px',
        background: 'none',
        border: 'none',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        zIndex: 2,
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
    },
    /* author */
    authorRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 1rem',
    },
    authorAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        objectFit: 'cover',
    },
    authorName: {
        fontWeight: '700',
        fontSize: '0.9rem',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    authorTime: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
    },
    /* image */
    imageWrap: {
        position: 'relative',
        width: '100%',
        maxHeight: '400px',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    image: {
        width: '100%',
        height: '100%',
        maxHeight: '400px',
        objectFit: 'cover',
        display: 'block',
    },
    heartBurst: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 5,
    },
    /* actions */
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.6rem 1rem',
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.2rem',
        width: 'auto',
    },
    actionCount: {
        fontSize: '0.9rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
    },
    /* caption & location */
    caption: {
        padding: '0 1rem 0.4rem',
        fontSize: '0.9rem',
        lineHeight: 1.4,
        color: 'var(--color-text-dark)',
    },
    locationRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0 1rem 0.6rem',
    },
    locationText: {
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
    },
    /* comments */
    commentsSection: {
        padding: '0.4rem 1rem 1rem',
        borderTop: '1px solid #f0f0f0',
    },
    noComments: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: '0.85rem',
        padding: '1rem 0',
    },
    comment: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.75rem',
    },
    commentAvatar: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
    },
    commentBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
    },
    commentUser: {
        fontWeight: '700',
        fontSize: '0.82rem',
        color: 'var(--color-text-dark)',
    },
    commentText: {
        fontSize: '0.85rem',
        color: 'var(--color-text-dark)',
        lineHeight: 1.35,
    },
    commentTime: {
        fontSize: '0.7rem',
        color: 'var(--color-text-light)',
    },
    /* comment form */
    commentForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        flexShrink: 0,
    },
    commentInputAvatar: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
    },
    commentInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '0.9rem',
        padding: '0.5rem 0',
        backgroundColor: 'transparent',
        fontFamily: 'inherit',
    },
    sendBtn: {
        background: 'none',
        border: 'none',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
    },
};

export default Explore;
