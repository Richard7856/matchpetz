import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlignLeft, Calendar, Clock, Navigation, Users, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import MultiImageUpload from '../components/MultiImageUpload';

const CreateEvent = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [images, setImages] = useState([]);
    const [form, setForm] = useState({
        title: '',
        event_date: '',
        event_time: '',
        location: '',
        description: '',
        activity_type: 'evento',
        max_attendees: '',
        lat: null,
        lng: null,
    });

    const handleUseLocation = () => {
        if (!navigator.geolocation) return;
        setLocLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })); setLocLoading(false); },
            () => setLocLoading(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.event_date || !form.event_time || !form.location.trim()) {
            setError('Completa nombre, fecha, hora y ubicacion.');
            return;
        }
        setSending(true);
        setError('');
        const creator_name = profile?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';
        const creator_avatar_url = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
        const { error: err } = await supabase.from('events').insert({
            creator_id: user?.id || null,
            creator_name,
            creator_avatar_url,
            title: form.title.trim(),
            description: form.description.trim() || null,
            event_date: form.event_date,
            event_time: form.event_time,
            location: form.location.trim(),
            image_url: images[0] || null,
            activity_type: form.activity_type,
            lat: form.lat,
            lng: form.lng,
            max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        });
        if (err) {
            setError(err.message || 'No se pudo crear el evento.');
            setSending(false);
            return;
        }
        navigate('/home');
        setSending(false);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)', display: 'flex', flexDirection: 'column' }} className="fade-in">
            <AppBar title="Crear Evento" />

            <form onSubmit={handleCreate} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', flex: 1 }}>
                {error && <div className="form-error">{error}</div>}

                {/* Cover image */}
                <div className="form-card">
                    <span className="form-section-title">Portada</span>
                    <MultiImageUpload
                        images={images}
                        onImagesChange={setImages}
                        folder="events"
                        maxImages={3}
                        shape="banner"
                        mainSize={180}
                    />
                </div>

                {/* Event info */}
                <div className="form-card">
                    <span className="form-section-title">Informacion del evento</span>

                    <div className="form-group">
                        <label className="form-label">Tipo</label>
                        <select className="form-select" value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}>
                            <option value="evento">Evento</option>
                            <option value="paseo">Paseo</option>
                            <option value="playdate">Playdate</option>
                            <option value="entrenamiento">Entrenamiento</option>
                            <option value="voluntariado">Voluntariado</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nombre del Evento *</label>
                        <input
                            className="form-input"
                            placeholder="Ej. Tarde de Golden Retrievers"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label"><Calendar size={15} /> Fecha *</label>
                            <input className="form-input" type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label"><Clock size={15} /> Hora *</label>
                            <input className="form-input" type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} required />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="form-card">
                    <span className="form-section-title">Ubicacion</span>

                    <div className="form-group">
                        <label className="form-label"><MapPin size={15} /> Lugar *</label>
                        <input className="form-input" placeholder="Ej. Parque Mexico" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
                        <button
                            type="button"
                            onClick={handleUseLocation}
                            disabled={locLoading}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '24px', border: '1.5px solid var(--color-primary)',
                                backgroundColor: '#fff', color: 'var(--color-primary)', fontSize: '0.85rem',
                                fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start', width: 'auto', minHeight: 'auto',
                            }}
                        >
                            <Navigation size={14} />
                            {locLoading ? 'Obteniendo...' : form.lat ? 'Zona capturada' : 'Capturar zona (opcional)'}
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Users size={15} /> Max. asistentes <span className="optional">opcional</span></label>
                        <input className="form-input" type="number" min="2" placeholder="Sin limite" value={form.max_attendees} onChange={e => setForm(f => ({ ...f, max_attendees: e.target.value }))} />
                    </div>
                </div>

                {/* Description */}
                <div className="form-card">
                    <span className="form-section-title">Detalles</span>
                    <div className="form-group">
                        <label className="form-label"><AlignLeft size={15} /> Descripcion <span className="optional">opcional</span></label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            placeholder="Cuentanos de que trata o si hay algun requisito..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                </div>

                <button type="submit" className="form-submit-btn" disabled={sending || !form.title.trim()}>
                    <Send size={18} />
                    {sending ? 'Publicando...' : 'Publicar Evento'}
                </button>
            </form>
        </div>
    );
};

export default CreateEvent;
