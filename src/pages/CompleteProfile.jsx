import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user === undefined) return;
        if (user) {
            setName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '');
        } else {
            navigate('/login', { replace: true });
        }
    }, [user, navigate]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            setLoading(true);
            await supabase.from('profiles').upsert({
                id: user.id,
                display_name: name,
                location,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
                stats: { pets: 0, friends: 0, impacts: 0 },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

            navigate('/home');
        } catch (error) {
            alert('Hubo un error al guardar tu perfil. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    if (!user) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center', minHeight: '100vh' }}>
                <span style={{ color: 'var(--color-text-light)' }}>Cargando...</span>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <h2 style={styles.title}>Completa tu Perfil</h2>
            <p style={styles.subtitle}>Cuéntanos un poco más sobre ti para empezar a hacer match.</p>

            <form onSubmit={handleSaveProfile} style={styles.formContainer}>

                <div style={styles.avatarSection}>
                    <div style={styles.avatarPlaceholder}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={styles.avatarImg} />
                        ) : (
                            <Camera size={32} color="var(--color-text-light)" />
                        )}
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre completo</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        style={styles.input}
                        required
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}><MapPin size={16} /> Ciudad / Zona</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ej. Ciudad de México"
                        style={styles.input}
                        required
                    />
                </div>

                <button type="submit" style={styles.submitBtn} disabled={loading || !name || !location}>
                    {loading ? 'Guardando...' : 'Comenzar'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#fff',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column'
    },
    title: {
        fontSize: '2rem',
        color: 'var(--color-primary)',
        marginTop: '2rem',
        marginBottom: '0.5rem'
    },
    subtitle: {
        color: 'var(--color-text-light)',
        marginBottom: '2rem',
        lineHeight: 1.5
    },
    formContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        flex: 1
    },
    avatarSection: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1rem'
    },
    avatarPlaceholder: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid var(--color-primary)',
        overflow: 'hidden'
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    label: {
        fontSize: '0.95rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem'
    },
    input: {
        padding: '1.2rem',
        borderRadius: '12px',
        border: '1px solid #eee',
        backgroundColor: '#f9f9f9',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.2s',
    },
    submitBtn: {
        marginTop: 'auto',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1.2rem',
        borderRadius: '50px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        opacity: 0.9,
    }
};

export default CompleteProfile;
