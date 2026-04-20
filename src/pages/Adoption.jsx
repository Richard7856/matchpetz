import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Star, SlidersHorizontal, MapPin, Info, Plus, MessageCircle, ChevronLeft, ChevronRight, RotateCcw, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { PET_TYPE_FILTERS } from '../constants/petTypes';
import { sendPush } from '../utils/pushNotify';

// ── localStorage helpers — persistir rechazados/likes por usuario ──────────
// Clave por usuario para que no se mezclen sesiones distintas
const seenKey  = (uid) => `mp_adopt_seen_${uid}`;
const getSeen  = (uid) => { try { return JSON.parse(localStorage.getItem(seenKey(uid)) || '{}'); } catch { return {}; } };
const markSeen = (uid, type, id) => {
    const d = getSeen(uid);
    const arr = d[type] || [];
    if (!arr.includes(id)) arr.push(id);
    d[type] = arr;
    localStorage.setItem(seenKey(uid), JSON.stringify(d));
};
const unmarkRejected = (uid, id) => {
    const d = getSeen(uid);
    d.rejected = (d.rejected || []).filter(x => x !== id);
    localStorage.setItem(seenKey(uid), JSON.stringify(d));
};
const clearSeen = (uid) => localStorage.removeItem(seenKey(uid));

const Adoption = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [pets, setPets] = useState([]);           // feed principal (sin vistos)
    const [rejectedPets, setRejectedPets] = useState([]); // los que dijo "no"
    const [allFetched, setAllFetched] = useState([]); // todos los del fetch (para rebuild)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showRejected, setShowRejected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('todos');
    const [genderFilter, setGenderFilter] = useState('todos');
    const [contactingId, setContactingId] = useState(null);
    const [imgIdx, setImgIdx] = useState(0);

    // Separa el feed principal de los rechazados usando el localStorage del usuario
    const applySeenFilter = useCallback((all) => {
        if (!user) { setPets(all); return; }
        const seen   = getSeen(user.id);
        const rejSet = new Set(seen.rejected || []);
        const likedSet = new Set(seen.liked || []);
        // Feed: excluye rechazados, likes y las propias mascotas
        setPets(all.filter(p => !rejSet.has(p.id) && !likedSet.has(p.id) && p.user_id !== user.id));
        // Drawer: solo rechazados (con datos completos para mostrar)
        setRejectedPets(all.filter(p => rejSet.has(p.id)));
    }, [user]);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('adoption_pets')
                .select('id, name, age, type, breed, gender, description, image_url, images, location, status, user_id, created_at')
                .eq('status', 'disponible')
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) {
                setAllFetched(data);
                applySeenFilter(data);
            }
            setLoading(false);
        };
        load();
    }, [applySeenFilter]);

    const advanceCard = (dir) => {
        setDirection(dir);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setImgIdx(0);
            setDirection(null);
        }, 300);
    };

    const handleSwipe = async (dir) => {
        if (currentIndex >= filteredPets.length) return;
        const pet = filteredPets[currentIndex];

        // ── Rechazo (izquierda) — guardar en localStorage ─────────────────
        if (dir === 'left') {
            if (user) markSeen(user.id, 'rejected', pet.id);
            advanceCard(dir);
            return;
        }

        // ── Super like (arriba) — avanza sin guardar como like permanente ──
        if (dir === 'up') {
            advanceCard(dir);
            return;
        }

        // ── Like (derecha) — marcar como visto + abrir chat con el dueño ──
        if (dir === 'right') {
            // Marcar ANTES de navegar: cuando vuelva, el pet ya no estará en el feed
            if (user) markSeen(user.id, 'liked', pet.id);

            if (user && pet.user_id && pet.user_id !== user.id) {
                setContactingId(pet.id);
                try {
                    const { data: existing } = await supabase
                        .from('conversations')
                        .select('id')
                        .or(
                            `and(user1_id.eq.${user.id},user2_id.eq.${pet.user_id}),and(user1_id.eq.${pet.user_id},user2_id.eq.${user.id})`
                        )
                        .maybeSingle();

                    if (existing) {
                        advanceCard(dir);
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
                        const notifTitle = `Alguien está interesado en adoptar a ${pet.name}`;
                        const notifBody  = 'Tienes un nuevo mensaje sobre tu mascota en adopción';
                        supabase.from('notifications').insert({
                            user_id: pet.user_id, type: 'adoption',
                            title: notifTitle, body: notifBody,
                            entity_id: conv.id, from_user_id: user.id,
                        });
                        sendPush(pet.user_id, notifTitle, notifBody, { type: 'adoption', entity_id: conv.id });
                        advanceCard(dir);
                        navigate(`/chat/${conv.id}`);
                        return;
                    }
                } catch {
                    alert('No se pudo iniciar el chat. Intenta de nuevo.');
                } finally {
                    setContactingId(null);
                }
            }
            advanceCard(dir);
        }
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
                        {/* Ver rechazados — solo visible si hay alguno */}
                        {rejectedPets.length > 0 && (
                            <button style={styles.iconBtn} onClick={() => setShowRejected(true)}>
                                <EyeOff size={22} color="var(--color-text-light)" />
                                <span style={styles.rejBadge}>{rejectedPets.length}</span>
                            </button>
                        )}
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
                        {(() => {
                            const allImgs = currentPet.images?.length > 0 ? currentPet.images : currentPet.image_url ? [currentPet.image_url] : [];
                            const totalImgs = allImgs.length;
                            const currentImgUrl = allImgs[imgIdx] || currentPet.image_url || '';
                            return (
                                <div style={{ ...styles.imageContainer, backgroundImage: `url(${currentImgUrl})` }}>
                                    {/* Image navigation */}
                                    {totalImgs > 1 && (
                                        <>
                                            <div style={styles.imgIndicators}>
                                                {allImgs.map((_, i) => (
                                                    <div key={i} style={{ ...styles.imgDot, backgroundColor: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
                                                ))}
                                            </div>
                                            <div style={styles.imgNavLeft} onClick={(e) => { e.stopPropagation(); setImgIdx(i => i > 0 ? i - 1 : totalImgs - 1); }}>
                                                <ChevronLeft size={20} color="rgba(255,255,255,0.8)" />
                                            </div>
                                            <div style={styles.imgNavRight} onClick={(e) => { e.stopPropagation(); setImgIdx(i => i < totalImgs - 1 ? i + 1 : 0); }}>
                                                <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
                                            </div>
                                            <div style={styles.imgCounter}>{imgIdx + 1}/{totalImgs}</div>
                                        </>
                                    )}
                                    <div style={styles.gradientOverlay}></div>
                                    <div style={styles.cardInfo}>
                                        <div style={styles.nameRow}>
                                            <h3 style={styles.petName}>
                                                {currentPet.name}, <span style={styles.petAge}>{currentPet.age}</span>
                                            </h3>
                                            <button style={styles.infoBtn} onClick={() => navigate(`/adoption/${currentPet.id}`)}>
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
                            );
                        })()}
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIconBg}>
                            <Heart size={40} color="var(--color-text-light)" />
                        </div>
                        <h3>¡No hay más peludos por ahora!</h3>
                        <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                            Vuelve más tarde o reinicia para ver desde el principio
                        </p>
                        {rejectedPets.length > 0 && (
                            <button
                                style={{ ...styles.secondaryBtn, marginTop: '1rem' }}
                                onClick={() => setShowRejected(true)}
                            >
                                <EyeOff size={16} /> Ver {rejectedPets.length} que descartaste
                            </button>
                        )}
                        <button
                            style={{ ...styles.primaryBtn, marginTop: '0.75rem' }}
                            onClick={() => {
                                if (user) clearSeen(user.id);
                                applySeenFilter(allFetched);
                                setCurrentIndex(0);
                            }}
                        >
                            <RotateCcw size={16} /> Reiniciar todo
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

            {/* ── Drawer: mascotas rechazadas ───────────────────────────── */}
            {showRejected && (
                <div style={styles.modalOverlay} onClick={() => setShowRejected(false)}>
                    <div style={styles.modalContent} className="fade-in" onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Descartados ({rejectedPets.length})</h3>
                            <button style={styles.iconBtn} onClick={() => setShowRejected(false)}>
                                <X size={24} color="var(--color-text-dark)" />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', margin: '0 0 1rem' }}>
                            Toca "Dar otra oportunidad" para volver a ver una mascota en el feed principal.
                        </p>
                        <div style={styles.rejGrid}>
                            {rejectedPets.map(p => {
                                const img = p.images?.[0] || p.image_url || '';
                                return (
                                    <div key={p.id} style={styles.rejCard}>
                                        <img
                                            src={img}
                                            alt={p.name}
                                            style={styles.rejImg}
                                            loading="lazy"
                                            onClick={() => navigate(`/adoption/${p.id}`)}
                                        />
                                        <div style={styles.rejInfo}>
                                            <span style={styles.rejName}>{p.name}</span>
                                            <span style={styles.rejBreed}>{p.breed || p.type}</span>
                                        </div>
                                        <button
                                            style={styles.unrejBtn}
                                            onClick={() => {
                                                if (user) unmarkRejected(user.id, p.id);
                                                // Quitar del drawer y volver al feed
                                                const updated = rejectedPets.filter(x => x.id !== p.id);
                                                setRejectedPets(updated);
                                                setPets(prev => [p, ...prev]);
                                                setCurrentIndex(0);
                                            }}
                                        >
                                            Dar otra oportunidad
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
        padding: 0,
        position: 'relative', // necesario para el badge de rechazados
    },
    imgIndicators: {
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '5px',
        zIndex: 5,
    },
    imgDot: {
        width: '24px',
        height: '3px',
        borderRadius: '2px',
        transition: 'background-color 0.3s',
    },
    imgNavLeft: {
        position: 'absolute',
        left: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        cursor: 'pointer',
    },
    imgNavRight: {
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        cursor: 'pointer',
    },
    imgCounter: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: '600',
        padding: '2px 8px',
        borderRadius: '10px',
        zIndex: 5,
    },
    cardsArea: {
        flex: 1,
        position: 'relative',
        padding: '0 0.75rem',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        minHeight: 0,   // allows flex child to shrink below content size
    },
    card: {
        width: '100%',
        height: '100%',
        maxHeight: 'none',
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
        padding: '0.85rem 0 1rem 0',
        flexShrink: 0,
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
        padding: '0.75rem 1.75rem',
        borderRadius: '50px',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    secondaryBtn: {
        backgroundColor: '#fff',
        color: 'var(--color-text-light)',
        border: '1.5px solid #e0e0e0',
        padding: '0.65rem 1.5rem',
        borderRadius: '50px',
        fontSize: '0.88rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    // ── Rejected badge en el botón del AppBar ──
    rejBadge: {
        position: 'absolute',
        top: 4, right: 4,
        minWidth: 14, height: 14,
        borderRadius: 7,
        backgroundColor: '#ff4b4b',
        color: '#fff',
        fontSize: '0.55rem',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 2px',
        lineHeight: 1,
    },
    // ── Rejected drawer ──
    rejGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    rejCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem',
        backgroundColor: '#fafafa',
        borderRadius: 14,
        border: '1px solid #f0f0f0',
    },
    rejImg: {
        width: 56, height: 56,
        borderRadius: 10,
        objectFit: 'cover',
        flexShrink: 0,
        cursor: 'pointer',
    },
    rejInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
    },
    rejName: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'var(--color-text-dark)',
    },
    rejBreed: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
    },
    unrejBtn: {
        flexShrink: 0,
        background: '#fff8ee',
        border: '1.5px solid #fde8b8',
        color: '#b36d00',
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '0.4rem 0.65rem',
        borderRadius: 10,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
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
