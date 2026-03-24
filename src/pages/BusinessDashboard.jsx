import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Star, Calendar, MapPin, Briefcase,
    BookOpen, ChevronRight, User, CalendarCheck,
} from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../constants/roles';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';

const StarRating = ({ rating, size = 14 }) => (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(i => (
            <Star
                key={i}
                size={size}
                color="#ee9d2b"
                fill={i <= Math.round(rating) ? '#ee9d2b' : 'none'}
            />
        ))}
    </div>
);

const BusinessDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [roles, setRoles] = useState([]);
    const [courses, setCourses] = useState([]);
    const [pendingAppointments, setPendingAppointments] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user) return;

            const [{ data: p }, { data: rawRoles }, { data: rawCourses }] = await Promise.all([
                supabase.from('profiles').select('display_name, avatar_url, email').eq('id', user.id).single(),
                supabase.from('business_roles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('courses').select('id, title, start_date, modality, business_role_id').eq('creator_id', user.id).order('created_at', { ascending: false }),
            ]);

            setProfile(p || null);
            setCourses(rawCourses || []);

            // Fetch ratings for all roles
            if (rawRoles && rawRoles.length > 0) {
                const roleIds = rawRoles.map(r => r.id);
                const { data: ratings } = await supabase
                    .from('business_ratings')
                    .select('business_role_id, rating')
                    .in('business_role_id', roleIds);

                const ratingsMap = {};
                (ratings || []).forEach(r => {
                    if (!ratingsMap[r.business_role_id]) ratingsMap[r.business_role_id] = [];
                    ratingsMap[r.business_role_id].push(r.rating);
                });

                const enriched = rawRoles.map(role => {
                    const arr = ratingsMap[role.id] || [];
                    const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                    return { ...role, avgRating: avg, ratingCount: arr.length };
                });
                setRoles(enriched);
            } else {
                setRoles([]);
            }

            // Count pending appointments for all roles
            if (rawRoles && rawRoles.length > 0) {
                const roleIds = rawRoles.map(r => r.id);
                const { count } = await supabase
                    .from('appointments')
                    .select('id', { count: 'exact', head: true })
                    .in('business_role_id', roleIds)
                    .eq('status', 'pending');
                setPendingAppointments(count || 0);
            }

            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) {
        return (
            <div style={styles.container}>
                <LoadingState />
            </div>
        );
    }

    const hasRoles = roles.length > 0;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Mi Panel" backTo="/home" />

            <div style={styles.content}>
                {/* Profile card */}
                <button
                    type="button"
                    style={styles.profileCard}
                    onClick={() => navigate('/profile')}
                >
                    <img
                        src={getAvatarUrl(profile?.avatar_url)}
                        alt=""
                        style={styles.avatar}
                    />
                    <div style={{ flex: 1 }}>
                        <h3 style={styles.profileName}>{profile?.display_name || 'Usuario'}</h3>
                        <p style={styles.profileEmail}>{profile?.email || ''}</p>
                    </div>
                    <ChevronRight size={20} color="var(--color-text-light)" />
                </button>

                {/* Roles section */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <Briefcase size={18} /> Mis Roles de Negocio
                        </h3>
                    </div>

                    {hasRoles ? (
                        <div style={styles.rolesList}>
                            {roles.map(role => {
                                const cfg = ROLE_CONFIG[role.role_type] || {};
                                const RoleIcon = cfg.Icon;
                                return (
                                    <div key={role.id} style={styles.roleCard}>
                                        <div style={{
                                            ...styles.roleIconBox,
                                            backgroundColor: cfg.color || '#f5f5f5',
                                        }}>
                                            {RoleIcon && <RoleIcon size={20} color="#555" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={styles.roleName}>{role.business_name}</div>
                                            <div style={styles.roleType}>{cfg.label || role.role_type}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                                                <StarRating rating={role.avgRating} />
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                                                    ({role.ratingCount})
                                                </span>
                                            </div>
                                        </div>
                                        <span style={{
                                            ...styles.statusBadge,
                                            backgroundColor: role.status === 'approved' ? '#e8f5e9' : '#fff8e1',
                                            color: role.status === 'approved' ? '#2e7d32' : '#f57f17',
                                        }}>
                                            {role.status === 'approved' ? 'Activo' : 'Pendiente'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            <Briefcase size={40} color="#ddd" />
                            <p style={styles.emptyText}>
                                Activa un rol de negocio para ofrecer tus servicios
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        style={styles.addBtn}
                        onClick={() => navigate('/activate-role')}
                    >
                        <Plus size={18} color="var(--color-primary)" />
                        <span>Activar nuevo rol</span>
                    </button>
                </div>

                {/* Courses section */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <BookOpen size={18} /> Mis Cursos
                        </h3>
                    </div>

                    {courses.length > 0 ? (
                        <div style={styles.rolesList}>
                            {courses.map(course => (
                                <button
                                    key={course.id}
                                    type="button"
                                    style={styles.courseCard}
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                >
                                    <BookOpen size={20} color="var(--color-primary)" />
                                    <div style={{ flex: 1 }}>
                                        <div style={styles.roleName}>{course.title}</div>
                                        <div style={styles.roleType}>
                                            {course.modality === 'presencial' ? 'Presencial' :
                                                course.modality === 'online' ? 'Online' : 'Híbrido'}
                                            {course.start_date && ` · ${new Date(course.start_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
                                        </div>
                                    </div>
                                    <ChevronRight size={18} color="var(--color-text-light)" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>
                            <BookOpen size={36} color="#ddd" />
                            <p style={styles.emptyText}>
                                {hasRoles ? 'Aún no has creado cursos.' : 'Activa un rol para crear cursos.'}
                            </p>
                        </div>
                    )}

                    {hasRoles && (
                        <button
                            type="button"
                            style={styles.addBtn}
                            onClick={() => navigate('/courses/new')}
                        >
                            <Plus size={18} color="var(--color-primary)" />
                            <span>Crear curso</span>
                        </button>
                    )}
                </div>

                {/* Appointments */}
                {hasRoles && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>
                                <CalendarCheck size={18} /> Citas
                            </h3>
                            {pendingAppointments > 0 && (
                                <span style={{ ...styles.statusBadge, backgroundColor: '#fff3e0', color: '#e65100' }}>
                                    {pendingAppointments} pendiente{pendingAppointments > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            style={styles.quickActionBtn}
                            onClick={() => navigate('/appointments')}
                        >
                            <CalendarCheck size={20} color="#2196f3" />
                            <span>Ver todas las citas</span>
                        </button>
                    </div>
                )}

                {/* Quick actions */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Acciones rápidas</h3>
                    <div style={styles.quickActions}>
                        <button type="button" style={styles.quickActionBtn} onClick={() => navigate('/create-event')}>
                            <Calendar size={20} color="#13ec5b" />
                            <span>Crear Evento</span>
                        </button>
                        <button type="button" style={styles.quickActionBtn} onClick={() => navigate('/map/new')}>
                            <MapPin size={20} color="#ee9d2b" />
                            <span>Agregar Lugar</span>
                        </button>
                        <button type="button" style={styles.quickActionBtn} onClick={() => navigate('/services/new')}>
                            <Briefcase size={20} color="#8b5cf6" />
                            <span>Publicar Servicio</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100%',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
    },
    content: {
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        flex: 1,
    },
    profileCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '1rem 1.25rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        objectFit: 'cover',
    },
    profileName: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
    },
    profileEmail: {
        margin: 0,
        fontSize: '0.82rem',
        color: 'var(--color-text-light)',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '1.25rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
    rolesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
    },
    roleCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: '#fafafa',
        borderRadius: '14px',
    },
    roleIconBox: {
        width: 40,
        height: 40,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    roleName: {
        fontSize: '0.92rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
    },
    roleType: {
        fontSize: '0.8rem',
        color: 'var(--color-text-light)',
    },
    statusBadge: {
        fontSize: '0.72rem',
        fontWeight: '600',
        padding: '0.25rem 0.65rem',
        borderRadius: '50px',
        flexShrink: 0,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1.5rem 0',
    },
    emptyText: {
        margin: 0,
        fontSize: '0.88rem',
        color: 'var(--color-text-light)',
        textAlign: 'center',
    },
    addBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '0.75rem',
        padding: '0.75rem',
        borderRadius: '14px',
        border: '2px dashed #e0e0e0',
        background: 'none',
        cursor: 'pointer',
        width: '100%',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-primary)',
        fontFamily: 'inherit',
    },
    courseCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: '#fafafa',
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
    },
    quickActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginTop: '0.5rem',
    },
    quickActionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: '#fafafa',
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        fontSize: '0.9rem',
        fontWeight: '500',
        color: 'var(--color-text-dark)',
        fontFamily: 'inherit',
        textAlign: 'left',
    },
};

export default BusinessDashboard;
