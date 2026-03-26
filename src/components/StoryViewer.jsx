import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';
import { timeAgo } from '../utils/formatters';

const STORY_DURATION = 5000;

const StoryViewer = ({ userStories, initialUserIndex = 0, onClose }) => {
    const [userIdx, setUserIdx] = useState(initialUserIndex);
    const [storyIdx, setStoryIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    const currentUser = userStories[userIdx];
    const currentStory = currentUser?.stories?.[storyIdx];

    // Progress animation
    useEffect(() => {
        if (!currentStory) return;
        startTimeRef.current = Date.now();
        setProgress(0);

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const pct = Math.min(elapsed / STORY_DURATION, 1);
            setProgress(pct);
            if (pct < 1) {
                timerRef.current = requestAnimationFrame(animate);
            } else {
                goNext();
            }
        };
        timerRef.current = requestAnimationFrame(animate);

        return () => {
            if (timerRef.current) cancelAnimationFrame(timerRef.current);
        };
    }, [userIdx, storyIdx]);

    const goNext = () => {
        if (storyIdx < currentUser.stories.length - 1) {
            setStoryIdx(s => s + 1);
        } else if (userIdx < userStories.length - 1) {
            setUserIdx(u => u + 1);
            setStoryIdx(0);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (storyIdx > 0) {
            setStoryIdx(s => s - 1);
        } else if (userIdx > 0) {
            setUserIdx(u => u - 1);
            setStoryIdx(0);
        }
    };

    const handleTap = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        if (tapX < rect.width / 3) {
            goPrev();
        } else {
            goNext();
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (!currentStory) return null;

    return (
        <div style={s.overlay}>
            <div style={s.container} onClick={handleTap}>
                {/* Progress bars */}
                <div style={s.progressRow}>
                    {currentUser.stories.map((_, i) => (
                        <div key={i} style={s.progressTrack}>
                            <div style={{
                                ...s.progressFill,
                                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                            }} />
                        </div>
                    ))}
                </div>

                {/* User info */}
                <div style={s.userRow}>
                    <img src={getAvatarUrl(currentUser.avatar_url)} alt="" style={s.avatar} loading="lazy" />
                    <div style={{ flex: 1 }}>
                        <p style={s.userName}>{currentUser.display_name}</p>
                        <span style={s.storyTime}>{timeAgo(currentStory.created_at)}</span>
                    </div>
                    <button style={s.closeBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={24} color="#fff" />
                    </button>
                </div>

                {/* Story image */}
                <img src={currentStory.image_url} alt="" style={s.storyImage} loading="lazy" />
            </div>
        </div>
    );
};

const s = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: '100%',
        maxWidth: '480px',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
    },
    progressRow: {
        display: 'flex',
        gap: '3px',
        padding: '12px 8px 0',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    progressTrack: {
        flex: 1,
        height: '3px',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: '2px',
        transition: 'width 0.1s linear',
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '28px 12px 8px',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid #fff',
    },
    userName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: '0.9rem',
        margin: 0,
    },
    storyTime: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.75rem',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    storyImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: '#000',
    },
};

export default StoryViewer;
