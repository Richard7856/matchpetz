import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import ImageUpload from '../components/ImageUpload';

const EditProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        display_name: '', location: '', avatar_url: '',
        instagram: '', facebook: '', tiktok: '', twitter: '',
    });

    useEffect(() => {
        const load = async () => {
            if (!user) { navigate('/login'); return; }
            const { data: p } = await supabase.from('profiles')
                .select('display_name, location, avatar_url, instagram, facebook, tiktok, twitter')
                .eq('id', user.id).single();
            if (p) {
                setForm({
                    display_name: p.display_name || '',
                    location: p.location || '',
                    avatar_url: p.avatar_url || '',
                    instagram: p.instagram || '',
                    facebook: p.facebook || '',
                    tiktok: p.tiktok || '',
                    twitter: p.twitter || '',
                });
            }
            setLoading(false);
        };
        load();
    }, [user, navigate]);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.display_name.trim()) return setError('El nombre es requerido.');
        setSaving(true);
        setError('');
        if (!user) return;
        const { error: err } = await supabase.from('profiles').update({
            display_name: form.display_name.trim(),
            location: form.location.trim() || null,
            avatar_url: form.avatar_url.trim() || null,
            instagram: form.instagram.trim() || null,
            facebook: form.facebook.trim() || null,
            tiktok: form.tiktok.trim() || null,
            twitter: form.twitter.trim() || null,
            updated_at: new Date().toISOString(),
        }).eq('id', user.id);
        setSaving(false);
        if (err) return setError('Error al guardar: ' + err.message);
        navigate('/profile');
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' }}>Cargando...</div>;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Editar Perfil" />

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.formContainer}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={styles.label}>Foto de perfil</label>
                    <ImageUpload
                        currentImageUrl={form.avatar_url}
                        onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
                        folder="avatars"
                        shape="circle"
                        size={100}
                        placeholder="Tu foto"
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre *</label>
                    <input style={styles.input} value={form.display_name} onChange={set('display_name')} placeholder="Tu nombre" required />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Ubicación</label>
                    <input style={styles.input} value={form.location} onChange={set('location')} placeholder="Ej. CDMX, Condesa" />
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0.5rem 0 0', color: 'var(--color-text-dark)' }}>Redes Sociales</h3>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Instagram</label>
                    <input style={styles.input} value={form.instagram} onChange={set('instagram')} placeholder="@tu_usuario" />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Facebook</label>
                    <input style={styles.input} value={form.facebook} onChange={set('facebook')} placeholder="tu.perfil" />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>TikTok</label>
                    <input style={styles.input} value={form.tiktok} onChange={set('tiktok')} placeholder="@tu_usuario" />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Twitter / X</label>
                    <input style={styles.input} value={form.twitter} onChange={set('twitter')} placeholder="@tu_usuario" />
                </div>

                <button type="submit" style={styles.submitBtn} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' },
    errorBox: { margin: '0 1.5rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.9rem' },
    formContainer: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-text-dark)' },
    input: { padding: '1rem', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: '1rem', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
    submitBtn: { marginTop: 'auto', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', cursor: 'pointer' },
};

export default EditProfile;
