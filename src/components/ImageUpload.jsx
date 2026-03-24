import React, { useState, useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente reutilizable para subir imágenes a Supabase Storage.
 *
 * Props:
 * - currentImageUrl: URL de la imagen actual (para preview)
 * - onUpload: callback con la URL pública de la imagen subida
 * - folder: subcarpeta dentro del bucket (ej: 'pets', 'events', 'avatars')
 * - shape: 'square' | 'circle' | 'banner' — forma del preview
 * - size: tamaño en px (para square/circle) o height para banner
 * - placeholder: texto a mostrar cuando no hay imagen
 */
const ImageUpload = ({
    currentImageUrl = '',
    onUpload,
    folder = 'general',
    shape = 'square',
    size = 120,
    placeholder = 'Subir foto',
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(currentImageUrl);
    const [error, setError] = useState(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setError('Solo se permiten imágenes (JPG, PNG, WebP, GIF)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no debe superar 5MB');
            return;
        }

        setError(null);
        setUploading(true);

        // Show local preview immediately
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);

        try {
            // Generate unique filename
            const ext = file.name.split('.').pop();
            const fileName = `${user.id}/${folder}/${Date.now()}.${ext}`;

            const { data, error: uploadError } = await supabase.storage
                .from('matchpet-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('matchpet-images')
                .getPublicUrl(data.path);

            setPreview(publicUrl);
            if (onUpload) onUpload(publicUrl);
        } catch (err) {
            setError('Error al subir la imagen. Intenta de nuevo.');
            setPreview(currentImageUrl);
        } finally {
            setUploading(false);
            // Clean up object URL
            URL.revokeObjectURL(localPreview);
        }
    };

    const handleRemove = () => {
        setPreview('');
        setError(null);
        if (onUpload) onUpload('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isBanner = shape === 'banner';
    const isCircle = shape === 'circle';

    const containerStyle = {
        position: 'relative',
        width: isBanner ? '100%' : `${size}px`,
        height: isBanner ? `${size}px` : `${size}px`,
        borderRadius: isCircle ? '50%' : isBanner ? '16px' : '16px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        border: '2px dashed #d0d0d0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        flexShrink: 0,
    };

    const imgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isBanner ? 'stretch' : 'center', gap: '0.5rem' }}>
            <div
                style={containerStyle}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="Preview" style={imgStyle} />
                        {!uploading && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                style={styles.removeBtn}
                            >
                                <X size={14} color="#fff" />
                            </button>
                        )}
                        {!uploading && (
                            <div style={styles.cameraOverlay}>
                                <Camera size={18} color="#fff" />
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {uploading ? (
                            <div style={styles.spinner} />
                        ) : (
                            <>
                                <Upload size={24} color="#aaa" />
                                <span style={styles.placeholderText}>{placeholder}</span>
                            </>
                        )}
                    </>
                )}

                {uploading && preview && (
                    <div style={styles.uploadingOverlay}>
                        <div style={styles.spinner} />
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {error && (
                <span style={styles.errorText}>{error}</span>
            )}
        </div>
    );
};

const styles = {
    removeBtn: {
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        zIndex: 2,
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: '6px',
        right: '6px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    spinner: {
        width: '28px',
        height: '28px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTop: '3px solid #fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    placeholderText: {
        fontSize: '0.75rem',
        color: '#aaa',
        marginTop: '0.3rem',
        textAlign: 'center',
    },
    errorText: {
        fontSize: '0.8rem',
        color: '#e53935',
        textAlign: 'center',
    },
};

export default ImageUpload;
