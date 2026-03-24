import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // On mount: check if user is already logged in — redirect if so.
    // This handles the case where a logged-in user navigates to /login.
    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    if (cancelled) return;
                    navigate(profile ? '/home' : '/complete-profile', { replace: true });
                    return;
                }
            } catch {
                // ignore
            }
            if (!cancelled) setCheckingSession(false);
        };

        check();

        // Safety: never stay loading forever
        const safety = setTimeout(() => {
            if (!cancelled) setCheckingSession(false);
        }, 2500);

        return () => { cancelled = true; clearTimeout(safety); };
    }, [navigate]);

    const handleGoogle = async () => {
        const url = import.meta.env.VITE_SUPABASE_URL;
        if (!url) {
            setError('Supabase no esta configurado. Revisa .env.local (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
            return;
        }
        try {
            setLoading(true);
            setError('');
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/` },
            });
        } catch (err) {
            setError('Error al conectar con Google. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Correo y contrasenia son obligatorios.');
            return;
        }
        if (password.length < 6) {
            setError('La contrasenia debe tener al menos 6 caracteres.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            if (mode === 'register') {
                const { error: err } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/` },
                });
                if (err) throw err;
                setError('Revisa tu correo y haz clic en el enlace para activar tu cuenta.');
            } else {
                const { data, error: err } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (err) throw err;

                // Navigate immediately after successful sign-in.
                // AuthContext's onAuthStateChange will set user/profile reactively.
                if (data?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', data.user.id)
                        .maybeSingle();
                    navigate(profile ? '/home' : '/complete-profile', { replace: true });
                    return;
                }
            }
        } catch (err) {
            setError(err.message || 'Error. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-text-light)' }}>Comprobando sesion...</span>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.card}>
                <div style={styles.header}>
                    <img src="/logo.png" alt="MatchPetz" style={{ width: '72px', height: '72px', borderRadius: '18px', boxShadow: '0 8px 24px rgba(238,157,43,0.25)', marginBottom: '0.75rem' }} />
                    <h1 style={styles.title}>MatchPetz</h1>
                    <p style={styles.subtitle}>
                        {mode === 'login' ? 'Inicia sesion o crea una cuenta' : 'Crea tu cuenta'}
                    </p>
                </div>

                {error && (
                    <div style={styles.errorBox}>{error}</div>
                )}

                <button
                    type="button"
                    style={styles.googleBtn}
                    onClick={handleGoogle}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Cargando...' : 'Continuar con Google'}
                </button>

                <div style={styles.divider}>
                    <span style={styles.dividerLine} />
                    <span style={styles.dividerText}>o</span>
                    <span style={styles.dividerLine} />
                </div>

                <form onSubmit={handleEmailSubmit} style={styles.form}>
                    <div style={styles.inputWrap}>
                        <Mail size={20} color="#9e9e9e" style={styles.inputIcon} />
                        <input
                            type="email"
                            placeholder="Correo electronico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            autoComplete="email"
                        />
                    </div>
                    <div style={styles.inputWrap}>
                        <Lock size={20} color="#9e9e9e" style={styles.inputIcon} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Contrasenia (min. 6 caracteres)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.inputWithEye}
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        />
                        <button
                            type="button"
                            style={styles.eyeBtn}
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar contrasenia' : 'Mostrar contrasenia'}
                        >
                            {showPassword ? <EyeOff size={20} color="#616161" /> : <Eye size={20} color="#616161" />}
                        </button>
                    </div>
                    <button type="submit" style={styles.submitBtn} disabled={loading}>
                        {mode === 'login' ? 'Iniciar sesion' : 'Registrarme'}
                    </button>
                </form>

                <button
                    type="button"
                    style={styles.toggleMode}
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                >
                    {mode === 'login'
                        ? 'No tienes cuenta? Registrate'
                        : 'Ya tienes cuenta? Inicia sesion'}
                </button>

                <div style={styles.legalLinks}>
                    <span>Al continuar aceptas nuestros </span>
                    <a href="/terminos.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>Terminos</a>
                    <span> y </span>
                    <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>Politica de Privacidad</a>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: '#fff',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    },
    header: { textAlign: 'center', marginBottom: '1.75rem' },
    title: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#333',
        marginBottom: '0.35rem',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: '0.9rem',
        color: '#6b7280',
        lineHeight: 1.4,
    },
    errorBox: {
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        color: '#b91c1c',
        fontSize: '0.875rem',
        textAlign: 'center',
        lineHeight: 1.4,
    },
    googleBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#374151',
        cursor: 'pointer',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    },
    divider: { display: 'flex', alignItems: 'center', marginBottom: '1.25rem' },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
    dividerText: { margin: '0 1rem', fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' },
    inputWrap: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
    inputIcon: { position: 'absolute', left: '14px', pointerEvents: 'none', zIndex: 1 },
    input: {
        width: '100%',
        padding: '0.9rem 1rem 0.9rem 46px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#fafafa',
        color: '#111',
    },
    inputWithEye: {
        width: '100%',
        padding: '0.9rem 48px 0.9rem 46px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#fafafa',
        color: '#111',
    },
    eyeBtn: {
        position: 'absolute',
        right: '4px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '8px',
        color: '#6b7280',
        minHeight: 'auto',
    },
    submitBtn: {
        padding: '0.95rem 1rem',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '0.25rem',
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
    },
    toggleMode: {
        display: 'block',
        width: '100%',
        textAlign: 'center',
        background: 'none',
        border: 'none',
        color: '#ea580c',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        textDecoration: 'none',
        padding: '0.5rem',
        minHeight: 'auto',
    },
    legalLinks: {
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#9ca3af',
        marginTop: '1rem',
        lineHeight: 1.5,
    },
    legalLink: {
        color: 'var(--color-primary)',
        textDecoration: 'none',
        fontWeight: '600',
    },
};

export default Login;
