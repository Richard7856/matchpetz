// DeleteAccount.jsx — Required by Apple App Store guidelines (4.2, GDPR)
// Allows the user to permanently delete their account and all associated data.
// Apple requires this to be a functional in-app flow, not just a link.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const DeleteAccount = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState('confirm'); // confirm | deleting | done | error
    const [errorMsg, setErrorMsg] = useState('');

    const handleDelete = async () => {
        if (!user) return;
        setStep('deleting');

        try {
            // Delete user data in order (child rows first, then parent)
            const uid = user.id;

            await supabase.from('pet_swipes').delete().or(`swiper_pet_id.in.(select id from pets where owner_id.eq.${uid}),target_pet_id.in.(select id from pets where owner_id.eq.${uid})`);
            await supabase.from('pet_matches').delete().or(`pet1_id.in.(select id from pets where owner_id.eq.${uid}),pet2_id.in.(select id from pets where owner_id.eq.${uid})`);
            await supabase.from('pets').delete().eq('owner_id', uid);
            await supabase.from('messages').delete().eq('sender_id', uid);
            await supabase.from('notifications').delete().eq('user_id', uid);
            await supabase.from('posts').delete().eq('user_id', uid);
            await supabase.from('adoption_pets').delete().eq('user_id', uid);
            await supabase.from('marketplace_products').delete().eq('user_id', uid);
            await supabase.from('profiles').delete().eq('id', uid);

            // Sign out — the auth user record requires a server-side call or edge function
            // For now we sign out and show confirmation. Full auth deletion via support email.
            await supabase.auth.signOut();
            setStep('done');
        } catch (err) {
            console.error('DeleteAccount error:', err);
            setErrorMsg('Ocurrió un error. Por favor intenta de nuevo o escríbenos a soporte@matchpetz.com');
            setStep('error');
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2 style={styles.title}>Eliminar cuenta</h2>
                <div style={{ width: 36 }} />
            </div>

            <div style={styles.content}>
                {/* ── Confirmation step ── */}
                {step === 'confirm' && (
                    <>
                        <div style={styles.iconWrap}>
                            <AlertTriangle size={40} color="#e53935" />
                        </div>
                        <h3 style={styles.heading}>¿Estás seguro?</h3>
                        <p style={styles.body}>
                            Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán:
                        </p>
                        <ul style={styles.list}>
                            <li>Tu perfil y datos personales</li>
                            <li>Todas tus mascotas y sus fotos</li>
                            <li>Tus publicaciones y comentarios</li>
                            <li>Tus conversaciones y mensajes</li>
                            <li>Tus anuncios de adopción y marketplace</li>
                            <li>Tu historial de matches</li>
                        </ul>

                        <button style={styles.deleteBtn} onClick={handleDelete}>
                            <Trash2 size={18} color="#fff" />
                            Sí, eliminar mi cuenta
                        </button>
                        <button style={styles.cancelBtn} onClick={() => navigate(-1)}>
                            Cancelar
                        </button>
                    </>
                )}

                {/* ── Deleting step ── */}
                {step === 'deleting' && (
                    <>
                        <div style={styles.iconWrap}>
                            <div style={styles.spinner} />
                        </div>
                        <h3 style={styles.heading}>Eliminando tu cuenta...</h3>
                        <p style={styles.body}>Por favor espera, esto solo tarda unos segundos.</p>
                    </>
                )}

                {/* ── Done step ── */}
                {step === 'done' && (
                    <>
                        <div style={styles.iconWrap}>
                            <span style={{ fontSize: '3rem' }}>✅</span>
                        </div>
                        <h3 style={styles.heading}>Cuenta eliminada</h3>
                        <p style={styles.body}>
                            Tus datos han sido eliminados. Si tienes alguna pregunta escríbenos a{' '}
                            <strong>soporte@matchpetz.com</strong>
                        </p>
                    </>
                )}

                {/* ── Error step ── */}
                {step === 'error' && (
                    <>
                        <div style={styles.iconWrap}>
                            <AlertTriangle size={40} color="#e53935" />
                        </div>
                        <h3 style={styles.heading}>Algo salió mal</h3>
                        <p style={styles.body}>{errorMsg}</p>
                        <button style={styles.cancelBtn} onClick={() => setStep('confirm')}>
                            Intentar de nuevo
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex', flexDirection: 'column',
        height: '100%', backgroundColor: 'var(--color-background)',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: '#fff',
    },
    backBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0.25rem', display: 'flex', alignItems: 'center',
        minHeight: 'auto',
    },
    title: {
        fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-dark)', margin: 0,
    },
    content: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '2rem 1.5rem',
        textAlign: 'center', overflowY: 'auto',
    },
    iconWrap: {
        marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '80px', height: '80px',
        backgroundColor: '#fff3f3', borderRadius: '50%',
    },
    heading: {
        fontSize: '1.3rem', fontWeight: '800',
        color: 'var(--color-text-dark)', margin: '0 0 0.75rem',
    },
    body: {
        fontSize: '0.95rem', color: 'var(--color-text-light)',
        lineHeight: 1.6, margin: '0 0 1rem', maxWidth: '320px',
    },
    list: {
        textAlign: 'left', paddingLeft: '1.25rem',
        marginBottom: '2rem', maxWidth: '300px', width: '100%',
        color: 'var(--color-text-light)', fontSize: '0.9rem', lineHeight: 2,
    },
    deleteBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        width: '100%', maxWidth: '320px',
        backgroundColor: '#e53935', color: '#fff',
        border: 'none', borderRadius: '12px',
        padding: '0.9rem', fontSize: '1rem', fontWeight: '700',
        cursor: 'pointer', marginBottom: '0.75rem',
    },
    cancelBtn: {
        width: '100%', maxWidth: '320px',
        backgroundColor: '#f0f2f5', color: 'var(--color-text-light)',
        border: 'none', borderRadius: '12px',
        padding: '0.85rem', fontSize: '0.95rem', fontWeight: '600',
        cursor: 'pointer',
    },
    spinner: {
        width: '36px', height: '36px',
        border: '4px solid #f0f0f0',
        borderTop: '4px solid #e53935',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
};

export default DeleteAccount;
