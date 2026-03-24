import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Instagram, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const TYPE_LABELS = {
    vet: 'Veterinario', hotel: 'Hotel', grooming: 'Peluquería',
    walker: 'Paseador', trainer: 'Entrenador', spa: 'Spa',
};

const StarPicker = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
            <Star
                key={i}
                size={28}
                fill={i <= value ? '#ee9d2b' : 'none'}
                color={i <= value ? '#ee9d2b' : '#ccc'}
                style={{ cursor: 'pointer' }}
                onClick={() => onChange(i)}
            />
        ))}
    </div>
);

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [service, setService] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRating, setNewRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [{ data: svc }, { data: revs }] = await Promise.all([
                supabase.from('services').select('*').eq('id', id).single(),
                supabase.from('service_reviews').select('*').eq('service_id', id).order('created_at', { ascending: false }),
            ]);
            setService(svc);
            setReviews(revs || []);
            setLoading(false);
        };
        load();
    }, [id]);

    const submitReview = async () => {
        if (!newRating || !user) return;
        setSubmitting(true);
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
        const userName = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
        await supabase.from('service_reviews').insert({
            service_id: id,
            user_id: user.id,
            user_name: userName,
            rating: newRating,
            comment: newComment.trim() || null,
        });
        // Update average rating on services table
        const allRatings = [...reviews.map((r) => r.rating), newRating];
        const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        await supabase.from('services').update({ rating: avg.toFixed(2), review_count: allRatings.length }).eq('id', id);
        setReviews([{ user_name: userName, rating: newRating, comment: newComment.trim(), created_at: new Date().toISOString() }, ...reviews]);
        setNewRating(0);
        setNewComment('');
        setSubmitting(false);
    };

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!service) return <div style={styles.loading}>Servicio no encontrado.</div>;

    return (
        <div style={styles.container}>
            {/* Hero image */}
            <div style={{ ...styles.hero, backgroundImage: service.image_url ? `url(${service.image_url})` : 'none', backgroundColor: service.image_url ? 'transparent' : '#ccc' }}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="#fff" />
                </button>
            </div>

            <div style={styles.content}>
                {/* Type + name */}
                <p style={styles.typeLabel}>{TYPE_LABELS[service.type] || service.type}{service.specialty ? ` · ${service.specialty}` : ''}</p>
                <h2 style={styles.name}>{service.name}</h2>

                {/* Rating summary */}
                {service.review_count > 0 && (
                    <div style={styles.ratingRow}>
                        {[1,2,3,4,5].map((i) => (
                            <Star key={i} size={16} fill={i <= Math.round(service.rating) ? '#ee9d2b' : 'none'} color={i <= Math.round(service.rating) ? '#ee9d2b' : '#ccc'} />
                        ))}
                        <span style={styles.ratingText}>{Number(service.rating).toFixed(1)} ({service.review_count} reseñas)</span>
                    </div>
                )}

                {service.description && <p style={styles.desc}>{service.description}</p>}

                {/* Info row */}
                <div style={styles.infoGrid}>
                    {service.location && (
                        <div style={styles.infoItem}>
                            <MapPin size={16} color="var(--color-primary)" />
                            <span style={styles.infoText}>{service.location}</span>
                        </div>
                    )}
                    {service.price_range && (
                        <div style={styles.infoItem}>
                            <span style={styles.priceIcon}>💲</span>
                            <span style={styles.infoText}>{service.price_range}</span>
                        </div>
                    )}
                    {service.phone && (
                        <div style={styles.infoItem}>
                            <Phone size={16} color="var(--color-primary)" />
                            <span style={styles.infoText}>{service.phone}</span>
                        </div>
                    )}
                    {service.instagram && (
                        <div style={styles.infoItem}>
                            <Instagram size={16} color="var(--color-primary)" />
                            <span style={styles.infoText}>{service.instagram}</span>
                        </div>
                    )}
                </div>

                {/* Review form */}
                {user && (
                    <div style={styles.reviewForm}>
                        <h3 style={styles.sectionTitle}>Agregar reseña</h3>
                        <StarPicker value={newRating} onChange={setNewRating} />
                        <textarea
                            style={styles.commentInput}
                            rows={3}
                            placeholder="Comparte tu experiencia (opcional)..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button
                            style={{ ...styles.submitBtn, opacity: (!newRating || submitting) ? 0.5 : 1 }}
                            disabled={!newRating || submitting}
                            onClick={submitReview}
                        >
                            {submitting ? 'Enviando...' : 'Publicar reseña'}
                        </button>
                    </div>
                )}

                {/* Reviews list */}
                {reviews.length > 0 && (
                    <div style={styles.reviewsList}>
                        <h3 style={styles.sectionTitle}>Reseñas</h3>
                        {reviews.map((r, i) => (
                            <div key={i} style={styles.reviewCard}>
                                <div style={styles.reviewHeader}>
                                    <span style={styles.reviewerName}>{r.user_name || 'Usuario'}</span>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        {[1,2,3,4,5].map((s) => (
                                            <Star key={s} size={12} fill={s <= r.rating ? '#ee9d2b' : 'none'} color={s <= r.rating ? '#ee9d2b' : '#ccc'} />
                                        ))}
                                    </div>
                                </div>
                                {r.comment && <p style={styles.reviewComment}>{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)', paddingBottom: '2rem' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-light)' },
    hero: {
        width: '100%',
        height: '240px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
    },
    backBtn: {
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        background: 'rgba(0,0,0,0.4)',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    content: { padding: '1.25rem' },
    typeLabel: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.25rem' },
    name: { fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-dark)', margin: '0 0 0.5rem' },
    ratingRow: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' },
    ratingText: { fontSize: '0.85rem', color: 'var(--color-text-light)', marginLeft: '4px' },
    desc: { fontSize: '0.95rem', color: 'var(--color-text-light)', lineHeight: 1.6, marginBottom: '1rem' },
    infoGrid: { display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#fff', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-soft)' },
    infoItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    priceIcon: { fontSize: '14px' },
    infoText: { fontSize: '0.9rem', color: 'var(--color-text-dark)' },
    reviewForm: { backgroundColor: '#fff', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    sectionTitle: { fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: 0 },
    commentInput: { padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e0e0e0', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
    submitBtn: { padding: '0.75rem', borderRadius: '14px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
    reviewsList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    reviewCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '0.9rem', boxShadow: 'var(--shadow-soft)' },
    reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
    reviewerName: { fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-dark)' },
    reviewComment: { fontSize: '0.88rem', color: 'var(--color-text-light)', margin: 0 },
};

export default ServiceDetail;
