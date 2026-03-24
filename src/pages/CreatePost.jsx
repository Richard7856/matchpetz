import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Tag } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import ImageUpload from '../components/ImageUpload';

const CreatePost = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [pets, setPets] = useState([]);
    const [form, setForm] = useState({
        image_url: '',
        caption: '',
        location: '',
        pet_id: '',
    });

    /* load user's pets for tagging */
    useEffect(() => {
        if (!user) return;
        const loadPets = async () => {
            const { data } = await supabase
                .from('pets')
                .select('id, name')
                .eq('owner_id', user.id);
            if (data) setPets(data);
        };
        loadPets();
    }, [user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.image_url) {
            setError('La foto es requerida.');
            return;
        }
        setSending(true);
        setError('');

        const { error: err } = await supabase.from('posts').insert({
            user_id: user.id,
            image_url: form.image_url,
            caption: form.caption.trim() || null,
            location: form.location.trim() || null,
            pet_id: form.pet_id || null,
        });

        if (err) {
            setError(err.message || 'No se pudo crear la publicación.');
            setSending(false);
            return;
        }
        navigate('/explore');
    };

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Nueva publicación" />

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleCreate} style={styles.formContainer}>
                {/* Image upload */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Foto *</label>
                    <ImageUpload
                        currentImageUrl={form.image_url}
                        onUpload={(url) => setForm((f) => ({ ...f, image_url: url }))}
                        folder="posts"
                        shape="banner"
                        size={220}
                        placeholder="Sube una foto de tu mascota"
                    />
                </div>

                {/* Caption */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción</label>
                    <textarea
                        placeholder="Escribe algo sobre tu foto..."
                        style={styles.textarea}
                        rows={3}
                        value={form.caption}
                        onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                        maxLength={500}
                    />
                    <span style={styles.charCount}>{form.caption.length}/500</span>
                </div>

                {/* Location */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>
                        <MapPin size={16} /> Ubicación (opcional)
                    </label>
                    <input
                        type="text"
                        placeholder="Ej. Parque México, CDMX"
                        style={styles.input}
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    />
                </div>

                {/* Pet tagging */}
                {pets.length > 0 && (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <Tag size={16} /> Etiquetar mascota (opcional)
                        </label>
                        <select
                            style={styles.input}
                            value={form.pet_id}
                            onChange={(e) => setForm((f) => ({ ...f, pet_id: e.target.value }))}
                        >
                            <option value="">Sin etiquetar</option>
                            {pets.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    style={styles.submitBtn}
                    disabled={sending || !form.image_url}
                >
                    {sending ? 'Compartiendo...' : 'Compartir'}
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
    },
    formContainer: {
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        flex: 1,
    },
    errorBox: {
        margin: '0 1.5rem',
        padding: '0.75rem',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        color: '#b91c1c',
        fontSize: '0.9rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        fontSize: '0.95rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
    },
    input: {
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #eee',
        backgroundColor: '#f9f9f9',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
    },
    textarea: {
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #eee',
        backgroundColor: '#f9f9f9',
        fontSize: '1rem',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
    },
    charCount: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
        textAlign: 'right',
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
        width: '100%',
    },
};

export default CreatePost;
