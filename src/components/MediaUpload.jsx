// MediaUpload.jsx — Upload component for images AND short videos
// Images: compressed to 1080px/82% JPEG before upload
// Videos: uploaded directly (no browser compression), max 50MB, max ~60s
// Shows a live preview (img or video) after selection

import React, { useState, useRef } from 'react';
import { Camera, Video, X, Upload } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../utils/compressImage';
import {
    isVideoFile,
    ACCEPTED_MEDIA_TYPES,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
} from '../utils/mediaUtils';

const MediaUpload = ({
    currentUrl = '',
    onUpload,        // callback(url: string, isVideo: boolean)
    folder = 'posts',
    placeholder = 'Foto o Video',
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [uploading, setUploading]   = useState(false);
    const [progress, setProgress]     = useState(0);   // 0-100
    const [preview, setPreview]       = useState(currentUrl);
    const [isVideo, setIsVideo]       = useState(false);
    const [error, setError]           = useState(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setError(null);
        const video = isVideoFile(file);

        // ── Validate ──────────────────────────────────────────────────────
        if (video && file.size > MAX_VIDEO_SIZE) {
            setError('El video no debe superar 50MB. Prueba recortarlo o comprimirlo antes.');
            return;
        }
        if (!video && file.size > MAX_IMAGE_SIZE) {
            setError('La imagen no debe superar 5MB.');
            return;
        }

        // ── Local preview (instant, before upload finishes) ───────────────
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
        setIsVideo(video);
        setUploading(true);
        setProgress(10);

        try {
            let fileToUpload = file;
            let ext = 'jpg';

            if (video) {
                // Videos: upload directly — browser can't compress video efficiently
                fileToUpload = file;
                ext = file.name.split('.').pop().toLowerCase() || 'mp4';
            } else {
                // Images: compress before upload
                fileToUpload = await compressImage(file, { maxWidth: 1080, maxHeight: 1080, quality: 0.82 });
                ext = 'jpg';
            }

            setProgress(40);

            const fileName = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

            const { data, error: uploadError } = await supabase.storage
                .from('matchpet-images')
                .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;
            setProgress(90);

            const { data: { publicUrl } } = supabase.storage
                .from('matchpet-images')
                .getPublicUrl(data.path);

            setPreview(publicUrl);
            setProgress(100);
            if (onUpload) onUpload(publicUrl, video);
        } catch (err) {
            setError('Error al subir. Intenta de nuevo.');
            setPreview(currentUrl);
            setIsVideo(false);
        } finally {
            setUploading(false);
            URL.revokeObjectURL(localUrl);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        setPreview('');
        setIsVideo(false);
        setError(null);
        setProgress(0);
        if (onUpload) onUpload('', false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={s.wrapper}>
            {/* Preview area */}
            <div
                style={s.previewBox}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                {preview ? (
                    <>
                        {isVideo ? (
                            /* Video preview */
                            <video
                                src={preview}
                                style={s.previewMedia}
                                muted
                                playsInline
                                preload="metadata"
                                loop
                                autoPlay
                            />
                        ) : (
                            /* Image preview */
                            <img src={preview} alt="Preview" style={s.previewMedia} />
                        )}

                        {/* Uploading progress bar */}
                        {uploading && (
                            <div style={s.progressOverlay}>
                                <div style={s.progressBar}>
                                    <div style={{ ...s.progressFill, width: `${progress}%` }} />
                                </div>
                                <span style={s.progressText}>
                                    {isVideo ? `Subiendo video... ${progress}%` : 'Comprimiendo y subiendo...'}
                                </span>
                            </div>
                        )}

                        {/* Remove button */}
                        {!uploading && (
                            <button
                                type="button"
                                style={s.removeBtn}
                                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                            >
                                <X size={14} color="#fff" />
                            </button>
                        )}

                        {/* Video play indicator badge */}
                        {!uploading && isVideo && (
                            <div style={s.videoBadge}>
                                <Video size={14} color="#fff" />
                                <span>Video</span>
                            </div>
                        )}

                        {/* Tap to change overlay */}
                        {!uploading && (
                            <div style={s.changeOverlay}>
                                <Camera size={18} color="#fff" />
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty state */
                    uploading ? (
                        <div style={s.spinner} />
                    ) : (
                        <div style={s.emptyContent}>
                            <div style={s.iconRow}>
                                <Camera size={28} color="var(--color-primary)" />
                                <span style={s.iconDivider}>o</span>
                                <Video size={28} color="var(--color-primary)" />
                            </div>
                            <span style={s.placeholderText}>{placeholder}</span>
                            <span style={s.placeholderSub}>Foto (JPG/PNG) · Video corto (MP4/MOV, máx 50MB)</span>
                        </div>
                    )
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA_TYPES}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {error && <span style={s.errorText}>{error}</span>}
        </div>
    );
};

const s = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    previewBox: {
        position: 'relative',
        width: '100%',
        minHeight: '200px',
        maxHeight: '400px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        border: '2px dashed var(--color-primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewMedia: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        minHeight: '200px',
        maxHeight: '400px',
    },
    emptyContent: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.5rem', padding: '2rem 1rem',
    },
    iconRow: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
    },
    iconDivider: {
        fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic',
    },
    placeholderText: {
        fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-dark)',
    },
    placeholderSub: {
        fontSize: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center',
    },
    removeBtn: {
        position: 'absolute', top: '8px', right: '8px',
        width: '26px', height: '26px', borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0, zIndex: 3,
    },
    changeOverlay: {
        position: 'absolute', bottom: '8px', right: '8px',
        width: '32px', height: '32px', borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3,
    },
    videoBadge: {
        position: 'absolute', bottom: '8px', left: '8px',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff', borderRadius: '20px',
        padding: '0.25rem 0.6rem',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.75rem', fontWeight: '700', zIndex: 3,
    },
    progressOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '0.75rem', zIndex: 4,
    },
    progressBar: {
        width: '70%', height: '6px', borderRadius: '3px',
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressFill: {
        height: '100%', borderRadius: '3px',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.3s ease',
    },
    progressText: {
        fontSize: '0.8rem', color: '#fff', fontWeight: '600',
    },
    spinner: {
        width: '32px', height: '32px',
        border: '3px solid rgba(238,157,43,0.2)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    errorText: { fontSize: '0.82rem', color: '#e53935' },
};

export default MediaUpload;
