import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint, FileText, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from '../components/MultiImageUpload';
import { PET_TYPES } from '../constants/petTypes';

const AddPet = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState([]);
    const [customSpecies, setCustomSpecies] = useState('');
    const [form, setForm] = useState({
        name: '', species: 'perro', breed: '', age: '', description: '',
    });

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return setError('El nombre es requerido.');
        setSaving(true);
        setError('');
        const { error: err } = await supabase.from('pets').insert({
            owner_id: user?.id,
            name: form.name.trim(),
            species: form.species === 'otro' && customSpecies.trim() ? customSpecies.trim() : form.species,
            breed: form.breed.trim() || null,
            age: form.age.trim() || null,
            description: form.description.trim() || null,
            image_url: images[0] || null,
            images: images,
        });
        setSaving(false);
        if (err) return setError('Error al guardar: ' + err.message);
        navigate('/profile');
    };

    return (
        <div style={{ minHeight: '100%', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <div className="form-header">
                <button className="form-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2>Registrar Mascota</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Photos */}
                <div className="form-card">
                    <span className="form-section-title">Fotos de tu mascota</span>
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
                    <span className="form-section-title">Informacion</span>

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
                    {form.species === 'otro' && (
                        <div className="form-group">
                            <label className="form-label">Especifica la especie *</label>
                            <input className="form-input" value={customSpecies} onChange={(e) => setCustomSpecies(e.target.value)} placeholder="Ej. Iguana, Chinchilla..." required />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Edad <span className="optional">opcional</span></label>
                        <input className="form-input" value={form.age} onChange={set('age')} placeholder="Ej. 2 anios" />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FileText size={15} /> Descripcion <span className="optional">opcional</span></label>
                        <textarea className="form-textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Cuentanos sobre tu mascota..." />
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={saving}>
                    <Send size={18} />
                    {saving ? 'Guardando...' : 'Registrar Mascota'}
                </button>
            </form>
        </div>
    );
};

export default AddPet;
