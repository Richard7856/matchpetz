import React, { useState, useEffect } from 'react';
import logoImg from '/logo.png';

const Splash = () => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setFadeOut(true), 2100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={styles.container} className={fadeOut ? 'splash-fade-out' : 'fade-in'}>
            <div style={styles.logoWrap}>
                <img src={logoImg} alt="MatchPetz" style={styles.logoImg} />
            </div>
            <h1 style={styles.title}>MatchPetz</h1>
            <p style={styles.slogan}>Encuentra al mejor amigo de tu mejor amigo.</p>

            <div style={styles.loaderWrap}>
                <div style={styles.loader} />
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        height: '100dvh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fffdf9',
    },
    logoWrap: {
        marginBottom: '1.5rem',
    },
    logoImg: {
        width: '120px',
        height: '120px',
        borderRadius: '28px',
        boxShadow: '0 12px 40px rgba(238, 157, 43, 0.3)',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '800',
        color: 'var(--color-primary)',
        marginBottom: '0.4rem',
        letterSpacing: '-0.5px',
    },
    slogan: {
        fontSize: '1rem',
        color: 'var(--color-text-light)',
        fontStyle: 'italic',
        maxWidth: '260px',
    },
    loaderWrap: {
        marginTop: '3rem',
    },
    loader: {
        width: '36px',
        height: '36px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
};

export default Splash;
