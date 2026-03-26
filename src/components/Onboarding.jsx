import React, { useState, useRef } from 'react';
import { Heart, Users, MapPin, Camera } from 'lucide-react';

const SLIDES = [
    { icon: Heart, color: '#e91e63', title: 'Adopta con amor', subtitle: 'Encuentra mascotas que necesitan un hogar' },
    { icon: Users, color: '#2196f3', title: 'Conecta', subtitle: 'Conoce otros amantes de mascotas' },
    { icon: MapPin, color: '#4caf50', title: 'Descubre', subtitle: 'Servicios, eventos y lugares pet-friendly' },
    { icon: Camera, color: '#ee9d2b', title: 'Comparte', subtitle: 'Publica fotos y momentos con tu mascota' },
];

const Onboarding = ({ onComplete }) => {
    const [current, setCurrent] = useState(0);
    const touchRef = useRef(null);

    const next = () => {
        if (current < SLIDES.length - 1) {
            setCurrent(current + 1);
        } else {
            localStorage.setItem('matchpetz_onboarded', 'true');
            onComplete();
        }
    };

    const onTouchStart = (e) => {
        touchRef.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e) => {
        if (touchRef.current === null) return;
        const diff = touchRef.current - e.changedTouches[0].clientX;
        if (diff > 50 && current < SLIDES.length - 1) setCurrent(current + 1);
        if (diff < -50 && current > 0) setCurrent(current - 1);
        touchRef.current = null;
    };

    const slide = SLIDES[current];
    const Icon = slide.icon;

    return (
        <div style={styles.overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div style={styles.content}>
                <div style={{ ...styles.iconWrap, backgroundColor: slide.color + '20' }}>
                    <Icon size={72} color={slide.color} />
                </div>
                <h2 style={styles.title}>{slide.title}</h2>
                <p style={styles.subtitle}>{slide.subtitle}</p>
            </div>

            <div style={styles.bottom}>
                <div style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                ...styles.dot,
                                backgroundColor: i === current ? 'var(--color-primary)' : '#d1d5db',
                                width: i === current ? '24px' : '8px',
                            }}
                        />
                    ))}
                </div>
                <button style={styles.btn} onClick={next}>
                    {current === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
    },
    iconWrap: {
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: '800',
        color: 'var(--color-text-dark)',
        marginBottom: '0.75rem',
    },
    subtitle: {
        fontSize: '1.05rem',
        color: 'var(--color-text-light)',
        lineHeight: 1.5,
        maxWidth: '280px',
    },
    bottom: {
        padding: '2rem 2rem calc(2rem + env(safe-area-inset-bottom, 16px))',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        flexShrink: 0,
    },
    dots: {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
    },
    dot: {
        height: '8px',
        borderRadius: '4px',
        transition: 'all 0.3s',
    },
    btn: {
        width: '100%',
        maxWidth: '320px',
        padding: '0.95rem',
        borderRadius: '14px',
        border: 'none',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        color: '#fff',
        fontSize: '1.05rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(238,157,43,0.35)',
    },
};

export default Onboarding;
