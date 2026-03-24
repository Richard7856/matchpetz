import React from 'react';

const LoadingState = ({ message = 'Cargando...' }) => (
    <div style={styles.wrapper}>
        <div style={styles.spinner} />
        <span style={styles.text}>{message}</span>
    </div>
);

const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        gap: 'var(--space-md)',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid #eee',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        color: 'var(--color-text-light)',
        fontSize: 'var(--font-size-body-sm)',
    },
};

export default LoadingState;
