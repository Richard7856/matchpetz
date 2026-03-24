import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Star, SlidersHorizontal, MapPin, Info, Plus, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { PET_TYPE_FILTERS } from '../constants/petTypes';

const Adoption = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [pets, setPets] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('todos');
    const [genderFilter, setGenderFilter] = useState('todos');
    const [contactingId, setContactingId] = useState(null);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('adoption_pets')
                .select('id, name, age, type, breed, gender, description, image_url, images, location, status, user_id, created_at')
                .eq('status', 'disponible')
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) setPets(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleSwipe = async (dir) => {
        if (currentIndex >= filteredPets.length) return;
        const pet = filteredPets[currentIndex];

        // On "like" (right swipe / heart), start chat with owner
        if (dir === 'right' && user && pet.user_id && pet.user_id !== user.id) {
            setContactingId(pet.id);
            try {
                // Check if conversation already exists
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

                // Get owner name
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
                    // Send initial message
                    await supabase.from('messages').insert({
                        conversation_id: conv.id,
                        sender_id: user.id,
                        content: `Hola! Me interesa adoptar a ${pet.name} 🐾`,
                    });
                    navigate(`/chat/${conv.id}`);
                    return;
                }
            } catch (err) {
            } finally {
                setContactingId(null);
            }
        }

        setDirection(dir);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setDirection(null);
        }, 300);
    };

    const filteredPets = pets.filter((p) => {
        const typeOk = typeFilter === 'todos' || p.type === typeFilter;
        const genderOk = genderFilter === 'todos' || (p.gender || '').toLowerCase() === genderFilter;
        return typeOk && genderOk;
    });
    const currentPet = filteredPets[currentIndex];

    if (loading) {
        return (
            <div style={styles.container}>
                <AppBar title="Modo Adopción" backTo="/home" />
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                    Cargando mascotas...
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <AppBar
                title="Modo Adopción"
                backTo="/home"
                rightAction={
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button style={styles.iconBtn} onClick={() => navigate('/adoption/new')}>
                            <Plus size={24} color="var(--color-text-dark)" />
                        </button>
                        <button style={styles.iconBtn} onClick={() => setShowFilters(true)}>
                            <SlidersHorizontal size={24} color="var(--color-text-dark)" />
                        </button>
                    </div>
                }
            />

            <div style={styles.cardsArea}>
                {currentPet ? (
                    <div
                        style={{
                            ...styles.card,
                            transform: direction === 'left' ? 'translateX(-100%) rotate(-10deg)' :
                                direction === 'right' ? 'translateX(100%) rotate(10deg)' :
                                    direction === 'up' ? 'translateY(-100%) rotate(5deg)' : 'none',
                            opacity: direction ? 0 : 1,
                        }}
                    >
                        <div style={{ ...styles.imageContainer, backgroundImage: `url(${currentPet.image_url})` }}>
                            <div style={styles.gradientOverlay}></div>
                            <div style={styles.cardInfo}>
                                <div style={styles.nameRow}>
                                    <h3 style={styles.petName}>
                                        {currentPet.name}, <span style={styles.petAge}>{currentPet.age}</span>
                                    </h3>
                                    <button style={styles.infoBtn}>
                                        <Info size={16} color="#fff" />
                                    </button>
                                </div>
                                <div style={styles.locationRow}>
                                    <MapPin size={16} color="#ddd" />
                                    <span style={styles.distance}>{currentPet.location || 'CDMX'}</span>
                                </div>
                                <p style={styles.petDesc}>{currentPet.description}</p>
                                <div style={styles.tagRow}>
                                    <span style={styles.tag}>{currentPet.type}</span>
                                    {currentPet.breed && <span style={styles.tag}>{currentPet.breed}</span>}
                                    {currentPet.gender && <span style={styles.tag}>{currentPet.gender}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIconBg}>
                            <Heart size={40} color="var(--color-text-light)" />
                        </div>
                        <h3>¡No hay más peludos por ahora!</h3>
                        <p>Vuelve más tarde o ajusta tus filtros</p>
                        <button style={{ ...styles.primaryBtn, marginTop: '2rem' }} onClick={() => setCurrentIndex(0)}>
                            Volver a empezar
                        </button>
                    </div>
                )}
            </div>

            <div style={styles.actionArea}>
                <button
                    style={{ ...styles.actionBtn, borderColor: '#ff4b4b', color: '#ff4b4b' }}
                    onClick={() => handleSwipe('left')}
                    disabled={!currentPet}
                >
                    <X size={32} />
                </button>
                <button
                    style={{ ...styles.actionBtn, borderColor: '#00bcd4', color: '#00bcd4', transform: 'scale(0.8)' }}
                    onClick={() => handleSwipe('up')}
                    disabled={!currentPet}
                >
                    <Star size={24} />
                </button>
                <button
                    style={{ ...styles.actionBtn, borderColor: '#4caf50', color: '#4caf50' }}
                    onClick={() => handleSwipe('right')}
                    disabled={!currentPet || !!contactingId}
                >
                    {contactingId ? <MessageCircle size={28} /> : <Heart size={32} />}
                </button>
            </div>

            {showFilters && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} className="fade-in">
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Filtros de Búsqueda</h3>
                            <button style={styles.iconBtn} onClick={() => setShowFilters(false)}>
                                <X size={24} color="var(--color-text-dark)" />
                            </button>
                        </div>

                        <div style={styles.filterSection}>
                            <label style={styles.filterLabel}>Tipo de mascota</label>
                            <div style={styles.chipGroup}>
                                {PET_TYPE_FILTERS.map((t) => (
                                    <button
                                        key={t.value}
                                        style={{ ...styles.filterChip, ...(typeFilter === t.value ? styles.activeChip : {}) }}
                                        onClick={() => { setTypeFilter(t.value); setCurrentIndex(0); }}
                                    >
                                        {t.emoji ? `${t.emoji} ` : ''}{t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={styles.filterSection}>
                            <label style={styles.filterLabel}>Género</label>
                            <div style={styles.chipGroup}>
                                {['todos', 'macho', 'hembra'].map((g) => (
                                    <button
                                        key={g}
                                        style={{ ...styles.filterChip, ...(genderFilter === g ? styles.activeChip : {}) }}
                                        onClick={() => { setGenderFilter(g); setCurrentIndex(0); }}
                                    >
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button style={styles.applyBtn} onClick={() => setShowFilters(false)}>
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0
    },
    cardsArea: {
        flex: 1,
        position: 'relative',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    card: {
        width: '100%',
        height: '100%',
        maxHeight: '600px',
        borderRadius: '24px',
        backgroundColor: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 1
    },
    cardInfo: {
        position: 'relative',
        zIndex: 2,
        padding: '2rem 1.5rem',
        color: '#fff'
    },
    nameRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.2rem'
    },
    petName: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#fff',
        margin: 0
    },
    petAge: {
        fontSize: '1.5rem',
        fontWeight: 'normal',
        opacity: 0.9
    },
    infoBtn: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
    },
    locationRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
    },
    distance: {
        fontSize: '0.9rem',
        color: '#ddd'
    },
    petDesc: {
        fontSize: '1rem',
        color: '#eee',
        lineHeight: 1.4,
        marginBottom: '0.75rem',
    },
    tagRow: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '0.25rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '600',
    },
    actionArea: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.5rem 0 2rem 0',
    },
    actionBtn: {
        width: '65px',
        height: '65px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s',
        padding: 0
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
    },
    emptyIconBg: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
    },
    primaryBtn: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1rem 2rem',
        borderRadius: '50px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '480px',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        padding: '2rem 1.5rem',
        maxHeight: '85vh',
        overflowY: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
    },
    modalTitle: {
        fontSize: '1.4rem',
        fontWeight: 'bold',
        margin: 0
    },
    filterSection: {
        marginBottom: '1.5rem'
    },
    filterLabel: {
        display: 'block',
        fontSize: '1rem',
        fontWeight: 'bold',
        marginBottom: '0.8rem',
        color: 'var(--color-text-dark)'
    },
    chipGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.6rem'
    },
    filterChip: {
        background: '#f0f2f5',
        border: 'none',
        padding: '0.6rem 1rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        cursor: 'pointer'
    },
    activeChip: {
        background: 'var(--color-primary)',
        color: '#fff'
    },
    applyBtn: {
        width: '100%',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1rem',
        borderRadius: '50px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        marginTop: '1rem'
    }
};

export default Adoption;
