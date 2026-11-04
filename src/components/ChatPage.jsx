import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../lib/api';
import { io } from 'socket.io-client';
import {
    MessageSquare, Search, Send, ChevronLeft, Users, Plus,
    X, RefreshCw, UserPlus
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

/**
 * ChatPage - Unified live chat component for all user roles
 * Props:
 *   userRole: 'Manager' | 'Writer' | 'Team' | 'Blogger'
 */
export function ChatPage({ userRole = 'User' }) {
    // State
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [threadId, setThreadId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);

    // New Chat Search state
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatSearch, setNewChatSearch] = useState('');
    const [newChatResults, setNewChatResults] = useState([]);
    const [newChatSearching, setNewChatSearching] = useState(false);

    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const currentUserRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Get current user from localStorage
    useEffect(() => {
        try {
            const userData = localStorage.getItem('authUser');
            if (userData) {
                currentUserRef.current = JSON.parse(userData);
            }
        } catch (e) {
            console.error('Failed to parse authUser', e);
        }
    }, []);

    // Initialize Socket.io
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('💬 Chat socket connected');
            if (currentUserRef.current?.id) {
                socket.emit('user_online', currentUserRef.current.id);
            }
        });

        socket.on('new_message', (message) => {
            setMessages(prev => {
                if (prev.find(m => m.id === message.id)) return prev;
                return [message, ...prev];
            });
            scrollToBottom();
        });

        socket.on('user_typing', ({ userName }) => {
            setTypingUser(userName);
            setTimeout(() => setTypingUser(null), 3000);
        });

        socket.on('user_stop_typing', () => {
            setTypingUser(null);
        });

        socket.on('user_status', ({ userId, online }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                if (online) next.add(userId);
                else next.delete(userId);
                return next;
            });
        });

        socketRef.current = socket;
        return () => { socket.disconnect(); };
    }, []);

    // Fetch users list (existing conversations)
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await chatAPI.getUsers();
            setUsers(data.users || []);
            setFilteredUsers(data.users || []);
        } catch (err) {
            console.error('Failed to fetch chat users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Filter sidebar users based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredUsers(
                users.filter(u =>
                    u.name?.toLowerCase().includes(q) ||
                    u.role?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
                )
            );
        }
    }, [searchQuery, users]);

    // New Chat search with debounce
    useEffect(() => {
        if (!newChatSearch.trim() || newChatSearch.trim().length < 2) {
            setNewChatResults([]);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setNewChatSearching(true);
                const data = await chatAPI.searchUsers(newChatSearch.trim());
                setNewChatResults(data.users || []);
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setNewChatSearching(false);
            }
        }, 300);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [newChatSearch]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Select a user to chat with
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setShowMobileSidebar(false);
        setShowNewChatModal(false);
        setMessagesLoading(true);
        setMessages([]);

        try {
            if (threadId && socketRef.current) {
                socketRef.current.emit('leave_chat', threadId);
            }

            const convData = await chatAPI.getConversation(user.id);
            const newThreadId = convData.conversation.id;
            setThreadId(newThreadId);

            if (socketRef.current) {
                socketRef.current.emit('join_chat', newThreadId);
            }

            const msgData = await chatAPI.getMessages(newThreadId);
            setMessages(msgData.messages || []);
            scrollToBottom();
            await chatAPI.markAsRead(newThreadId);

            // Update sidebar
            setUsers(prev => {
                const exists = prev.find(u => u.id === user.id);
                if (!exists) {
                    return [{ ...user, unread_count: 0, last_message: null, last_message_at: null }, ...prev];
                }
                return prev.map(u => u.id === user.id ? { ...u, unread_count: 0 } : u);
            });

            setTimeout(() => inputRef.current?.focus(), 200);
        } catch (err) {
            console.error('Failed to open conversation:', err);
        } finally {
            setMessagesLoading(false);
        }
    };

    // Send a message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !threadId || sending) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            thread_id: threadId,
            user_id: currentUserRef.current?.id,
            message: messageText,
            sender_name: currentUserRef.current?.name || 'You',
            sender_role: userRole,
            created_at: new Date().toISOString(),
            is_read: false,
            _optimistic: true
        };
        setMessages(prev => [optimisticMsg, ...prev]);
        scrollToBottom();

        if (socketRef.current) {
            socketRef.current.emit('stop_typing', { threadId });
        }

        try {
            const data = await chatAPI.sendMessage(threadId, messageText);
            setMessages(prev => {
                // Check if socket already beat the HTTP response and injected the real message
                if (prev.find(m => m.id === data.message.id)) {
                    // It exists, so cleanly purge the optimistic UI clone
                    return prev.filter(m => m.id !== optimisticMsg.id);
                }
                // Socket was slower, so securely mutate the optimistic ID into the database ID
                return prev.map(m => m.id === optimisticMsg.id ? data.message : m);
            });
            setUsers(prev => prev.map(u =>
                u.id === selectedUser?.id
                    ? { ...u, last_message: messageText, last_message_at: new Date().toISOString() }
                    : u
            ));
        } catch (err) {
            console.error('Failed to send message:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        if (socketRef.current && threadId) {
            socketRef.current.emit('typing', {
                threadId,
                userName: currentUserRef.current?.name || 'Someone'
            });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('stop_typing', { threadId });
            }, 2000);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getDisplayName = useCallback((name, role) => {
        if (userRole === 'Blogger' && ['manager', 'admin', 'super_admin'].includes(role?.toLowerCase())) {
            return 'Manager';
        }
        return name || 'Unknown';
    }, [userRole]);

    const getInitials = (name, role) => {
        const dName = getDisplayName(name, role);
        if (!dName || dName === '?') return '?';
        return dName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // one colour per role (identity, not status); text shades dark enough for the light background
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'manager': case 'admin': case 'super_admin':
                return { bg: 'rgba(124, 58, 237, 0.12)', color: '#6D28D9', border: 'rgba(124, 58, 237, 0.3)' };
            case 'writer':
                return { bg: 'rgba(37, 99, 235, 0.12)', color: '#1D4ED8', border: 'rgba(37, 99, 235, 0.3)' };
            case 'team':
                return { bg: 'rgba(5, 150, 105, 0.12)', color: '#047857', border: 'rgba(5, 150, 105, 0.3)' };
            case 'vendor':
                return { bg: 'rgba(219, 39, 119, 0.10)', color: '#BE185D', border: 'rgba(219, 39, 119, 0.28)' };
            default:
                return { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: 'rgba(100, 116, 139, 0.3)' };
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'vendor': return 'Blogger';
            case 'manager': return 'Manager';
            case 'admin': return 'Admin';
            case 'super_admin': return 'Admin';
            case 'writer': return 'Writer';
            case 'team': return 'Team';
            default: return role;
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const oneDay = 86400000;
        const opts = { timeZone: 'Asia/Kolkata' };

        if (diff < oneDay && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('en-IN', { ...opts, hour: '2-digit', minute: '2-digit' });
        } else if (diff < 2 * oneDay) {
            return 'Yesterday';
        }
        return date.toLocaleDateString('en-IN', { ...opts, month: 'short', day: 'numeric' });
    };

    const getDateLabel = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const oneDay = 86400000;
        const opts = { timeZone: 'Asia/Kolkata' };

        if (diff < oneDay && date.getDate() === now.getDate()) return 'Today';
        if (diff < 2 * oneDay && date.getDate() === now.getDate() - 1) return 'Yesterday';
        return date.toLocaleDateString('en-IN', { ...opts, weekday: 'long', month: 'long', day: 'numeric' });
    };

    const isMyMessage = (msg) => msg.user_id === currentUserRef.current?.id;

    // Render a user row (shared between sidebar and search results)
    const renderUserRow = (user, isSelected = false, onClick) => {
        const roleColor = getRoleBadgeColor(user.role);
        const isOnline = onlineUsers.has(user.id);

        return (
            <div
                key={user.id}
                onClick={() => onClick(user)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-2 
          ${isSelected
                        ? 'bg-[var(--primary-cyan)]/5 border-l-[var(--primary-cyan)]'
                        : 'border-l-transparent hover:bg-[var(--background-dark)]'
                    }`}
            >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                            background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`,
                            color: roleColor.color,
                            border: `1px solid ${roleColor.border}`
                        }}
                    >
                        {getInitials(user.name, user.role)}
                    </div>
                    {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--card-background)]" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[var(--text-primary)] truncate">{getDisplayName(user.name, user.role)}</span>
                        {user.last_message_at && (
                            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 ml-2">
                                {formatTime(user.last_message_at)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-[var(--text-muted)] truncate pr-2">
                            {user.last_message || (
                                <span className="italic opacity-60">No messages yet</span>
                            )}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{
                                    background: roleColor.bg,
                                    color: roleColor.color,
                                    border: `1px solid ${roleColor.border}`
                                }}
                            >
                                {getRoleLabel(user.role)}
                            </span>
                            {user.unread_count > 0 && (
                                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--primary-cyan)] text-white text-[10px] font-bold px-1">
                                    {user.unread_count}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-120px)] flex rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: 'var(--card-background)' }}>
            {/* ============ SIDEBAR ============ */}
            <div
                className={`w-full md:w-[340px] flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--card-background)] 
          ${showMobileSidebar ? 'block' : 'hidden md:flex'}`}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-[var(--primary-cyan)]" />
                            Messages
                        </h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { 
                                    if (userRole === 'Blogger') {
                                        const manager = users.find(u => ['manager', 'admin', 'super_admin'].includes(u.role?.toLowerCase()));
                                        if (manager) handleSelectUser(manager);
                                    } else {
                                        setShowNewChatModal(true); setNewChatSearch(''); setNewChatResults([]); 
                                    }
                                }}
                                className="p-1.5 rounded-lg hover:bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] transition-colors"
                                title="New Chat"
                            >
                                <UserPlus className="h-4 w-4" />
                            </button>
                            <button onClick={fetchUsers} className="p-1.5 rounded-lg hover:bg-[var(--background-dark)] text-[var(--text-muted)] transition-colors">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search contacts..."
                            className="premium-input w-full pl-10 py-2 text-sm"
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <RefreshCw className="h-6 w-6 animate-spin mb-3 text-[var(--primary-cyan)]" />
                            <p className="text-sm">Loading contacts...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <Users className="h-8 w-8 mb-3 opacity-40" />
                            <p className="text-sm mb-1">{searchQuery ? 'No contacts found' : 'No conversations yet'}</p>
                            <p className="text-xs opacity-60 text-center px-4">
                                Click the <UserPlus className="h-3 w-3 inline" /> button above to start a new chat
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map(user =>
                            renderUserRow(user, selectedUser?.id === user.id, handleSelectUser)
                        )
                    )}
                </div>
            </div>

            {/* ============ NEW CHAT SEARCH MODAL ============ */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-[10vh] px-4">
                    <div className="premium-card w-full max-w-lg p-0 overflow-hidden shadow-2xl border-[var(--primary-cyan)]/20">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-[var(--primary-cyan)]" />
                                New Conversation
                            </h3>
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                className="p-1 rounded hover:bg-[var(--background-dark)] text-[var(--text-muted)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-[var(--border)]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={newChatSearch}
                                    onChange={(e) => setNewChatSearch(e.target.value)}
                                    placeholder={userRole === 'Manager'
                                        ? 'Search writers, team members, bloggers by name...'
                                        : 'Search managers by name...'}
                                    className="premium-input w-full pl-10 py-2.5 text-sm"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-2 ml-1">
                                Type at least 2 characters to search
                            </p>
                        </div>

                        {/* Search Results */}
                        <div className="max-h-[50vh] overflow-y-auto">
                            {newChatSearching ? (
                                <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
                                    <RefreshCw className="h-5 w-5 animate-spin mr-2 text-[var(--primary-cyan)]" />
                                    <span className="text-sm">Searching...</span>
                                </div>
                            ) : newChatResults.length > 0 ? (
                                newChatResults.map(user => {
                                    const roleColor = getRoleBadgeColor(user.role);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => handleSelectUser(user)}
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-[var(--background-dark)] border-b border-[var(--border)]/50"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`,
                                                    color: roleColor.color,
                                                    border: `1px solid ${roleColor.border}`
                                                }}
                                            >
                                                {getInitials(user.name, user.role)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-[var(--text-primary)] truncate">{getDisplayName(user.name, user.role)}</p>
                                                <p className="text-xs text-[var(--text-muted)] truncate">{userRole === 'Blogger' ? '' : user.email}</p>
                                            </div>
                                            <span
                                                className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                                style={{
                                                    background: roleColor.bg,
                                                    color: roleColor.color,
                                                    border: `1px solid ${roleColor.border}`
                                                }}
                                            >
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : newChatSearch.trim().length >= 2 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                                    <Users className="h-8 w-8 mb-2 opacity-40" />
                                    <p className="text-sm">No users found</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                                    <Search className="h-8 w-8 mb-2 opacity-40" />
                                    <p className="text-sm">Search for a user to start chatting</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ CHAT WINDOW ============ */}
            <div className={`flex-1 flex flex-col ${!showMobileSidebar ? 'block' : 'hidden md:flex'}`}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--card-background)]">
                            <button
                                onClick={() => setShowMobileSidebar(true)}
                                className="md:hidden p-1 rounded hover:bg-[var(--background-dark)] text-[var(--text-muted)]"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="relative">
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: `linear-gradient(135deg, ${getRoleBadgeColor(selectedUser.role).bg}, ${getRoleBadgeColor(selectedUser.role).border})`,
                                        color: getRoleBadgeColor(selectedUser.role).color,
                                        border: `1px solid ${getRoleBadgeColor(selectedUser.role).border}`
                                    }}
                                >
                                    {getInitials(selectedUser.name, selectedUser.role)}
                                </div>
                                {onlineUsers.has(selectedUser.id) && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--card-background)]" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{getDisplayName(selectedUser.name, selectedUser.role)}</h3>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {typingUser ? (
                                        <span className="text-[var(--primary-cyan)] animate-pulse">typing...</span>
                                    ) : onlineUsers.has(selectedUser.id) ? (
                                        <span className="text-green-400">Online</span>
                                    ) : (
                                        getRoleLabel(selectedUser.role)
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ background: 'var(--background-dark)' }}>
                            {messagesLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                                    <RefreshCw className="h-8 w-8 animate-spin mb-3 text-[var(--primary-cyan)]/50" />
                                    <p className="text-sm">Loading messages...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] opacity-60">
                                    <MessageSquare className="h-12 w-12 mb-3" />
                                    <p className="text-sm font-medium">No messages yet</p>
                                    <p className="text-xs mt-1">Say hello to start the conversation!</p>
                                </div>
                            ) : (
                                <>
                                    <div ref={messagesEndRef} />
                                    {typingUser && (
                                        <div className="flex justify-start mb-2">
                                            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-2">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {messages.map((msg, idx) => {
                                        const mine = isMyMessage(msg);
                                        const showDateLabel = idx === 0 ||
                                            getDateLabel(msg.created_at) !== getDateLabel(messages[idx - 1]?.created_at);
                                        const showSender = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDateLabel && (
                                                    <div className="flex items-center justify-center my-4">
                                                        <div className="px-3 py-1 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--card-background)] border border-[var(--border)]">
                                                            {getDateLabel(msg.created_at)}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-3' : 'mt-0.5'}`}>
                                                    <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                                                        {showSender && !mine && (
                                                            <p className="text-[10px] text-[var(--text-muted)] ml-1 mb-1 font-medium">
                                                                {getDisplayName(msg.sender_name, msg.sender_role)}
                                                            </p>
                                                        )}
                                                        <div
                                                            className={`px-3.5 py-2 text-sm leading-relaxed ${mine
                                                                ? 'bg-[var(--primary-cyan)] text-white rounded-2xl rounded-br-md'
                                                                : 'bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--border)] rounded-2xl rounded-bl-md'
                                                                } ${msg._optimistic ? 'opacity-70' : ''}`}
                                                        >
                                                            <p className="whitespace-pre-wrap break-words text-inherit">{msg.message}</p>
                                                            <p className={`text-[9px] mt-1 text-right ${mine ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                                                                {new Date(msg.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--card-background)]">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type a message..."
                                        rows={1}
                                        className="premium-input w-full py-2.5 px-4 pr-10 text-sm resize-none max-h-32"
                                        style={{
                                            minHeight: '42px',
                                            height: newMessage.split('\n').length > 1 ? 'auto' : '42px'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    className="flex-shrink-0 w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-all 
                    disabled:opacity-30 disabled:cursor-not-allowed
                    bg-[var(--primary-cyan)] text-white hover:text-white hover:bg-[var(--color-primary-hover)] 
                    shadow-[0_0_15px_rgb(var(--brand-rgb)/0.2)]"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 ml-1">
                                Press Enter to send, Shift+Enter for new line
                            </p>
                        </div>
                    </>
                ) : (
                    /* No user selected - Welcome screen */
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]" style={{ background: 'var(--background-dark)' }}>
                        <div className="w-20 h-20 rounded-2xl bg-[var(--primary-cyan)]/10 border border-[var(--primary-cyan)]/20 flex items-center justify-center mb-4">
                            <MessageSquare className="h-10 w-10 text-[var(--primary-cyan)]/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Welcome to Messages</h3>
                        <p className="text-sm text-center max-w-sm mb-4">
                            {userRole === 'Manager'
                                ? 'Message any Writer, Team member, or Blogger.'
                                : 'Message your Manager for support.'}
                        </p>
                        <button
                            onClick={() => { 
                                if (userRole === 'Blogger') {
                                    const manager = users.find(u => ['manager', 'admin', 'super_admin'].includes(u.role?.toLowerCase()));
                                    if (manager) handleSelectUser(manager);
                                } else {
                                    setShowNewChatModal(true); setNewChatSearch(''); setNewChatResults([]); 
                                }
                            }}
                            className="premium-btn bg-[var(--primary-cyan)] text-white hover:text-white hover:bg-[var(--color-primary-hover)] shadow-[0_0_15px_rgb(var(--brand-rgb)/0.2)]"
                        >
                            <UserPlus className="h-4 w-4" />
                            Start New Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatPage;
