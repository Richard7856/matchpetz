import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, MapPin, X } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { timeAgo } from '../utils/formatters';

const PostDetail = ({ post, onClose, user, profile, onLikeToggle }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [liked, setLiked] = useState(post._liked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showHeart, setShowHeart] = useState(false);
    const commentsEndRef = useRef(null);
    const lastTapRef = useRef(0);

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

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments.length]);

    const toggleLike = async () => {
        if (!user) return;
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount((c) => c + (wasLiked ? -1 : 1));
        if (onLikeToggle) onLikeToggle(post.id, !wasLiked);

        if (wasLiked) {
            await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        } else {
            await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        }
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (!liked) toggleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        }
        lastTapRef.current = now;
    };

    const submitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || sending) return;
        setSending(true);
        const savedText = newComment.trim();
        const optimistic = {
            id: `temp-${Date.now()}`,
            post_id: post.id,
            user_id: user.id,
            user_name: profile?.display_name || 'Tu',
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

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div style={ms.overlay} onClick={onClose}>
            <div style={ms.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={ms.dragBar}><div style={ms.dragHandle} /></div>
                <button style={ms.closeBtn} onClick={onClose}>
                    <X size={20} color="#666" />
                </button>

                <div style={ms.scrollArea}>
                    <div style={ms.authorRow}>
                        <img src={getAvatarUrl(post._authorAvatar)} alt="" style={ms.authorAvatar} loading="lazy" />
                        <div>
                            <p style={ms.authorName}>{post._authorName || 'Usuario'}</p>
                            <span style={ms.authorTime}>{timeAgo(post.created_at)}</span>
                        </div>
                    </div>

                    <div style={ms.imageWrap} onClick={handleDoubleTap}>
                        <img src={post.image_url} alt="" style={ms.image} loading="lazy" />
                        {showHeart && (
                            <div className="heartBurst" style={ms.heartBurst}>
                                <Heart size={80} fill="#fff" color="#fff" />
                            </div>
                        )}
                    </div>

                    <div style={ms.actions}>
                        <button style={ms.actionBtn} onClick={toggleLike}>
                            <Heart size={24} fill={liked ? '#e53935' : 'none'} color={liked ? '#e53935' : 'var(--color-text-dark)'} />
                            <span style={{ ...ms.actionCount, color: liked ? '#e53935' : 'var(--color-text-dark)' }}>{likesCount}</span>
                        </button>
                        <div style={ms.actionBtn}>
                            <MessageCircle size={22} color="var(--color-text-dark)" />
                            <span style={ms.actionCount}>{comments.length}</span>
                        </div>
                    </div>

                    {post.caption && (
                        <p style={ms.caption}><strong>{post._authorName || 'Usuario'}</strong> {post.caption}</p>
                    )}
                    {post.location && (
                        <div style={ms.locationRow}>
                            <MapPin size={13} color="var(--color-primary)" />
                            <span style={ms.locationText}>{post.location}</span>
                        </div>
                    )}

                    <div style={ms.commentsSection}>
                        {comments.length === 0 && <p style={ms.noComments}>Se el primero en comentar</p>}
                        {comments.map((c) => (
                            <div key={c.id} style={ms.comment}>
                                <img src={getAvatarUrl(c.user_avatar)} alt="" style={ms.commentAvatar} loading="lazy" />
                                <div style={ms.commentBody}>
                                    <span style={ms.commentUser}>{c.user_name}</span>
                                    <span style={ms.commentText}>{c.content}</span>
                                    <span style={ms.commentTime}>{timeAgo(c.created_at)}</span>
                                </div>
                            </div>
                        ))}
                        <div ref={commentsEndRef} />
                    </div>
                </div>

                {user && (
                    <form style={ms.commentForm} onSubmit={submitComment}>
                        <img src={getAvatarUrl(profile?.avatar_url)} alt="" style={ms.commentInputAvatar} loading="lazy" />
                        <input style={ms.commentInput} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." />
                        <button type="submit" style={{ ...ms.sendBtn, opacity: newComment.trim() ? 1 : 0.4 }} disabled={!newComment.trim() || sending}>
                            <Send size={18} color="var(--color-primary)" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const ms = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' },
    sheet: { width: '100%', maxWidth: '480px', maxHeight: '92vh', backgroundColor: '#fff', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideUp 0.3s ease' },
    dragBar: { display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 },
    dragHandle: { width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#d0d0d0' },
    closeBtn: { position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 },
    scrollArea: { flex: 1, overflowY: 'auto', minHeight: 0 },
    authorRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem' },
    authorAvatar: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' },
    authorName: { fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-dark)', margin: 0 },
    authorTime: { fontSize: '0.75rem', color: 'var(--color-text-light)' },
    imageWrap: { position: 'relative', width: '100%', maxHeight: '400px', overflow: 'hidden', backgroundColor: '#f5f5f5' },
    image: { width: '100%', height: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' },
    heartBurst: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 5 },
    actions: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 1rem' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', width: 'auto' },
    actionCount: { fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-text-dark)' },
    caption: { padding: '0 1rem 0.4rem', fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--color-text-dark)' },
    locationRow: { display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0 1rem 0.6rem' },
    locationText: { fontSize: '0.8rem', color: 'var(--color-text-light)' },
    commentsSection: { padding: '0.4rem 1rem 1rem', borderTop: '1px solid #f0f0f0' },
    noComments: { textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.85rem', padding: '1rem 0' },
    comment: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
    commentAvatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    commentBody: { display: 'flex', flexDirection: 'column', gap: '1px' },
    commentUser: { fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-text-dark)' },
    commentText: { fontSize: '0.85rem', color: 'var(--color-text-dark)', lineHeight: 1.35 },
    commentTime: { fontSize: '0.7rem', color: 'var(--color-text-light)' },
    commentForm: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff', flexShrink: 0 },
    commentInputAvatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    commentInput: { flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem', padding: '0.5rem 0', backgroundColor: 'transparent', fontFamily: 'inherit' },
    sendBtn: { background: 'none', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 },
};

export default PostDetail;
