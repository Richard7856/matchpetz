import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Calendar, MapPin, Clock, Users, DollarSign,
    Star, BookOpen, User,
} from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG } from '../constants/roles';

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

const CourseDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [creator, setCreator] = useState(null);
    const [businessRole, setBusinessRole] = useState(null);
    const [roleRating, setRoleRating] = useState({ avg: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data: c } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();
            if (!c) { setLoading(false); return; }
            setCourse(c);

            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', c.creator_id)
                .single();
            setCreator(profile);

            if (c.business_role_id) {
                const { data: role } = await supabase
                    .from('business_roles')
                    .select('*')
                    .eq('id', c.business_role_id)
                    .single();
                setBusinessRole(role);

                if (role) {
                    const { data: ratings } = await supabase
                        .from('business_ratings')
                        .select('rating')
                        .eq('business_role_id', role.id);
                    const arr = (ratings || []).map(r => r.rating);
                    setRoleRating({
                        avg: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
                        count: arr.length,
                    });
                }
            }

            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
                    Cargando curso...
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div style={styles.container} className="fade-in">
                <AppBar title="Curso" />
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
                    Curso no encontrado.
                </div>
            </div>
        );
    }

    const roleCfg = businessRole ? (ROLE_CONFIG[businessRole.role_type] || {}) : {};
    const RoleIcon = roleCfg.Icon;

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Detalle del Curso" />

            <div style={styles.content}>
                {/* Course image */}
                {course.image_url && (
                    <img src={course.image_url} alt="" style={styles.coverImage} loading="lazy" />
                )}

                {/* Course info */}
                <div style={styles.card}>
                    <h2 style={styles.courseTitle}>{course.title}</h2>

                    <div style={styles.metaRow}>
                        {course.modality && (
                            <span style={styles.badge}>
                                {course.modality === 'presencial' ? 'Presencial' :
                                    course.modality === 'online' ? 'Online' : 'Híbrido'}
                            </span>
                        )}
                        {course.price != null && (
                            <span style={styles.price}>
                                <DollarSign size={14} /> ${Number(course.price).toFixed(2)}
                            </span>
                        )}
                    </div>

                    {course.description && (
                        <p style={styles.description}>{course.description}</p>
                    )}

                    <div style={styles.detailsList}>
                        {course.duration && (
                            <div style={styles.detailItem}>
                                <Clock size={16} color="var(--color-text-light)" />
                                <span>{course.duration}</span>
                            </div>
                        )}
                        {course.start_date && (
                            <div style={styles.detailItem}>
                                <Calendar size={16} color="var(--color-text-light)" />
                                <span>{new Date(course.start_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                        )}
                        {course.location && (
                            <div style={styles.detailItem}>
                                <MapPin size={16} color="var(--color-text-light)" />
                                <span>{course.location}</span>
                            </div>
                        )}
                        {course.max_participants && (
                            <div style={styles.detailItem}>
                                <Users size={16} color="var(--color-text-light)" />
                                <span>Máx. {course.max_participants} participantes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Creator info */}
                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>Impartido por</h3>
                    <div style={styles.creatorRow}>
                        <img
                            src={getAvatarUrl(creator?.avatar_url)}
                            alt=""
                            style={styles.creatorAvatar}
                            loading="lazy"
                        />
                        <div style={{ flex: 1 }}>
                            <div style={styles.creatorName}>
                                {creator?.display_name || 'Usuario'}
                            </div>
                            {businessRole && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                    {RoleIcon && (
                                        <div style={{
                                            width: 22, height: 22, borderRadius: '6px',
                                            backgroundColor: roleCfg.color || '#f5f5f5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <RoleIcon size={12} color="#555" />
                                        </div>
                                    )}
                                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                                        {businessRole.business_name}
                                    </span>
                                </div>
                            )}
                            {roleRating.count > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                                    <StarRating rating={roleRating.avg} />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                                        {roleRating.avg.toFixed(1)} ({roleRating.count})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contact button */}
                <button
                    type="button"
                    style={styles.contactBtn}
                    onClick={() => {
                        if (course.creator_id) navigate(`/chat/${course.creator_id}`);
                    }}
                >
                    Contactar
                </button>
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
    coverImage: {
        width: '100%',
        height: '200px',
        objectFit: 'cover',
        borderRadius: '20px',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '1.25rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    },
    courseTitle: {
        margin: 0,
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginTop: '0.75rem',
    },
    badge: {
        fontSize: '0.78rem',
        fontWeight: '600',
        padding: '0.3rem 0.75rem',
        borderRadius: '50px',
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
    },
    price: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.2rem',
        fontSize: '1rem',
        fontWeight: 'bold',
        color: 'var(--color-primary)',
    },
    description: {
        margin: '1rem 0 0',
        fontSize: '0.92rem',
        color: 'var(--color-text-dark)',
        lineHeight: 1.5,
    },
    detailsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        marginTop: '1rem',
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        color: 'var(--color-text-dark)',
    },
    sectionTitle: {
        margin: '0 0 0.75rem',
        fontSize: '1rem',
        fontWeight: 'bold',
        color: 'var(--color-text-dark)',
    },
    creatorRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    creatorAvatar: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        objectFit: 'cover',
    },
    creatorName: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
    },
    contactBtn: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        padding: '1.1rem',
        borderRadius: '50px',
        fontSize: '1.05rem',
        fontWeight: 'bold',
        width: '100%',
        cursor: 'pointer',
        marginTop: 'auto',
    },
};

export default CourseDetail;
