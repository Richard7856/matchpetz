/** Avatar URL with fallback to pravatar placeholder */
export const getAvatarUrl = (url, userId) => {
    if (url) return url;
    if (userId) return `https://i.pravatar.cc/80?u=${userId}`;
    return 'https://i.pravatar.cc/80';
};
