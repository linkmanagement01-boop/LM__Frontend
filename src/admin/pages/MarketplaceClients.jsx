import React, { useEffect, useState } from 'react';
import { Crown, Search, RefreshCw, X, Plus, Globe, Save, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, PauseCircle, PlayCircle, Clock } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Admin → Marketplace Clients
 * - Every marketplace client with their plan (Free / Pro for life), balance and when it expires, last order and pause date
 * - Grant Pro by hand, reactivate a paused account (both kept in the plan history)
 * - Edit the free sites list (what Free users can see and order)
 */
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const soon = (d, days) => d && new Date(d) - Date.now() < days * 86400000;

function PlanBadge({ c }) {
    if (c.deactivated_at) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                <PauseCircle size={12} />Paused
            </span>
        );
    }
    if (c.pro) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 border border-orange-200">
                <Crown size={12} />Pro
            </span>
        );
    }
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">Free</span>;
}

const HISTORY_LABEL = {
    pro: (h) => <>Pro unlocked by a top-up of <b>{money(h.amount)}</b></>,
    grant: (h) => <>Pro granted{h.by_name ? ` by ${h.by_name}` : ''}{h.note ? ` – ${h.note}` : ''}</>,
    expired: (h) => <><b>{money(h.amount)}</b> expired (older than 12 months)</>,
    deactivated: () => <>Paused – no order for 12 months</>,
    reactivated: (h) => <>Reactivated{h.by_name ? ` by ${h.by_name}` : ''}{h.note ? ` – ${h.note}` : ''}</>
};

/** Pop-up: plan, wallet money by expiry date, Grant Pro / Reactivate, plan history */
function ManagePlan({ client, onClose, onSaved }) {
    const { showSuccess, showError } = useToast();
    const [data, setData] = useState(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const load = () => adminAPI.getMarketplaceClientPlan(client.id).then(setData).catch(err => showError(err.message));
    useEffect(() => { load(); }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const run = async (action) => {
        const label = action === 'grant' ? `Give ${client.email} Pro for life?` : `Reactivate ${client.email}? They get full access again right away.`;
        if (!window.confirm(label)) return;
        try {
            setSaving(true);
            const r = action === 'grant'
                ? await adminAPI.grantMarketplaceClientPro(client.id, note.trim())
                : await adminAPI.reactivateMarketplaceClient(client.id, note.trim());
            showSuccess(r.message);
            setNote('');
            await load();
            onSaved();
        } catch (err) {
            showError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const plan = data?.plan;
    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="premium-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Manage plan</h3>
                        <p className="text-sm text-[var(--text-muted)]">{client.name} · {client.email}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)]" aria-label="Close"><X size={18} /></button>
                </div>
                {!data ? <p className="p-6 text-sm text-[var(--text-muted)]">Loading…</p> : (
                    <div className="p-5 space-y-5">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-1">
                            <p className="text-xs text-[var(--text-muted)]">Current plan</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">
                                {plan.tier === 'pro' ? 'Pro (for life)' : 'Free'}
                                {plan.deactivated && <span className="ml-2 align-middle"><PlanBadge c={{ deactivated_at: plan.deactivated_at }} /></span>}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {plan.tier === 'pro'
                                    ? <>Since <b>{fmt(plan.pro_since)}</b> ({plan.pro_source === 'admin' ? 'granted by admin' : 'top-up'})</>
                                    : `Unlocks with one top-up of $${plan.pro_price} or more`}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Last order: <b>{fmt(plan.last_order_at)}</b>
                                {plan.deactivated ? <> · Paused on <b>{fmt(plan.deactivated_at)}</b></>
                                    : plan.deactivates_on ? <> · Pauses on <b className={soon(plan.deactivates_on, 30) ? 'text-amber-700' : ''}>{fmt(plan.deactivates_on)}</b> without a new order</> : null}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Wallet money by expiry date</p>
                            {plan.funds.lots.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No money in the wallet.</p> : (
                                <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                                    {plan.funds.lots.map(l => (
                                        <div key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                                            <span className="flex-1 text-[var(--text-secondary)]">Added {fmt(l.added_at)} <span className="text-[var(--text-muted)]">({l.source === 'topup' ? 'top-up' : l.source === 'admin' ? 'admin credit' : 'credit'})</span></span>
                                            <span className={`text-xs ${soon(l.expires_at, 30) ? 'text-amber-700 font-semibold' : 'text-[var(--text-muted)]'}`}>expires {fmt(l.expires_at)}</span>
                                            <b className="text-[var(--text-primary)] w-20 text-right">{money(l.remaining)}</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(plan.tier !== 'pro' || plan.deactivated) && (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Note (optional, shown in the plan history)</label>
                                <input className="premium-input w-full" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. Agency partner, chatted with support…" />
                                <div className="flex gap-2 justify-end pt-1">
                                    {plan.deactivated && <button onClick={() => run('reactivate')} disabled={saving} className="premium-btn premium-btn-primary px-4 py-2 text-sm"><PlayCircle size={14} />Reactivate</button>}
                                    {plan.tier !== 'pro' && <button onClick={() => run('grant')} disabled={saving} className="premium-btn premium-btn-primary px-4 py-2 text-sm"><Crown size={14} />Grant Pro</button>}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Plan history</p>
                            {data.history.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No plan changes yet.</p> : (
                                <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                                    {data.history.map((h, i) => (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                                            <span className="text-[var(--text-muted)] w-24 shrink-0">{fmt(h.created_at)}</span>
                                            <span className="flex-1 text-[var(--text-secondary)]">{(HISTORY_LABEL[h.kind] || (() => h.note))(h)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** The free sites list: what Free users can see fully and order */
function FreeSites() {
    const { showSuccess, showError } = useToast();
    const [sites, setSites] = useState(null);
    const [draft, setDraft] = useState([]);
    const [add, setAdd] = useState('');
    const [saving, setSaving] = useState(false);
    const load = () => adminAPI.getMarketplaceFreeSites().then(d => { setSites(d.sites); setDraft(d.sites.map(s => s.domain)); }).catch(err => showError(err.message));
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const changed = sites && JSON.stringify(draft) !== JSON.stringify(sites.map(s => s.domain));
    const info = new Map((sites || []).map(s => [s.domain, s]));

    const addDomain = () => {
        const d = add.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
        if (!d) return;
        if (draft.includes(d)) return showError(`${d} is already in the list`);
        setDraft(l => [...l, d]);
        setAdd('');
    };
    const save = async () => {
        try {
            setSaving(true);
            const d = await adminAPI.saveMarketplaceFreeSites(draft);
            setSites(d.sites); setDraft(d.sites.map(s => s.domain));
            showSuccess('Free sites saved – Free users see the new list right away');
        } catch (err) {
            showError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="premium-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                    <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Globe size={16} />Free sites ({draft.length})</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Free users see these sites with full names and can order them. All other sites are masked.</p>
                </div>
                <button onClick={save} disabled={!changed || saving} className="premium-btn premium-btn-primary px-4 py-2 text-sm disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : 'Save list'}</button>
            </div>
            {!sites ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : (
                <>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {draft.map(d => {
                            const s = info.get(d);
                            const warn = s && (!s.in_sites || !s.listed);
                            return (
                                <div key={d} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${warn ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)]'}`}>
                                    {s ? (warn ? <AlertTriangle size={14} className="text-amber-600 shrink-0" /> : <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />) : <Plus size={14} className="text-[var(--text-muted)] shrink-0" />}
                                    <span className="flex-1 truncate text-[var(--text-primary)]">{d}</span>
                                    <span className="text-xs text-[var(--text-muted)]">{s ? (!s.in_sites ? 'not in sites' : !s.listed ? 'hidden' : `DR ${s.dr ?? '-'}`) : 'new'}</span>
                                    <button onClick={() => setDraft(l => l.filter(x => x !== d))} className="p-1 rounded text-[var(--text-muted)] hover:text-red-600" aria-label={`Remove ${d}`}><Trash2 size={13} /></button>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 mt-3 max-w-md">
                        <input className="premium-input w-full" value={add} onChange={e => setAdd(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDomain()} placeholder="Add a domain, e.g. example.com" />
                        <button onClick={addDomain} className="premium-btn border border-[var(--border)] px-4 text-sm"><Plus size={14} />Add</button>
                    </div>
                    {changed && <p className="text-xs text-amber-700 mt-2">Unsaved changes – click "Save list".</p>}
                </>
            )}
        </div>
    );
}

export function MarketplaceClients() {
    const { showError } = useToast();
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [managing, setManaging] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [search]);
    const load = async () => {
        try { setLoading(true); setData(await adminAPI.getMarketplaceClients({ search: q || undefined, filter: filter || undefined, page, limit: 25 })); }
        catch (err) { showError(err.message); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [q, filter, page]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]"><Crown className="h-6 w-6 text-orange-500" />Marketplace Clients</h2>
                    <p className="text-sm mt-1 text-[var(--text-muted)]">
                        One top-up of ${data?.pro_price ?? 499}+ = Pro for life. Wallet money is valid 12 months. Pro accounts pause after 12 months without an order.
                    </p>
                </div>
                <button onClick={load} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]" title="Reload"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[['Clients', data?.stats?.clients, ''], ['On Pro', data?.stats?.pro, 'pro'], ['Paused', data?.stats?.paused, 'paused']].map(([l, v, f]) => (
                    <button key={l} onClick={() => { setFilter(filter === f ? '' : f); setPage(1); }}
                        className={`premium-card p-4 text-left transition ${filter === f && f ? 'ring-2 ring-orange-400' : ''}`}>
                        <p className={`text-2xl font-bold ${f === 'paused' && v ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>{v ?? '—'}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{l}</p>
                    </button>
                ))}
            </div>

            <div className="premium-card overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex flex-wrap gap-3 items-center">
                    <div className="relative max-w-sm flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input className="premium-input w-full pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" />
                    </div>
                    <select className="premium-input w-40" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
                        <option value="">All plans</option>
                        <option value="pro">Pro</option>
                        <option value="free">Free</option>
                        <option value="paused">Paused</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-muted)]">
                                {['Client', 'Plan', 'Balance', 'Next expiry', 'Last order', 'Pauses on', 'Top-ups', 'Orders', ''].map(h => <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {!data ? (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-[var(--text-muted)]">Loading…</td></tr>
                            ) : data.clients.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-[var(--text-muted)]">No marketplace clients{q || filter ? ' match' : ' yet'}.</td></tr>
                            ) : data.clients.map(c => (
                                <tr key={c.id} className="hover:bg-[var(--surface-muted)]">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-[var(--text-primary)]">{c.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{c.email}</p>
                                    </td>
                                    <td className="px-4 py-3"><PlanBadge c={c} /></td>
                                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{money(c.balance)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                                        {c.next_expiry ? <span className={soon(c.next_expiry.date, 30) ? 'text-amber-700 font-semibold' : ''}>{money(c.next_expiry.amount)} · {fmt(c.next_expiry.date)}</span> : '—'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">{fmt(c.last_order_at)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                                        {c.deactivated_at ? <span className="text-amber-700 font-semibold">Paused {fmt(c.deactivated_at)}</span>
                                            : c.deactivates_on ? <span className={`inline-flex items-center gap-1 ${soon(c.deactivates_on, 30) ? 'text-amber-700 font-semibold' : ''}`}><Clock size={12} />{fmt(c.deactivates_on)}</span> : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{money(c.topups)}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{c.orders}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => setManaging(c)} className={`premium-btn px-3 py-1.5 text-xs font-semibold ${c.deactivated_at ? 'premium-btn-primary' : 'border border-[var(--border)]'}`}>
                                            {c.deactivated_at ? 'Reactivate' : c.pro ? 'View plan' : 'Manage plan'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data?.pagination?.totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 p-3 border-t border-[var(--border)] text-sm text-[var(--text-secondary)]">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
                        Page {page} of {data.pagination.totalPages}
                        <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
                    </div>
                )}
            </div>

            <FreeSites />
            {managing && <ManagePlan client={managing} onClose={() => setManaging(null)} onSaved={load} />}
        </div>
    );
}

export default MarketplaceClients;
