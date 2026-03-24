import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente para subir multiples imagenes a Supabase Storage.
 *
 * Props:
 * - images: string[] — array de URLs actuales
 * - onImagesChange: (urls: string[]) => void
 * - folder: subcarpeta dentro del bucket
 * - maxImages: numero maximo de imagenes (default 5)
 * - shape: 'square' | 'banner'
 * - mainSize: tamaño de la imagen principal en px
 */
const MultiImageUpload = ({
    images = [],
    onImagesChange,
    folder = 'general',
    maxImages = 5,
    shape = 'square',
    mainSize = 160,
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !user) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 5 * 1024 * 1024;
        const remaining = maxImages - images.length;
        const toUpload = files.slice(0, remaining);

        for (const file of toUpload) {
            if (!validTypes.includes(file.type)) {
                setError('Solo se permiten imagenes (JPG, PNG, WebP, GIF)');
                return;
            }
            if (file.size > maxSize) {
                setError('Cada imagen no debe superar 5MB');
                return;
            }
        }

        setError(null);
        setUploading(true);

        try {
            const uploaded = [];
            for (const file of toUpload) {
                const ext = file.name.split('.').pop();
                const fileName = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

                const { data, error: uploadError } = await supabase.storage
                    .from('matchpet-images')
                    .upload(fileName, file, { cacheControl: '3600', upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('matchpet-images')
                    .getPublicUrl(data.path);

                uploaded.push(publicUrl);
            }

            const newImages = [...images, ...uploaded];
            if (onImagesChange) onImagesChange(newImages);
        } catch (err) {
            setError('Error al subir. Intenta de nuevo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        if (onImagesChange) onImagesChange(newImages);
    };

    const setAsMain = (index) => {
        if (index === 0) return;
        const newImages = [...images];
        const [moved] = newImages.splice(index, 1);
        newImages.unshift(moved);
        if (onImagesChange) onImagesChange(newImages);
    };

    const isBanner = shape === 'banner';
    const canAdd = images.length < maxImages;

    return (
        <div style={s.wrapper}>
            {/* Main image or upload placeholder */}
            {images.length === 0 ? (
                <div
                    style={{
                        ...s.mainSlot,
                        height: isBanner ? `${mainSize}px` : `${mainSize}px`,
                        width: isBanner ? '100%' : `${mainSize}px`,
                        borderRadius: isBanner ? '16px' : '16px',
                    }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <div style={s.spinner} />
                    ) : (
                        <>
                            <div style={s.uploadIconCircle}>
                                <Camera size={24} color="var(--color-primary)" />
                            </div>
                            <span style={s.uploadMainText}>Subir foto</span>
                            <span style={s.uploadSubText}>JPG, PNG o WebP (max 5MB)</span>
                        </>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        ...s.mainImageContainer,
                        height: isBanner ? `${mainSize}px` : `${mainSize}px`,
                        width: isBanner ? '100%' : '100%',
                        borderRadius: '16px',
                    }}
                >
                    <img src={images[0]} alt="Principal" style={s.mainImage} />
                    <div style={s.mainBadge}>Principal</div>
                    <button
                        type="button"
                        onClick={() => removeImage(0)}
                        style={s.removeBtn}
                    >
                        <X size={14} color="#fff" />
                    </button>
                </div>
            )}

            {/* Thumbnails row */}
            {(images.length > 0 || canAdd) && (
                <div style={s.thumbRow}>
                    {images.slice(1).map((url, i) => (
                        <div key={i} style={s.thumb} onClick={() => setAsMain(i + 1)}>
                            <img src={url} alt="" style={s.thumbImage} />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(i + 1); }}
                                style={s.thumbRemove}
                            >
                                <X size={10} color="#fff" />
                            </button>
                        </div>
                    ))}

                    {canAdd && images.length > 0 && (
                        <div
                            style={s.addThumb}
                            onClick={() => !uploading && fileInputRef.current?.click()}
                        >
                            {uploading ? (
                                <div style={s.spinnerSmall} />
                            ) : (
                                <>
                                    <Plus size={20} color="var(--color-primary)" />
                                    <span style={s.addThumbText}>Agregar</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {images.length > 1 && (
                <p style={s.hint}>Toca una foto para hacerla principal</p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {error && <span style={s.errorText}>{error}</span>}

            <p style={s.counter}>
                <ImageIcon size={13} color="var(--color-text-light)" />
                {images.length}/{maxImages} fotos {images.length === 0 && '(opcional)'}
            </p>
        </div>
    );
};

const s = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    mainSlot: {
        backgroundColor: 'var(--color-surface)',
        border: '2px dashed var(--color-primary)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        gap: '0.4rem',
        transition: 'border-color 0.2s',
    },
    uploadIconCircle: {
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        backgroundColor: 'rgba(238,157,43,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.25rem',
    },
    uploadMainText: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: 'var(--color-text-dark)',
    },
    uploadSubText: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
    },
    mainImageContainer: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    mainImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    mainBadge: {
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '0.25rem 0.6rem',
        borderRadius: '20px',
    },
    removeBtn: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    thumbRow: {
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
    },
    thumb: {
        position: 'relative',
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'pointer',
        border: '2px solid transparent',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    thumbRemove: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.55)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    addThumb: {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '2px dashed var(--color-primary)',
        backgroundColor: 'rgba(238,157,43,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        gap: '2px',
    },
    addThumbText: {
        fontSize: '0.6rem',
        color: 'var(--color-primary)',
        fontWeight: '600',
    },
    hint: {
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
        margin: 0,
        textAlign: 'center',
    },
    counter: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-light)',
        margin: 0,
    },
    spinner: {
        width: '28px',
        height: '28px',
        border: '3px solid rgba(238,157,43,0.2)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    spinnerSmall: {
        width: '20px',
        height: '20px',
        border: '2px solid rgba(238,157,43,0.2)',
        borderTop: '2px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    errorText: {
        fontSize: '0.8rem',
        color: '#e53935',
    },
};

export default MultiImageUpload;
