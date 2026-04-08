import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Lock, Trash2, Info, ChevronRight, FileText, Shield, LogOut } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const NOTIF_KEYS = ['matchpetz_notif_adopcion', 'matchpetz_notif_eventos', 'matchpetz_notif_mensajes'];

const Settings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notifs, setNotifs] = useState({
        adopcion: localStorage.getItem('matchpetz_notif_adopcion') !== 'false',
        eventos: localStorage.getItem('matchpetz_notif_eventos') !== 'false',
        mensajes: localStorage.getItem('matchpetz_notif_mensajes') !== 'false',
    });
    const [resetMsg, setResetMsg] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const toggleNotif = (key) => {
        const newVal = !notifs[key];
        setNotifs(prev => ({ ...prev, [key]: newVal }));
        localStorage.setItem(`matchpetz_notif_${key}`, String(newVal));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    const handleChangePassword = async () => {
        if (!user?.email) { setResetMsg('No se encontro tu correo.'); return; }
        setResetLoading(true);
        setResetMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/' });
            if (error) throw error;
            setResetMsg('Revisa tu correo para restablecer tu contrasena');
        } catch (err) {
            setResetMsg(err.message || 'Error al enviar el correo.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.appBar}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2 style={styles.title}>Configuracion</h2>
            </div>

            <div style={styles.content}>
                {/* Notificaciones */}
                <div className="form-card" style={styles.card}>
                    <h3 style={styles.sectionTitle}><Bell size={18} /> Notificaciones</h3>
                    {[
                        { key: 'adopcion', label: 'Adopciones' },
                        { key: 'eventos', label: 'Eventos' },
                        { key: 'mensajes', label: 'Mensajes' },
                    ].map(({ key, label }) => (
                        <div key={key} style={styles.toggleRow}>
                            <span style={styles.toggleLabel}>{label}</span>
                            <button
                                style={{ ...styles.toggle, backgroundColor: notifs[key] ? 'var(--color-primary)' : '#e0e0e0' }}
                                onClick={() => toggleNotif(key)}
                            >
                                <div style={{ ...styles.toggleKnob, transform: notifs[key] ? 'translateX(20px)' : 'translateX(0)' }} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Cuenta */}
                <div className="form-card" style={styles.card}>
                    <h3 style={styles.sectionTitle}><Lock size={18} /> Cuenta</h3>
                    <button style={styles.menuItem} onClick={handleChangePassword} disabled={resetLoading}>
                        <span>{resetLoading ? 'Enviando...' : 'Cambiar contrasena'}</span>
                        <ChevronRight size={18} color="var(--color-text-light)" />
                    </button>
                    {resetMsg && (
                        <p style={{ fontSize: '0.85rem', padding: '0 0.5rem', color: resetMsg.includes('Revisa') ? '#065f46' : '#b91c1c', marginTop: '0.25rem' }}>
                            {resetMsg}
                        </p>
                    )}
                    <button style={styles.menuItem} onClick={handleLogout}>
                        <span style={{ color: '#e53935' }}>Cerrar sesion</span>
                        <LogOut size={18} color="#e53935" />
                    </button>
                    <button style={styles.menuItem} onClick={() => navigate('/eliminar-cuenta')}>
                        <span style={{ color: '#e53935' }}>Eliminar cuenta</span>
                        <Trash2 size={18} color="#e53935" />
                    </button>
                </div>

                {/* Informacion */}
                <div className="form-card" style={styles.card}>
                    <h3 style={styles.sectionTitle}><Info size={18} /> Informacion</h3>
                    <div style={styles.menuItem}>
                        <span>Version de la app</span>
                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>1.0.3</span>
                    </div>
                    <a href="/legal.html#terminos" target="_blank" rel="noopener noreferrer" style={styles.menuItem}>
                        <span>Terminos y Condiciones</span>
                        <FileText size={18} color="var(--color-text-light)" />
                    </a>
                    <a href="/legal.html#privacidad" target="_blank" rel="noopener noreferrer" style={styles.menuItem}>
                        <span>Politica de Privacidad</span>
                        <Shield size={18} color="var(--color-text-light)" />
                    </a>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-soft)',
    },
    appBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
    },
    backBtn: {
        background: 'none',
        border: 'none',
        padding: '0.3rem',
        width: 'auto',
        cursor: 'pointer',
        display: 'flex',
    },
    title: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
        margin: 0,
    },
    content: {
        flex: 1,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    card: {
        padding: '1rem',
        margin: 0,
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '1rem',
        fontWeight: '700',
        color: 'var(--color-text-dark)',
        marginBottom: '0.75rem',
    },
    toggleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 0',
        borderBottom: '1px solid #f5f5f5',
    },
    toggleLabel: {
        fontSize: '0.95rem',
        color: 'var(--color-text-dark)',
    },
    toggle: {
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        padding: '2px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s',
    },
    toggleKnob: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s',
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 0.5rem',
        borderBottom: '1px solid #f5f5f5',
        background: 'none',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        fontSize: '0.95rem',
        color: 'var(--color-text-dark)',
        textDecoration: 'none',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#f5f5f5',
    },
};

export default Settings;
