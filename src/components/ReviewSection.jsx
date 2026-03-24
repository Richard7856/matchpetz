import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

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

const StarRating = ({ rating, size = 14 }) => (
    <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={size} fill={i <= rating ? '#ee9d2b' : 'none'} color={i <= rating ? '#ee9d2b' : '#ccc'} />
        ))}
    </div>
);

const ReviewSection = ({ entityType, entityId, showForm = true }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [newRating, setNewRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [alreadyReviewed, setAlreadyReviewed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data: revs } = await supabase.from('reviews')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false });
            setReviews(revs || []);
            if (user && revs) {
                setAlreadyReviewed(revs.some(r => r.reviewer_id === user.id));
            }
            setLoading(false);
        };
        if (entityId) load();
    }, [entityType, entityId, user]);

    const submitReview = async () => {
        if (!newRating || !user) return;
        setSubmitting(true);
        const { data: profile } = await supabase.from('profiles')
            .select('display_name, avatar_url')
            .eq('id', user.id)
            .single();
        const reviewerName = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
        const { data: inserted, error } = await supabase.from('reviews').insert({
            entity_type: entityType,
            entity_id: entityId,
            reviewer_id: user.id,
            reviewer_name: reviewerName,
            reviewer_avatar: profile?.avatar_url || null,
            rating: newRating,
            comment: newComment.trim() || null,
        }).select().single();
        if (!error && inserted) {
            setReviews([inserted, ...reviews]);
            setAlreadyReviewed(true);
            setNewRating(0);
            setNewComment('');
        }
        setSubmitting(false);
    };

    const avgRatingNum = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;
    const avgRating = avgRatingNum !== null ? avgRatingNum.toFixed(1) : null;

    if (loading) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {avgRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <StarRating rating={Math.round(avgRatingNum)} size={18} />
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>{avgRating}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>({reviews.length})</span>
                </div>
            )}

            {showForm && user && !alreadyReviewed && (
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

            {alreadyReviewed && (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>Ya dejaste tu reseña.</p>
            )}

            {reviews.length > 0 && (
                <div style={styles.reviewsList}>
                    <h3 style={styles.sectionTitle}>Reseñas</h3>
                    {reviews.map((r) => (
                        <div key={r.id} style={styles.reviewCard}>
                            <div style={styles.reviewHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {r.reviewer_avatar && (
                                        <img src={r.reviewer_avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                    )}
                                    <span style={styles.reviewerName}>{r.reviewer_name || 'Usuario'}</span>
                                </div>
                                <StarRating rating={r.rating} size={12} />
                            </div>
                            {r.comment && <p style={styles.reviewComment}>{r.comment}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    reviewForm: { backgroundColor: '#fff', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    sectionTitle: { fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: 0 },
    commentInput: { padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e0e0e0', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
    submitBtn: { padding: '0.75rem', borderRadius: '14px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
    reviewsList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    reviewCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
    reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
    reviewerName: { fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-dark)' },
    reviewComment: { fontSize: '0.88rem', color: 'var(--color-text-light)', margin: 0 },
};

export { StarRating };
export default ReviewSection;
