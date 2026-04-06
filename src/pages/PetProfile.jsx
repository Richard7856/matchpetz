import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import ReviewSection from '../components/ReviewSection';
import { useAuth } from '../contexts/AuthContext';

const SPECIES_LABELS = { perro: 'Perro', gato: 'Gato', otro: 'Otro' };

const LOOKING_FOR_LABELS = {
    amigos: { label: 'Busca amigos',          emoji: '🐾', color: '#e8f5e9', textColor: '#2e7d32' },
    pareja: { label: 'Busca pareja',           emoji: '❤️', color: '#fce4ec', textColor: '#c62828' },
    ambos:  { label: 'Busca amigos y pareja',  emoji: '✨', color: '#fff8ee', textColor: '#e65100' },
};

const PetProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [pet, setPet] = useState(null);
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data: petData } = await supabase.from('pets').select('*').eq('id', id).single();
            if (petData) {
                setPet(petData);
                const { data: ownerData } = await supabase
                    .from('profiles').select('id, display_name, avatar_url')
                    .eq('id', petData.owner_id).single();
                setOwner(ownerData);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!pet) return <div style={styles.loading}>Mascota no encontrada</div>;

    const isOwner = user?.id === pet.owner_id;
    const lf = pet.looking_for ? LOOKING_FOR_LABELS[pet.looking_for] : null;

    return (
        <div style={styles.container} className="fade-in">
            <div style={{ ...styles.hero, backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundColor: '#f0e6d3' }}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="#fff" />
                </button>
                {/* Edit button — only visible to owner */}
                {isOwner && (
                    <button style={styles.editBtn} onClick={() => navigate(`/pets/${id}/edit`)}>
                        <Pencil size={16} color="#fff" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>Editar</span>
                    </button>
                )}
            </div>

            <div style={styles.content}>
                <h1 style={styles.name}>{pet.name}</h1>

                <div style={styles.tagsRow}>
                    <span style={styles.tag}>{SPECIES_LABELS[pet.species] || pet.species}</span>
                    {pet.gender && <span style={styles.tag}>{pet.gender === 'macho' ? '♂ Macho' : '♀ Hembra'}</span>}
                    {pet.breed && <span style={styles.tag}>{pet.breed}</span>}
                    {pet.age && <span style={styles.tag}>{pet.age}</span>}
                    {pet.is_neutered && <span style={{ ...styles.tag, backgroundColor: '#f0fdf4', color: '#16a34a' }}>Castrado/a</span>}
                </div>

                {/* Looking for badge */}
                {lf && (
                    <div style={{ ...styles.lookingBadge, backgroundColor: lf.color }}>
                        <span>{lf.emoji}</span>
                        <span style={{ color: lf.textColor, fontWeight: '700', fontSize: '0.88rem' }}>{lf.label}</span>
                    </div>
                )}

                {pet.description && <p style={styles.desc}>{pet.description}</p>}

                {/* Personality tags */}
                {pet.tags && pet.tags.length > 0 && (
                    <div>
                        <p style={styles.sectionLabel}>Características</p>
                        <div style={styles.tagsRow}>
                            {pet.tags.map((tag) => (
                                <span key={tag} style={styles.personalityTag}>{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Owner card — hidden if viewing your own pet */}
                {owner && !isOwner && (
                    <div style={styles.ownerCard} onClick={() => navigate(`/users/${owner.id}`)}>
                        <img src={getAvatarUrl(owner.avatar_url, owner.id)} alt="" style={styles.ownerAvatar} />
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>Dueño</p>
                            <p style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)' }}>{owner.display_name || 'Usuario'}</p>
                        </div>
                    </div>
                )}

                {/* Reviews — only shown to non-owners */}
                {!isOwner && <ReviewSection entityType="pet" entityId={id} />}
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', backgroundColor: 'var(--color-bg-soft)' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' },
    hero: { width: '100%', height: '240px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
    backBtn: { position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', padding: 0, minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    editBtn: { position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '20px', padding: '0.45rem 0.9rem', minHeight: 'auto', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' },
    content: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    name: { fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-dark)', margin: 0 },
    tagsRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    tag: { padding: '0.35rem 0.8rem', borderRadius: '20px', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-dark)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    desc: { fontSize: '0.95rem', color: 'var(--color-text-light)', lineHeight: 1.6, margin: 0 },
    lookingBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', borderRadius: '20px', alignSelf: 'flex-start' },
    sectionLabel: { fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
    personalityTag: { padding: '0.3rem 0.7rem', borderRadius: '20px', backgroundColor: '#fff8ee', border: '1px solid #ffe0b2', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-primary)' },
    ownerCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' },
    ownerAvatar: { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' },
};

export default PetProfile;
