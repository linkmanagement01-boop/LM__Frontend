import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radar, X, Save, Send, RotateCcw, ExternalLink, Loader2 } from 'lucide-react';
import { outreachTeamAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { OutreachDetailsForm, toForm, missingFields } from '../../components/OutreachDetailsForm.jsx';

const TABS = [
    ['todo', 'To do'],
    ['submitted', 'Waiting for manager'],
    ['added', 'Sites added'],
    ['not_possible', 'Not possible']
];
const STATUS = {
    assigned: ['To do', 'border-violet-200 bg-violet-50 text-violet-700'],
    sent_back: ['Sent back', 'border-orange-200 bg-orange-50 text-orange-700'],
    submitted: ['Waiting for manager', 'border-blue-200 bg-blue-50 text-blue-700'],
    added: ['Site added', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
    not_possible: ['Not possible', 'border-slate-200 bg-slate-100 text-slate-600']
};
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
export const StatusPill = ({ status }) => {
    const [l, c] = STATUS[status] || [status, 'border-slate-200 bg-slate-50 text-slate-600'];
    return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${c}`}>{l}</span>;
};

/** One task: the client's request + the details form → Save progress / Submit for review */
function TaskPanel({ task, onClose, onChanged }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState(() => toForm(task.details));
    const [busy, setBusy] = useState('');
    const editable = ['assigned', 'sent_back'].includes(task.status);
    const missing = missingFields(form);

    const run = async (kind) => {
        try {
            setBusy(kind);
            const d = kind === 'submit' ? await outreachTeamAPI.submit(task.id, form) : await outreachTeamAPI.save(task.id, form);
            showSuccess(d.message);
            onChanged();
            if (kind === 'submit') onClose();
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
                        <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: 'var(--text-primary)' }}><Radar size={18} style={{ color: 'var(--primary-cyan)' }} />{task.domain}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <StatusPill status={task.status} /> <span>Assigned {fmt(task.assigned_at)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)]" aria-label="Close"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="rounded-xl border border-[var(--border)] p-4 grid sm:grid-cols-3 gap-3 text-sm">
                        <div><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Domain</p>
                            <a href={`https://${task.domain}`} target="_blank" rel="noopener noreferrer" className="font-semibold inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--text-primary)' }}>{task.domain}<ExternalLink size={12} /></a></div>
                        <div><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Client budget / link</p>
                            <p className="font-semibold" style={{ color: 'var(--success)' }}>{money(task.budget)}</p></div>
                        <div><p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Client note</p>
                            <p style={{ color: 'var(--text-secondary)' }}>{task.note || '—'}</p></div>
                    </div>

                    {task.status === 'sent_back' && task.review_note && (
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 flex gap-2">
                            <RotateCcw size={16} className="mt-0.5 shrink-0" />
                            <span><b>Sent back{task.reviewed_by_name ? ` by ${task.reviewed_by_name}` : ''}:</b> {task.review_note}</span>
                        </div>
                    )}

                    <OutreachDetailsForm value={form} onChange={setForm} readOnly={!editable} />
                </div>

                {editable && (
                    <div className="px-6 py-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs" style={{ color: missing.length ? 'var(--warning, #b45309)' : 'var(--text-muted)' }}>
                            {missing.length ? `Still needed to submit: ${missing.join(', ')}` : 'Ready – the manager reviews it before the site goes live.'}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => run('save')} disabled={!!busy} className="premium-btn px-4 py-2 border border-[var(--border)] inline-flex items-center gap-1.5 text-sm disabled:opacity-60">
                                {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save progress
                            </button>
                            <button onClick={() => run('submit')} disabled={!!busy || missing.length > 0} className="premium-btn premium-btn-primary px-4 py-2 inline-flex items-center gap-1.5 text-sm disabled:opacity-60">
                                {busy === 'submit' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Submit for review
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Outreach Team → Outreach Tasks: the requests a manager assigned to me */
export function OutreachTasks() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'todo';
    const [tasks, setTasks] = useState(null);
    const [open, setOpen] = useState(null);

    const load = useCallback(() => {
        outreachTeamAPI.tasks(tab).then(d => setTasks(d.tasks)).catch(() => setTasks([]));
    }, [tab]);
    useEffect(() => { setTasks(null); load(); }, [load]);

    // ?open=<id> (from the dashboard or a notification) opens that task, whatever its tab
    useEffect(() => {
        const id = Number(params.get('open'));
        if (!id) return;
        outreachTeamAPI.tasks('all').then(d => {
            const t = d.tasks.find(x => Number(x.id) === id);
            if (t) setOpen(t);
        }).catch(() => {});
    }, [params]);
    const close = () => { setOpen(null); if (params.get('open')) { params.delete('open'); setParams(params, { replace: true }); } };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Radar className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />Outreach Tasks</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sites a client asked for, assigned to you by a manager. Contact the site, fill in the details and submit them for review.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {TABS.map(([k, l]) => (
                    <button key={k} onClick={() => setParams({ tab: k })}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${tab === k ? 'bg-[var(--primary-cyan)] text-white border-transparent' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'}`}>{l}</button>
                ))}
            </div>

            <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}>
                            <th className="px-4 py-3">Domain</th><th className="px-4 py-3">Client budget</th><th className="px-4 py-3">Client note</th>
                            <th className="px-4 py-3 whitespace-nowrap">Assigned</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {tasks === null ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
                        ) : !tasks.length ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>{tab === 'todo' ? 'Nothing to do right now.' : 'Nothing here yet.'}</td></tr>
                        ) : tasks.map(t => (
                            <tr key={t.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer" onClick={() => setOpen(t)}>
                                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{t.domain}</td>
                                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--success)' }}>{money(t.budget)}</td>
                                <td className="px-4 py-3 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{t.note || '—'}</td>
                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmt(t.assigned_at)}</td>
                                <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                                <td className="px-4 py-3 text-right"><span className="text-sm font-semibold" style={{ color: 'var(--primary-cyan)' }}>{['assigned', 'sent_back'].includes(t.status) ? 'Work on it →' : 'View →'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {open && <TaskPanel key={open.id} task={open} onClose={close} onChanged={load} />}
        </div>
    );
}
