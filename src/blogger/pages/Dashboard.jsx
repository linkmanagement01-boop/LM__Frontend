import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Globe, RefreshCw, Layers, ArrowRight, Sparkles, ChevronRight, ShoppingBag, Wallet, PlusCircle } from 'lucide-react';
import { bloggerAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext.jsx';
import { mapTaskStatus } from '../components/OrdersTable';

const fmt = (n) => Number(n || 0).toLocaleString();
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null); // { balance, earned, sites }

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksResponse, wallet, stats] = await Promise.all([
        bloggerAPI.getTasks(),
        bloggerAPI.getWallet().catch(() => null),
        bloggerAPI.getStats().catch(() => null)
      ]);
      setTasks(tasksResponse.tasks || []);
      setSummary({
        balance: wallet?.wallet?.current_balance,
        earned: stats?.statistics?.total_earned,
        sites: stats?.statistics?.total_sites
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Tasks by status
  const byStatus = (s) => tasks.filter(t => mapTaskStatus(t.current_status) === s);
  const pendingTasks = byStatus('pending');
  const waitingTasks = byStatus('waiting');
  const rejectedTasks = byStatus('rejected');
  const completedTasks = byStatus('completed');

  // each card opens the Orders page on its tab
  const cards = [
    { icon: Clock, label: 'Pending', hint: 'Orders waiting for your link', value: pendingTasks.length, tone: 'amber', to: '/blogger/orders?status=pending' },
    { icon: Layers, label: 'Waiting approval', hint: 'Links the manager is checking', value: waitingTasks.length, tone: 'sky', to: '/blogger/orders?status=waiting' },
    { icon: XCircle, label: 'Rejected', hint: 'Fix and send again', value: rejectedTasks.length, tone: 'red', to: '/blogger/orders?status=rejected' },
    { icon: CheckCircle, label: 'Completed', hint: 'Orders delivered', value: completedTasks.length, tone: 'emerald', to: '/blogger/orders?status=completed' }
  ];

  const ready = !loading || tasks.length > 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todo = pendingTasks.length + rejectedTasks.length;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-violet-500/20"
        style={{ background: 'linear-gradient(120deg, #4C1D95 0%, #6D28D9 45%, #8B5CF6 80%, #A855F7 100%)' }}>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-40 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-violet-200">{today}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="mt-2 max-w-xl text-sm md:text-base text-violet-100">
              {ready
                ? (todo ? <><b className="text-white">{fmt(todo)}</b> {todo === 1 ? 'order needs' : 'orders need'} your action.</> : 'No orders need your action – all caught up.')
                : 'Loading your orders…'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <HeroLink to="/blogger/orders" icon={ShoppingBag} label="My orders" primary />
              <HeroLink to="/blogger/request-withdrawal" icon={Wallet} label="Withdraw" />
              <HeroLink to="/blogger/sites/single" icon={PlusCircle} label="Add site" />
              <button onClick={fetchDashboardData} disabled={loading}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-white/15 text-white hover:text-white hover:bg-white/25 ring-1 ring-white/25 transition-all disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 2xl:w-[480px] shrink-0">
            <HeroStat label="Balance" value={summary ? money(summary.balance) : '…'} hint="ready to withdraw" />
            <HeroStat label="Total earned" value={summary ? money(summary.earned) : '…'} hint="all time" />
            <HeroStat label="My sites" value={summary ? fmt(summary.sites) : '…'} hint="listed" />
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

      {/* ── Numbers ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} loading={!ready} />)}
      </section>

      {/* ── Queues ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderList title="Pending action" icon={Clock} tone="amber" to="/blogger/orders?status=pending" orders={pendingTasks} loading={!ready} empty="No pending orders. Good job!" />
        <OrderList title="Rejected / issues" icon={XCircle} tone="red" to="/blogger/orders?status=rejected" orders={rejectedTasks} loading={!ready} empty="No rejected orders" />
        <OrderList title="Waiting approval" icon={Layers} tone="sky" to="/blogger/orders?status=waiting" orders={waitingTasks} loading={!ready} empty="No orders waiting for approval" />
        <OrderList title="Recently completed" icon={CheckCircle} tone="emerald" to="/blogger/orders?status=completed" orders={completedTasks.slice(0, 8)} total={completedTasks.length} loading={!ready} empty="No completed orders yet" />
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl ring-1 ring-white/20 backdrop-blur-sm px-4 py-3.5 min-w-0" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide sm:whitespace-nowrap text-violet-200">{label}</div>
      <div className="mt-1 text-xl md:text-2xl font-bold text-white tabular-nums truncate">{value}</div>
      <div className="text-xs text-violet-200 mt-0.5">{hint}</div>
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600'
};

function StatCard({ icon: Icon, label, hint, value, tone, to, loading }) {
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

function OrderList({ title, icon: Icon, tone, to, orders, total, loading, empty }) {
  const count = total ?? orders.length;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{loading ? 'Loading…' : `${fmt(count)} ${count === 1 ? 'order' : 'orders'}`}</p>
          </div>
        </div>
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800 shrink-0">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[320px] custom-scrollbar divide-y divide-slate-100">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="px-6 py-4"><div className="h-9 rounded-lg bg-slate-50 animate-pulse" /></div>)
        ) : orders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-violet-400" />
            <p className="mt-2 text-sm text-slate-500">{empty}</p>
          </div>
        ) : orders.map(task => (
          <Link key={task.id} to={`/blogger/orders/${task.id}`} className="group flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-violet-50/40 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-slate-900">
                <span className="truncate">Order #{task.order_id || task.id}</span>
                {task.order_type && (
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${task.order_type.toLowerCase().includes('niche') ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {task.order_type}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 truncate flex items-center gap-1">
                <Globe className="h-3 w-3 shrink-0" />{task.root_domain || task.website_domain || 'N/A'}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
