import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeDate } from '../utils/formatters';

const Inbox = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('todos');
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch direct conversations (user is user1 or user2, or legacy), exclude groups
            const { data: directConvs } = await supabase
                .from('conversations')
                .select('id, user1_id, user2_id, participant_name, participant_avatar, last_message, unread_count, is_group, group_name, group_avatar_url, created_at')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id},user1_id.is.null`)
                .not('is_group', 'is', true)
                .order('created_at', { ascending: false })
                .limit(30);

            // Fetch group conversations where user is a participant
            const { data: participantRows } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', user.id);

            let groupConvs = [];
            if (participantRows && participantRows.length > 0) {
                const groupIds = participantRows.map(r => r.conversation_id);
                const { data: groups } = await supabase
                    .from('conversations')
                    .select('id, user1_id, user2_id, participant_name, participant_avatar, last_message, unread_count, is_group, group_name, group_avatar_url, event_id, created_at')
                    .in('id', groupIds)
                    .eq('is_group', true)
                    .order('created_at', { ascending: false })
                    .limit(30);
                groupConvs = groups || [];
            }

            // Enrich direct conversations with correct display info
            const directList = directConvs || [];
            const needProfileIds = directList
                .filter(c => c.user2_id === user.id && c.user1_id)
                .map(c => c.user1_id);

            let profileMap = {};
            if (needProfileIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, avatar_url')
                    .in('id', needProfileIds);
                if (profiles) {
                    profiles.forEach(p => { profileMap[p.id] = p; });
                }
            }

            const enrichedDirect = directList.map(c => {
                if (!c.user1_id && !c.user2_id) return c;
                if (c.user1_id === user.id) return c;
                if (c.user2_id === user.id && c.user1_id) {
                    const otherProfile = profileMap[c.user1_id];
                    return {
                        ...c,
                        participant_name: otherProfile?.display_name || 'Usuario',
                        participant_avatar: otherProfile?.avatar_url || c.participant_avatar,
                    };
                }
                return c;
            });

            // Mark group convs for display
            const enrichedGroups = groupConvs.map(c => ({
                ...c,
                _isGroup: true,
                participant_name: c.group_name || 'Chat grupal',
                participant_avatar: c.group_avatar_url || null,
            }));

            // Merge and sort by created_at descending
            const all = [...enrichedDirect, ...enrichedGroups];
            // Remove duplicates (in case a group conv also matches the direct query)
            const seen = new Set();
            const unique = all.filter(c => {
                if (seen.has(c.id)) return false;
                seen.add(c.id);
                return true;
            });
            unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setConversations(unique);
            setLoading(false);
        };
        load();
    }, [user]);

    // Realtime: update last_message when conversations are updated
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('inbox-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations' },
                (payload) => {
                    const updated = payload.new;
                    setConversations(prev =>
                        prev.map(c => c.id === updated.id ? { ...c, last_message: updated.last_message } : c)
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'conversations' },
                (payload) => {
                    const newConv = payload.new;
                    if (newConv.user1_id === user.id || newConv.user2_id === user.id) {
                        setConversations(prev => [newConv, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const filteredChats = conversations.filter(chat => {
        if (activeTab === 'todos') return true;
        if (activeTab === 'grupos') return chat._isGroup || chat.is_group;
        if (activeTab === 'directos') return !chat._isGroup && !chat.is_group;
        return true;
    });

    const tabs = ['todos', 'directos', 'grupos'];

    return (
        <div style={styles.container} className="fade-in">
            <div style={styles.header}>
                <h2 style={styles.title}>Mensajes</h2>
            </div>

            <div style={styles.chipsContainer}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        style={{ ...styles.chip, ...(activeTab === tab ? styles.activeChip : {}) }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div style={styles.chatList}>
                {loading ? (
                    <p style={styles.loadingText}>Cargando mensajes...</p>
                ) : filteredChats.length === 0 ? (
                    <p style={styles.emptyText}>No hay conversaciones aún.</p>
                ) : (
                    filteredChats.map((chat) => {
                        const chatIsGroup = chat._isGroup || chat.is_group;
                        return (
                            <div key={chat.id} style={styles.chatItem} onClick={() => navigate(`/chat/${chat.id}`)}>
                                <div style={styles.avatarContainer}>
                                    {chatIsGroup ? (
                                        chat.participant_avatar || chat.group_avatar_url ? (
                                            <img
                                                src={chat.participant_avatar || chat.group_avatar_url}
                                                alt={chat.participant_name || chat.group_name}
                                                style={styles.groupAvatar}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div style={styles.groupAvatarPlaceholder}>
                                                <Users size={22} color="var(--color-primary)" />
                                            </div>
                                        )
                                    ) : (
                                        <img
                                            src={getAvatarUrl(chat.participant_avatar, chat.id)}
                                            alt={chat.participant_name}
                                            style={styles.avatar}
                                            loading="lazy"
                                        />
                                    )}
                                    {chat.unread_count > 0 && <div style={styles.unreadDot}></div>}
                                </div>

                                <div style={styles.chatInfo}>
                                    <div style={styles.chatHeader}>
                                        <h4 style={styles.chatName}>
                                            {chat.participant_name || chat.group_name || 'Chat'}
                                        </h4>
                                        <span style={styles.chatTime}>{formatRelativeDate(chat.created_at)}</span>
                                    </div>
                                    <div style={styles.chatFooter}>
                                        <p style={{
                                            ...styles.lastMessage,
                                            ...(chat.unread_count > 0 ? { fontWeight: 'bold', color: 'var(--color-text-dark)' } : {})
                                        }}>
                                            {chat.last_message || (chatIsGroup ? 'Chat de evento' : '')}
                                        </p>
                                        {chat.unread_count > 0 && (
                                            <div style={styles.unreadBadge}>{chat.unread_count}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
    },
    header: {
        padding: '2rem 1.5rem 1rem 1.5rem',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: 'bold',
        margin: 0
    },
    chipsContainer: {
        display: 'flex',
        gap: '0.8rem',
        padding: '0 1.5rem 1rem 1.5rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
    },
    chip: {
        background: '#f0f2f5',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        whiteSpace: 'nowrap',
        width: 'auto',
        cursor: 'pointer'
    },
    activeChip: {
        background: 'var(--color-primary)',
        color: '#fff'
    },
    chatList: {
        flex: 1,
        overflowY: 'auto',
    },
    loadingText: { textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' },
    emptyText: { textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' },
    chatItem: {
        display: 'flex',
        padding: '1rem 1.5rem',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid #f9f9f9',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    avatarContainer: { position: 'relative' },
    avatar: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        objectFit: 'cover'
    },
    groupAvatar: {
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        objectFit: 'cover',
    },
    groupAvatarPlaceholder: {
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        backgroundColor: '#fff3e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        border: '2px solid #fff'
    },
    chatInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    },
    chatHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.3rem'
    },
    chatName: { fontSize: '1rem', fontWeight: '700', margin: 0 },
    chatTime: { fontSize: '0.8rem', color: 'var(--color-text-light)' },
    chatFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    lastMessage: {
        fontSize: '0.9rem',
        color: 'var(--color-text-light)',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '220px'
    },
    unreadBadge: {
        backgroundColor: '#ff4b4b',
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
};

export default Inbox;
