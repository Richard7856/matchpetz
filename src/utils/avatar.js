/** Default avatar — simple user silhouette on neutral background */
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%23e0e0e0'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%23bdbdbd'/%3E%3Cellipse cx='40' cy='68' rx='22' ry='18' fill='%23bdbdbd'/%3E%3C/svg%3E";

/** Avatar URL with fallback to default placeholder (no random images) */
export const getAvatarUrl = (url) => {
    if (url && url.trim()) return url;
    return DEFAULT_AVATAR;
};

/** Generate initials from a display name */
export const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
};
