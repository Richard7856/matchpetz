import React from 'react';

const EmptyState = ({ title, subtitle, actionLabel, onAction, icon }) => (
    <div style={styles.wrapper}>
        {icon && <div style={styles.iconWrap}>{icon}</div>}
        <p style={styles.title}>{title}</p>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        {actionLabel && onAction && (
            <button style={styles.btn} onClick={onAction}>{actionLabel}</button>
        )}
    </div>
);

const styles = {
    wrapper: {
        textAlign: 'center',
        padding: 'var(--space-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-sm)',
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: 'var(--color-bg-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--space-sm)',
    },
    title: {
        fontSize: 'var(--font-size-body)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    subtitle: {
        fontSize: 'var(--font-size-body-sm)',
        color: 'var(--color-text-light)',
        margin: 0,
    },
    btn: {
        marginTop: 'var(--space-md)',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-body-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        cursor: 'pointer',
    },
};

export default EmptyState;
