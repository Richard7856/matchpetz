import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AppBar = ({ title, onBack, backTo, rightAction, showBack = true }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) return onBack();
        if (backTo) return navigate(backTo);
        navigate(-1);
    };

    return (
        <div style={styles.bar}>
            {showBack ? (
                <button style={styles.backBtn} onClick={handleBack}>
                    <ArrowLeft size={24} color="var(--color-text-dark)" />
                </button>
            ) : (
                <div style={{ width: 40 }} />
            )}
            <h2 style={styles.title}>{title}</h2>
            {rightAction || <div style={{ width: 40 }} />}
        </div>
    );
};

const styles = {
    bar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-md)',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
    },
    backBtn: {
        background: 'none',
        border: 'none',
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    title: {
        fontSize: 'var(--font-size-page-title)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
};

export default AppBar;
