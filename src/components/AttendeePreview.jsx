import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star, MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';

const AttendeePreview = ({ userId, onClose }) => {
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [pets, setPets] = useState([]);
    const [avgRating, setAvgRating] = useState(null);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const load = async () => {
            const [{ data: p }, { data: petsList }, { data: reviews }] = await Promise.all([
                supabase.from('profiles').select('id, display_name, avatar_url, location').eq('id', userId).single(),
                supabase.from('pets').select('id, name, species, breed, image_url').eq('owner_id', userId),
                supabase.from('reviews').select('rating').eq('entity_type', 'profile').eq('entity_id', userId),
            ]);
            setProfile(p);
            setPets(petsList || []);
            if (reviews && reviews.length > 0) {
                const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                setAvgRating(Math.round(avg * 10) / 10);
                setReviewCount(reviews.length);
            }
            setLoading(false);
        };
        load();
    }, [userId]);

    // Block body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleSendMessage = async () => {
        if (!user || user.id === userId) return;

        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
            .limit(1);

        if (existing && existing.length > 0) {
            onClose();
            navigate('/chat/' + existing[0].id);
            return;
        }

        const { data: newConv, error } = await supabase.from('conversations').insert({
            user1_id: user.id,
            user2_id: userId,
            participant_name: profile?.display_name || 'Usuario',
            participant_avatar: profile?.avatar_url || null,
            last_message: '',
            unread_count: 0,
        }).select().single();

        if (!error && newConv) {
            onClose();
            navigate('/chat/' + newConv.id);
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={16}
                    fill={i <= Math.round(rating) ? '#fbbf24' : 'none'}
                    color={i <= Math.round(rating) ? '#fbbf24' : '#d1d5db'}
                />
            );
        }
        return stars;
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.sheet} onClick={e => e.stopPropagation()}>
                <div style={styles.dragHandle} />
                <button style={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                {loading ? (
                    <div style={styles.loadingBox}>Cargando...</div>
                ) : !profile ? (
                    <div style={styles.loadingBox}>Perfil no encontrado</div>
                ) : (
                    <div style={styles.content}>
                        {/* Header */}
                        <div style={styles.header}>
                            <img
                                src={getAvatarUrl(profile.avatar_url, profile.id)}
                                alt=""
                                style={styles.avatar}
                                loading="lazy"
                            />
                            <div>
                                <h3 style={styles.name}>{profile.display_name || 'Usuario'}</h3>
                                {profile.location && <p style={styles.location}>{profile.location}</p>}
                            </div>
                        </div>

                        {/* Rating */}
                        {avgRating !== null && (
                            <div style={styles.ratingRow}>
                                <div style={{ display: 'flex', gap: '2px' }}>{renderStars(avgRating)}</div>
                                <span style={styles.ratingText}>{avgRating} ({reviewCount})</span>
                            </div>
                        )}

                        {/* Pets */}
                        {pets.length > 0 && (
                            <div style={styles.section}>
                                <h4 style={styles.sectionTitle}>Mascotas</h4>
                                <div style={styles.petsScroll}>
                                    {pets.map(pet => (
                                        <div key={pet.id} style={styles.petCard} onClick={() => { onClose(); navigate(`/pets/${pet.id}`); }}>
                                            <div style={{
                                                ...styles.petImg,
                                                backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none',
                                                backgroundColor: '#f0e6d3',
                                            }} />
                                            <p style={styles.petName}>{pet.name}</p>
                                            <p style={styles.petSpecies}>{pet.species}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={styles.buttons}>
                            <button
                                style={styles.primaryBtn}
                                onClick={() => { onClose(); navigate(`/users/${userId}`); }}
                            >
                                <ChevronRight size={18} />
                                Ver perfil completo
                            </button>
                            {user && user.id !== userId && (
                                <button style={styles.secondaryBtn} onClick={handleSendMessage}>
                                    <MessageCircle size={18} />
                                    Enviar mensaje
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
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
        maxWidth: 480,
        maxHeight: '75vh',
        backgroundColor: '#fff',
        borderRadius: '20px 20px 0 0',
        position: 'relative',
        animation: 'slideUp 0.3s ease',
        overflowY: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
        margin: '12px auto 0',
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        background: '#f0f0f0',
        border: 'none',
        borderRadius: '50%',
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    loadingBox: {
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--color-text-light)',
    },
    content: {
        padding: '1.25rem 1.5rem 1.5rem',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: '50%',
        objectFit: 'cover',
    },
    name: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        margin: 0,
        color: 'var(--color-text-dark)',
    },
    location: {
        fontSize: '0.85rem',
        color: 'var(--color-text-light)',
        margin: '0.15rem 0 0',
    },
    ratingRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.25rem',
    },
    ratingText: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        fontWeight: '600',
    },
    section: {
        marginBottom: '1.25rem',
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: 'bold',
        margin: '0 0 0.5rem',
        color: 'var(--color-text-dark)',
    },
    petsScroll: {
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
        scrollbarWidth: 'none',
    },
    petCard: {
        minWidth: 90,
        textAlign: 'center',
        cursor: 'pointer',
    },
    petImg: {
        width: 56,
        height: 56,
        borderRadius: '14px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        margin: '0 auto 0.3rem',
    },
    petName: {
        fontSize: '0.85rem',
        fontWeight: '600',
        margin: 0,
        color: 'var(--color-text-dark)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    petSpecies: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
        margin: 0,
    },
    buttons: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    primaryBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '0.9rem',
        borderRadius: '14px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    secondaryBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: '#f5f5f5',
        color: 'var(--color-text-dark)',
        border: 'none',
        padding: '0.9rem',
        borderRadius: '14px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default AttendeePreview;
