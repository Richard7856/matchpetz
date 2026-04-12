import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';

/**
 * Standalone "Forgot Password" page — user enters their email and receives a reset link.
 * After clicking the link in their email, they land on /reset-password.
 */
export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }
        setLoading(true);
        setError('');
        try {
            const { error: err } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: window.location.origin + '/' }
            );
            if (err) throw err;
            setSent(true);
        } catch (err) {
            setError(err.message || 'Error al enviar el correo. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.topBar}>
                <button style={styles.backBtn} onClick={() => navigate('/login')}>
                    <ArrowLeft size={22} color="#374151" />
                </button>
            </div>

            <div style={styles.card}>
                {sent ? (
                    /* ── Success state ── */
                    <>
                        <CheckCircle size={52} color="#22c55e" style={{ marginBottom: '1rem' }} />
                        <h2 style={styles.title}>Revisa tu correo</h2>
                        <p style={styles.subtitle}>
                            Enviamos un enlace a <strong>{email}</strong>.
                            Abre el correo y haz clic en el enlace para crear una nueva contraseña.
                        </p>
                        <p style={styles.hint}>¿No lo ves? Revisa tu carpeta de spam.</p>
                        <button style={styles.btn} onClick={() => navigate('/login')}>
                            Volver al inicio de sesión
                        </button>
                    </>
                ) : (
                    /* ── Email form ── */
                    <>
                        <div style={styles.iconWrap}>
                            <Mail size={28} color="#ee9d2b" />
                        </div>
                        <h2 style={styles.title}>Recuperar contraseña</h2>
                        <p style={styles.subtitle}>
                            Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                        </p>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.fieldWrap}>
                                <Mail size={16} style={styles.fieldIcon} />
                                <input
                                    type="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={styles.input}
                                    autoComplete="email"
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && <p style={styles.error}>{error}</p>}

                            <button type="submit" disabled={loading} style={styles.btn}>
                                {loading ? 'Enviando...' : 'Enviar enlace'}
                            </button>
                        </form>

                        <button
                            type="button"
                            style={styles.linkBtn}
                            onClick={() => navigate('/login')}
                        >
                            Volver al inicio de sesión
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100dvh',
        backgroundColor: '#f0f2f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
    },
    topBar: {
        width: '100%',
        maxWidth: 420,
        padding: '1rem 1.25rem 0',
        display: 'flex',
        alignItems: 'center',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.4rem',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 8,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        margin: '1.5rem 1.5rem 2rem',
        padding: '2rem 1.75rem',
        backgroundColor: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
    },
    iconWrap: {
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: 'rgba(238,157,43,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
    },
    title: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#1f2937',
        margin: '0 0 0.5rem',
    },
    subtitle: {
        fontSize: '0.9rem',
        color: '#6b7280',
        lineHeight: 1.6,
        margin: '0 0 1.5rem',
    },
    hint: {
        fontSize: '0.82rem',
        color: '#9ca3af',
        margin: '0 0 1.5rem',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    fieldWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    fieldIcon: {
        position: 'absolute',
        left: 14,
        color: '#9ca3af',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '0.85rem 1rem 0.85rem 2.5rem',
        border: '1.5px solid #e5e7eb',
        borderRadius: 14,
        fontSize: '0.95rem',
        outline: 'none',
        fontFamily: 'inherit',
        backgroundColor: '#fafafa',
    },
    error: {
        color: '#ef4444',
        fontSize: '0.85rem',
        margin: 0,
        textAlign: 'center',
    },
    btn: {
        width: '100%',
        padding: '0.9rem',
        background: 'linear-gradient(135deg, #ee9d2b, #ffb703)',
        border: 'none',
        borderRadius: 14,
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: '0.25rem',
        fontFamily: 'inherit',
    },
    linkBtn: {
        background: 'none',
        border: 'none',
        color: '#ee9d2b',
        fontSize: '0.9rem',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '1rem',
        fontFamily: 'inherit',
    },
};
