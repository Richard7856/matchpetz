import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical, Users, Image, Smile } from 'lucide-react';
import { supabase } from '../supabase';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../contexts/AuthContext';
import { formatChatTime } from '../utils/formatters';

const ChatRoom = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, profile: authProfile } = useAuth();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [sending, setSending] = useState(false);
    const [otherName, setOtherName] = useState('Chat');
    const [otherAvatar, setOtherAvatar] = useState(null);
    const [isGroup, setIsGroup] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [participantMap, setParticipantMap] = useState({});
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Load conversation and initial messages
    useEffect(() => {
        const load = async () => {
            try {
                const [convRes, msgsRes] = await Promise.all([
                    supabase.from('conversations').select('id, user1_id, user2_id, participant_name, participant_avatar, is_group, group_name, group_avatar_url, event_id').eq('id', id).maybeSingle(),
                    supabase.from('messages').select('id, conversation_id, sender_id, sender_name, content, is_own, created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(100),
                ]);
                if (convRes.error || !convRes.data) {
                    setLoadError('No se pudo cargar la conversacion.');
                    setLoading(false);
                    return;
                }
                const conv = convRes.data;
                const msgs = msgsRes.data;

                if (conv) {
                    setConversation(conv);

                    if (conv.is_group) {
                        setIsGroup(true);
                        setOtherName(conv.group_name || 'Chat grupal');
                        setOtherAvatar(conv.group_avatar_url || null);

                        const { data: parts } = await supabase
                            .from('conversation_participants')
                            .select('user_id')
                            .eq('conversation_id', id);

                        if (parts) {
                            setParticipantCount(parts.length);
                            const ids = parts.map(p => p.user_id);
                            if (ids.length > 0) {
                                const { data: profiles } = await supabase
                                    .from('profiles')
                                    .select('id, display_name, avatar_url')
                                    .in('id', ids);
                                if (profiles) {
                                    const map = {};
                                    profiles.forEach(p => { map[p.id] = p; });
                                    setParticipantMap(map);
                                }
                            }
                        }
                    } else {
                        if (user && conv.user1_id && conv.user2_id) {
                            const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
                            const { data: otherProfile } = await supabase
                                .from('profiles')
                                .select('display_name, avatar_url')
                                .eq('id', otherId)
                                .maybeSingle();
                            setOtherName(otherProfile?.display_name || conv.participant_name || 'Chat');
                            setOtherAvatar(otherProfile?.avatar_url || conv.participant_avatar || null);
                        } else {
                            setOtherName(conv.participant_name || 'Chat');
                            setOtherAvatar(conv.participant_avatar || null);
                        }
                    }
                }
                if (msgs) setMessages(msgs);
            } catch (err) {
                setLoadError('No se pudo cargar el chat.');
            } finally {
                setLoading(false);
            }
        };
        if (id) load();
    }, [id, user]);

    // Supabase Realtime
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`chat-${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
                (payload) => {
                    const newMsg = payload.new;
                    if (newMsg.sender_id && user && newMsg.sender_id === user.id) {
                        setMessages(prev => {
                            const withoutTemp = prev.filter(m => !String(m.id).startsWith('temp-'));
                            if (withoutTemp.some(m => m.id === newMsg.id)) return withoutTemp;
                            return [...withoutTemp, newMsg];
                        });
                    } else {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);

        const senderName = authProfile?.display_name || 'Tu';
        const savedText = newMessage;

        const tempMsg = {
            id: `temp-${Date.now()}`,
            conversation_id: id,
            sender_id: user?.id || null,
            sender_name: senderName,
            content: savedText,
            is_own: true,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');

        const { error } = await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: user?.id || null,
            sender_name: senderName,
            content: savedText,
            is_own: true,
        });

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            setNewMessage(savedText);
        } else {
            await supabase.from('conversations')
                .update({ last_message: savedText })
                .eq('id', id);
        }
        setSending(false);
        inputRef.current?.focus();
    };

    // Group messages by date
    const getDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.appBar}>
                    <button style={styles.backBtn} onClick={() => navigate(-1)}>
                        <ArrowLeft size={22} color="#fff" />
                    </button>
                    <span style={styles.headerName}>Cargando...</span>
                </div>
                <div style={styles.loadingBody}>
                    <div style={{ width: 28, height: 28, border: '3px solid rgba(238,157,43,0.2)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={styles.container}>
                <div style={styles.appBar}>
                    <button style={styles.backBtn} onClick={() => navigate(-1)}>
                        <ArrowLeft size={22} color="#fff" />
                    </button>
                    <span style={styles.headerName}>Error</span>
                </div>
                <div style={styles.loadingBody}>
                    <p style={{ color: 'var(--color-text-light)' }}>{loadError}</p>
                </div>
            </div>
        );
    }

    let lastDateLabel = '';

    return (
        <div style={styles.container} className="fade-in">
            {/* Header */}
            <div style={styles.appBar}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={22} color="#fff" />
                </button>

                {isGroup ? (
                    <div style={styles.groupAvatarWrap}>
                        {otherAvatar ? (
                            <img src={otherAvatar} alt="" style={styles.groupAvatar} loading="lazy" />
                        ) : (
                            <div style={styles.groupAvatarPlaceholder}>
                                <Users size={18} color="#fff" />
                            </div>
                        )}
                    </div>
                ) : (
                    <img
                        src={getAvatarUrl(otherAvatar, id)}
                        alt=""
                        style={styles.headerAvatar}
                        loading="lazy"
                    />
                )}

                <div style={styles.headerInfo}>
                    <h3 style={styles.headerName}>{otherName}</h3>
                    <span style={styles.headerStatus}>
                        {isGroup ? `${participantCount} participantes` : 'En linea'}
                    </span>
                </div>

                <button style={styles.moreBtn}>
                    <MoreVertical size={20} color="rgba(255,255,255,0.8)" />
                </button>
            </div>

            {/* Messages */}
            <div style={styles.messagesArea}>
                {messages.length === 0 && (
                    <div style={styles.emptyChat}>
                        <div style={styles.emptyChatIcon}>
                            <Send size={32} color="var(--color-primary)" />
                        </div>
                        <p style={styles.emptyChatText}>Envia el primer mensaje</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isOwn = msg.sender_id && user ? msg.sender_id === user.id : msg.is_own;
                    const senderProfile = isGroup && !isOwn && msg.sender_id ? participantMap[msg.sender_id] : null;

                    // Date separator
                    const dateLabel = getDateLabel(msg.created_at);
                    let showDateSep = false;
                    if (dateLabel !== lastDateLabel) {
                        showDateSep = true;
                        lastDateLabel = dateLabel;
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateSep && (
                                <div style={styles.dateSeparator}>
                                    <span style={styles.dateLabel}>{dateLabel}</span>
                                </div>
                            )}
                            <div style={{ ...styles.msgRow, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                                {/* Group avatar */}
                                {isGroup && !isOwn && (
                                    <img
                                        src={getAvatarUrl(senderProfile?.avatar_url, msg.sender_id)}
                                        alt=""
                                        style={styles.msgAvatar}
                                        loading="lazy"
                                    />
                                )}
                                <div style={{
                                    ...styles.bubble,
                                    ...(isOwn ? styles.bubbleOwn : styles.bubbleOther),
                                }}>
                                    {isGroup && !isOwn && (
                                        <span style={styles.senderLabel}>
                                            {senderProfile?.display_name || msg.sender_name || 'Usuario'}
                                        </span>
                                    )}
                                    <p style={styles.msgText}>{msg.content}</p>
                                    <span style={{
                                        ...styles.msgTime,
                                        color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--color-text-light)',
                                    }}>
                                        {formatChatTime(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputBar}>
                <form onSubmit={handleSend} style={styles.inputForm}>
                    <div style={styles.inputField}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Escribe un mensaje..."
                            style={styles.textInput}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            ...styles.sendBtn,
                            opacity: newMessage.trim() && !sending ? 1 : 0.5,
                        }}
                        disabled={!newMessage.trim() || sending}
                    >
                        <Send size={18} color="#fff" style={{ marginLeft: '2px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f0f2f5',
    },
    /* ── Header ── */
    appBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.75rem 1rem',
        background: 'linear-gradient(135deg, var(--color-primary), #d4891f)',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        padding: '0.3rem',
        cursor: 'pointer',
        width: 'auto',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
    },
    headerAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(255,255,255,0.3)',
    },
    groupAvatarWrap: { width: 40, height: 40, flexShrink: 0 },
    groupAvatar: {
        width: 40, height: 40, borderRadius: '12px',
        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
    },
    groupAvatarPlaceholder: {
        width: 40, height: 40, borderRadius: '12px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
    },
    headerName: {
        fontSize: '1.05rem',
        fontWeight: '700',
        color: '#fff',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    headerStatus: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.75)',
    },
    moreBtn: {
        background: 'none',
        border: 'none',
        padding: '0.3rem',
        cursor: 'pointer',
        width: 'auto',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
    },
    /* ── Messages ── */
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
    },
    loadingBody: {
        flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
    },
    emptyChat: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        opacity: 0.6,
    },
    emptyChatIcon: {
        width: 64, height: 64, borderRadius: '50%',
        backgroundColor: 'rgba(238,157,43,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    emptyChatText: {
        fontSize: '0.95rem',
        color: 'var(--color-text-light)',
        fontWeight: '500',
    },
    dateSeparator: {
        display: 'flex',
        justifyContent: 'center',
        padding: '0.5rem 0',
    },
    dateLabel: {
        fontSize: '0.7rem',
        fontWeight: '600',
        color: 'var(--color-text-light)',
        backgroundColor: 'rgba(0,0,0,0.06)',
        padding: '0.25rem 0.75rem',
        borderRadius: '20px',
    },
    msgRow: {
        display: 'flex',
        width: '100%',
        alignItems: 'flex-end',
        gap: '0.3rem',
    },
    msgAvatar: {
        width: 26, height: 26, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0,
    },
    bubble: {
        maxWidth: '78%',
        padding: '0.6rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },
    bubbleOwn: {
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        borderRadius: '18px 18px 4px 18px',
        boxShadow: '0 1px 3px rgba(238,157,43,0.2)',
    },
    bubbleOther: {
        backgroundColor: '#fff',
        color: 'var(--color-text-dark)',
        borderRadius: '18px 18px 18px 4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    senderLabel: {
        fontSize: '0.7rem',
        fontWeight: '700',
        color: 'var(--color-primary)',
        marginBottom: '0.15rem',
    },
    msgText: {
        margin: 0,
        fontSize: '0.93rem',
        lineHeight: 1.45,
        wordBreak: 'break-word',
    },
    msgTime: {
        fontSize: '0.65rem',
        alignSelf: 'flex-end',
        marginTop: '0.2rem',
    },
    /* ── Input bar ── */
    inputBar: {
        flexShrink: 0,
        padding: '0.5rem 0.75rem',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        backgroundColor: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.04)',
    },
    inputForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    inputField: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        borderRadius: '24px',
        padding: '0.15rem 1rem',
        display: 'flex',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontSize: '0.95rem',
        color: 'var(--color-text-dark)',
        padding: '0.6rem 0',
        fontFamily: 'inherit',
    },
    sendBtn: {
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary), #d4891f)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        minHeight: 'auto',
        boxShadow: '0 2px 8px rgba(238,157,43,0.3)',
        transition: 'opacity 0.2s, transform 0.2s',
    },
};

export default ChatRoom;
