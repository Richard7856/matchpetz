import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, User, Phone, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import logoImg from '/logo.png';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user === undefined) return;
        if (user) {
            setName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '');
            setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
        } else {
            navigate('/login', { replace: true });
        }
    }, [user, navigate]);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        const ext = file.name.split('.').pop();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('matchpet-images').upload(path, file, { upsert: true });
        if (!error) {
            const { data: urlData } = supabase.storage.from('matchpet-images').getPublicUrl(path);
            setAvatarUrl(urlData.publicUrl);
        }
        setUploading(false);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user) return;
        try {
            setLoading(true);
            await supabase.from('profiles').upsert({
                id: user.id,
                display_name: name,
                location,
                phone: phone || null,
                bio: bio || null,
                email: user.email,
                avatar_url: avatarUrl,
                stats: { pets: 0, friends: 0, impacts: 0 },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            navigate('/home');
        } catch (error) {
            alert('Error al guardar tu perfil. Intentalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-text-light)' }}>Cargando...</span>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.header}>
                <img src={logoImg} alt="MatchPetz" style={styles.logo} />
                <h2 style={styles.title}>Completa tu Perfil</h2>
                <p style={styles.subtitle}>Cuentanos sobre ti para empezar a conectar con la comunidad pet lover</p>
            </div>

            <form onSubmit={handleSaveProfile} style={styles.form}>
                {/* Avatar upload */}
                <div style={styles.avatarSection}>
                    <label htmlFor="avatar-upload" style={styles.avatarWrapper}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={styles.avatarImg} />
                        ) : (
                            <div style={styles.avatarPlaceholder}>
                                <User size={36} color="#999" />
                            </div>
                        )}
                        <div style={styles.cameraOverlay}>
                            {uploading ? (
                                <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            ) : (
                                <Camera size={16} color="#fff" />
                            )}
                        </div>
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                    <span style={styles.avatarHint}>Toca para subir tu foto</span>
                </div>

                {/* Fields */}
                <div style={styles.card}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><User size={15} /> Nombre *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" style={styles.input} required />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}><MapPin size={15} /> Ciudad / Zona *</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Ciudad de Mexico" style={styles.input} required />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Phone size={15} /> Telefono <span style={styles.optional}>opcional</span></label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 55 1234 5678" style={styles.input} />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}><FileText size={15} /> Sobre ti <span style={styles.optional}>opcional</span></label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Cuentanos sobre ti y tus mascotas..." style={styles.textarea} rows={3} />
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <span style={styles.infoIcon}>💡</span>
                    <span style={styles.infoText}>Puedes completar tu perfil despues desde la seccion de Perfil. Los campos marcados con * son obligatorios.</span>
                </div>

                <button type="submit" style={styles.submitBtn} disabled={loading || !name || !location}>
                    {loading ? 'Guardando...' : 'Comenzar a explorar'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    header: {
        textAlign: 'center',
        padding: '2rem 1.5rem 1rem',
    },
    logo: {
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(238,157,43,0.25)',
        marginBottom: '1rem',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '800',
        color: 'var(--color-primary)',
        marginBottom: '0.4rem',
    },
    subtitle: {
        color: 'var(--color-text-light)',
        fontSize: '0.9rem',
        lineHeight: 1.5,
        maxWidth: '320px',
        margin: '0 auto',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0 1.5rem 2rem',
        width: '100%',
        maxWidth: '480px',
        flex: 1,
    },
    avatarSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '0.5rem 0',
    },
    avatarWrapper: {
        position: 'relative',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        cursor: 'pointer',
        overflow: 'visible',
    },
    avatarImg: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid var(--color-primary)',
    },
    avatarPlaceholder: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px dashed #ccc',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    },
    avatarHint: {
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
    },
    card: {
        backgroundColor: '#fafafa',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: '1px solid #f0f0f0',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
    },
    label: {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
    },
    optional: {
        fontSize: '0.75rem',
        fontWeight: '400',
        color: '#999',
        marginLeft: '0.25rem',
    },
    input: {
        padding: '0.85rem 1rem',
        borderRadius: '12px',
        border: '1.5px solid #e0e0e0',
        backgroundColor: '#fff',
        fontSize: '0.95rem',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    textarea: {
        padding: '0.85rem 1rem',
        borderRadius: '12px',
        border: '1.5px solid #e0e0e0',
        backgroundColor: '#fff',
        fontSize: '0.95rem',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        resize: 'vertical',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    infoBox: {
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'flex-start',
        padding: '0.75rem 1rem',
        backgroundColor: '#fef9ef',
        borderRadius: '12px',
        border: '1px solid #fde68a',
    },
    infoIcon: { fontSize: '1.1rem', flexShrink: 0 },
    infoText: { fontSize: '0.8rem', color: '#92700c', lineHeight: 1.5 },
    submitBtn: {
        marginTop: 'auto',
        background: 'linear-gradient(135deg, var(--color-primary), #d4891f)',
        color: '#fff',
        border: 'none',
        padding: '1rem',
        borderRadius: '50px',
        fontSize: '1.05rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(238,157,43,0.3)',
        transition: 'transform 0.2s',
    },
};

export default CompleteProfile;
