import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Search, Send, Paperclip, X, FileText, Loader2, MessageSquare, Wallet, Crown, ClipboardList, Mail, CalendarDays, Image as ImageIcon, Inbox } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { supportAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Marketplace support chat – shared inbox for managers (and admins).
 * Clients see staff replies as "Support Team". ?client=<id>&order=<marketplaceOrderId>&number=MP-… opens / starts a chat.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const ago = (d) => {
    if (!d) return '';
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const time = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const isImage = (a) => /\.(png|jpe?g|gif|webp)$/i.test(a.url);

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export function ClientMessagesView() {
    const { showError } = useToast();
    const [params, setParams] = useSearchParams();
    const [list, setList] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [activeId, setActiveId] = useState(null);
    const [chat, setChat] = useState(null); // { conversation, client, messages }
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [order, setOrder] = useState(null);
    const [busy, setBusy] = useState(false);
    const [typingFor, setTypingFor] = useState(null);
    const listRef = useRef(null);
    const fileRef = useRef(null);
    const socketRef = useRef(null);
    const activeRef = useRef(null);
    activeRef.current = activeId;

    const loadList = () => supportAPI.conversations({ search: search.trim() || undefined, filter: filter === 'unread' ? 'unread' : undefined })
        .then(d => setList(d.conversations)).catch(err => showError(err.message));
    useEffect(() => { const t = setTimeout(loadList, 300); return () => clearTimeout(t); }, [search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

    const open = async (id) => {
        setActiveId(id);
        try {
            const d = await supportAPI.conversation(id);
            setChat(d);
            supportAPI.read(id).catch(() => {});
            setList(l => l.map(c => (c.id === id ? { ...c, staff_unread: 0 } : c)));
            window.dispatchEvent(new Event('support:unread-changed'));
        } catch (err) { showError(err.message); }
    };

    // ?client=…&order=…&number=… → find or start the client's conversation
    useEffect(() => {
        const client = params.get('client');
        if (!client) return;
        supportAPI.start({ client_user_id: Number(client) }).then(d => {
            if (params.get('order')) setOrder({ id: Number(params.get('order')), number: params.get('number') || `#${params.get('order')}` });
            setParams({}, { replace: true });
            loadList();
            open(d.conversation_id);
        }).catch(err => showError(err.message));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Live updates (joined with the login token)
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        socket.on('connect', () => socket.emit('support:join', { token: localStorage.getItem('authToken') }));
        socket.on('support:message', ({ conversation_id: cid, message }) => {
            if (cid === activeRef.current) {
                setChat(c => (c && !c.messages.some(m => m.id === message.id) ? { ...c, messages: [...c.messages, message] } : c));
                if (message.from === 'client') supportAPI.read(cid).catch(() => {});
            }
            loadList();
        });
        socket.on('support:typing', ({ client_user_id: uid }) => {
            setTypingFor(uid);
            setTimeout(() => setTypingFor(t => (t === uid ? null : t)), 3000);
        });
        socket.on('support:read', () => loadList());
        return () => socket.disconnect();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useLayoutEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [chat?.messages.length]);

    const pickFile = async (file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) return showError('File is too large (max 10 MB)');
        try { setBusy(true); const d = await supportAPI.upload(file); setFiles(f => [...f, d].slice(0, 5)); }
        catch (err) { showError(err.message); } finally { setBusy(false); }
    };
    const send = async (e) => {
        e?.preventDefault();
        if (!activeId || (!text.trim() && !files.length)) return;
        try {
            setBusy(true);
            const d = await supportAPI.send(activeId, { body: text.trim(), attachments: files, order_id: order?.id });
            setChat(c => (c.messages.some(m => m.id === d.message.id) ? c : { ...c, messages: [...c.messages, d.message] }));
            setText(''); setFiles([]); setOrder(null);
            loadList();
        } catch (err) { showError(err.message); } finally { setBusy(false); }
    };
    const lastTyping = useRef(0);
    const onType = (v) => {
        setText(v);
        if (chat && Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); socketRef.current?.emit('support:typing', { to: chat.conversation.client_user_id }); }
    };

    const c = chat?.client;
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2"><MessageSquare className="h-6 w-6 text-[var(--primary-cyan)]" />Client Messages</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Marketplace support chat – shared by all managers. Clients see your replies as "Support Team".</p>
            </div>

            <div className="premium-card overflow-hidden grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] h-[calc(100vh-12rem)] min-h-[520px]">
                {/* Conversations */}
                <div className="border-r border-[var(--border)] flex flex-col min-h-0">
                    <div className="p-3 space-y-2 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input className="premium-input w-full pl-8 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client name or email" />
                        </div>
                        <div className="flex gap-1">
                            {[['all', 'All'], ['unread', 'Waiting for reply']].map(([v, l]) => (
                                <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1 rounded-md text-xs font-semibold ${filter === v ? 'bg-[var(--primary-cyan)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)]'}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                        {list.length === 0 ? (
                            <div className="p-8 text-center text-sm text-[var(--text-muted)]"><Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />No conversations{filter === 'unread' ? ' waiting' : ' yet'}</div>
                        ) : list.map(cv => (
                            <button key={cv.id} onClick={() => open(cv.id)} className={`w-full text-left px-3 py-3 flex gap-2.5 hover:bg-[var(--surface-muted)] ${activeId === cv.id ? 'bg-[var(--surface-muted)]' : ''}`}>
                                <span className="h-9 w-9 rounded-full bg-slate-900 text-white text-sm font-bold grid place-items-center shrink-0">{(cv.client_name || '?').charAt(0).toUpperCase()}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className={`truncate text-sm ${cv.staff_unread ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>{cv.client_name}</span>
                                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">{ago(cv.last_message_at)}</span>
                                    </span>
                                    <span className="flex items-center justify-between gap-2 mt-0.5">
                                        <span className="truncate text-xs text-[var(--text-muted)]">{typingFor === cv.client_user_id ? 'typing…' : `${cv.last_sender === 'staff' ? 'You: ' : ''}${cv.last_message_preview || ''}`}</span>
                                        {cv.staff_unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold grid place-items-center shrink-0">{cv.staff_unread}</span>}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex flex-col min-h-0">
                    {!chat ? (
                        <div className="flex-1 grid place-items-center text-center p-8 text-[var(--text-muted)]">
                            <div><MessageSquare className="h-10 w-10 mx-auto opacity-40" /><p className="mt-2 text-sm">Select a conversation</p></div>
                        </div>
                    ) : (
                        <>
                            <div className="px-5 py-3 border-b border-[var(--border)]">
                                <p className="font-semibold text-[var(--text-primary)]">{c?.name}</p>
                                <p className="text-xs text-[var(--text-muted)]">{c?.email}</p>
                            </div>
                            <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[var(--surface-muted)]">
                                {chat.messages.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-10">No messages yet – write the first one below.</p>}
                                {chat.messages.map(m => {
                                    const staff = m.from === 'staff';
                                    return (
                                        <div key={m.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[75%] flex flex-col gap-1">
                                                <span className={`text-[11px] text-[var(--text-muted)] ${staff ? 'text-right' : ''}`}>{staff ? `${m.sender_name || 'Staff'} (shown as Support Team)` : c?.name} · {time(m.created_at)}</span>
                                                <div className={`rounded-2xl px-3.5 py-2 text-sm ${staff ? 'bg-[var(--primary-cyan)] text-white rounded-br-md' : 'bg-white text-slate-800 border border-[var(--border)] rounded-bl-md'}`}>
                                                    {m.order_number && <span className={`mb-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${staff ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}><ClipboardList size={11} />{m.order_number}</span>}
                                                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                                                    {m.attachments?.map((a, i) => isImage(a)
                                                        ? <a key={i} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} className="mt-1.5 max-h-48 rounded-lg" /></a>
                                                        : <a key={i} href={a.url} target="_blank" rel="noreferrer" className={`mt-1.5 flex items-center gap-1.5 text-xs underline ${staff ? 'text-white' : 'text-slate-700'}`}><FileText size={13} />{a.name}</a>)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {typingFor === chat.conversation.client_user_id && <p className="text-xs text-[var(--text-muted)]">{c?.name} is typing…</p>}
                            </div>
                            <form onSubmit={send} className="border-t border-[var(--border)] p-3 bg-[var(--surface)]">
                                {(order || files.length > 0) && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {order && <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 border border-orange-200 px-2 py-1 text-xs font-semibold text-orange-800"><ClipboardList size={12} />About order {order.number}<button type="button" onClick={() => setOrder(null)} aria-label="Remove order"><X size={12} /></button></span>}
                                        {files.map((f, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{isImage(f) ? <ImageIcon size={12} /> : <FileText size={12} />}<span className="max-w-[140px] truncate">{f.name}</span><button type="button" onClick={() => setFiles(l => l.filter((_, j) => j !== i))} aria-label="Remove file"><X size={12} /></button></span>)}
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                                    <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="h-10 w-10 grid place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)]" title="Attach image, PDF or DOC"><Paperclip size={18} /></button>
                                    <textarea rows={1} value={text} onChange={e => onType(e.target.value)} maxLength={4000}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                                        placeholder="Reply as Support Team…" className="premium-input flex-1 resize-none min-h-[40px] max-h-32 py-2.5 text-sm" />
                                    <button type="submit" disabled={busy || (!text.trim() && !files.length)} className="h-10 w-10 grid place-items-center rounded-xl bg-[var(--primary-cyan)] text-white disabled:opacity-40" aria-label="Send">
                                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                {/* Client info */}
                <div className="border-l border-[var(--border)] overflow-y-auto hidden lg:block">
                    {c ? (
                        <div className="p-4 space-y-4 text-sm">
                            <div>
                                <span className="h-12 w-12 rounded-full bg-slate-900 text-white text-lg font-bold grid place-items-center">{(c.name || '?').charAt(0).toUpperCase()}</span>
                                <p className="font-semibold text-[var(--text-primary)] mt-2">{c.name}</p>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 break-all"><Mail size={12} />{c.email}</p>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><CalendarDays size={12} />Joined {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-[var(--border)] p-2.5"><p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Wallet size={11} />Balance</p><p className="font-bold text-[var(--text-primary)]">{money(c.balance)}</p></div>
                                <div className="rounded-lg border border-[var(--border)] p-2.5"><p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Crown size={11} />Plan</p><p className="font-bold text-[var(--text-primary)]">{c.plan?.tier === 'pro' ? 'Pro' : 'Free'}</p></div>
                                <div className="rounded-lg border border-[var(--border)] p-2.5"><p className="text-[11px] text-[var(--text-muted)]">Orders</p><p className="font-bold text-[var(--text-primary)]">{c.totals.orders}</p></div>
                                <div className="rounded-lg border border-[var(--border)] p-2.5"><p className="text-[11px] text-[var(--text-muted)]">Spent</p><p className="font-bold text-[var(--text-primary)]">{money(c.totals.spent)}</p></div>
                            </div>
                            {c.plan?.deactivated && (
                                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                                    <b>Account paused</b> since {fmtDay(c.plan.deactivated_at)} (no order for 12 months). An admin can reactivate it in Admin → Marketplace Clients.
                                </p>
                            )}
                            {c.plan?.tier === 'pro' && !c.plan.deactivated && <p className="text-xs text-[var(--text-muted)]">Pro since {fmtDay(c.plan.pro_since)}{c.plan.deactivates_on ? ` · pauses ${fmtDay(c.plan.deactivates_on)} without an order` : ''}</p>}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Recent orders</p>
                                {c.orders.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No orders yet.</p> : (
                                    <div className="space-y-1.5">
                                        {c.orders.map(o => (
                                            <div key={o.id} className="rounded-lg border border-[var(--border)] p-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    {o.client_order_id
                                                        ? <Link to={`/manager/client-orders/${o.client_order_id}`} className="text-xs font-semibold text-[var(--primary-cyan)] hover:underline">{o.order_number}</Link>
                                                        : <span className="text-xs font-semibold">{o.order_number}</span>}
                                                    <span className="text-xs font-semibold">{money(o.total_price)}</span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {String(o.statuses || '').replace(/_/g, ' ')}</p>
                                                <button onClick={() => setOrder({ id: o.id, number: o.order_number })} className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary-cyan)] mt-1">Mention in reply</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : <p className="p-6 text-sm text-[var(--text-muted)]">Client details appear here.</p>}
                </div>
            </div>
        </div>
    );
}

export function ClientMessages() {
    return <Layout><ClientMessagesView /></Layout>;
}

export default ClientMessages;
