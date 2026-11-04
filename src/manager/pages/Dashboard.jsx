import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Users, AlertTriangle, MessageSquare, RefreshCw, Zap, FileText, ArrowRight, PlusCircle, Package, Globe, Sparkles, Eye } from 'lucide-react';
import { managerAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString();

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getDashboard();
      setDashboardData(response);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const s = dashboardData?.stats || {};
  // what waits for the manager – each card opens its list
  const queues = [
    { icon: Users, label: 'Bloggers to approve', hint: 'Submitted links waiting for your check', value: s.pending_bloggers, tone: 'violet', to: '/manager/pending/bloggers' },
    { icon: Zap, label: 'Teams to approve', hint: 'Site selections from the team', value: s.pending_teams, tone: 'sky', to: '/manager/pending/teams' },
    { icon: FileText, label: 'Writers to approve', hint: 'Articles waiting for review', value: s.pending_writers, tone: 'emerald', to: '/manager/pending/writers' },
    { icon: AlertTriangle, label: 'Rejected orders', hint: 'Sent back or refused by bloggers', value: s.rejected_orders, tone: 'red', to: '/manager/rejected/bloggers' },
    { icon: MessageSquare, label: 'Threads', hint: 'Conversations with the team', value: s.threads, tone: 'amber', to: '/manager/threads' }
  ];
  const waiting = (s.pending_bloggers || 0) + (s.pending_teams || 0) + (s.pending_writers || 0);

  // Pending blogger approvals for the table
  const pendingApprovals = dashboardData?.pending_blogger_approvals || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div className="space-y-6 max-w-[1400px]">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-violet-500/20"
          style={{ background: 'linear-gradient(120deg, #4C1D95 0%, #6D28D9 45%, #8B5CF6 80%, #A855F7 100%)' }}>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-40 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-200">{today}</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0] || 'Manager'}</h1>
              <p className="mt-2 max-w-xl text-sm md:text-base text-violet-100">
                {dashboardData
                  ? (waiting ? <><b className="text-white">{fmt(waiting)}</b> approvals are waiting for you today.</> : 'Nothing is waiting for your approval – all caught up.')
                  : 'Loading today\'s numbers…'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <HeroLink to="/manager/orders/create" icon={PlusCircle} label="Create order" primary />
                <HeroLink to="/manager/orders" icon={Package} label="Orders" />
                <HeroLink to="/manager/sites" icon={Globe} label="Sites" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-[400px] shrink-0">
              <HeroStat label="Waiting for approval" value={dashboardData ? fmt(waiting) : '…'} hint="bloggers · teams · writers" />
              <HeroStat label="Rejected orders" value={dashboardData ? fmt(s.rejected_orders) : '…'} hint="to follow up" />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl px-5 py-4 border border-red-200 bg-red-50 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-red-600">Error loading dashboard: {error}</p>
            <button onClick={fetchDashboardData} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-red-600 text-sm font-semibold text-white hover:text-white hover:bg-red-700">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {/* ── What's waiting ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {queues.map(q => <Queue key={q.label} {...q} loading={loading && !dashboardData} />)}
        </section>

        {/* ── Today's pending blogger approvals ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today's pending approvals for bloggers</h2>
              <p className="text-sm text-slate-500 mt-0.5">{dashboardData ? `${fmt(pendingApprovals.length)} waiting` : 'Loading…'}</p>
            </div>
            <Link to="/manager/pending/bloggers" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800">
              All blogger approvals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">New site</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !dashboardData ? (
                  [1, 2, 3].map(i => <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-9 rounded-lg bg-slate-50 animate-pulse" /></td></tr>)
                ) : pendingApprovals.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center">
                    <Sparkles className="h-6 w-6 mx-auto text-violet-400" />
                    <p className="mt-2 text-sm text-slate-500">No blogger approvals pending at the moment</p>
                  </td></tr>
                ) : pendingApprovals.map((approval) => (
                  <tr key={approval.detail_id} className="hover:bg-violet-50/40 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">{approval.order_id || '-'}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center">{(approval.vendor_name || '?').charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{approval.vendor_name || '-'}</div>
                          <div className="text-xs text-slate-500 truncate">{approval.vendor_email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-700">{approval.new_site || '-'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${approval.status === 'Accepted'
                        ? 'bg-emerald-50 text-emerald-700'
                        : approval.status === 'Rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => navigate(`/manager/orders/${approval.detail_id}`)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 hover:text-violet-800 hover:bg-violet-100 transition-colors">
                          <Eye className="h-3.5 w-3.5" />Detail
                        </button>
                        <button className="inline-flex items-center h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                          Reject post
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Pieces ─────────────────────────────────────────────────────────

function HeroLink({ to, icon: Icon, label, primary }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${primary
      ? 'bg-white text-violet-700 hover:text-violet-800 shadow-md shadow-violet-900/20'
      : 'bg-white/15 text-white hover:text-white hover:bg-white/25 ring-1 ring-white/25'}`}>
      <Icon className="h-4 w-4" />{label}
    </Link>
  );
}

function HeroStat({ label, value, hint }) {
  return (
    <div className="rounded-2xl ring-1 ring-white/20 backdrop-blur-sm px-4 py-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide sm:whitespace-nowrap text-violet-200">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-violet-200 mt-0.5">{hint}</div>
    </div>
  );
}

const TONES = {
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600'
};

function Queue({ icon: Icon, label, hint, value, tone, to, loading }) {
  return (
    <Link to={to} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200">
      <div className="flex items-start justify-between">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="h-5 w-5" /></span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-violet-500 group-hover:translate-x-0.5" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{loading ? '…' : fmt(value)}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </Link>
  );
}
