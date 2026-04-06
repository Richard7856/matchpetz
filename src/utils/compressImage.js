// compressImage.js — Client-side image compression using Canvas API
// Why: raw phone photos can be 5-10MB; compressing to 1080px / 82% quality
// reduces them to ~150-400KB without visible quality loss.
// No external libraries needed — uses the browser's built-in canvas.

/**
 * Compress an image File before uploading to Supabase Storage.
 *
 * @param {File} file           - Original image file from <input type="file">
 * @param {object} opts
 * @param {number} opts.maxWidth  - Max output width  (default 1080px)
 * @param {number} opts.maxHeight - Max output height (default 1080px)
 * @param {number} opts.quality   - JPEG quality 0-1  (default 0.82 = 82%)
 * @returns {Promise<File>} Compressed file (falls back to original on error)
 */
export const compressImage = (file, { maxWidth = 1080, maxHeight = 1080, quality = 0.82 } = {}) => {
    return new Promise((resolve) => {
        // GIFs and SVGs are not processed — return as-is
        if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
            return resolve(file);
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let { width, height } = img;

            // Scale down proportionally if image exceeds max dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width  = Math.round(width  * ratio);
                height = Math.round(height * ratio);
            }

            // Draw to canvas at target size
            const canvas = document.createElement('canvas');
            canvas.width  = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG blob at target quality
            canvas.toBlob(
                (blob) => {
                    if (!blob) return resolve(file); // fallback to original
                    // Wrap blob as File to preserve filename for Supabase path
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, '.jpg'), // force .jpg extension
                        { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    resolve(compressed);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file); // fallback to original on decode error
        };

        img.src = objectUrl;
    });
};
