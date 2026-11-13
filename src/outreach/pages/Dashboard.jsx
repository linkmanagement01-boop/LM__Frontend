import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, ListTodo, RotateCcw, Clock, CheckCircle2, XCircle, ArrowRight, Bell } from 'lucide-react';
import { outreachTeamAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/** Outreach Team → Dashboard: what to do now, what's waiting for the manager, what got added */
export function OutreachDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    useEffect(() => { outreachTeamAPI.dashboard().then(setData).catch(() => setData({ counts: {}, todo: [] })); }, []);
    const c = data?.counts || {};
    const cards = [
        { label: 'To do', value: c.todo, icon: ListTodo, tone: 'text-violet-600 bg-violet-50', to: '/outreach/tasks?tab=todo' },
        { label: 'Sent back to fix', value: c.sent_back, icon: RotateCcw, tone: 'text-orange-600 bg-orange-50', to: '/outreach/tasks?tab=todo' },
        { label: 'Waiting for manager', value: c.submitted, icon: Clock, tone: 'text-blue-600 bg-blue-50', to: '/outreach/tasks?tab=submitted' },
        { label: 'Sites added', value: c.added, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50', to: '/outreach/tasks?tab=added' },
        { label: 'Not possible', value: c.not_possible, icon: XCircle, tone: 'text-slate-600 bg-slate-100', to: '/outreach/tasks?tab=not_possible' }
    ];
    return (
        <div className="space-y-6">
            <div className="rounded-2xl p-6 text-white" style={{ backgroundImage: 'linear-gradient(120deg, #5b21b6 0%, #7c3aed 55%, #a855f7 100%)' }}>
                {/* explicit white – the dashboard's global text colours would otherwise win on this banner */}
                <p className="text-sm" style={{ color: 'rgba(255,255,255,.8)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <h2 className="text-2xl font-bold mt-1" style={{ color: '#fff' }}>Hello{user?.name ? `, ${user.name}` : ''}</h2>
                <p className="mt-1 text-sm [&_b]:text-white" style={{ color: 'rgba(255,255,255,.92)' }}>
                    {data ? <>You have <b>{c.todo || 0}</b> outreach task{c.todo === 1 ? '' : 's'} to work on{data.unread ? <> and <b>{data.unread}</b> unread notification{data.unread === 1 ? '' : 's'}</> : ''}.</> : 'Loading…'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/outreach/tasks" className="inline-flex items-center gap-1.5 rounded-lg bg-white text-violet-700 px-4 py-2 text-sm font-bold"><Radar size={16} />Open my tasks</Link>
                    <Link to="/outreach/notifications" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold" style={{ color: '#fff' }}><Bell size={16} />Notifications</Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map(({ label, value, icon: Icon, tone, to }) => (
                    <Link key={label} to={to} className="premium-card p-4 hover:shadow-md transition-shadow">
                        <span className={`h-9 w-9 rounded-lg grid place-items-center ${tone}`}><Icon size={18} /></span>
                        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data ? value || 0 : '…'}</p>
                    </Link>
                ))}
            </div>

            <div className="premium-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Work on next</h3>
                    <Link to="/outreach/tasks" className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: 'var(--primary-cyan)' }}>All tasks <ArrowRight size={14} /></Link>
                </div>
                {!data ? (
                    <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                ) : !data.todo.length ? (
                    <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nothing to do right now – new tasks appear here when a manager assigns them to you.</p>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {data.todo.map(t => (
                            <Link key={t.id} to={`/outreach/tasks?open=${t.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--surface-muted)]">
                                <Radar size={16} style={{ color: 'var(--primary-cyan)' }} />
                                <span className="flex-1 min-w-0">
                                    <span className="font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{t.domain}</span>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Client budget {money(t.budget)} · assigned {fmt(t.assigned_at)}</span>
                                </span>
                                {t.status === 'sent_back'
                                    ? <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">Sent back</span>
                                    : <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">To do</span>}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
