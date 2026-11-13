import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, Search, RefreshCw, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { outreachAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Marketplace → Outreach Requests (shared by managers and admins)
 * Pro clients searched for a site we don't have and asked us to get it, with their budget.
 * Staff see every request and set its status; the client sees the status on their Outreach page (read-only).
 */
const STATUSES = [
    ['requested', 'Requested', 'bg-amber-50 text-amber-700 border-amber-200'],
    ['in_progress', 'In progress', 'bg-blue-50 text-blue-700 border-blue-200'],
    ['added', 'Site added', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    ['not_possible', 'Not possible', 'bg-slate-100 text-slate-600 border-slate-200']
];
const STATUS = Object.fromEntries(STATUSES.map(([k, l, c]) => [k, { label: l, cls: c }]));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function OutreachRequestsView({ role = 'manager' }) {
    const { showSuccess, showError } = useToast();
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [search]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setData(await outreachAPI.list(role, { page, limit: 25, status: status || undefined, search: query || undefined }));
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to load outreach requests');
        } finally {
            setLoading(false);
        }
    }, [role, page, status, query]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [load]);

    const changeStatus = async (r, next) => {
        if (next === r.status) return;
        try {
            setSaving(r.id);
            await outreachAPI.setStatus(role, r.id, next);
            showSuccess(`${r.domain}: ${STATUS[next].label}`);
            await load();
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to update status');
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
                        Sites marketplace clients searched for but we don't have yet – with the budget they offered. Set the status so the client can follow it.
                    </p>
                </div>
                <button onClick={load} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]" title="Reload">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                </button>
            </div>

            {/* Status tabs with counts */}
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
                                <th className="px-4 py-3">Note</th>
                                <th className="px-4 py-3 whitespace-nowrap">Requested</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data && loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
                            ) : !data?.requests?.length ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                                    {query || status ? 'No requests match your search' : 'No outreach requests yet'}
                                </td></tr>
                            ) : data.requests.map(r => (
                                <tr key={r.id} className="border-t border-[var(--border)] align-top">
                                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.domain}</a>
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
                                    <td className="px-4 py-3 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{r.note || '—'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmt(r.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <select value={r.status} disabled={saving === r.id} onChange={e => changeStatus(r, e.target.value)}
                                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer disabled:opacity-60 ${STATUS[r.status]?.cls || ''}`}>
                                            {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                        </select>
                                        {r.updated_by_name && r.status !== 'requested' && (
                                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>by {r.updated_by_name}</p>
                                        )}
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
        </div>
    );
}

export function OutreachRequests() {
    return <Layout><OutreachRequestsView role="manager" /></Layout>;
}

export default OutreachRequests;
