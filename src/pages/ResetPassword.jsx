import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';

/**
 * Password reset page — user lands here after clicking the link in their email.
 * Supabase has already processed the recovery token via detectSessionInUrl,
 * so supabase.auth.updateUser() works directly with the active recovery session.
 */
export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [hasSession, setHasSession] = useState(false);

    // Verify a recovery session is actually present before showing the form.
    // If someone navigates here directly without a token, redirect to login.
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setHasSession(true);
            } else {
                navigate('/login', { replace: true });
            }
        });
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error: err } = await supabase.auth.updateUser({ password });
            if (err) throw err;
            setDone(true);
            // Sign out so the user starts fresh with the new password
            await supabase.auth.signOut();
        } catch (err) {
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    if (!hasSession) {
        return (
            <div style={styles.container}>
                <span style={{ color: 'var(--color-text-light)' }}>Verificando...</span>
            </div>
        );
    }

    if (done) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <CheckCircle size={48} color="#13ec5b" style={{ marginBottom: '1rem' }} />
                    <h2 style={styles.title}>¡Contraseña actualizada!</h2>
                    <p style={styles.subtitle}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
                    <button style={styles.btn} onClick={() => navigate('/login', { replace: true })}>
                        Ir a iniciar sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconWrap}>
                    <Lock size={28} color="#ee9d2b" />
                </div>
                <h2 style={styles.title}>Nueva contraseña</h2>
                <p style={styles.subtitle}>Elige una contraseña segura de al menos 6 caracteres.</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Password field */}
                    <div style={styles.fieldWrap}>
                        <Lock size={16} style={styles.fieldIcon} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Nueva contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={styles.input}
                            required
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            style={styles.eyeBtn}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Confirm field */}
                    <div style={styles.fieldWrap}>
                        <Lock size={16} style={styles.fieldIcon} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirmar contraseña"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            style={styles.input}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} style={styles.btn}>
                        {loading ? 'Guardando...' : 'Guardar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fff8ee 0%, #fff 100%)',
        padding: '1.5rem',
    },
    card: {
        background: '#fff',
        borderRadius: 24,
        padding: '2rem 1.75rem',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(238,157,43,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.5rem',
    },
    title: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#2a2a2a',
        margin: 0,
    },
    subtitle: {
        fontSize: '0.9rem',
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '0.5rem',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginTop: '0.5rem',
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
        padding: '0.85rem 2.75rem 0.85rem 2.5rem',
        border: '1.5px solid #e5e7eb',
        borderRadius: 14,
        fontSize: '0.95rem',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#9ca3af',
        padding: 4,
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
};
