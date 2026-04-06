// EditPet.jsx — Edit an existing pet profile
// Only the owner can access this page (guarded by owner_id check)

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PawPrint, FileText, Save, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from '../components/MultiImageUpload';
import { PET_TYPES } from '../constants/petTypes';

const TAG_OPTIONS = [
    { label: 'Juguetón',              emoji: '🎾' },
    { label: 'Calmado',               emoji: '😌' },
    { label: 'Energético',            emoji: '⚡' },
    { label: 'Tímido',                emoji: '🙈' },
    { label: 'Curioso',               emoji: '🔍' },
    { label: 'Protector',             emoji: '🛡️' },
    { label: 'Amigable con perros',   emoji: '🐕' },
    { label: 'Amigable con gatos',    emoji: '🐈' },
    { label: 'Amigable con niños',    emoji: '👶' },
    { label: 'Prefiere estar solo',   emoji: '🌿' },
    { label: 'Entrenado',             emoji: '🎓' },
    { label: 'Obediente',             emoji: '✅' },
    { label: 'Vacunado',              emoji: '💉' },
    { label: 'Esterilizado',          emoji: '🏥' },
    { label: 'Chip de rastreo',       emoji: '📡' },
    { label: 'Le gusta el agua',      emoji: '🌊' },
    { label: 'Le gusta los parques',  emoji: '🌳' },
];

const LOOKING_FOR_OPTIONS = [
    { value: 'amigos', label: 'Amigos',          emoji: '🐾', desc: 'Compañeros de juego' },
    { value: 'pareja', label: 'Pareja',           emoji: '❤️', desc: 'Amor peludo especial' },
    { value: 'ambos',  label: 'Amigos y Pareja',  emoji: '✨', desc: 'Abierto a todo' },
];

const EditPet = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [form, setForm] = useState({
        name: '', species: 'perro', breed: '', age: '', description: '',
        looking_for: 'ambos', gender: '', is_neutered: false,
    });

    // Load existing pet data on mount
    useEffect(() => {
        const load = async () => {
            const { data, error: err } = await supabase
                .from('pets').select('*').eq('id', id).single();

            if (err || !data) { navigate(-1); return; }

            // Redirect if not the owner
            if (data.owner_id !== user?.id) { navigate(-1); return; }

            setForm({
                name: data.name || '',
                species: data.species || 'perro',
                breed: data.breed || '',
                age: data.age || '',
                description: data.description || '',
                looking_for: data.looking_for || 'ambos',
                gender: data.gender || '',
                is_neutered: data.is_neutered || false,
            });
            setImages(data.images || (data.image_url ? [data.image_url] : []));
            setSelectedTags(data.tags || []);
            setLoading(false);
        };
        load();
    }, [id, user, navigate]);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const toggleTag = (label) => {
        setSelectedTags((prev) =>
            prev.includes(label)
                ? prev.filter((t) => t !== label)
                : prev.length < 8 ? [...prev, label] : prev
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return setError('El nombre es requerido.');
        setSaving(true);
        setError('');
        const { error: err } = await supabase.from('pets').update({
            name: form.name.trim(),
            species: form.species,
            breed: form.breed.trim() || null,
            age: form.age.trim() || null,
            description: form.description.trim() || null,
            image_url: images[0] || null,
            images,
            tags: selectedTags,
            looking_for: form.looking_for,
            gender: form.gender || null,
            is_neutered: form.is_neutered,
            updated_at: new Date().toISOString(),
        }).eq('id', id).eq('owner_id', user.id);
        setSaving(false);
        if (err) return setError('Error al guardar: ' + err.message);
        navigate(`/pets/${id}`);
    };

    const handleDelete = async () => {
        if (!window.confirm(`¿Eliminar a ${form.name}? Esta acción no se puede deshacer.`)) return;
        setDeleting(true);
        await supabase.from('pets').delete().eq('id', id).eq('owner_id', user.id);
        navigate('/profile');
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Cargando...</div>;

    return (
        <div style={{ minHeight: '100%', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <div className="form-header">
                <button className="form-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2>Editar Mascota</h2>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Photos */}
                <div className="form-card">
                    <span className="form-section-title">Fotos</span>
                    <MultiImageUpload
                        images={images}
                        onImagesChange={setImages}
                        folder="pets"
                        maxImages={5}
                        shape="square"
                        mainSize={160}
                    />
                </div>

                {/* Basic info */}
                <div className="form-card">
                    <span className="form-section-title">Información</span>
                    <div className="form-group">
                        <label className="form-label"><PawPrint size={15} /> Nombre *</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ej. Luna" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Especie</label>
                            <select className="form-select" value={form.species} onChange={set('species')}>
                                {PET_TYPES.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Raza <span className="optional">opcional</span></label>
                            <input className="form-input" value={form.breed} onChange={set('breed')} placeholder="Ej. Labrador" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Edad <span className="optional">opcional</span></label>
                            <input className="form-input" value={form.age} onChange={set('age')} placeholder="Ej. 2 años" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sexo <span className="optional">opcional</span></label>
                            <select className="form-select" value={form.gender} onChange={set('gender')}>
                                <option value="">No especificar</option>
                                <option value="macho">♂ Macho</option>
                                <option value="hembra">♀ Hembra</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--color-text-dark)', fontWeight: '500' }}>
                            <input type="checkbox" checked={form.is_neutered}
                                onChange={(e) => setForm(p => ({ ...p, is_neutered: e.target.checked }))}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            />
                            Castrado / Esterilizado
                        </label>
                    </div>
                    <div className="form-group">
                        <label className="form-label"><FileText size={15} /> Descripción <span className="optional">opcional</span></label>
                        <textarea className="form-textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Cuéntanos sobre tu mascota..." />
                    </div>
                </div>

                {/* Tags */}
                <div className="form-card">
                    <span className="form-section-title">Características <span className="optional">max 8</span></span>
                    <div style={tagStyles.grid}>
                        {TAG_OPTIONS.map(({ label, emoji }) => {
                            const active = selectedTags.includes(label);
                            return (
                                <button key={label} type="button"
                                    style={{ ...tagStyles.chip, ...(active ? tagStyles.chipActive : {}) }}
                                    onClick={() => toggleTag(label)}
                                >
                                    <span>{emoji}</span><span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Looking for */}
                <div className="form-card">
                    <span className="form-section-title">Busca...</span>
                    <div style={tagStyles.lookingRow}>
                        {LOOKING_FOR_OPTIONS.map(({ value, label, emoji, desc }) => {
                            const active = form.looking_for === value;
                            return (
                                <button key={value} type="button"
                                    style={{ ...tagStyles.lookingCard, ...(active ? tagStyles.lookingCardActive : {}) }}
                                    onClick={() => setForm((p) => ({ ...p, looking_for: value }))}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: active ? 'var(--color-primary)' : 'var(--color-text-dark)' }}>{label}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', textAlign: 'center' }}>{desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={saving || deleting}>
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>

                {/* Delete — red, separated to avoid accidental tap */}
                <button type="button" disabled={deleting}
                    style={{ ...tagStyles.deleteBtn }}
                    onClick={handleDelete}
                >
                    <Trash2 size={16} />
                    {deleting ? 'Eliminando...' : 'Eliminar mascota'}
                </button>
            </form>
        </div>
    );
};

const tagStyles = {
    grid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
    chip: { display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '20px', border: '1.5px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-dark)', cursor: 'pointer', width: 'auto', minHeight: 'auto', transition: 'all 0.15s' },
    chipActive: { backgroundColor: '#fff8ee', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' },
    lookingRow: { display: 'flex', gap: '0.6rem' },
    lookingCard: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.85rem 0.5rem', borderRadius: '14px', border: '1.5px solid #e5e7eb', backgroundColor: '#f9fafb', cursor: 'pointer', minHeight: 'auto', width: 'auto', transition: 'all 0.15s' },
    lookingCardActive: { backgroundColor: '#fff8ee', borderColor: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(238,157,43,0.2)' },
    deleteBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', width: '100%', minHeight: 'auto' },
};

export default EditPet;
