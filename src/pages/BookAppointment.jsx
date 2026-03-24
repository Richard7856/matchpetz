import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../constants/roles';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';

const TIME_SLOTS = [
    '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
    '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
    '16:00 - 17:00', '17:00 - 18:00',
];

const BookAppointment = () => {
    const { businessRoleId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [businessRole, setBusinessRole] = useState(null);
    const [myPets, setMyPets] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        pet_id: '', appointment_date: '', time_slot: '', notes: '',
    });

    useEffect(() => {
        const load = async () => {
            const [{ data: role }, { data: pets }] = await Promise.all([
                supabase.from('business_roles').select('*').eq('id', businessRoleId).single(),
                user ? supabase.from('pets').select('id, name, species').eq('owner_id', user.id) : { data: [] },
            ]);
            setBusinessRole(role);
            setMyPets(pets || []);
            setLoading(false);
        };
        load();
    }, [businessRoleId, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.appointment_date || !form.time_slot) {
            setError('Selecciona fecha y horario.');
            return;
        }
        setSending(true);
        setError('');
        const { error: err } = await supabase.from('appointments').insert({
            business_role_id: businessRoleId,
            client_id: user.id,
            pet_id: form.pet_id || null,
            appointment_date: form.appointment_date,
            time_slot: form.time_slot,
            notes: form.notes.trim() || null,
        });
        if (err) {
            setError(err.message || 'No se pudo agendar.');
            setSending(false);
            return;
        }
        navigate('/appointments');
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><LoadingState /></div>;
    if (!businessRole) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-light)' }}>Negocio no encontrado</div>;

    const cfg = ROLE_CONFIG[businessRole.role_type] || {};

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Agendar Cita" />

            <div style={styles.businessCard}>
                <div style={{ ...styles.roleIconBg, backgroundColor: cfg.color || '#f5f5f5' }}>
                    {cfg.Icon && <cfg.Icon size={24} color="#555" />}
                </div>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{businessRole.business_name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 }}>{cfg.label || businessRole.role_type}</p>
                </div>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.formContainer}>
                {myPets.length > 0 && (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Mascota</label>
                        <select style={styles.input} value={form.pet_id} onChange={e => setForm(f => ({ ...f, pet_id: e.target.value }))}>
                            <option value="">Sin mascota específica</option>
                            {myPets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                        </select>
                    </div>
                )}

                <div style={styles.inputGroup}>
                    <label style={styles.label}><Calendar size={16} /> Fecha *</label>
                    <input type="date" style={styles.input} value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} required min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()} />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}><Clock size={16} /> Horario *</label>
                    <select style={styles.input} value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} required>
                        <option value="">Selecciona un horario</option>
                        {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Notas (opcional)</label>
                    <textarea style={styles.textarea} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej. Es la primera visita de mi mascota..." />
                </div>

                <button type="submit" style={styles.submitBtn} disabled={sending}>
                    {sending ? 'Agendando...' : 'Agendar Cita'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' },
    businessCard: { display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '16px' },
    roleIconBg: { width: 48, height: 48, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    errorBox: { margin: '0 1.5rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.9rem' },
    formContainer: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-text-dark)', display: 'flex', alignItems: 'center', gap: '0.3rem' },
    input: { padding: '1rem', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: '1rem', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
    textarea: { padding: '1rem', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: '1rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
    submitBtn: { marginTop: 'auto', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', cursor: 'pointer' },
};

export default BookAppointment;
