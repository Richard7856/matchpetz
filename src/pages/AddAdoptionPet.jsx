import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint, MapPin, FileText, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from '../components/MultiImageUpload';
import { PET_TYPES } from '../constants/petTypes';

const AddAdoptionPet = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState([]);
    const [customType, setCustomType] = useState('');
    const [form, setForm] = useState({
        name: '', type: 'perro', breed: '', age: '',
        gender: 'Macho', description: '', location: '',
    });

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return setError('El nombre es requerido.');
        setSaving(true);
        setError('');
        const finalType = form.type === 'otro' && customType.trim() ? customType.trim() : form.type;
        const { error: err } = await supabase.from('adoption_pets').insert({
            ...form,
            type: finalType,
            image_url: images[0] || '',
            images: images,
            status: 'disponible',
            user_id: user?.id || null,
        });
        setSaving(false);
        if (err) return setError('Error al publicar: ' + err.message);
        navigate('/adoption');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <div className="form-header">
                <button className="form-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2>Publicar mascota</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Photos section */}
                <div className="form-card">
                    <span className="form-section-title">Fotos</span>
                    <MultiImageUpload
                        images={images}
                        onImagesChange={setImages}
                        folder="adoption"
                        maxImages={5}
                        shape="banner"
                        mainSize={180}
                    />
                </div>

                {/* Basic info */}
                <div className="form-card">
                    <span className="form-section-title">Informacion basica</span>

                    <div className="form-group">
                        <label className="form-label"><PawPrint size={15} /> Nombre *</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ej. Max" required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Tipo</label>
                            <select className="form-select" value={form.type} onChange={set('type')}>
                                {PET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Genero</label>
                            <select className="form-select" value={form.gender} onChange={set('gender')}>
                                <option>Macho</option>
                                <option>Hembra</option>
                            </select>
                        </div>
                    </div>
                    {form.type === 'otro' && (
                        <div className="form-group">
                            <label className="form-label">Especifica el tipo *</label>
                            <input className="form-input" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ej. Iguana, Chinchilla..." required />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Raza <span className="optional">opcional</span></label>
                            <input className="form-input" value={form.breed} onChange={set('breed')} placeholder="Ej. Labrador" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Edad <span className="optional">opcional</span></label>
                            <input className="form-input" value={form.age} onChange={set('age')} placeholder="Ej. 2 anios" />
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="form-card">
                    <span className="form-section-title">Detalles</span>

                    <div className="form-group">
                        <label className="form-label"><FileText size={15} /> Descripcion <span className="optional">opcional</span></label>
                        <textarea className="form-textarea" value={form.description} onChange={set('description')} rows={3} placeholder="Cuentanos sobre la mascota, su personalidad, si esta vacunado..." />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><MapPin size={15} /> Ubicacion <span className="optional">opcional</span></label>
                        <input className="form-input" value={form.location} onChange={set('location')} placeholder="Colonia, Ciudad" />
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={saving}>
                    <Send size={18} />
                    {saving ? 'Publicando...' : 'Publicar en adopcion'}
                </button>
            </form>
        </div>
    );
};

export default AddAdoptionPet;
