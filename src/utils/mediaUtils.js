// mediaUtils.js — helpers for detecting and handling image vs video media

// Video extensions stored in Supabase will appear in the URL path
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', '3gp', 'mkv'];

/**
 * Returns true if the given URL points to a video file.
 * Strips query params (Supabase signed URLs add ?token=...) before checking.
 */
export const isVideoUrl = (url) => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    const ext   = clean.split('.').pop();
    return VIDEO_EXTENSIONS.includes(ext);
};

/**
 * Returns true if the File object is a video type.
 */
export const isVideoFile = (file) => {
    if (!file) return false;
    return file.type.startsWith('video/');
};

// Accepted MIME types for the media input
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
export const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/quicktime,video/webm,video/x-m4v';
export const ACCEPTED_MEDIA_TYPES = `${ACCEPTED_IMAGE_TYPES},${ACCEPTED_VIDEO_TYPES}`;

// Size limits
export const MAX_IMAGE_SIZE = 5  * 1024 * 1024;  // 5 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50 MB
