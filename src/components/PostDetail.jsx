// PostDetail.jsx — Full-screen post viewer
// Layout: image fills screen, author overlay at top, actions at bottom,
// comments slide up as a panel from the bottom when tapped.
// Tapping the author navigates to their profile.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, MapPin, X, Trash2, MoreHorizontal,
         Flag, Ban, Bookmark, Share2, ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { timeAgo } from '../utils/formatters';
import { isVideoUrl } from '../utils/mediaUtils';

const REPORT_REASONS = [
    { value: 'spam',          label: 'Spam' },
    { value: 'inappropriate', label: 'Contenido inapropiado' },
    { value: 'animal_abuse',  label: 'Maltrato animal' },
    { value: 'harassment',    label: 'Acoso' },
    { value: 'fraud',         label: 'Fraude o estafa' },
    { value: 'other',         label: 'Otro' },
];

const PostDetail = ({ post, onClose, user, profile, onLikeToggle, onDelete }) => {
    const navigate = useNavigate();

    const [comments, setComments]         = useState([]);
    const [newComment, setNewComment]     = useState('');
    const [sending, setSending]           = useState(false);
    const [liked, setLiked]               = useState(post._liked || false);
    const [likesCount, setLikesCount]     = useState(post.likes_count || 0);
    const [showHeart, setShowHeart]       = useState(false);
    const [saved, setSaved]               = useState(false);
    const [shareToast, setShareToast]     = useState(false);
    const [showMenu, setShowMenu]         = useState(false);
    const [showComments, setShowComments] = useState(false); // comments drawer
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSent, setReportSent]     = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);

    const commentsEndRef = useRef(null);
    const lastTapRef     = useRef(0);
    const isOwner = user && post.user_id === user.id;

    // ── Load saved state ────────────────────────────────────────────────────
    useEffect(() => {
        if (user) {
            supabase.from('saved_posts').select('id')
                .eq('user_id', user.id).eq('post_id', post.id)
                .maybeSingle()
                .then(({ data }) => { if (data) setSaved(true); });
        }
    }, [post.id, user]);

    // ── Load & subscribe to comments ────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('post_comments').select('*')
                .eq('post_id', post.id).order('created_at', { ascending: true });
            if (data) setComments(data);
        };
        load();

        const channel = supabase.channel(`comments-${post.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public',
                table: 'post_comments', filter: `post_id=eq.${post.id}`,
            }, (payload) => {
                setComments(prev =>
                    prev.find(c => c.id === payload.new.id) ? prev : [...prev, payload.new]
                );
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [post.id]);

    // Auto-scroll comments to bottom when panel opens
    useEffect(() => {
        if (showComments) {
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [showComments, comments.length]);

    // Lock body scroll while open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // ── Like ────────────────────────────────────────────────────────────────
    const toggleLike = async () => {
        if (!user) return;
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(c => c + (wasLiked ? -1 : 1));
        if (onLikeToggle) onLikeToggle(post.id, !wasLiked);

        if (wasLiked) {
            await supabase.from('post_likes').delete()
                .eq('post_id', post.id).eq('user_id', user.id);
        } else {
            await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
            if (post.user_id && post.user_id !== user.id) {
                const name = profile?.display_name || 'Alguien';
                supabase.from('notifications').insert({
                    user_id: post.user_id, type: 'message',
                    title: `${name} le dio like a tu publicacion`,
                    body: post.caption?.substring(0, 60) || 'Tu foto recibio un like',
                    entity_id: post.id,
                }).catch(() => { /* notificacion no critica, ignorar fallo */ });
            }
        }
    };

    // Double-tap to like
    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (!liked) toggleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        }
        lastTapRef.current = now;
    };

    // ── Save ────────────────────────────────────────────────────────────────
    const toggleSave = async () => {
        if (!user) return;
        if (saved) {
            await supabase.from('saved_posts').delete()
                .eq('user_id', user.id).eq('post_id', post.id);
            setSaved(false);
        } else {
            await supabase.from('saved_posts').insert({ user_id: user.id, post_id: post.id });
            setSaved(true);
        }
    };

    // ── Share ───────────────────────────────────────────────────────────────
    const handleShare = async () => {
        const shareUrl = window.location.origin + '/explore';
        if (navigator.share) {
            try { await navigator.share({ title: `${post._authorName} en MatchPetz`, text: post.caption || '', url: shareUrl }); }
            catch { /* cancelled */ }
        } else {
            try { await navigator.clipboard.writeText(shareUrl); setShareToast(true); setTimeout(() => setShareToast(false), 2000); }
            catch { /* clipboard failed */ }
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!window.confirm('Eliminar esta publicacion?')) return;
        const { error } = await supabase.from('posts').delete()
            .eq('id', post.id).eq('user_id', user.id);
        if (!error) { if (onDelete) onDelete(post.id); onClose(); }
    };

    // ── Report ──────────────────────────────────────────────────────────────
    const handleReport = async () => {
        if (!reportReason || !user) return;
        const { error: reportErr } = await supabase.from('reports').insert({
            reporter_id: user.id, reported_user_id: post.user_id,
            reported_content_id: post.id, content_type: 'post', reason: reportReason,
        });
        if (reportErr) { alert('No se pudo enviar el reporte. Intenta de nuevo.'); return; }
        setReportSent(true);
        setTimeout(() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }, 1500);
    };

    // ── Block ───────────────────────────────────────────────────────────────
    const handleBlock = async () => {
        if (!user || !post.user_id || post.user_id === user.id) return;
        if (!window.confirm('Bloquear a este usuario?')) return;
        const { error: blockErr } = await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: post.user_id });
        if (blockErr) { alert('No se pudo bloquear al usuario. Intenta de nuevo.'); return; }
        setShowMenu(false);
        onClose();
    };

    // ── Comment submit ──────────────────────────────────────────────────────
    const submitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || sending) return;
        setSending(true);
        const text = newComment.trim();
        const optimistic = {
            id: `temp-${Date.now()}`, post_id: post.id, user_id: user.id,
            user_name: profile?.display_name || 'Tu',
            user_avatar: profile?.avatar_url || '',
            content: text, created_at: new Date().toISOString(),
        };
        setComments(prev => [...prev, optimistic]);
        setNewComment('');

        const { error } = await supabase.from('post_comments').insert({
            post_id: post.id, user_id: user.id,
            user_name: profile?.display_name || 'Usuario',
            user_avatar: profile?.avatar_url || '',
            content: text,
        });
        if (error) {
            setComments(prev => prev.filter(c => c.id !== optimistic.id));
            setNewComment(text);
        }
        setSending(false);
    };

    // Navigate to author profile and close modal
    const goToProfile = () => {
        if (!post.user_id) return;
        onClose();
        navigate(`/users/${post.user_id}`);
    };

    // ────────────────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────────────────
    return (
        <div style={ms.overlay} onClick={onClose}>
            {/* Full-screen card — stops propagation to avoid accidental close */}
            <div style={ms.screen} onClick={e => e.stopPropagation()}>

                {/* ── MEDIA AREA: imagen o video según tipo ── */}
                <div style={ms.imageArea} onClick={handleDoubleTap}>
                    {isVideoUrl(post.image_url) || post.media_type === 'video' ? (
                        /* Video con controles nativos — stopPropagation evita cierre accidental */
                        <video
                            src={post.image_url}
                            style={ms.image}
                            controls
                            playsInline
                            preload="metadata"
                            loop
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <img src={post.image_url} alt="" style={ms.image} loading="lazy" draggable={false} />
                    )}

                    {/* Double-tap heart burst */}
                    {showHeart && (
                        <div style={ms.heartBurst}>
                            <Heart size={90} fill="#fff" color="#fff" />
                        </div>
                    )}

                    {/* ── TOP OVERLAY: author + close/menu ── */}
                    <div style={ms.topBar}>
                        {/* Tapping author → goes to their profile */}
                        <button style={ms.authorBtn} onClick={(e) => { e.stopPropagation(); goToProfile(); }}>
                            <img src={getAvatarUrl(post._authorAvatar)} alt="" style={ms.authorAvatar} />
                            <div>
                                <p style={ms.authorName}>{post._authorName || 'Usuario'}</p>
                                <span style={ms.authorTime}>{timeAgo(post.created_at)}</span>
                            </div>
                        </button>

                        <div style={ms.topRight}>
                            {isOwner && (
                                <button style={ms.iconBtn} onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                                    <Trash2 size={18} color="#fff" />
                                </button>
                            )}
                            {user && !isOwner && (
                                <button style={ms.iconBtn} onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}>
                                    <MoreHorizontal size={20} color="#fff" />
                                </button>
                            )}
                            <button style={ms.iconBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>
                                <X size={20} color="#fff" />
                            </button>
                        </div>
                    </div>

                    {/* Menu dropdown */}
                    {showMenu && (
                        <div style={ms.menuDropdown} onClick={e => e.stopPropagation()}>
                            <button style={ms.menuItem} onClick={() => { setShowMenu(false); setShowReportModal(true); }}>
                                <Flag size={16} color="#e53935" /> Reportar publicacion
                            </button>
                            <button style={ms.menuItem} onClick={handleBlock}>
                                <Ban size={16} color="#e53935" /> Bloquear usuario
                            </button>
                        </div>
                    )}

                    {/* ── BOTTOM OVERLAY: actions + caption ── */}
                    <div style={ms.bottomBar} onClick={e => e.stopPropagation()}>
                        {/* Caption & location */}
                        {post.caption && (
                            <p style={ms.caption} onClick={() => setCaptionExpanded(v => !v)}>
                                <strong style={{ color: '#fff' }}>{post._authorName} </strong>
                                <span style={{ color: 'rgba(255,255,255,0.92)' }}>
                                    {captionExpanded || post.caption.length <= 80
                                        ? post.caption
                                        : post.caption.substring(0, 80) + '…'}
                                </span>
                            </p>
                        )}
                        {post.location && (
                            <div style={ms.locationRow}>
                                <MapPin size={12} color="rgba(255,255,255,0.8)" />
                                <span style={ms.locationText}>{post.location}</span>
                            </div>
                        )}

                        {/* Action icons row */}
                        <div style={ms.actionsRow}>
                            {/* Like */}
                            <button style={ms.actionBtn} onClick={toggleLike}>
                                <Heart size={26} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
                                <span style={ms.actionCount}>{likesCount}</span>
                            </button>

                            {/* Comments — opens drawer */}
                            <button style={ms.actionBtn} onClick={() => setShowComments(true)}>
                                <MessageCircle size={26} color="#fff" />
                                <span style={ms.actionCount}>{comments.length}</span>
                            </button>

                            {/* Share */}
                            <button style={ms.actionBtn} onClick={handleShare}>
                                <Share2 size={24} color="#fff" />
                            </button>

                            <div style={{ flex: 1 }} />

                            {/* Save */}
                            {user && (
                                <button style={ms.actionBtn} onClick={toggleSave}>
                                    <Bookmark size={24} fill={saved ? '#fff' : 'none'} color="#fff" />
                                </button>
                            )}
                        </div>

                        {shareToast && (
                            <div style={ms.toast}>Enlace copiado al portapapeles</div>
                        )}
                    </div>
                </div>

                {/* ── COMMENTS DRAWER — slides up from bottom ── */}
                {showComments && (
                    <div style={ms.commentsOverlay} onClick={() => setShowComments(false)}>
                        <div style={ms.commentsDrawer} onClick={e => e.stopPropagation()}>
                            {/* Drag handle */}
                            <div style={ms.drawerHandle}>
                                <div style={ms.handleBar} />
                            </div>
                            <div style={ms.drawerHeader}>
                                <span style={ms.drawerTitle}>Comentarios</span>
                                <button style={ms.closeDrawer} onClick={() => setShowComments(false)}>
                                    <ChevronDown size={22} color="#666" />
                                </button>
                            </div>

                            {/* Comments list */}
                            <div style={ms.commentsList}>
                                {comments.length === 0 && (
                                    <p style={ms.noComments}>Sé el primero en comentar 💬</p>
                                )}
                                {comments.map(c => (
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

                            {/* Comment input */}
                            {user && (
                                <form style={ms.commentForm} onSubmit={submitComment}>
                                    <img src={getAvatarUrl(profile?.avatar_url)} alt="" style={ms.commentInputAvatar} />
                                    <input
                                        style={ms.commentInput}
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Escribe un comentario..."
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        style={{ ...ms.sendBtn, opacity: newComment.trim() ? 1 : 0.35 }}
                                        disabled={!newComment.trim() || sending}
                                    >
                                        <Send size={18} color="var(--color-primary)" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── REPORT MODAL ── */}
            {showReportModal && (
                <div style={ms.reportOverlay} onClick={() => setShowReportModal(false)}>
                    <div style={ms.reportModal} onClick={e => e.stopPropagation()}>
                        {reportSent ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>Reporte enviado ✓</p>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Gracias por ayudar a mantener la comunidad segura
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Reportar publicacion</h3>
                                {REPORT_REASONS.map(r => (
                                    <button key={r.value}
                                        style={{ ...ms.reportOption, ...(reportReason === r.value ? { borderColor: 'var(--color-primary)', backgroundColor: '#fff8ee' } : {}) }}
                                        onClick={() => setReportReason(r.value)}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                                <button
                                    style={{ ...ms.reportSubmit, opacity: reportReason ? 1 : 0.5 }}
                                    disabled={!reportReason}
                                    onClick={handleReport}
                                >
                                    Enviar reporte
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const ms = {
    // Full-screen modal
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: '#000',
        display: 'flex',
    },
    // Card ocupa toda la pantalla — imagen + overlays encima
    screen: {
        flex: 1, position: 'relative',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
    },
    // Imagen llena el 100% de la pantalla — igual que Instagram/TikTok
    imageArea: {
        position: 'absolute', inset: 0,
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',    // llena la pantalla, look profesional
        display: 'block',
        userSelect: 'none', WebkitUserSelect: 'none',
    },
    heartBurst: {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: 5,
        animation: 'heartPop 0.8s ease forwards',
    },

    // ── TOP BAR ──
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 0.75rem 2.5rem 0.6rem',  // menos padding izquierdo → autor más pegado
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
    },
    authorBtn: {
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, width: 'auto', minHeight: 'auto', flex: 1,
        textAlign: 'left',
    },
    authorAvatar: {
        width: '38px', height: '38px', borderRadius: '50%',
        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.75)',
        flexShrink: 0,
    },
    authorName: {
        fontWeight: '700', fontSize: '0.9rem', color: '#fff', margin: 0,
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
    },
    authorTime: {
        fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    },
    topRight: { display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 },
    iconBtn: {
        background: 'rgba(0,0,0,0.3)', border: 'none',
        width: '34px', height: '34px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0, backdropFilter: 'blur(4px)',
    },
    menuDropdown: {
        position: 'absolute', top: '60px', right: '12px', zIndex: 10,
        backgroundColor: '#fff', borderRadius: '14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: '210px',
    },
    menuItem: {
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.9rem 1rem', width: '100%', border: 'none',
        background: 'none', fontSize: '0.9rem', fontWeight: '600',
        color: '#e53935', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
    },

    // ── BOTTOM BAR ──
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4,
        padding: '2.5rem 1rem 1.25rem',
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
    },
    caption: {
        fontSize: '0.88rem', lineHeight: 1.45, margin: '0 0 0.35rem',
        cursor: 'pointer',
    },
    locationRow: {
        display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem',
    },
    locationText: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' },
    actionsRow: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
    },
    actionBtn: {
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0.3rem 0.4rem', width: 'auto', minHeight: 'auto',
    },
    actionCount: {
        fontSize: '0.95rem', fontWeight: '700', color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    },
    toast: {
        marginTop: '0.6rem',
        padding: '0.4rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.15)',
        color: '#fff', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center',
        backdropFilter: 'blur(8px)',
    },

    // ── COMMENTS DRAWER ──
    commentsOverlay: {
        position: 'absolute', inset: 0, zIndex: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    },
    commentsDrawer: {
        backgroundColor: '#fff',
        borderRadius: '20px 20px 0 0',
        maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
    },
    drawerHandle: { display: 'flex', justifyContent: 'center', padding: '10px 0 0' },
    handleBar: { width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#d0d0d0' },
    drawerHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1rem 0.5rem',
        borderBottom: '1px solid #f0f0f0', flexShrink: 0,
    },
    drawerTitle: { fontWeight: '700', fontSize: '1rem', color: 'var(--color-text-dark)' },
    closeDrawer: {
        background: 'none', border: 'none', width: '32px', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
    },
    commentsList: { flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' },
    noComments: {
        textAlign: 'center', color: 'var(--color-text-light)',
        fontSize: '0.9rem', padding: '2rem 0',
    },
    comment: { display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' },
    commentAvatar: { width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    commentBody: { display: 'flex', flexDirection: 'column', gap: '1px' },
    commentUser: { fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-text-dark)' },
    commentText: { fontSize: '0.88rem', color: 'var(--color-text-dark)', lineHeight: 1.35 },
    commentTime: { fontSize: '0.7rem', color: 'var(--color-text-light)' },
    commentForm: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fff', flexShrink: 0,
    },
    commentInputAvatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    commentInput: {
        flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem',
        padding: '0.5rem 0', backgroundColor: 'transparent', fontFamily: 'inherit',
    },
    sendBtn: {
        background: 'none', border: 'none', width: '36px', height: '36px',
        borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0,
    },

    // ── REPORT MODAL ──
    reportOverlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    },
    reportModal: {
        backgroundColor: '#fff', borderRadius: '20px', padding: '1.5rem',
        maxWidth: '380px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
    },
    reportOption: {
        display: 'block', width: '100%', padding: '0.75rem 1rem',
        border: '1.5px solid #e0e0e0', borderRadius: '12px', background: 'none',
        fontSize: '0.9rem', fontWeight: '500', color: 'var(--color-text-dark)',
        cursor: 'pointer', marginBottom: '0.5rem', textAlign: 'left',
    },
    reportSubmit: {
        width: '100%', padding: '0.85rem', borderRadius: '50px', border: 'none',
        backgroundColor: '#e53935', color: '#fff', fontSize: '1rem',
        fontWeight: '700', cursor: 'pointer', marginTop: '0.75rem',
    },
};

export default PostDetail;
