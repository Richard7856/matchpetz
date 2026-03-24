import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, MapPin, Phone, Instagram, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import MultiImageUpload from '../components/MultiImageUpload';

const SERVICE_TYPES = [
    { value: 'vet', label: 'Veterinario' },
    { value: 'hotel', label: 'Hotel de mascotas' },
    { value: 'grooming', label: 'Peluqueria / Lavanderia' },
    { value: 'walker', label: 'Paseador' },
    { value: 'trainer', label: 'Entrenador' },
    { value: 'spa', label: 'Spa' },
];

const VET_SPECIALTIES = [
    'Medicina general', 'Cirugia', 'Dermatologia', 'Cardiologia',
    'Oftalmologia', 'Ortopedia', 'Oncologia', 'Urgencias',
];

const AddService = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState([]);
    const [form, setForm] = useState({
        type: 'vet', specialty: '', name: '', description: '',
        phone: '', location: '', price_range: '', instagram: '',
    });

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.type) return setError('Nombre y tipo son requeridos.');
        setSaving(true);
        setError('');
        const payload = {
            ...form,
            image_url: images[0] || '',
            images: images,
            specialty: form.type === 'vet' ? form.specialty : null,
            owner_id: user?.id || null,
        };
        const { error: err } = await supabase.from('services').insert(payload);
        setSaving(false);
        if (err) return setError('Error al publicar: ' + err.message);
        navigate('/map');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <div className="form-header">
                <button className="form-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="var(--color-text-dark)" />
                </button>
                <h2>Publicar servicio</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Photos */}
                <div className="form-card">
                    <span className="form-section-title">Fotos del negocio</span>
                    <MultiImageUpload
                        images={images}
                        onImagesChange={setImages}
                        folder="services"
                        maxImages={5}
                        shape="banner"
                        mainSize={160}
                    />
                </div>

                {/* Service type */}
                <div className="form-card">
                    <span className="form-section-title">Tipo de servicio</span>

                    <div className="form-group">
                        <label className="form-label"><Briefcase size={15} /> Tipo *</label>
                        <select className="form-select" value={form.type} onChange={set('type')}>
                            {SERVICE_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {form.type === 'vet' && (
                        <div className="form-group">
                            <label className="form-label">Especialidad <span className="optional">opcional</span></label>
                            <select className="form-select" value={form.specialty} onChange={set('specialty')}>
                                <option value="">Seleccionar especialidad</option>
                                {VET_SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Business info */}
                <div className="form-card">
                    <span className="form-section-title">Informacion del negocio</span>

                    <div className="form-group">
                        <label className="form-label">Nombre del negocio *</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Ej. Clinica PetCare" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Descripcion <span className="optional">opcional</span></label>
                        <textarea className="form-textarea" value={form.description} onChange={set('description')} rows={3} placeholder="Describe tus servicios..." />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><MapPin size={15} /> Ubicacion <span className="optional">opcional</span></label>
                        <input className="form-input" value={form.location} onChange={set('location')} placeholder="Colonia, Ciudad" />
                    </div>
                </div>

                {/* Contact */}
                <div className="form-card">
                    <span className="form-section-title">Contacto</span>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label"><Phone size={15} /> Telefono</label>
                            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+52 55 1234-5678" />
                        </div>
                        <div className="form-group">
                            <label className="form-label"><Instagram size={15} /> Instagram</label>
                            <input className="form-input" value={form.instagram} onChange={set('instagram')} placeholder="@tuusuario" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rango de precios <span className="optional">opcional</span></label>
                        <input className="form-input" value={form.price_range} onChange={set('price_range')} placeholder="Ej. $200-$500" />
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={saving}>
                    <Send size={18} />
                    {saving ? 'Publicando...' : 'Publicar servicio'}
                </button>
            </form>
        </div>
    );
};

export default AddService;
