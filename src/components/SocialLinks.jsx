import React from 'react';
import { Instagram } from 'lucide-react';

const TikTokIcon = ({ size = 18, color = '#000' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

const SOCIALS = [
    { key: 'instagram', icon: Instagram, color: '#E4405F', url: (h) => `https://instagram.com/${h}` },
    { key: 'facebook', icon: ({ size, color: c }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    ), color: '#1877F2', url: (h) => `https://facebook.com/${h}` },
    { key: 'twitter', icon: ({ size, color: c }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l11.733 16h4.267l-11.733 -16zM4 20l6.768 -6.768M19.5 4l-6.768 6.768" />
        </svg>
    ), color: '#000', url: (h) => `https://x.com/${h}` },
    { key: 'tiktok', icon: TikTokIcon, color: '#000', url: (h) => `https://tiktok.com/@${h}` },
];

const SocialLinks = ({ instagram, facebook, twitter, tiktok, size = 22 }) => {
    const values = { instagram, facebook, twitter, tiktok };
    const active = SOCIALS.filter(s => values[s.key]);
    if (active.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {active.map(s => {
                const Icon = s.icon;
                return (
                    <a
                        key={s.key}
                        href={s.url(values[s.key])}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f5f5f5' }}
                    >
                        <Icon size={size} color={s.color} />
                    </a>
                );
            })}
        </div>
    );
};

export default SocialLinks;
