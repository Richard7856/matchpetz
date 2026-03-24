import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '../components/AppBar';
import { ROLE_CONFIG, ALL_ROLE_TYPES } from '../constants/roles';

const ActivateRole = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [availableTypes, setAvailableTypes] = useState([]);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        roleType: '',
        businessName: '',
        description: '',
        documentUrl: '',
    });
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            const { data: existingRoles } = await supabase
                .from('business_roles')
                .select('role_type')
                .eq('user_id', user.id);
            const takenTypes = (existingRoles || []).map(r => r.role_type);
            const available = ALL_ROLE_TYPES.filter(t => !takenTypes.includes(t.value));
            setAvailableTypes(available);
            if (available.length > 0) {
                setForm(f => ({ ...f, roleType: available[0].value }));
            }
        };
        load();
    }, [user]);

    const handleDocumentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setError('El archivo no debe superar 10 MB.');
            return;
        }
        setUploading(true);
        setError('');
        const ext = file.name.split('.').pop();
        const filePath = `${user.id}/${form.roleType}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
            .from('business-documents')
            .upload(filePath, file);
        if (uploadErr) {
            setError('Error al subir el documento: ' + uploadErr.message);
            setUploading(false);
            return;
        }
        const { data: urlData } = supabase.storage
            .from('business-documents')
            .getPublicUrl(filePath);
        setForm(prev => ({ ...prev, documentUrl: urlData.publicUrl }));
        setFileName(file.name);
        setUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.roleType || !form.businessName.trim()) {
            setError('Completa el tipo de rol y nombre del negocio.');
            return;
        }
        if (!form.documentUrl) {
            setError('Debes subir un documento de verificación.');
            return;
        }
        setSending(true);
        setError('');
        const { error: insertErr } = await supabase.from('business_roles').insert({
            user_id: user.id,
            role_type: form.roleType,
            business_name: form.businessName.trim(),
            description: form.description.trim() || null,
            document_url: form.documentUrl,
            status: 'approved',
        });
        if (insertErr) {
            if (insertErr.code === '23505') {
                setError('Ya tienes este rol activado.');
            } else {
                setError('Error: ' + insertErr.message);
            }
            setSending(false);
            return;
        }
        navigate('/dashboard');
    };

    if (availableTypes.length === 0 && user) {
        return (
            <div style={styles.container} className="fade-in">
                <AppBar title="Activar Rol" />
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
                    Ya tienes todos los roles disponibles activados.
                </div>
            </div>
        );
    }

    const selectedConfig = ROLE_CONFIG[form.roleType];

    return (
        <div style={styles.container} className="fade-in">
            <AppBar title="Activar Rol de Negocio" />

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.formContainer}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Tipo de Rol</label>
                    <select
                        style={styles.input}
                        value={form.roleType}
                        onChange={e => setForm(f => ({ ...f, roleType: e.target.value }))}
                    >
                        {availableTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    {selectedConfig && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '8px',
                                backgroundColor: selectedConfig.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <selectedConfig.Icon size={16} color="#555" />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                {selectedConfig.label}
                            </span>
                        </div>
                    )}
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre del Negocio</label>
                    <input
                        type="text"
                        placeholder="Ej. Veterinaria PetCare"
                        style={styles.input}
                        value={form.businessName}
                        onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                        required
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción (opcional)</label>
                    <textarea
                        placeholder="Cuéntanos sobre tu negocio o servicio..."
                        style={styles.textarea}
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Documento de Verificación</label>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                        Sube un documento que acredite tu servicio (PDF, imagen, etc.)
                    </p>
                    <label style={styles.uploadBox}>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            style={{ display: 'none' }}
                            onChange={handleDocumentUpload}
                            disabled={uploading}
                        />
                        {uploading ? (
                            <>
                                <Loader size={28} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={styles.uploadText}>Subiendo...</span>
                            </>
                        ) : fileName ? (
                            <>
                                <FileText size={28} color="var(--color-primary)" />
                                <span style={styles.uploadText}>{fileName}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                                    Toca para cambiar
                                </span>
                            </>
                        ) : (
                            <>
                                <Upload size={28} color="var(--color-text-light)" />
                                <span style={styles.uploadText}>Subir documento</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                                    PDF, JPG o PNG (máx 10 MB)
                                </span>
                            </>
                        )}
                    </label>
                </div>

                <button
                    type="submit"
                    style={{
                        ...styles.submitBtn,
                        opacity: sending || !form.businessName.trim() || !form.documentUrl ? 0.6 : 1,
                    }}
                    disabled={sending || !form.businessName.trim() || !form.documentUrl}
                >
                    {sending ? 'Activando...' : 'Activar Rol'}
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
    uploadBox: {
        width: '100%',
        minHeight: '120px',
        backgroundColor: '#f9f9f9',
        borderRadius: '16px',
        border: '2px dashed #ddd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        gap: '0.5rem',
        padding: '1rem',
        boxSizing: 'border-box',
    },
    uploadText: {
        color: 'var(--color-text-dark)',
        fontWeight: '600',
        fontSize: '0.9rem',
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

export default ActivateRole;
