import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import StoryViewer from './StoryViewer';

const StoriesRow = () => {
    const { user, profile } = useAuth();
    const [userStories, setUserStories] = useState([]);
    const [viewerData, setViewerData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('stories')
                .select('id, user_id, image_url, created_at, profiles!stories_user_id_fkey(display_name, avatar_url)')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            if (!data) return;

            // Group by user
            const grouped = {};
            data.forEach((s) => {
                if (!grouped[s.user_id]) {
                    grouped[s.user_id] = {
                        user_id: s.user_id,
                        display_name: s.profiles?.display_name || 'Usuario',
                        avatar_url: s.profiles?.avatar_url || '',
                        stories: [],
                    };
                }
                grouped[s.user_id].stories.push({ id: s.id, image_url: s.image_url, created_at: s.created_at });
            });

            // Current user first, then others
            const arr = Object.values(grouped);
            const myIdx = arr.findIndex(u => u.user_id === user?.id);
            if (myIdx > 0) {
                const [mine] = arr.splice(myIdx, 1);
                arr.unshift(mine);
            }
            setUserStories(arr);
        };
        load();
    }, [user]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${user.id}/stories/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('matchpet-images')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('matchpet-images').getPublicUrl(path);
            await supabase.from('stories').insert({ user_id: user.id, image_url: publicUrl });

            // Refresh
            const myStories = userStories.find(u => u.user_id === user.id);
            if (myStories) {
                myStories.stories.push({ id: Date.now().toString(), image_url: publicUrl, created_at: new Date().toISOString() });
                setUserStories([...userStories]);
            } else {
                setUserStories([{
                    user_id: user.id,
                    display_name: profile?.display_name || 'Tu',
                    avatar_url: profile?.avatar_url || '',
                    stories: [{ id: Date.now().toString(), image_url: publicUrl, created_at: new Date().toISOString() }],
                }, ...userStories]);
            }
        } catch {
            // Story upload failed — silent
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const myHasStory = userStories.some(u => u.user_id === user?.id);

    return (
        <>
            <div style={s.container}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

                {/* My story circle */}
                <div style={s.storyItem} onClick={() => {
                    if (myHasStory) {
                        const idx = userStories.findIndex(u => u.user_id === user?.id);
                        setViewerData({ initialUserIndex: idx >= 0 ? idx : 0 });
                    } else {
                        fileRef.current?.click();
                    }
                }}>
                    <div style={{ ...s.avatarRing, ...(myHasStory ? s.activeRing : s.noRing) }}>
                        <img src={getAvatarUrl(profile?.avatar_url)} alt="" style={s.avatar} loading="lazy" />
                        {!myHasStory && (
                            <div style={s.addBadge}>
                                <Plus size={12} color="#fff" />
                            </div>
                        )}
                    </div>
                    <span style={s.name}>{uploading ? 'Subiendo...' : 'Tu historia'}</span>
                </div>

                {/* Other users' stories */}
                {userStories.filter(u => u.user_id !== user?.id).map((u, i) => (
                    <div key={u.user_id} style={s.storyItem} onClick={() => {
                        const realIdx = userStories.findIndex(x => x.user_id === u.user_id);
                        setViewerData({ initialUserIndex: realIdx });
                    }}>
                        <div style={{ ...s.avatarRing, ...s.activeRing }}>
                            <img src={getAvatarUrl(u.avatar_url)} alt="" style={s.avatar} loading="lazy" />
                        </div>
                        <span style={s.name}>{u.display_name?.split(' ')[0] || 'Usuario'}</span>
                    </div>
                ))}
            </div>

            {viewerData && (
                <StoryViewer
                    userStories={userStories}
                    initialUserIndex={viewerData.initialUserIndex}
                    onClose={() => setViewerData(null)}
                />
            )}
        </>
    );
};

const s = {
    container: {
        display: 'flex',
        gap: '0.85rem',           // era 1rem
        padding: '0.7rem 0.9rem', // era 0.85rem 1rem — ~10% menos
        overflowX: 'auto',
        backgroundColor: 'var(--color-background, #fdfdfd)',
        borderBottom: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        marginBottom: '0.85rem',
    },
    storyItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',       // era 6px
        cursor: 'pointer',
        flexShrink: 0,
        width: '60px',    // era 72px
    },
    avatarRing: {
        width: '58px',    // era 66px
        height: '58px',
        borderRadius: '50%',
        padding: '3px',
        position: 'relative',
        boxShadow: '4px 4px 10px rgba(0,0,0,0.08), -3px -3px 8px rgba(255,255,255,0.9)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    activeRing: {
        background: 'linear-gradient(135deg, #ee9d2b, #e91e63, #ee9d2b)',
        boxShadow: '4px 4px 12px rgba(238,157,43,0.25), -3px -3px 8px rgba(255,255,255,0.9)',
    },
    noRing: {
        background: 'var(--color-bg-soft, #eef0f4)',
        boxShadow: '4px 4px 10px rgba(0,0,0,0.07), -3px -3px 8px rgba(255,255,255,0.95), inset 1px 1px 2px rgba(255,255,255,0.5)',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid var(--color-background, #fdfdfd)',
    },
    addBadge: {
        position: 'absolute',
        bottom: '0',
        right: '0',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        border: '2.5px solid var(--color-background, #fdfdfd)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(238,157,43,0.3)',
    },
    name: {
        fontSize: '0.7rem',
        color: 'var(--color-text-dark)',
        fontWeight: '600',
        textAlign: 'center',
        maxWidth: '60px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.2px',
    },
};

export default StoriesRow;
