import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle, Bell, XCircle, MessageSquare, ArrowRight, Database, Sparkles, ChevronRight } from 'lucide-react';
import { teamAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString();

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [ordersAddedToday, setOrdersAddedToday] = useState([]);
  const [rejectedOrders, setRejectedOrders] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await teamAPI.getDashboard();
      // Map backend stats to frontend format
      setStats({
        completed_orders: data.stats?.completed_tasks || 0,
        order_added_notifications: data.stats?.pending_tasks || 0,
        rejected_notifications: data.stats?.rejected_tasks || 0,
        threads: data.stats?.total_tasks || 0
      });
      setOrdersAddedToday(data.orders_added_today || []);
      setRejectedOrders(data.rejected_orders || []);
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

  const s = stats || {};
  // each card opens its list
  const cards = [
    { icon: Bell, label: 'New orders', hint: 'Waiting for you to pick sites', value: s.order_added_notifications, tone: 'violet', to: '/teams/order-notifications' },
    { icon: CheckCircle, label: 'Completed orders', hint: 'Orders you have processed', value: s.completed_orders, tone: 'emerald', to: '/teams/completed-orders' },
    { icon: XCircle, label: 'Rejected links', hint: 'Sent back – pick a new site', value: s.rejected_notifications, tone: 'red', to: '/teams/rejected-links' },
    { icon: MessageSquare, label: 'Threads', hint: 'Conversations with managers', value: s.threads, tone: 'sky', to: '/teams/threads' }
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todo = (s.order_added_notifications || 0) + (s.rejected_notifications || 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-violet-500/20"
        style={{ background: 'linear-gradient(120deg, #4C1D95 0%, #6D28D9 45%, #8B5CF6 80%, #A855F7 100%)' }}>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-40 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-violet-200">{today}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0] || 'Team'}</h1>
            <p className="mt-2 max-w-xl text-sm md:text-base text-violet-100">
              {stats
                ? (todo ? <><b className="text-white">{fmt(todo)}</b> orders need sites from you.</> : 'No orders waiting for sites – all caught up.')
                : 'Loading today\'s numbers…'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <HeroLink to="/teams/order-notifications" icon={Bell} label="New orders" primary />
              <HeroLink to="/teams/new-sites" icon={Database} label="Sites" />
              <button onClick={fetchDashboardData} disabled={loading}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-white/15 text-white hover:text-white hover:bg-white/25 ring-1 ring-white/25 transition-all disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[400px] shrink-0">
            <HeroStat label="Added today" value={stats ? fmt(ordersAddedToday.length) : '…'} hint="new orders" />
            <HeroStat label="Rejected links" value={stats ? fmt(s.rejected_notifications) : '…'} hint="to replace" />
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
        {cards.map(c => <StatCard key={c.label} {...c} loading={loading && !stats} />)}
      </section>

      {/* ── Lists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderList
          title="Today's new orders" icon={Bell} tone="violet" to="/teams/order-notifications" linkLabel="All new orders"
          orders={ordersAddedToday} loading={loading && !stats} empty="No new orders added today"
        />
        <OrderList
          title="Rejected links" icon={XCircle} tone="red" to="/teams/rejected-links" linkLabel="All rejected links"
          orders={rejectedOrders} loading={loading && !stats} empty="No rejected links pending" rejected
        />
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

function OrderList({ title, icon: Icon, tone, to, linkLabel, orders, loading, empty, rejected }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{loading ? 'Loading…' : `${fmt(orders.length)} ${orders.length === 1 ? 'order' : 'orders'}`}</p>
          </div>
        </div>
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800 shrink-0">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar divide-y divide-slate-100">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="px-6 py-4"><div className="h-9 rounded-lg bg-slate-50 animate-pulse" /></div>)
        ) : orders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-violet-400" />
            <p className="mt-2 text-sm text-slate-500">{empty}</p>
          </div>
        ) : orders.map(order => (
          <Link key={order.id} to={to} className="group flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-violet-50/40 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-slate-900">
                <span className="truncate">{order.manual_order_id || `Order #${order.id}`}</span>
                {rejected && <span className="shrink-0 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold uppercase">Rejected</span>}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 truncate">
                {order.client_name || '-'}{order.order_type ? ` · ${order.order_type}` : ''}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
