import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorBox = ({ message = 'Ocurrió un error. Intenta de nuevo.' }) => (
    <div style={styles.box}>
        <AlertCircle size={18} color="#e53935" />
        <span style={styles.text}>{message}</span>
    </div>
);

const styles = {
    box: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md)',
        backgroundColor: '#ffebee',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid #ffcdd2',
    },
    text: {
        fontSize: 'var(--font-size-body-sm)',
        color: '#c62828',
        margin: 0,
    },
};

export default ErrorBox;
