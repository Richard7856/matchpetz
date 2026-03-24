import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import ReviewSection from '../components/ReviewSection';

const SPECIES_LABELS = { perro: 'Perro', gato: 'Gato', otro: 'Otro' };

const PetProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pet, setPet] = useState(null);
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data: petData } = await supabase.from('pets').select('*').eq('id', id).single();
            if (petData) {
                setPet(petData);
                const { data: ownerData } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', petData.owner_id).single();
                setOwner(ownerData);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div style={styles.loading}>Cargando...</div>;
    if (!pet) return <div style={styles.loading}>Mascota no encontrada</div>;

    return (
        <div style={styles.container} className="fade-in">
            <div style={{ ...styles.hero, backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundColor: '#f0e6d3' }}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="#fff" />
                </button>
            </div>

            <div style={styles.content}>
                <h1 style={styles.name}>{pet.name}</h1>
                <div style={styles.tagsRow}>
                    <span style={styles.tag}>{SPECIES_LABELS[pet.species] || pet.species}</span>
                    {pet.breed && <span style={styles.tag}>{pet.breed}</span>}
                    {pet.age && <span style={styles.tag}>{pet.age}</span>}
                </div>

                {pet.description && <p style={styles.desc}>{pet.description}</p>}

                {owner && (
                    <div style={styles.ownerCard} onClick={() => navigate(`/users/${owner.id}`)}>
                        <img
                            src={getAvatarUrl(owner.avatar_url, owner.id)}
                            alt=""
                            style={styles.ownerAvatar}
                        />
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>Dueño</p>
                            <p style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)' }}>{owner.display_name || 'Usuario'}</p>
                        </div>
                    </div>
                )}

                <ReviewSection entityType="pet" entityId={id} />
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-light)' },
    hero: { width: '100%', height: '240px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
    backBtn: { position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    content: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    name: { fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-dark)', margin: 0 },
    tagsRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    tag: { padding: '0.35rem 0.8rem', borderRadius: '20px', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-dark)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    desc: { fontSize: '0.95rem', color: 'var(--color-text-light)', lineHeight: 1.6, margin: 0 },
    ownerCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' },
    ownerAvatar: { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' },
};

export default PetProfile;
