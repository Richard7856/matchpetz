import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, DollarSign } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG } from '../constants/roles';

const CreateCourse = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roles, setRoles] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        businessRoleId: '',
        title: '',
        description: '',
        imageUrl: '',
        price: '',
        duration: '',
        modality: 'presencial',
        location: '',
        startDate: '',
        maxParticipants: '',
    });

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            const { data: userRoles } = await supabase
                .from('business_roles')
                .select('id, role_type, business_name')
                .eq('user_id', user.id)
                .eq('status', 'approved');
            const r = userRoles || [];
            setRoles(r);
            if (r.length > 0) {
                setForm(f => ({ ...f, businessRoleId: r[0].id }));
            }
        };
        load();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setError('El título es requerido.');
            return;
        }
        if (!form.businessRoleId) {
            setError('Selecciona un rol asociado.');
            return;
        }
        setSending(true);
        setError('');
        const { error: insertErr } = await supabase.from('courses').insert({
            creator_id: user.id,
            business_role_id: form.businessRoleId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            image_url: form.imageUrl.trim() || null,
            price: form.price ? parseFloat(form.price) : null,
            duration: form.duration.trim() || null,
            modality: form.modality,
            location: form.location.trim() || null,
            start_date: form.startDate || null,
            max_participants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
        });
        if (insertErr) {
            setError('Error: ' + insertErr.message);
            setSending(false);
            return;
        }
        navigate('/dashboard');
    };

    if (roles.length === 0 && user) {
        return (
            <div style={styles.container} className="fade-in">
                <AppBar title="Crear Curso" />
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
                    Necesitas activar un rol de negocio para crear cursos.
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Crear Curso" />

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.formContainer}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Rol asociado</label>
                    <select
                        style={styles.input}
                        value={form.businessRoleId}
                        onChange={e => setForm(f => ({ ...f, businessRoleId: e.target.value }))}
                    >
                        {roles.map(r => {
                            const cfg = ROLE_CONFIG[r.role_type] || {};
                            return (
                                <option key={r.id} value={r.id}>
                                    {r.business_name} ({cfg.label || r.role_type})
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Título del Curso</label>
                    <input
                        type="text"
                        placeholder="Ej. Entrenamiento canino básico"
                        style={styles.input}
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        required
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción</label>
                    <textarea
                        placeholder="Describe el contenido del curso..."
                        style={styles.textarea}
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>URL de Imagen (opcional)</label>
                    <input
                        type="url"
                        placeholder="https://..."
                        style={styles.input}
                        value={form.imageUrl}
                        onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    />
                </div>

                <div style={styles.inputRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><DollarSign size={16} /> Precio</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            style={styles.input}
                            value={form.price}
                            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Clock size={16} /> Duración</label>
                        <input
                            type="text"
                            placeholder="Ej. 2 horas"
                            style={styles.input}
                            value={form.duration}
                            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                        />
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Modalidad</label>
                    <select
                        style={styles.input}
                        value={form.modality}
                        onChange={e => setForm(f => ({ ...f, modality: e.target.value }))}
                    >
                        <option value="presencial">Presencial</option>
                        <option value="online">Online</option>
                        <option value="hibrido">Híbrido</option>
                    </select>
                </div>

                {(form.modality === 'presencial' || form.modality === 'hibrido') && (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><MapPin size={16} /> Ubicación</label>
                        <input
                            type="text"
                            placeholder="Ej. Parque México, CDMX"
                            style={styles.input}
                            value={form.location}
                            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        />
                    </div>
                )}

                <div style={styles.inputRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Calendar size={16} /> Fecha de inicio</label>
                        <input
                            type="date"
                            style={styles.input}
                            value={form.startDate}
                            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}><Users size={16} /> Máx. participantes</label>
                        <input
                            type="number"
                            placeholder="Sin límite"
                            style={styles.input}
                            value={form.maxParticipants}
                            onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))}
                            min="1"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    style={{
                        ...styles.submitBtn,
                        opacity: sending || !form.title.trim() ? 0.6 : 1,
                    }}
                    disabled={sending || !form.title.trim()}
                >
                    {sending ? 'Publicando...' : 'Publicar Curso'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
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
        marginTop: '1rem',
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
        flex: 1,
    },
    inputRow: {
        display: 'flex',
        gap: '1rem',
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
        boxSizing: 'border-box',
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
        cursor: 'pointer',
    },
};

export default CreateCourse;
