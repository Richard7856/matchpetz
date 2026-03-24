import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../constants/roles';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { formatEventDate } from '../utils/formatters';

const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' };
const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444', completed: '#6b7280' };

const MyAppointments = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('mine');
    const [myAppointments, setMyAppointments] = useState([]);
    const [businessAppointments, setBusinessAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user) return;

            // My appointments as client
            const { data: mine } = await supabase.from('appointments')
                .select('*, business_role:business_roles(id, business_name, role_type), pet:pets(id, name)')
                .eq('client_id', user.id)
                .order('appointment_date', { ascending: true });

            // My business roles
            const { data: myRoles } = await supabase.from('business_roles')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'approved');

            let bizAppts = [];
            if (myRoles && myRoles.length > 0) {
                const roleIds = myRoles.map(r => r.id);
                const { data: biz } = await supabase.from('appointments')
                    .select('*, business_role:business_roles(id, business_name, role_type), pet:pets(id, name), client:profiles!appointments_client_id_fkey(display_name, avatar_url)')
                    .in('business_role_id', roleIds)
                    .order('appointment_date', { ascending: true });
                bizAppts = biz || [];
            }

            setMyAppointments(mine || []);
            setBusinessAppointments(bizAppts);
            setLoading(false);
        };
        load();
    }, [user]);

    const updateStatus = async (appointmentId, newStatus) => {
        if (newStatus === 'cancelled' || newStatus === 'rejected') {
            const label = newStatus === 'cancelled' ? 'cancelar' : 'rechazar';
            if (!window.confirm(`¿Seguro que deseas ${label} esta cita?`)) return;
        }
        const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId);
        if (error) return;
        const updater = (list) => list.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a);
        if (activeTab === 'mine') setMyAppointments(updater);
        else setBusinessAppointments(updater);
    };

    const appointments = activeTab === 'mine' ? myAppointments : businessAppointments;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Citas" />

            <div style={styles.tabsContainer}>
                <button style={{ ...styles.tabBtn, ...(activeTab === 'mine' ? styles.activeTab : {}) }} onClick={() => setActiveTab('mine')}>
                    Mis citas
                </button>
                <button style={{ ...styles.tabBtn, ...(activeTab === 'business' ? styles.activeTab : {}) }} onClick={() => setActiveTab('business')}>
                    Mi negocio
                </button>
            </div>

            <div style={styles.content}>
                {loading ? (
                    <LoadingState />
                ) : appointments.length === 0 ? (
                    activeTab === 'mine' ? (
                        <EmptyState
                            title="No tienes citas aún"
                            subtitle="Explora negocios y agenda tu primera cita"
                            actionLabel="Explorar negocios"
                            onAction={() => navigate('/explore')}
                            icon={<Calendar size={28} color="var(--color-primary)" />}
                        />
                    ) : (
                        <EmptyState
                            title="No hay citas en tu negocio"
                            subtitle="Cuando un cliente agende una cita, aparecerá aquí"
                            icon={<Calendar size={28} color="var(--color-primary)" />}
                        />
                    )
                ) : (
                    appointments.map((appt) => {
                        const cfg = ROLE_CONFIG[appt.business_role?.role_type] || {};
                        return (
                            <div key={appt.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={{ ...styles.roleIconBg, backgroundColor: cfg.color || '#f5f5f5' }}>
                                        {cfg.Icon && <cfg.Icon size={20} color="#555" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={styles.businessName}>{appt.business_role?.business_name || 'Negocio'}</p>
                                        {activeTab === 'business' && appt.client && (
                                            <p style={styles.clientName}>Cliente: {appt.client.display_name || 'Usuario'}</p>
                                        )}
                                    </div>
                                    <span style={{ ...styles.statusBadge, backgroundColor: `${STATUS_COLORS[appt.status]}15`, color: STATUS_COLORS[appt.status] }}>
                                        {STATUS_LABELS[appt.status]}
                                    </span>
                                </div>

                                <div style={styles.detailsRow}>
                                    <div style={styles.detailItem}>
                                        <Calendar size={14} color="var(--color-text-light)" />
                                        <span>{formatEventDate(appt.appointment_date, true)}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <Clock size={14} color="var(--color-text-light)" />
                                        <span>{appt.time_slot}</span>
                                    </div>
                                </div>

                                {appt.pet && (
                                    <p style={styles.petInfo}>Mascota: {appt.pet.name}</p>
                                )}
                                {appt.notes && <p style={styles.notes}>{appt.notes}</p>}

                                <div style={styles.actions}>
                                    {activeTab === 'mine' && appt.status === 'pending' && (
                                        <button style={styles.cancelBtn} onClick={() => updateStatus(appt.id, 'cancelled')}>Cancelar</button>
                                    )}
                                    {activeTab === 'business' && appt.status === 'pending' && (
                                        <>
                                            <button style={styles.confirmBtn} onClick={() => updateStatus(appt.id, 'confirmed')}>Confirmar</button>
                                            <button style={styles.cancelBtn} onClick={() => updateStatus(appt.id, 'cancelled')}>Rechazar</button>
                                        </>
                                    )}
                                    {activeTab === 'business' && appt.status === 'confirmed' && (
                                        <button style={styles.completeBtn} onClick={() => updateStatus(appt.id, 'completed')}>Completar</button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' },
    tabsContainer: { display: 'flex', padding: '0.75rem 1rem', gap: '0.5rem', backgroundColor: '#fff' },
    tabBtn: { flex: 1, padding: '0.7rem', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', backgroundColor: '#f5f5f5', color: 'var(--color-text-light)', cursor: 'pointer' },
    activeTab: { backgroundColor: 'var(--color-primary)', color: '#fff' },
    content: { flex: 1, padding: '1rem', overflowY: 'auto' },
    emptyText: { textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.95rem', marginTop: '2rem' },
    card: { backgroundColor: '#fff', borderRadius: '16px', padding: '1rem', marginBottom: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
    roleIconBg: { width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    businessName: { fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)' },
    clientName: { fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0 },
    statusBadge: { padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
    detailsRow: { display: 'flex', gap: '1rem', marginBottom: '0.5rem' },
    detailItem: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem', color: 'var(--color-text-light)' },
    petInfo: { fontSize: '0.88rem', color: 'var(--color-text-dark)', margin: '0 0 0.25rem', fontWeight: '600' },
    notes: { fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0, fontStyle: 'italic' },
    actions: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
    cancelBtn: { flex: 1, padding: '0.6rem', borderRadius: '12px', border: '1.5px solid #ef4444', backgroundColor: '#fff', color: '#ef4444', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
    confirmBtn: { flex: 1, padding: '0.6rem', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
    completeBtn: { flex: 1, padding: '0.6rem', borderRadius: '12px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
};

export default MyAppointments;
