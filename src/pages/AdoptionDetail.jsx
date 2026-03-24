import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Send, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { sendPush } from '../utils/pushNotify';

const AdoptionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [pet, setPet] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [currentImg, setCurrentImg] = useState(0);
    const [contacting, setContacting] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [{ data: petData }, { data: comms }] = await Promise.all([
                supabase.from('adoption_pets').select('*').eq('id', id).single(),
                supabase.from('pet_comments').select('*').eq('pet_id', id).order('created_at', { ascending: true }),
            ]);
            setPet(petData);
            setComments(comms || []);
            setLoading(false);
        };
        load();
    }, [id]);

    const sendComment = async () => {
        if (!newComment.trim() || !user) return;
        setSubmitting(true);
        const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
        const userName = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
        const { data: inserted } = await supabase.from('pet_comments').insert({
            pet_id: id,
            user_id: user.id,
            user_name: userName,
            user_avatar: profile?.avatar_url || null,
            content: newComment.trim(),
        }).select().single();
        if (inserted) setComments((prev) => [...prev, inserted]);
        setNewComment('');
        setSubmitting(false);
    };

    const handleContact = async () => {
        if (!user || !pet?.user_id || pet.user_id === user.id) return;
        setContacting(true);
        try {
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .or(
                    `and(user1_id.eq.${user.id},user2_id.eq.${pet.user_id}),and(user1_id.eq.${pet.user_id},user2_id.eq.${user.id})`
                )
                .maybeSingle();

            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }

            const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', pet.user_id)
                .maybeSingle();

            const { data: conv } = await supabase
                .from('conversations')
                .insert({
                    user1_id: user.id,
                    user2_id: pet.user_id,
                    participant_name: ownerProfile?.display_name || 'Usuario',
                    last_message: `Me interesa adoptar a ${pet.name}`,
                })
                .select('id')
                .single();

            if (conv) {
                await supabase.from('messages').insert({
                    conversation_id: conv.id,
                    sender_id: user.id,
                    content: `Hola! Me interesa adoptar a ${pet.name} 🐾`,
                });
                // Notify pet owner — in-app + push (fire-and-forget)
                const notifTitle = `Alguien esta interesado en adoptar a ${pet.name}`;
                const notifBody = 'Tienes un nuevo mensaje sobre tu mascota en adopcion';
                supabase.from('notifications').insert({
                    user_id: pet.user_id,
                    type: 'adoption',
                    title: notifTitle,
                    body: notifBody,
                    entity_id: conv.id,
                });
                sendPush(pet.user_id, notifTitle, notifBody, { type: 'adoption', entity_id: conv.id });
                navigate(`/chat/${conv.id}`);
            }
        } catch (err) {
        } finally {
            setContacting(false);
        }
    };

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!pet) return <div style={styles.loading}>Mascota no encontrada.</div>;

    // Build image gallery array
    const allImages = pet.images?.length > 0
        ? pet.images
        : pet.image_url ? [pet.image_url] : [];
    const totalImages = allImages.length;

    const handleImageTap = (e) => {
        if (totalImages <= 1) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        if (tapX < rect.width / 2) {
            setCurrentImg((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
        } else {
            setCurrentImg((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
        }
    };

    const isOwner = user && pet.user_id === user.id;

    return (
        <div style={styles.container}>
            {/* Image Gallery */}
            <div
                style={{
                    ...styles.hero,
                    backgroundImage: totalImages > 0 ? `url(${allImages[currentImg]})` : 'none',
                    backgroundColor: totalImages > 0 ? 'transparent' : '#ddd',
                }}
                onClick={handleImageTap}
            >
                <button style={styles.backBtn} onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
                    <ArrowLeft size={22} color="#fff" />
                </button>

                {/* Image indicators */}
                {totalImages > 1 && (
                    <div style={styles.indicators}>
                        {allImages.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.indicator,
                                    backgroundColor: i === currentImg ? '#fff' : 'rgba(255,255,255,0.4)',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Navigation hints */}
                {totalImages > 1 && (
                    <>
                        <div style={styles.navHintLeft}><ChevronLeft size={24} color="rgba(255,255,255,0.7)" /></div>
                        <div style={styles.navHintRight}><ChevronRight size={24} color="rgba(255,255,255,0.7)" /></div>
                    </>
                )}

                {/* Image counter */}
                {totalImages > 1 && (
                    <div style={styles.imgCounter}>{currentImg + 1}/{totalImages}</div>
                )}
            </div>

            <div style={styles.content}>
                <div style={styles.titleRow}>
                    <h2 style={styles.petName}>{pet.name}</h2>
                    <span style={styles.ageBadge}>{pet.age}</span>
                </div>

                <div style={styles.tags}>
                    {pet.type && <span style={styles.tag}>{pet.type}</span>}
                    {pet.breed && <span style={styles.tag}>{pet.breed}</span>}
                    {pet.gender && <span style={styles.tag}>{pet.gender}</span>}
                </div>

                {pet.location && (
                    <div style={styles.location}>
                        <MapPin size={14} color="var(--color-primary)" />
                        <span style={styles.locationText}>{pet.location}</span>
                    </div>
                )}

                {pet.description && <p style={styles.desc}>{pet.description}</p>}

                {/* Contact button */}
                {user && pet.user_id && !isOwner && (
                    <button style={styles.contactBtn} onClick={handleContact} disabled={contacting}>
                        <MessageCircle size={18} />
                        {contacting ? 'Conectando...' : 'Contactar al dueño'}
                    </button>
                )}
                {isOwner && (
                    <p style={styles.ownerNote}>Esta es tu publicación</p>
                )}

                {/* Comments */}
                <h3 style={styles.sectionTitle}>Comentarios</h3>
                {comments.length === 0 ? (
                    <p style={styles.noComments}>Sé el primero en comentar.</p>
                ) : (
                    <div style={styles.commentsList}>
                        {comments.map((c) => (
                            <div key={c.id} style={styles.commentCard}>
                                <div style={styles.commentHeader}>
                                    <div style={{ ...styles.commentAvatar, backgroundImage: c.user_avatar ? `url(${c.user_avatar})` : 'none', backgroundColor: c.user_avatar ? 'transparent' : 'var(--color-primary)' }} />
                                    <span style={styles.commentUser}>{c.user_name || 'Usuario'}</span>
                                </div>
                                <p style={styles.commentText}>{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {user && (
                    <div style={styles.inputRow}>
                        <input
                            style={styles.commentInput}
                            placeholder="Agrega un comentario..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                        />
                        <button style={styles.sendBtn} onClick={sendComment} disabled={submitting || !newComment.trim()}>
                            <Send size={18} color="#fff" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', backgroundColor: 'var(--color-bg-soft)', paddingBottom: '2rem' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' },
    hero: {
        width: '100%',
        height: '320px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
    },
    backBtn: { position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 },
    indicators: {
        position: 'absolute',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        zIndex: 5,
    },
    indicator: {
        width: '28px',
        height: '4px',
        borderRadius: '2px',
        transition: 'background-color 0.3s',
    },
    navHintLeft: {
        position: 'absolute',
        left: '0.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    navHintRight: {
        position: 'absolute',
        right: '0.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    imgCounter: {
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.25rem 0.6rem',
        borderRadius: '12px',
        zIndex: 5,
    },
    content: { padding: '1.25rem' },
    titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' },
    petName: { fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-text-dark)', margin: 0 },
    ageBadge: { backgroundColor: 'var(--color-primary)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
    tags: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
    tag: { backgroundColor: '#fff', border: '1.5px solid #e0e0e0', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-dark)' },
    location: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' },
    locationText: { fontSize: '0.9rem', color: 'var(--color-text-light)' },
    desc: { fontSize: '0.95rem', color: 'var(--color-text-light)', lineHeight: 1.6, marginBottom: '1.25rem' },
    contactBtn: {
        width: '100%',
        padding: '0.85rem',
        borderRadius: '50px',
        border: 'none',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 12px rgba(238,157,43,0.3)',
    },
    ownerNote: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        marginBottom: '1.25rem',
        fontStyle: 'italic',
    },
    sectionTitle: { fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-dark)', marginBottom: '0.75rem' },
    noComments: { color: 'var(--color-text-light)', fontSize: '0.9rem', marginBottom: '1rem' },
    commentsList: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
    commentCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '0.9rem', boxShadow: 'var(--shadow-soft)' },
    commentHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' },
    commentAvatar: { width: '30px', height: '30px', borderRadius: '50%', backgroundSize: 'cover', flexShrink: 0 },
    commentUser: { fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-text-dark)' },
    commentText: { fontSize: '0.9rem', color: 'var(--color-text-light)', margin: 0 },
    inputRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    commentInput: { flex: 1, padding: '0.75rem', borderRadius: '24px', border: '1.5px solid #e0e0e0', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', backgroundColor: '#fff' },
    sendBtn: { width: '44px', height: '44px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
};

export default AdoptionDetail;
