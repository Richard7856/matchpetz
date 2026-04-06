// PetMatch.jsx — Tinder-style dog matching for MatchPetz
// Allows a user's pet to swipe on other pets in two modes: Amigos (friends) or Pareja (partner)
// Flow: select your pet → choose mode → swipe cards → celebrate matches

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, PawPrint, RefreshCw, MessageCircle, Camera, Tag, Zap, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

// --- Helper: resolve avatar URL the same way the app does elsewhere
const getAvatar = (url) => {
    if (!url) return `https://api.dicebear.com/7.x/adventurer/svg?seed=pet`;
    return url;
};

// ─── MATCH MODAL ────────────────────────────────────────────────────────────
const MatchModal = ({ myPet, matchedPet, mode, ownerProfile, onMessage, onContinue }) => (
    <div style={modalStyles.overlay}>
        <div style={modalStyles.card}>
            {/* Animated paw + hearts */}
            <div style={modalStyles.celebration}>
                {mode === 'pareja' ? '❤️' : '🐾'}
            </div>
            <h2 style={modalStyles.title}>
                {mode === 'pareja' ? '¡Es un Match! ❤️' : '¡Nuevos Amigos! 🐾'}
            </h2>
            <p style={modalStyles.subtitle}>
                <strong>{myPet.name}</strong> y <strong>{matchedPet.name}</strong> se gustaron mutuamente
            </p>

            {/* Pet photos side by side */}
            <div style={modalStyles.petsRow}>
                <div style={modalStyles.petThumb}>
                    <img src={getAvatar(myPet.image_url)} alt={myPet.name} style={modalStyles.petImg} />
                    <span style={modalStyles.petLabel}>{myPet.name}</span>
                </div>
                <div style={modalStyles.heartCenter}>
                    {mode === 'pareja' ? '💕' : '🐾'}
                </div>
                <div style={modalStyles.petThumb}>
                    <img src={getAvatar(matchedPet.image_url)} alt={matchedPet.name} style={modalStyles.petImg} />
                    <span style={modalStyles.petLabel}>{matchedPet.name}</span>
                </div>
            </div>

            {/* Action buttons */}
            <button style={modalStyles.messageBtn} onClick={onMessage}>
                <MessageCircle size={18} />
                Enviar Mensaje al Dueño
            </button>
            <button style={modalStyles.continueBtn} onClick={onContinue}>
                Seguir Explorando
            </button>
        </div>
    </div>
);

// ─── SWIPE CARD ─────────────────────────────────────────────────────────────
// Handles drag-to-swipe + tap-to-browse-photos (Tinder style)
const SwipeCard = ({ pet, onLike, onPass, isTop }) => {
    const cardRef    = useRef(null);
    const dragState  = useRef({ isDragging: false, startX: 0, currentX: 0, moved: false });
    const [dragX,    setDragX]    = useState(0);
    const [photoIdx, setPhotoIdx] = useState(0);   // which photo is shown

    // Build the photos array: prefer images[], fall back to image_url
    const photos = (pet.images && pet.images.length > 0)
        ? pet.images
        : pet.image_url ? [pet.image_url] : [];
    const totalPhotos = photos.length;
    const currentPhoto = getAvatar(photos[photoIdx] || pet.image_url);

    // Reset photo index whenever the pet changes (new card on top)
    useEffect(() => { setPhotoIdx(0); }, [pet.id]);

    // Swipe threshold in px
    const THRESHOLD = 90;

    const handleDragStart = (clientX) => {
        dragState.current = { isDragging: true, startX: clientX, currentX: clientX, moved: false };
    };
    const handleDragMove = (clientX) => {
        if (!dragState.current.isDragging) return;
        const delta = clientX - dragState.current.startX;
        if (Math.abs(delta) > 5) dragState.current.moved = true;
        dragState.current.currentX = delta;
        setDragX(delta);
    };
    const handleDragEnd = (clientX, cardWidth) => {
        if (!dragState.current.isDragging) return;
        dragState.current.isDragging = false;
        const delta = dragState.current.currentX;

        if (!dragState.current.moved && totalPhotos > 1) {
            // Short tap without drag → navigate photos
            const tapLeft = clientX < cardWidth / 2;
            setPhotoIdx(i => tapLeft
                ? (i - 1 + totalPhotos) % totalPhotos
                : (i + 1) % totalPhotos
            );
            setDragX(0);
            return;
        }

        if (delta > THRESHOLD)       onLike();
        else if (delta < -THRESHOLD) onPass();
        else                         setDragX(0);
    };

    // Touch handlers
    const onTouchStart = (e) => handleDragStart(e.touches[0].clientX);
    const onTouchMove  = (e) => handleDragMove(e.touches[0].clientX);
    const onTouchEnd   = (e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        const lastX = e.changedTouches[0].clientX;
        handleDragEnd(lastX, rect?.width || 300);
    };

    // Mouse handlers (desktop testing)
    const onMouseDown  = (e) => handleDragStart(e.clientX);
    const onMouseMove  = (e) => { if (dragState.current.isDragging) handleDragMove(e.clientX); };
    const onMouseUp    = (e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        handleDragEnd(e.clientX, rect?.width || 300);
    };
    const onMouseLeave = (e) => { if (dragState.current.isDragging) handleDragEnd(e.clientX, cardRef.current?.offsetWidth || 300); };

    const dragRatio  = Math.min(Math.abs(dragX) / THRESHOLD, 1);
    const isLiking   = dragX > 30;
    const isPassing  = dragX < -30;

    const cardTransform = isTop
        ? `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`
        : 'scale(0.96) translateY(10px)';

    return (
        <div
            ref={cardRef}
            style={{
                ...cardStyles.card,
                transform: cardTransform,
                transition: dragState.current.isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: isTop ? 2 : 1,
                cursor: isTop ? 'grab' : 'default',
            }}
            onTouchStart={isTop ? onTouchStart : undefined}
            onTouchMove={isTop ? onTouchMove : undefined}
            onTouchEnd={isTop ? onTouchEnd : undefined}
            onMouseDown={isTop ? onMouseDown : undefined}
            onMouseMove={isTop ? onMouseMove : undefined}
            onMouseUp={isTop ? onMouseUp : undefined}
            onMouseLeave={isTop ? onMouseLeave : undefined}
        >
            {/* Full-bleed background photo */}
            <div style={{ ...cardStyles.imageWrapper, backgroundImage: `url(${currentPhoto})` }}>

                {/* ── Photo dots indicator (top center) ── */}
                {totalPhotos > 1 && (
                    <div style={cardStyles.dotsRow}>
                        {photos.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    ...cardStyles.dot,
                                    backgroundColor: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                                    width: i === photoIdx ? '22px' : '6px',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ── Swipe direction overlays ── */}
                {isTop && isLiking && (
                    <div style={{ ...cardStyles.overlay, ...cardStyles.likeOverlay, opacity: dragRatio }}>
                        <span style={cardStyles.overlayText}>❤️ LIKE</span>
                    </div>
                )}
                {isTop && isPassing && (
                    <div style={{ ...cardStyles.overlay, ...cardStyles.passOverlay, opacity: dragRatio }}>
                        <span style={cardStyles.overlayText}>✕ PASO</span>
                    </div>
                )}

                {/* ── Gradient + info overlay ── */}
                <div style={cardStyles.gradient} />
                <div style={cardStyles.info}>
                    <div style={cardStyles.nameRow}>
                        <h3 style={cardStyles.name}>{pet.name}</h3>
                        {pet.age && <span style={cardStyles.age}>{pet.age}</span>}
                        {pet.gender && (
                            <span style={{
                                ...cardStyles.genderPill,
                                backgroundColor: pet.gender === 'macho' ? 'rgba(66,133,244,0.85)' : 'rgba(220,53,69,0.85)',
                            }}>
                                {pet.gender === 'macho' ? '♂ Macho' : '♀ Hembra'}
                                {pet.is_neutered ? ' · Cast.' : ''}
                            </span>
                        )}
                    </div>
                    {pet.breed && <p style={cardStyles.breed}>{pet.breed}</p>}
                    {pet.description && <p style={cardStyles.description}>{pet.description}</p>}
                    {pet.tags && pet.tags.length > 0 && (
                        <div style={cardStyles.tagsRow}>
                            {pet.tags.slice(0, 5).map((tag) => (
                                <span key={tag} style={cardStyles.tagChip}>{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const PetMatch = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // UI phases
    const [phase, setPhase] = useState('loading'); // loading | select-pet | select-mode | swiping | empty | no-pets | likes-received

    // Data
    const [userPets, setUserPets]     = useState([]);
    const [activePet, setActivePet]   = useState(null);
    const [mode, setMode]             = useState('amigos');
    const [candidates, setCandidates] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false); // prevents double-swipe

    // Match modal
    const [matchData, setMatchData] = useState(null); // { matchedPet, ownerProfile }

    // Likes received by active pet (from other pets that swiped right on ours)
    const [likesReceived, setLikesReceived] = useState([]);

    // ── Load user's pets on mount ──────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const { data, error } = await supabase
                .from('pets')
                .select('id, name, breed, age, image_url, species')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true });

            if (error || !data || data.length === 0) {
                setPhase('no-pets');
                return;
            }
            setUserPets(data);
            // If only one pet, skip selection and go straight to mode choice
            if (data.length === 1) {
                setActivePet(data[0]);
                setPhase('select-mode');
            } else {
                setPhase('select-pet');
            }
        };
        load();
    }, [user]);

    // ── Load candidate pets when mode + activePet are set ─────────────────
    const loadCandidates = useCallback(async (pet, selectedMode) => {
        if (!pet || !user) return;

        // Step 1: get IDs the active pet has already swiped in this mode
        const { data: alreadySwiped } = await supabase
            .from('pet_swipes')
            .select('target_pet_id')
            .eq('swiper_pet_id', pet.id)
            .eq('mode', selectedMode);

        const excludeIds = (alreadySwiped || []).map(s => s.target_pet_id);
        // Also exclude all pets owned by the current user
        const { data: ownPets } = await supabase
            .from('pets')
            .select('id')
            .eq('owner_id', user.id);
        const ownIds = (ownPets || []).map(p => p.id);

        const allExclude = [...new Set([...excludeIds, ...ownIds, pet.id])];

        // Step 2: fetch candidate pets — no profile join to avoid FK issues
        // looking_for: same mode, 'ambos', or NULL (pets before migration 014)
        let query = supabase
            .from('pets')
            .select('id, name, breed, age, image_url, images, description, species, owner_id, tags, looking_for, gender, is_neutered')
            .eq('species', pet.species || 'perro')
            .or(`looking_for.eq.${selectedMode},looking_for.eq.ambos,looking_for.is.null`)
            .order('created_at', { ascending: false })
            .limit(50);

        // In pareja mode, only show opposite gender (if active pet has gender set)
        // This avoids showing two machos to each other, etc.
        if (selectedMode === 'pareja' && pet.gender) {
            const oppositeGender = pet.gender === 'macho' ? 'hembra' : 'macho';
            query = query.eq('gender', oppositeGender);
        }

        // Exclude already-swiped + own pets
        if (allExclude.length > 0) {
            query = query.not('id', 'in', `(${allExclude.join(',')})`);
        }

        const { data: pets, error: candidatesErr } = await query;

        if (candidatesErr) {
            console.error('PetMatch candidates error:', candidatesErr.message);
            setPhase('empty');
            return;
        }

        // Fetch owner profiles separately so missing profiles don't block results
        const ownerIds = [...new Set((pets || []).map(p => p.owner_id).filter(Boolean))];
        let profileMap = {};
        if (ownerIds.length > 0) {
            const { data: profileRows } = await supabase
                .from('profiles')
                .select('id, display_name, location')
                .in('id', ownerIds);
            (profileRows || []).forEach(pr => { profileMap[pr.id] = pr; });
        }

        const enriched = (pets || []).map(p => ({
            ...p,
            owner_location: profileMap[p.owner_id]?.location || null,
            owner_name: profileMap[p.owner_id]?.display_name || 'Usuario',
        }));

        setCandidates(enriched);
        setCurrentIdx(0);
        setPhase(enriched.length > 0 ? 'swiping' : 'empty');
    }, [user]);

    // ── Load pets that liked the active pet (pending likes, no mutual match yet) ──
    const loadLikesReceived = useCallback(async (pet) => {
        if (!pet) return;
        // Find swipes where others liked our pet
        const { data: swipes } = await supabase
            .from('pet_swipes')
            .select('swiper_pet_id, mode')
            .eq('target_pet_id', pet.id)
            .eq('liked', true);

        if (!swipes || swipes.length === 0) { setLikesReceived([]); return; }

        // Filter out ones we already swiped back on (mutual matches already exist)
        const { data: ourSwipes } = await supabase
            .from('pet_swipes')
            .select('target_pet_id')
            .eq('swiper_pet_id', pet.id);
        const alreadySwiped = new Set((ourSwipes || []).map(s => s.target_pet_id));

        const pendingIds = swipes
            .filter(s => !alreadySwiped.has(s.swiper_pet_id))
            .map(s => s.swiper_pet_id);

        if (pendingIds.length === 0) { setLikesReceived([]); return; }

        const { data: petRows } = await supabase
            .from('pets')
            .select('id, name, breed, age, image_url, images, gender, is_neutered, tags, owner_id')
            .in('id', pendingIds);

        setLikesReceived(petRows || []);
    }, []);

    // ── Handle pet selection ────────────────────────────────────────────────
    const handleSelectPet = (pet) => {
        setActivePet(pet);
        setPhase('select-mode');
    };

    // ── Handle mode selection ───────────────────────────────────────────────
    const handleSelectMode = (selectedMode) => {
        setMode(selectedMode);
        loadCandidates(activePet, selectedMode);
        loadLikesReceived(activePet); // also refresh likes count
    };

    // ── Core swipe logic ────────────────────────────────────────────────────
    const handleSwipe = useCallback(async (liked) => {
        if (isProcessing || !activePet) return;
        const target = candidates[currentIdx];
        if (!target) return;

        setIsProcessing(true);

        // Record the swipe
        await supabase.from('pet_swipes').insert({
            swiper_pet_id: activePet.id,
            target_pet_id: target.id,
            mode,
            liked,
        });

        // If liked, check for mutual match
        if (liked) {
            const { data: reverseSwipe } = await supabase
                .from('pet_swipes')
                .select('id')
                .eq('swiper_pet_id', target.id)
                .eq('target_pet_id', activePet.id)
                .eq('mode', mode)
                .eq('liked', true)
                .maybeSingle();

            if (reverseSwipe) {
                // Mutual match! Record it (order IDs for uniqueness constraint)
                const [p1, p2] = [activePet.id, target.id].sort();
                await supabase.from('pet_matches').upsert(
                    { pet1_id: p1, pet2_id: p2, mode },
                    { onConflict: 'pet1_id,pet2_id,mode', ignoreDuplicates: true }
                );
                setMatchData({ matchedPet: target });
                setIsProcessing(false);
                return; // pause on match modal, don't advance card yet
            }
        }

        // Advance to next card
        setCurrentIdx(prev => prev + 1);
        setIsProcessing(false);
    }, [activePet, candidates, currentIdx, mode, isProcessing]);

    const handleLike = () => handleSwipe(true);
    const handlePass = () => handleSwipe(false);

    // ── After match modal: send message to owner ───────────────────────────
    const handleMessageOwner = async () => {
        if (!matchData) return;
        const ownerId = matchData.matchedPet.owner_id;
        // Find or create a direct conversation with this owner
        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .or(`user1_id.eq.${ownerId},user2_id.eq.${ownerId}`)
            .not('is_group', 'is', true)
            .maybeSingle();

        if (existing) {
            navigate('/chat/' + existing.id);
        } else {
            const { data: newConv } = await supabase.from('conversations').insert({
                user1_id: user.id,
                user2_id: ownerId,
                participant_name: matchData.matchedPet.owner_name || 'Usuario',
                participant_avatar: null,
                last_message: '',
                unread_count: 0,
            }).select().single();
            if (newConv) navigate('/chat/' + newConv.id);
        }
    };

    const handleContinueAfterMatch = () => {
        setMatchData(null);
        setCurrentIdx(prev => prev + 1);
    };

    // ── Reload candidates when all cards are swiped ────────────────────────
    const handleReload = () => {
        if (activePet && mode) loadCandidates(activePet, mode);
    };

    // ────────────────────────────────────────────────────────────────────────
    // RENDER PHASES
    // ────────────────────────────────────────────────────────────────────────

    if (phase === 'loading') {
        return <div style={containerStyles.centered}><p style={containerStyles.hint}>Cargando...</p></div>;
    }

    // User has no pets registered — invite them to add the first one
    if (phase === 'no-pets') {
        return (
            <div style={containerStyles.centered}>
                <div style={noPetsStyles.illustration}><PawPrint size={64} color="var(--color-primary)" /></div>
                <h3 style={noPetsStyles.title}>¡Registra a tu mascota!</h3>
                <p style={noPetsStyles.body}>
                    Para usar Pet Match necesitas tener al menos una mascota registrada.
                    ¡Es rápido y tu peludo podrá encontrar nuevos amigos!
                </p>

                {/* Step hints */}
                <div style={noPetsStyles.steps}>
                    <div style={noPetsStyles.step}>
                        <Camera size={18} color="var(--color-primary)" />
                        <span>Sube una foto de tu mascota</span>
                    </div>
                    <div style={noPetsStyles.step}>
                        <Tag size={18} color="var(--color-primary)" />
                        <span>Cuéntanos su nombre y raza</span>
                    </div>
                    <div style={noPetsStyles.step}>
                        <Zap size={18} color="var(--color-primary)" />
                        <span>Empieza a hacer match</span>
                    </div>
                </div>

                <button style={containerStyles.primaryBtn} onClick={() => navigate('/pets/new')}>
                    <PawPrint size={18} color="#fff" /> Registrar mi primera mascota
                </button>
            </div>
        );
    }

    // Select which of the user's pets will swipe
    if (phase === 'select-pet') {
        return (
            <div style={containerStyles.phase}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
                <h3 style={containerStyles.phaseTitle}>¿Con cuál mascota quieres explorar?</h3>
                <div style={containerStyles.petGrid}>
                    {userPets.map(pet => (
                        <button key={pet.id} style={containerStyles.petCard} onClick={() => handleSelectPet(pet)}>
                            <img src={getAvatar(pet.image_url)} alt={pet.name} style={containerStyles.petCardImg} />
                            <span style={containerStyles.petCardName}>{pet.name}</span>
                            {pet.breed && <span style={containerStyles.petCardBreed}>{pet.breed}</span>}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Select mode: Amigos or Pareja
    if (phase === 'select-mode') {
        return (
            <div style={containerStyles.phase}>
                <img src={getAvatar(activePet?.image_url)} alt={activePet?.name} style={containerStyles.activePetImg} />
                <h3 style={containerStyles.phaseTitle}>¿Qué busca {activePet?.name}?</h3>
                <p style={containerStyles.hint}>Elige el tipo de conexión que quieres encontrar</p>
                <div style={containerStyles.modeRow}>
                    <button style={containerStyles.modeCard} onClick={() => handleSelectMode('amigos')}>
                        <span style={containerStyles.modeEmoji}>🐾</span>
                        <span style={containerStyles.modeLabel}>Amigos</span>
                        <span style={containerStyles.modeDesc}>Compañeros de juego y paseos</span>
                    </button>
                    <button style={containerStyles.modeCard} onClick={() => handleSelectMode('pareja')}>
                        <span style={containerStyles.modeEmoji}>❤️</span>
                        <span style={containerStyles.modeLabel}>Pareja</span>
                        <span style={containerStyles.modeDesc}>Amor peludo especial</span>
                    </button>
                </div>
                {userPets.length > 1 && (
                    <button style={containerStyles.backLink} onClick={() => setPhase('select-pet')}>
                        ← Cambiar mascota
                    </button>
                )}
            </div>
        );
    }

    // ── Likes received: show who liked your pet ────────────────────────────
    if (phase === 'likes-received') {
        return (
            <div style={containerStyles.phase}>
                <div style={likesStyles.header}>
                    <button style={containerStyles.backLink} onClick={() => setPhase('swiping')}>
                        ← Volver
                    </button>
                    <h3 style={likesStyles.title}>
                        <Sparkles size={18} color="var(--color-primary)" />
                        A estas mascotas les gustó {activePet?.name}
                    </h3>
                </div>

                {likesReceived.length === 0 ? (
                    <div style={containerStyles.centered}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🐾</div>
                        <p style={containerStyles.hint}>Aún no hay likes recibidos. ¡Sigue explorando!</p>
                    </div>
                ) : (
                    <div style={likesStyles.grid}>
                        {likesReceived.map(lp => (
                            <div key={lp.id} style={likesStyles.card}>
                                {/* Blurred photo (reveal on mutual) */}
                                <div style={{
                                    ...likesStyles.photo,
                                    backgroundImage: `url(${getAvatar(lp.images?.[0] || lp.image_url)})`,
                                }} />
                                <div style={likesStyles.cardInfo}>
                                    <span style={likesStyles.petName}>{lp.name}</span>
                                    {lp.breed && <span style={likesStyles.petBreed}>{lp.breed}</span>}
                                    {lp.gender && (
                                        <span style={{
                                            ...likesStyles.genderPill,
                                            backgroundColor: lp.gender === 'macho' ? '#e8f0fe' : '#fce4ec',
                                            color: lp.gender === 'macho' ? '#1a73e8' : '#c62828',
                                        }}>
                                            {lp.gender === 'macho' ? '♂ Macho' : '♀ Hembra'}
                                        </span>
                                    )}
                                </div>
                                {/* Action: like back to create match */}
                                <button
                                    style={likesStyles.likeBackBtn}
                                    onClick={async () => {
                                        // Register our like back → triggers match check
                                        await supabase.from('pet_swipes').insert({
                                            swiper_pet_id: activePet.id,
                                            target_pet_id: lp.id,
                                            mode,
                                            liked: true,
                                        });
                                        // Record the mutual match
                                        const [p1, p2] = [activePet.id, lp.id].sort();
                                        await supabase.from('pet_matches').upsert(
                                            { pet1_id: p1, pet2_id: p2, mode },
                                            { onConflict: 'pet1_id,pet2_id,mode', ignoreDuplicates: true }
                                        );
                                        // Show match modal and remove from likes list
                                        setMatchData({ matchedPet: { ...lp, owner_name: 'Usuario' } });
                                        setLikesReceived(prev => prev.filter(p => p.id !== lp.id));
                                    }}
                                >
                                    <Heart size={16} fill="#fff" color="#fff" />
                                    Match
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Match modal can show from here too */}
                {matchData && (
                    <MatchModal
                        myPet={activePet}
                        matchedPet={matchData.matchedPet}
                        mode={mode}
                        onMessage={handleMessageOwner}
                        onContinue={() => { setMatchData(null); }}
                    />
                )}
            </div>
        );
    }

    // No more candidates
    if (phase === 'empty' || currentIdx >= candidates.length) {
        return (
            <div style={containerStyles.centered}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😴</div>
                <h3 style={containerStyles.emptyTitle}>No hay más perfiles por ahora</h3>
                <p style={containerStyles.hint}>Vuelve más tarde cuando haya nuevas mascotas o prueba con otro modo.</p>
                <button style={containerStyles.primaryBtn} onClick={handleReload}>
                    <RefreshCw size={16} />  Intentar de nuevo
                </button>
                <button style={containerStyles.backLink} onClick={() => setPhase('select-mode')}>
                    Cambiar modo
                </button>
            </div>
        );
    }

    // Main swiping UI
    const topPet  = candidates[currentIdx];
    const nextPet = candidates[currentIdx + 1];

    return (
        <div style={swipeStyles.container}>
            {/* Header row: title + likes badge + mode chip + change */}
            <div style={swipeStyles.header}>
                <div style={swipeStyles.headerLeft}>
                    <PawPrint size={20} color="var(--color-primary)" />
                    <span style={swipeStyles.headerTitle}>Pet Match</span>
                </div>
                <div style={swipeStyles.modeBar}>
                    {/* Likes received badge */}
                    {likesReceived.length > 0 && (
                        <button style={swipeStyles.likesBtn} onClick={() => setPhase('likes-received')}>
                            <Sparkles size={14} />
                            {likesReceived.length} {likesReceived.length === 1 ? 'like' : 'likes'}
                        </button>
                    )}
                    <span style={swipeStyles.modeChip}>
                        {mode === 'amigos' ? '🐾 Amigos' : '❤️ Pareja'}
                    </span>
                    <button style={swipeStyles.changeModeBtn} onClick={() => setPhase('select-mode')}>
                        Cambiar
                    </button>
                </div>
            </div>

            {/* Card stack */}
            <div style={swipeStyles.cardStack}>
                {/* Background card (next) */}
                {nextPet && <SwipeCard pet={nextPet} isTop={false} onLike={() => {}} onPass={() => {}} />}
                {/* Foreground card (current) */}
                <SwipeCard key={topPet.id} pet={topPet} isTop onLike={handleLike} onPass={handlePass} />
            </div>

            {/* Action buttons */}
            <div style={swipeStyles.actions}>
                <button
                    style={{ ...swipeStyles.actionBtn, ...swipeStyles.passBtn }}
                    onClick={handlePass}
                    disabled={isProcessing}
                >
                    <X size={28} color="#ff4b4b" />
                </button>
                <button
                    style={{ ...swipeStyles.actionBtn, ...swipeStyles.likeBtn }}
                    onClick={handleLike}
                    disabled={isProcessing}
                >
                    {mode === 'amigos'
                        ? <PawPrint size={28} color="#ee9d2b" />
                        : <Heart size={28} color="#ff4b4b" fill="#ff4b4b" />
                    }
                </button>
            </div>

            <p style={swipeStyles.hint}>Arrastra la tarjeta o usa los botones</p>

            {/* Match modal overlay */}
            {matchData && (
                <MatchModal
                    myPet={activePet}
                    matchedPet={matchData.matchedPet}
                    mode={mode}
                    onMessage={handleMessageOwner}
                    onContinue={handleContinueAfterMatch}
                />
            )}
        </div>
    );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const containerStyles = {
    centered: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, padding: '2rem 1.5rem', textAlign: 'center',
    },
    phase: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '1.5rem 1.25rem 2rem', overflowY: 'auto',
    },
    phaseTitle: { fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: '0.5rem 0', textAlign: 'center' },
    emptyTitle: { fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: '0 0 0.5rem' },
    hint: { fontSize: '0.85rem', color: 'var(--color-text-light)', lineHeight: 1.5, margin: '0 0 1.5rem', textAlign: 'center' },
    primaryBtn: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'var(--color-primary)', color: '#fff', border: 'none',
        padding: '0.85rem 2rem', borderRadius: '50px', fontSize: '1rem', fontWeight: '700',
        cursor: 'pointer', marginBottom: '0.75rem',
    },
    backLink: {
        background: 'none', border: 'none', color: 'var(--color-text-light)',
        fontSize: '0.85rem', cursor: 'pointer', padding: '0.5rem', width: 'auto', minHeight: 'auto',
    },
    petGrid: { display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', width: '100%', marginTop: '1rem' },
    petCard: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
        background: '#fff', border: '2px solid #f0f0f0', borderRadius: '16px',
        padding: '1rem', cursor: 'pointer', width: '140px', minHeight: 'auto',
        transition: 'border-color 0.2s',
    },
    petCardImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' },
    petCardName: { fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-dark)' },
    petCardBreed: { fontSize: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center' },
    activePetImg: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', marginBottom: '0.75rem' },
    modeRow: { display: 'flex', gap: '1rem', marginTop: '0.5rem', width: '100%', maxWidth: '380px' },
    modeCard: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
        background: '#fff', border: '2px solid #f0f0f0', borderRadius: '20px',
        padding: '1.25rem 1rem', cursor: 'pointer', minHeight: 'auto',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    modeEmoji: { fontSize: '2rem' },
    modeLabel: { fontWeight: '700', fontSize: '1rem', color: 'var(--color-text-dark)' },
    modeDesc: { fontSize: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center', lineHeight: 1.3 },
};

const cardStyles = {
    // Card is absolutely positioned inside the fixed-height cardStack
    card: {
        position: 'absolute', inset: 0,
        borderRadius: '24px', overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        userSelect: 'none', WebkitUserSelect: 'none',
    },
    // Photo fills the entire card — no fixed px height, just 100%
    imageWrapper: {
        width: '100%', height: '100%',
        backgroundSize: 'cover', backgroundPosition: 'center',
        position: 'relative', display: 'flex',
        flexDirection: 'column', justifyContent: 'flex-end',
    },
    // Like / Pass tint overlays
    overlay: {
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3,
    },
    likeOverlay: { backgroundColor: 'rgba(34,197,94,0.35)' },
    passOverlay: { backgroundColor: 'rgba(239,68,68,0.35)' },
    overlayText: {
        fontSize: '2rem', fontWeight: '900', color: '#fff',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)', letterSpacing: '2px',
    },
    // Gradient so text is legible over any photo
    gradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '55%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 1,
    },
    // Info sits on top of gradient — never affects card height
    info: {
        position: 'relative', zIndex: 2,
        padding: '1.5rem 1.25rem 1.1rem',
        display: 'flex', flexDirection: 'column', gap: '0.25rem',
    },
    nameRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
    name: { fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#fff' },
    age:  { fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    genderPill: {
        fontSize: '0.75rem', fontWeight: '700', color: '#fff',
        padding: '0.2rem 0.55rem', borderRadius: '20px',
    },
    breed: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0 },
    description: {
        fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', margin: 0,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', lineHeight: 1.4,
    },
    tagsRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.1rem' },
    tagChip: {
        padding: '0.2rem 0.55rem', borderRadius: '12px',
        backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
        fontSize: '0.72rem', fontWeight: '600', color: '#fff',
    },
    // Photo navigation dots (top center of card)
    dotsRow: {
        position: 'absolute', top: '10px', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: '4px', zIndex: 4,
    },
    dot: {
        height: '4px', borderRadius: '2px',
        transition: 'width 0.25s, background-color 0.25s',
    },
};

// ─── LIKES RECEIVED STYLES ───────────────────────────────────────────────────
const likesStyles = {
    header: {
        width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem',
    },
    title: {
        fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text-dark)',
        display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0,
    },
    grid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem', width: '100%', overflowY: 'auto',
    },
    card: {
        borderRadius: '16px', overflow: 'hidden',
        backgroundColor: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
    },
    photo: {
        width: '100%', aspectRatio: '1 / 1',
        backgroundSize: 'cover', backgroundPosition: 'center',
    },
    cardInfo: {
        padding: '0.6rem 0.75rem 0.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.2rem',
    },
    petName:  { fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-text-dark)' },
    petBreed: { fontSize: '0.75rem', color: 'var(--color-text-light)' },
    genderPill: {
        alignSelf: 'flex-start',
        fontSize: '0.7rem', fontWeight: '700',
        padding: '0.15rem 0.45rem', borderRadius: '12px',
    },
    likeBackBtn: {
        margin: '0.5rem 0.75rem 0.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        background: 'linear-gradient(135deg, var(--color-primary), #d4891f)',
        color: '#fff', border: 'none', borderRadius: '12px',
        padding: '0.55rem', fontSize: '0.85rem', fontWeight: '700',
        cursor: 'pointer', minHeight: 'auto',
    },
};

const swipeStyles = {
    container: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        flex: 1, padding: '0.5rem 0.75rem 0.75rem', overflow: 'hidden',
        height: '100%',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: '420px', marginBottom: '0.6rem',
    },
    headerLeft: {
        display: 'flex', alignItems: 'center', gap: '0.4rem',
    },
    headerTitle: {
        fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-text-dark)',
    },
    modeBar: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
    },
    modeChip: {
        background: 'var(--color-primary)', color: '#fff',
        padding: '0.35rem 0.9rem', borderRadius: '20px',
        fontSize: '0.85rem', fontWeight: '700',
    },
    changeModeBtn: {
        background: 'none', border: 'none', color: 'var(--color-text-light)',
        fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem', width: 'auto', minHeight: 'auto',
    },
    cardStack: {
        position: 'relative', width: '100%', maxWidth: '420px',
        // calc: total viewport - bottom nav(56) - modeBar(46) - actions(90) - hint(28) - padding(40)
        height: 'calc(100svh - 260px)',
        minHeight: '380px',
        maxHeight: '620px',
        flexShrink: 0,
    },
    likesBtn: {
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        background: 'linear-gradient(135deg, #ff6b6b, #ee9d2b)',
        color: '#fff', border: 'none', borderRadius: '20px',
        padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: '700',
        cursor: 'pointer', minHeight: 'auto',
    },
    actions: {
        display: 'flex', gap: '2.5rem', marginTop: '1rem', alignItems: 'center',
    },
    actionBtn: {
        width: '64px', height: '64px', borderRadius: '50%', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        transition: 'transform 0.15s', padding: 0, minHeight: 'auto',
    },
    passBtn: { backgroundColor: '#fff' },
    likeBtn: { backgroundColor: '#fff' },
    hint: { fontSize: '0.75rem', color: '#ccc', marginTop: '0.75rem', textAlign: 'center' },
};

const modalStyles = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
    },
    card: {
        backgroundColor: '#fff', borderRadius: '28px',
        padding: '2rem 1.5rem', width: '100%', maxWidth: '360px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
    },
    celebration: { fontSize: '3.5rem', marginBottom: '0.5rem', animation: 'pulse 1s infinite' },
    title: { fontSize: '1.6rem', fontWeight: '900', color: 'var(--color-text-dark)', margin: '0 0 0.4rem' },
    subtitle: { fontSize: '0.9rem', color: 'var(--color-text-light)', margin: '0 0 1.5rem', lineHeight: 1.5 },
    petsRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' },
    petThumb: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' },
    petImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' },
    petLabel: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-dark)' },
    heartCenter: { fontSize: '2rem' },
    messageBtn: {
        width: '100%', background: 'linear-gradient(135deg, var(--color-primary), #d4891f)',
        color: '#fff', border: 'none', padding: '1rem', borderRadius: '50px',
        fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        marginBottom: '0.75rem', boxShadow: '0 4px 16px rgba(238,157,43,0.3)',
    },
    continueBtn: {
        width: '100%', background: '#f0f2f5', color: 'var(--color-text-light)',
        border: 'none', padding: '0.85rem', borderRadius: '50px',
        fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
    },
};

const noPetsStyles = {
    illustration: {
        fontSize: '5rem',
        marginBottom: '1rem',
        lineHeight: 1,
    },
    title: {
        fontSize: '1.3rem',
        fontWeight: '800',
        color: 'var(--color-text-dark)',
        margin: '0 0 0.6rem',
        textAlign: 'center',
    },
    body: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        lineHeight: 1.6,
        textAlign: 'center',
        maxWidth: '280px',
        margin: '0 0 1.5rem',
    },
    steps: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        marginBottom: '1.75rem',
        width: '100%',
        maxWidth: '280px',
        backgroundColor: '#fef9ef',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        border: '1px solid #fde68a',
    },
    step: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontSize: '0.88rem',
        color: '#92700c',
        fontWeight: '500',
    },
};

export default PetMatch;
