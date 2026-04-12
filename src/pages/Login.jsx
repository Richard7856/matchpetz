import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Initialize Google Sign-In once on mount so it's ready before the user taps the button
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            GoogleAuth.initialize({
                clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
                scopes: ['profile', 'email'],
            });
        }
    }, []);

    // Fallback redirect: if auth state changes while on login (e.g. after Google sign-in
    // completes and onAuthStateChange fires), redirect based on profile existence.
    const { user: authUser } = useAuth();
    useEffect(() => {
        if (!authUser) return;
        supabase.from('profiles').select('id').eq('id', authUser.id).maybeSingle()
            .then(({ data: profile }) => {
                navigate(profile ? '/home' : '/complete-profile', { replace: true });
            })
            .catch(() => navigate('/home', { replace: true }));
    }, [authUser, navigate]);

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
        try {
            setLoading(true);
            setError('');

            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                // Native Google Sign-In — shows Google account picker inside the app
                // Returns an idToken which Supabase exchanges for a session directly
                const googleUser = await GoogleAuth.signIn();
                const idToken = googleUser?.authentication?.idToken;
                if (!idToken) throw new Error('No se obtuvo el token de Google.');

                const { data, error: err } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                });
                if (err) throw err;
                if (data?.user) {
                    const { data: profile } = await supabase
                        .from('profiles').select('id').eq('id', data.user.id).maybeSingle();
                    navigate(profile ? '/home' : '/complete-profile', { replace: true });
                }
            } else {
                // Web fallback — opens OAuth in browser
                await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/` },
                });
            }
        } catch (err) {
            // Log the full error so we can diagnose — remove once fixed
            console.error('Google Sign-In error:', JSON.stringify(err), err?.message, err?.code);
            if (err?.message?.includes('cancelled') || err?.message?.includes('canceled') || err?.message?.includes('12501')) return;
            // Show the real error message temporarily for debugging
            setError(`Google error: ${err?.message || err?.code || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApple = async () => {
        // Apple Sign In — only available on iOS native and Safari on macOS
        // Apple requires nonce for security — Supabase handles the PKCE flow
        try {
            setLoading(true);
            setError('');

            const options = {
                clientId: import.meta.env.VITE_APPLE_CLIENT_ID || 'com.matchpetz.app',
                redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/`,
                scopes: 'email name',
                state: Math.random().toString(36).substring(2),
            };

            const result = await SignInWithApple.authorize(options);

            if (!result?.response?.identityToken) {
                throw new Error('No se obtuvo el token de Apple.');
            }

            const { data, error: err } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: result.response.identityToken,
            });

            if (err) throw err;

            if (data?.user) {
                // Apple only provides name on first sign-in — save it if present
                const fullName = result.response.givenName
                    ? `${result.response.givenName} ${result.response.familyName || ''}`.trim()
                    : null;

                const { data: profile } = await supabase
                    .from('profiles').select('id').eq('id', data.user.id).maybeSingle();

                // If new user and Apple gave us a name, pre-fill display_name
                if (!profile && fullName) {
                    await supabase.from('profiles').insert({
                        id: data.user.id,
                        display_name: fullName,
                    }).select().maybeSingle();
                }

                navigate(profile ? '/home' : '/complete-profile', { replace: true });
            }
        } catch (err) {
            // User cancelled Apple Sign-In — don't show error
            if (err?.message?.includes('cancel') || err?.message?.includes('Cancel') || err?.code === 'ERR_CANCELED') return;
            setError('Error al conectar con Apple. Intenta de nuevo.');
            console.warn('Apple Sign-In error:', err);
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
                const { data, error: err } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/` },
                });
                if (err) throw err;
                // When email confirmation is disabled in Supabase, signUp returns a session immediately.
                // When enabled, session is null and user must verify email before logging in.
                if (data?.session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', data.user.id)
                        .maybeSingle();
                    navigate(profile ? '/home' : '/complete-profile', { replace: true });
                    return;
                }
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

                {/* Apple Sign In — obligatorio por App Store cuando hay Google Sign-In */}
                <button
                    type="button"
                    style={styles.appleBtn}
                    onClick={handleApple}
                    disabled={loading}
                >
                    <svg width="18" height="22" viewBox="0 0 814 1000" fill="currentColor">
                        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.5c-42.8-72.5-64.5-188.6-64.5-251.4 0-199.3 109-343.6 291.3-343.6 73.3 0 134.2 48.8 178.6 48.8 42.8 0 110.1-51.6 191.1-51.6 31.3 0 152.1 3.2 218.2 113.6zM537.6 76.1c33.7-40.8 58.4-97.4 58.4-153.9 0-7.7-.6-15.4-1.9-21.8-55.7 2.1-120.9 37.5-160.4 84.4-30.7 35.3-60.1 91.9-60.1 149.2 0 8.3 1.3 16.7 1.9 19.2 3.2.6 8.3 1.3 13.5 1.3 49.7 0 112.5-33.1 148.6-78.4z"/>
                    </svg>
                    {loading ? 'Cargando...' : 'Continuar con Apple'}
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

                {mode === 'login' && (
                    <button type="button" style={styles.forgotBtn} onClick={() => navigate('/forgot-password')}>
                        ¿Olvidaste tu contraseña?
                    </button>
                )}

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
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        overflowY: 'auto',          // scroll when keyboard pushes content up
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: '#f0f2f5',
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: '#fff',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        marginTop: 'auto',
        marginBottom: 'auto',
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
    appleBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginBottom: '1.25rem',
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
    forgotBtn: {
        display: 'block',
        width: '100%',
        textAlign: 'center',
        background: 'none',
        border: 'none',
        color: '#6b7280',
        fontSize: '0.85rem',
        cursor: 'pointer',
        padding: '0.4rem',
        marginBottom: '0.5rem',
        minHeight: 'auto',
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
