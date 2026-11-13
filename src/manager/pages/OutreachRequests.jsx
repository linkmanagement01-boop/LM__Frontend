import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, Search, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, X, Save, CheckCircle2, RotateCcw, XCircle, Loader2, ExternalLink, Undo2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { outreachAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { OutreachDetailsForm, toForm, missingFields } from '../../components/OutreachDetailsForm.jsx';

/**
 * Marketplace → Outreach Requests (shared by managers and admins)
 * Client asks for a site we don't have → manager assigns an Outreach Team member → member fills in the site's
 * details and submits → manager reviews (can edit): Approve = site added to Sites + marketplace and the client is told,
 * Send back = to the member with a note, Not possible = closed.
 */
const STATUSES = [
    ['requested', 'New', 'bg-amber-50 text-amber-700 border-amber-200'],
    ['assigned', 'Assigned', 'bg-violet-50 text-violet-700 border-violet-200'],
    ['submitted', 'Waiting for approval', 'bg-blue-50 text-blue-700 border-blue-200'],
    ['sent_back', 'Sent back', 'bg-orange-50 text-orange-700 border-orange-200'],
    ['added', 'Site added', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    ['not_possible', 'Not possible', 'bg-slate-100 text-slate-600 border-slate-200']
];
const STATUS = Object.fromEntries(STATUSES.map(([k, l, c]) => [k, { label: l, cls: c }]));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const closed = (s) => s === 'added' || s === 'not_possible';
const Pill = ({ status }) => <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS[status]?.cls || ''}`}>{STATUS[status]?.label || status}</span>;

/** Review panel: the client's request, who works on it, and the details the member entered (editable by staff) */
function ReviewPanel({ role, req, members, onClose, onChanged }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState(() => toForm(req.details));
    const [busy, setBusy] = useState('');
    const [backNote, setBackNote] = useState(null); // null = closed, '' = writing
    const missing = missingFields(form);
    const hasDetails = Object.values(req.details || {}).some(v => v !== null && v !== '' && v !== false);

    const act = async (kind, fn) => {
        try {
            setBusy(kind);
            const d = await fn();
            showSuccess(d.message);
            await onChanged();
            if (['approve', 'sendback', 'not_possible', 'reopen'].includes(kind)) onClose();
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Something went wrong');
        } finally {
            setBusy('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="h-full w-full max-w-2xl flex flex-col shadow-2xl" style={{ background: 'var(--card-background)' }}>
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border)]">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: 'var(--text-primary)' }}><Radar size={18} style={{ color: 'var(--primary-cyan)' }} />{req.domain}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <Pill status={req.status} />
                            {req.assigned_to_name && <span>Outreach: <b style={{ color: 'var(--text-secondary)' }}>{req.assigned_to_name}</b></span>}
                            {req.submitted_at && <span>· submitted {fmt(req.submitted_at)}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)]" aria-label="Close"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Client's request */}
                    <div className="rounded-xl border border-[var(--border)] p-4 grid sm:grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Client</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{req.client_name || '—'}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{req.client_email}</p></div>
                        <div><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Budget / link · requested</p>
                            <p className="font-semibold" style={{ color: 'var(--success)' }}>{money(req.budget)} <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>· {fmt(req.created_at)}</span></p></div>
                        <div className="sm:col-span-2"><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Client note</p>
                            <p style={{ color: 'var(--text-secondary)' }}>{req.note || '—'}</p></div>
                        <div className="sm:col-span-2">
                            <a href={`https://${req.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--primary-cyan)' }}>Open {req.domain}<ExternalLink size={11} /></a>
                        </div>
                    </div>

                    {req.status === 'sent_back' && req.review_note && (
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800"><b>Sent back{req.reviewed_by_name ? ` by ${req.reviewed_by_name}` : ''}:</b> {req.review_note}</div>
                    )}
                    {req.status === 'added' && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            Added to Sites{req.reviewed_by_name ? ` by ${req.reviewed_by_name}` : ''} on {fmt(req.reviewed_at)} – it's on the marketplace and the client was told.
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                            Site details {req.assigned_to_name ? <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(entered by {req.assigned_to_name}{closed(req.status) ? '' : ' – you can edit'})</span> : null}
                        </p>
                        {!hasDetails && !closed(req.status) && (
                            <p className="text-xs mb-3 rounded-lg border border-[var(--border)] px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                                {req.assigned_to ? 'The outreach member hasn\'t entered details yet.' : 'Assign an outreach member first – or fill the details in yourself and approve.'}
                            </p>
                        )}
                        <OutreachDetailsForm value={form} onChange={setForm} readOnly={closed(req.status)} />
                    </div>

                    {backNote !== null && (
                        <div className="rounded-xl border border-orange-200 p-4 space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>What should the outreach member change?</label>
                            <textarea className="premium-input w-full min-h-[70px] text-sm" autoFocus value={backNote} onChange={e => setBackNote(e.target.value)} maxLength={1000} placeholder="e.g. Please confirm the NE price and add a sample post" />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setBackNote(null)} className="premium-btn px-3 py-1.5 border border-[var(--border)] text-sm">Cancel</button>
                                <button disabled={!backNote.trim() || !!busy} onClick={() => act('sendback', () => outreachAPI.sendBack(role, req.id, backNote))}
                                    className="premium-btn px-3 py-1.5 text-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 inline-flex items-center gap-1.5">
                                    {busy === 'sendback' ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}Send back
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                    {closed(req.status) ? (
                        <>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>This request is closed.</span>
                            {req.status === 'not_possible' && (
                                <button onClick={() => act('reopen', () => outreachAPI.setStatus(role, req.id, 'requested'))} disabled={!!busy}
                                    className="premium-btn px-4 py-2 border border-[var(--border)] inline-flex items-center gap-1.5 text-sm"><Undo2 size={16} />Reopen</button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <button onClick={() => act('not_possible', () => outreachAPI.setStatus(role, req.id, 'not_possible'))} disabled={!!busy}
                                    className="premium-btn px-3 py-2 border border-[var(--border)] inline-flex items-center gap-1.5 text-sm"><XCircle size={16} />Not possible</button>
                                {req.assigned_to && (
                                    <button onClick={() => setBackNote('')} disabled={!!busy || backNote !== null}
                                        className="premium-btn px-3 py-2 border border-orange-200 text-orange-700 inline-flex items-center gap-1.5 text-sm"><RotateCcw size={16} />Send back</button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => act('save', () => outreachAPI.saveDetails(role, req.id, form))} disabled={!!busy}
                                    className="premium-btn px-3 py-2 border border-[var(--border)] inline-flex items-center gap-1.5 text-sm">
                                    {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save changes
                                </button>
                                <button onClick={() => act('approve', () => outreachAPI.approve(role, req.id, form))} disabled={!!busy || missing.length > 0}
                                    title={missing.length ? `Missing: ${missing.join(', ')}` : 'Add this site to Sites and the marketplace, and tell the client'}
                                    className="premium-btn premium-btn-primary px-4 py-2 inline-flex items-center gap-1.5 text-sm disabled:opacity-60">
                                    {busy === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Approve & add site
                                </button>
                            </div>
                            {missing.length > 0 && <p className="w-full text-xs text-right" style={{ color: 'var(--text-muted)' }}>To approve, still needed: {missing.join(', ')}</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function OutreachRequestsView({ role = 'manager' }) {
    const { showSuccess, showError } = useToast();
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [saving, setSaving] = useState(null);
    const [open, setOpen] = useState(null);

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { outreachAPI.members(role).then(d => setMembers(d.members || [])).catch(() => setMembers([])); }, [role]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const d = await outreachAPI.list(role, { page, limit: 25, status: status || undefined, search: query || undefined });
            setData(d);
            return d;
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to load outreach requests');
        } finally {
            setLoading(false);
        }
    }, [role, page, status, query]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [load]);

    const assign = async (r, userId) => {
        if (!userId) return;
        try {
            setSaving(r.id);
            const d = await outreachAPI.assign(role, r.id, userId);
            showSuccess(`${r.domain}: ${d.message}`);
            await load();
            outreachAPI.members(role).then(x => setMembers(x.members || [])).catch(() => {});
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to assign');
        } finally {
            setSaving(null);
        }
    };

    const counts = data?.counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pg = data?.pagination;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Radar className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} /> Outreach Requests
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Sites marketplace clients asked for. Assign each one to an Outreach Team member, review what they submit, then approve it to add the site.
                    </p>
                </div>
                <button onClick={load} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]" title="Reload">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                </button>
            </div>

            {members.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    No Outreach Team members yet – {role === 'admin'
                        ? <>add one in <Link to="/admin/team-members" className="font-semibold underline">Team Members</Link> (role "Outreach Team")</>
                        : 'ask an admin to add one (Team Members → role "Outreach Team")'} to assign requests.
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {[['', 'All', total], ...STATUSES.map(([k, l]) => [k, l, counts[k] || 0])].map(([k, l, n]) => (
                    <button key={k || 'all'} onClick={() => { setStatus(k); setPage(1); }}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${status === k ? 'bg-[var(--primary-cyan)] text-white border-transparent' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'}`}>
                        {l} <span className={status === k ? '' : 'opacity-70'}>({n})</span>
                    </button>
                ))}
            </div>

            <div className="premium-card overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input className="premium-input w-full pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domain, client name or email…" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}>
                                <th className="px-4 py-3">Domain</th>
                                <th className="px-4 py-3">Budget</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3 whitespace-nowrap">Requested</th>
                                <th className="px-4 py-3">Outreach member</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {!data && loading ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
                            ) : !data?.requests?.length ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                                    {query || status ? 'No requests match your search' : 'No outreach requests yet'}
                                </td></tr>
                            ) : data.requests.map(r => (
                                <tr key={r.id} className="border-t border-[var(--border)] align-top">
                                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.domain}</a>
                                        {r.note && <p className="text-xs font-normal mt-0.5 max-w-[220px] truncate" style={{ color: 'var(--text-muted)' }} title={r.note}>{r.note}</p>}
                                    </td>
                                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--success)' }}>{money(r.budget)}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.client_name || '—'}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.client_email}</p>
                                        {role === 'manager' && r.client_id && (
                                            <Link to={`/manager/client-messages?client=${r.client_id}`} className="inline-flex items-center gap-1 text-xs font-semibold mt-1" style={{ color: 'var(--primary-cyan)' }}>
                                                <MessageSquare size={12} />Message client
                                            </Link>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmt(r.created_at)}</td>
                                    <td className="px-4 py-3">
                                        {closed(r.status) ? (
                                            <span style={{ color: 'var(--text-secondary)' }}>{r.assigned_to_name || '—'}</span>
                                        ) : (
                                            <select value={r.assigned_to || ''} disabled={saving === r.id || !members.length} onChange={e => assign(r, e.target.value)}
                                                className="premium-input py-1.5 text-xs min-w-[150px] disabled:opacity-60">
                                                <option value="">{members.length ? 'Assign to…' : 'No members'}</option>
                                                {members.map(m => <option key={m.id} value={m.id}>{m.name}{m.open_tasks ? ` (${m.open_tasks} open)` : ''}</option>)}
                                                {r.assigned_to && !members.some(m => String(m.id) === String(r.assigned_to)) && <option value={r.assigned_to}>{r.assigned_to_name || 'Former member'}</option>}
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-4 py-3"><Pill status={r.status} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => setOpen(r)} className={`text-sm font-semibold whitespace-nowrap ${r.status === 'submitted' ? 'premium-btn premium-btn-primary px-3 py-1.5' : ''}`}
                                            style={r.status === 'submitted' ? undefined : { color: 'var(--primary-cyan)' }}>
                                            {r.status === 'submitted' ? 'Review' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pg?.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span>{pg.total} requests · page {pg.page} of {pg.totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40"><ChevronLeft size={16} /></button>
                            <button disabled={page >= pg.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {open && <ReviewPanel key={open.id} role={role} req={open} members={members} onClose={() => setOpen(null)} onChanged={load} />}
        </div>
    );
}

export function OutreachRequests() {
    return <Layout><OutreachRequestsView role="manager" /></Layout>;
}

export default OutreachRequests;
