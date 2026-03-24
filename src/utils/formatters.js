/**
 * Shared date/time formatting utilities for MatchPetz.
 * Replaces duplicate formatters across 8+ page files.
 */

/** Compact relative time: "ahora", "5m", "2h", "3d", "1sem" */
export const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}sem`;
};

/** Verbose relative time: "Hace 5 min", "Hace 2 h", "Ayer", "Lun" */
export const formatRelativeDate = (createdAt) => {
    if (!createdAt) return '';
    const d = createdAt?.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
    const now = new Date();
    const diff = (now - d) / 1000 / 60;
    if (diff < 60) return `Hace ${Math.floor(diff)} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
    if (diff < 2880) return 'Ayer';
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[d.getDay()];
};

/** Event date: "5 de marzo" or "5 de marzo de 2026" (with year option) */
export const formatEventDate = (dateStr, includeYear = false) => {
    if (!dateStr) return '';
    // Date-only strings (YYYY-MM-DD): parse as local noon to avoid timezone shift
    const date = typeof dateStr === 'string' && dateStr.length === 10
        ? new Date(dateStr + 'T12:00:00')
        : new Date(dateStr);
    const opts = { day: 'numeric', month: 'long' };
    if (includeYear) opts.year = 'numeric';
    return date.toLocaleDateString('es-MX', opts);
};

/** Time slot: "14:30" from a time column value */
export const formatTimeSlot = (t) => {
    if (!t) return '';
    return String(t).slice(0, 5);
};

/** Chat timestamp: "2:30 PM" from an ISO timestamp */
export const formatChatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
