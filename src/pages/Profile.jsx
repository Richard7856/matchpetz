import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Edit2, LogOut, ChevronRight, Award, Shield, Heart, Trash2, Plus, Star, PawPrint } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../constants/roles';
import SocialLinks from '../components/SocialLinks';
import AppBar from '../components/AppBar';
import LoadingState from '../components/LoadingState';
import ErrorBox from '../components/ErrorBox';
import EmptyState from '../components/EmptyState';

const Profile = () => {
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [myPets, setMyPets] = useState([]);
    const [myPersonalPets, setMyPersonalPets] = useState([]);
    const [myRoles, setMyRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const [profileRes, petsRes, rolesRes, personalPetsRes] = await Promise.all([
                    supabase.from('profiles').select('id, display_name, email, avatar_url, stats, instagram, facebook, twitter, tiktok').eq('id', user.id).single(),
                    supabase.from('adoption_pets').select('id, name, type, image_url, status').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('business_roles').select('id, role_type, business_name, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('pets').select('id, name, species, breed, image_url').eq('owner_id', user.id).order('created_at', { ascending: false }),
                ]);
                if (profileRes.error) throw profileRes.error;
                setProfile(profileRes.data || null);
                setMyPets(petsRes.data || []);
                setMyPersonalPets(personalPetsRes.data || []);
                setMyRoles(rolesRes.data || []);
            } catch (err) {
                setLoadError('No se pudo cargar el perfil.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    const displayName = profile?.display_name || 'Usuario';
    const email = profile?.email || '';
    const avatarUrl = profile?.avatar_url || '';
    const stats = profile?.stats || { pets: 0, friends: 0, impacts: 0 };

    if (loading) {
        return (
            <div style={styles.container}>
                <LoadingState message="Cargando perfil..." />
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={styles.container}>
                <AppBar title="Mi Perfil" />
                <div style={{ padding: '1rem' }}><ErrorBox message={loadError} /></div>
            </div>
        );
    }

    return (
        <div style={styles.container} className="fade-in">
            <AppBar
                title="Mi Perfil"
                showBack={false}
                rightAction={
                    <button style={{ background: '#f5f5f5', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }} onClick={() => navigate('/profile/edit')}>
                        <Settings size={24} color="var(--color-text-dark)" />
                    </button>
                }
            />

            <div style={styles.content}>
                <div style={styles.profileCard}>
                    <div style={styles.avatarSection}>
                        <div style={styles.avatarWrapper}>
                            <img
                                src={getAvatarUrl(avatarUrl, profile?.id)}
                                alt="Avatar"
                                style={styles.avatar}
                            />
                            <button style={styles.editAvatarBtn}>
                                <Edit2 size={12} color="#fff" />
                            </button>
                        </div>
                        <div style={styles.userInfo}>
                            <h3 style={styles.userName}>{displayName}</h3>
                            <p style={styles.userEmail}>{email || 'Sin email'}</p>
                            <SocialLinks
                                instagram={profile?.instagram}
                                facebook={profile?.facebook}
                                twitter={profile?.twitter}
                                tiktok={profile?.tiktok}
                            />
                        </div>
                    </div>

                    <div style={styles.statsRow}>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{stats.pets ?? 0}</span>
                            <span style={styles.statLabel}>Mascotas</span>
                        </div>
                        <div style={styles.statDivider}></div>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{stats.friends ?? 0}</span>
                            <span style={styles.statLabel}>Amigos</span>
                        </div>
                        <div style={styles.statDivider}></div>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>{stats.impacts ?? 0}</span>
                            <span style={styles.statLabel}>Impactos</span>
                        </div>
                    </div>
                </div>

                {/* Mis mascotas personales */}
                <div style={styles.optionsSection}>
                    <h4 style={styles.sectionTitle}>Mis Mascotas</h4>
                    {myPersonalPets.length === 0 ? (
                        <EmptyState
                            title="Registra tu primera mascota"
                            subtitle="Agrega a tu compañero peludo para acceder a todas las funciones"
                            actionLabel="Agregar mascota"
                            onAction={() => navigate('/pets/new')}
                            icon={<PawPrint size={28} color="var(--color-primary)" />}
                        />
                    ) : (
                        <>
                            {myPersonalPets.map((pet) => (
                                <div key={pet.id} style={styles.optionItem} onClick={() => navigate(`/pets/${pet.id}`)}>
                                    <div style={{ ...styles.optionIconBg, backgroundColor: '#fff0e6', backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                        {!pet.image_url && <PawPrint size={20} color="var(--color-primary)" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={styles.optionText}>{pet.name}</span>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', margin: 0 }}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                                    </div>
                                    <ChevronRight size={20} color="var(--color-text-light)" />
                                </div>
                            ))}
                            <div
                                style={{ ...styles.optionItem, justifyContent: 'center', border: '2px dashed #e0e0e0', boxShadow: 'none' }}
                                onClick={() => navigate('/pets/new')}
                            >
                                <Plus size={18} color="var(--color-primary)" />
                                <span style={{ color: 'var(--color-primary)', fontWeight: '600', marginLeft: '0.4rem' }}>Agregar mascota</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Roles de negocio */}
                <div style={styles.optionsSection}>
                    <h4 style={styles.sectionTitle}>Roles de Negocio</h4>
                    {myRoles.length > 0 ? myRoles.map(role => {
                        const cfg = ROLE_CONFIG[role.role_type] || {};
                        const RoleIcon = cfg.Icon;
                        return (
                            <div key={role.id} style={styles.optionItem}>
                                <div style={{ ...styles.optionIconBg, backgroundColor: cfg.color || '#f5f5f5' }}>
                                    {RoleIcon && <RoleIcon size={20} color="#555" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={styles.optionText}>{role.business_name}</span>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', margin: 0 }}>
                                        {cfg.label || role.role_type} · {role.status === 'approved' ? 'Activo' : 'Pendiente'}
                                    </p>
                                </div>
                                <ChevronRight size={20} color="var(--color-text-light)" />
                            </div>
                        );
                    }) : (
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
                            No tienes roles de negocio activos.
                        </p>
                    )}
                    <div
                        style={{ ...styles.optionItem, justifyContent: 'center', border: '2px dashed #e0e0e0', boxShadow: 'none' }}
                        onClick={() => navigate('/activate-role')}
                    >
                        <Plus size={18} color="var(--color-primary)" />
                        <span style={{ color: 'var(--color-primary)', fontWeight: '600', marginLeft: '0.4rem' }}>Activar rol de negocio</span>
                    </div>
                </div>

                <div style={styles.optionsSection}>
                    <h4 style={styles.sectionTitle}>Cuenta</h4>
                    <div style={styles.optionItem}>
                        <div style={{ ...styles.optionIconBg, backgroundColor: '#fff8eb' }}>
                            <Shield size={20} color="var(--color-primary)" />
                        </div>
                        <span style={styles.optionText}>Privacidad y Seguridad</span>
                        <ChevronRight size={20} color="var(--color-text-light)" />
                    </div>
                    <div style={styles.optionItem}>
                        <div style={{ ...styles.optionIconBg, backgroundColor: '#eefdf2' }}>
                            <Award size={20} color="var(--color-social)" />
                        </div>
                        <span style={styles.optionText}>Mis Impactos (Adopciones)</span>
                        <ChevronRight size={20} color="var(--color-text-light)" />
                    </div>
                </div>

                {/* Mis mascotas en adopción */}
                {myPets.length > 0 && (
                    <div style={styles.optionsSection}>
                        <h4 style={styles.sectionTitle}>Mis mascotas en adopción</h4>
                        {myPets.map((pet) => (
                            <div key={pet.id} style={styles.optionItem}>
                                <div style={{ ...styles.optionIconBg, backgroundColor: '#fff0e6', backgroundImage: pet.image_url ? `url(${pet.image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    {!pet.image_url && <Heart size={20} color="var(--color-primary)" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={styles.optionText}>{pet.name}</span>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', margin: 0 }}>{pet.type} · {pet.status}</p>
                                </div>
                                <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', width: 'auto', display: 'flex' }}
                                    onClick={async () => {
                                        if (!window.confirm(`¿Seguro que deseas eliminar a ${pet.name} de adopción?`)) return;
                                        const { error } = await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                        if (!error) setMyPets((prev) => prev.filter((p) => p.id !== pet.id));
                                    }}
                                >
                                    <Trash2 size={18} color="#e53935" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                    <a href="/terminos.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textDecoration: 'none' }}>Terminos y Condiciones</a>
                    <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textDecoration: 'none' }}>Politica de Privacidad</a>
                </div>

                <button style={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
            </div>

        </div>
    );
};

const styles = {
    container: { minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' },
    content: { padding: '1.5rem', flex: 1, overflowY: 'auto' },
    profileCard: { backgroundColor: '#fff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '2rem' },
    avatarSection: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' },
    avatarWrapper: { position: 'relative' },
    avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
    userInfo: { flex: 1 },
    userName: { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.2rem' },
    userEmail: { fontSize: '0.9rem', color: 'var(--color-text-light)' },
    statsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '1.5rem' },
    statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
    statValue: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-dark)' },
    statLabel: { fontSize: '0.8rem', color: 'var(--color-text-light)' },
    statDivider: { width: '1px', height: '30px', backgroundColor: '#f0f0f0' },
    optionsSection: { marginBottom: '2rem' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-text-dark)' },
    optionItem: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '1rem', borderRadius: '16px', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer' },
    optionIconBg: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem' },
    optionText: { flex: 1, fontSize: '1rem', fontWeight: '600' },
    logoutBtn: { width: '100%', backgroundColor: 'transparent', color: '#ff4b4b', border: '2px solid #ff4b4b', padding: '1rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: 'auto' },
};

export default Profile;
