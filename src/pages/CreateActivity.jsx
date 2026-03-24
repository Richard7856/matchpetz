import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Users, Navigation } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';

const ACTIVITY_TYPES = [
    { value: 'paseo', label: 'Paseo' },
    { value: 'playdate', label: 'Playdate' },
    { value: 'entrenamiento', label: 'Entrenamiento' },
    { value: 'voluntariado', label: 'Voluntariado' },
    { value: 'otro', label: 'Otro' },
];

const CreateActivity = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [form, setForm] = useState({
        title: '', activity_type: 'paseo', event_date: '', event_time: '',
        location: '', description: '', image_url: '', max_attendees: '',
        lat: null, lng: null,
    });

    const handleUseLocation = () => {
        if (!navigator.geolocation) return;
        setLocLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                setLocLoading(false);
            },
            () => setLocLoading(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.event_date || !form.event_time || !form.location.trim()) {
            setError('Completa nombre, fecha, hora y zona.');
            return;
        }
        setSending(true);
        setError('');
        const creator_name = profile?.display_name || user?.email?.split('@')[0] || 'Usuario';
        const creator_avatar_url = profile?.avatar_url || null;
        const { error: err } = await supabase.from('events').insert({
            creator_id: user?.id || null,
            creator_name,
            creator_avatar_url,
            title: form.title.trim(),
            description: form.description.trim() || null,
            event_date: form.event_date,
            event_time: form.event_time,
            location: form.location.trim(),
            image_url: form.image_url.trim() || null,
            activity_type: form.activity_type,
            lat: form.lat,
            lng: form.lng,
            max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        });
        if (err) {
            setError(err.message || 'No se pudo crear la actividad.');
            setSending(false);
            return;
        }
        navigate('/social');
    };

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Proponer Actividad" />

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleCreate} style={styles.formContainer}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Tipo de actividad</label>
                    <select style={styles.input} value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}>
                        {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre *</label>
                    <input type="text" placeholder="Ej. Paseo matutino en el parque" style={styles.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>URL de imagen (opcional)</label>
                    <input type="url" placeholder="https://..." style={styles.input} value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
                </div>

                <div style={styles.inputRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Calendar size={16} /> Fecha</label>
                        <input type="date" style={styles.input} value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Clock size={16} /> Hora</label>
                        <input type="time" style={styles.input} value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} required />
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}><MapPin size={16} /> Zona (sin dirección exacta)</label>
                    <input type="text" placeholder="Ej. Zona Condesa" style={styles.input} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
                    <button type="button" style={styles.locBtn} onClick={handleUseLocation} disabled={locLoading}>
                        <Navigation size={16} />
                        {locLoading ? 'Obteniendo...' : form.lat ? 'Ubicación capturada' : 'Capturar mi zona'}
                    </button>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}><Users size={16} /> Máximo de asistentes (opcional)</label>
                    <input type="number" min="2" placeholder="Ej. 10" style={styles.input} value={form.max_attendees} onChange={e => setForm(f => ({ ...f, max_attendees: e.target.value }))} />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción</label>
                    <textarea placeholder="Cuéntanos de qué trata..." style={styles.textarea} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <button type="submit" style={styles.submitBtn} disabled={sending}>
                    {sending ? 'Publicando...' : 'Publicar Actividad'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: { minHeight: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' },
    errorBox: { margin: '0 1.5rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.9rem' },
    formContainer: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
    inputRow: { display: 'flex', gap: '1rem' },
    label: { fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-text-dark)', display: 'flex', alignItems: 'center', gap: '0.3rem' },
    input: { padding: '1rem', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: '1rem', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
    textarea: { padding: '1rem', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: '1rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
    locBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid var(--color-primary)', backgroundColor: '#fff', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start' },
    submitBtn: { marginTop: 'auto', backgroundColor: 'var(--color-social)', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', cursor: 'pointer' },
};

export default CreateActivity;
