import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Radar, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { outreachTeamAPI } from '../../lib/api';

const ICON = { outreach_assigned: Radar, outreach_sent_back: RotateCcw, outreach_approved: CheckCircle2, outreach_closed: XCircle };
const ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Outreach Team → Notifications: new tasks, tasks sent back, approvals */
export function OutreachNotifications() {
    const [list, setList] = useState(null);
    const load = () => outreachTeamAPI.notifications().then(d => setList(d.notifications)).catch(() => setList([]));
    useEffect(() => { load(); }, []);

    const readAll = async () => {
        await outreachTeamAPI.readNotifications().catch(() => {});
        await load();
        window.dispatchEvent(new Event('outreach:unread-changed'));
    };
    const open = (n) => {
        if (!n.read_at) outreachTeamAPI.readNotifications(n.id).then(() => window.dispatchEvent(new Event('outreach:unread-changed'))).catch(() => {});
    };
    const unread = (list || []).filter(n => !n.read_at).length;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Bell className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />Notifications</h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>New tasks from your manager, tasks sent back to fix, and approved sites.</p>
                </div>
                {unread > 0 && <button onClick={readAll} className="premium-btn px-4 py-2 border border-[var(--border)] inline-flex items-center gap-1.5 text-sm"><CheckCheck size={16} />Mark all as read</button>}
            </div>
            <div className="premium-card overflow-hidden divide-y divide-[var(--border)]">
                {list === null ? (
                    <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                ) : !list.length ? (
                    <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet.</p>
                ) : list.map(n => {
                    const Icon = ICON[n.type] || Bell;
                    return (
                        <Link key={n.id} to={n.data?.request_id ? `/outreach/tasks?open=${n.data.request_id}` : '/outreach/tasks'} onClick={() => open(n)}
                            className={`flex items-start gap-3 px-5 py-4 hover:bg-[var(--surface-muted)] ${n.read_at ? '' : 'bg-violet-50/60'}`}>
                            <span className="h-9 w-9 shrink-0 rounded-lg grid place-items-center bg-violet-50 text-violet-600"><Icon size={17} /></span>
                            <span className="flex-1 min-w-0">
                                <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>{n.data?.title || 'Update'}</span>
                                <span className="text-sm block" style={{ color: 'var(--text-secondary)' }}>{n.data?.message}</span>
                            </span>
                            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{ago(n.created_at)}</span>
                            {!n.read_at && <span className="h-2 w-2 rounded-full bg-violet-600 mt-2 shrink-0" />}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
