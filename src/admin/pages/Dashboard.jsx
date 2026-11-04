import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Users2, User, BarChart3, Globe, Link2, ShoppingCart, Wallet, ArrowRight, Search, X, Eye,
  Clock, CheckCircle2, RotateCcw, Ban, Send, Sparkles
} from 'lucide-react';
import { BarChart } from '../components/BarChart';
import { adminAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VIOLET = '#7C3AED';
const fmt = (n) => (n === null || n === undefined ? '…' : Number(n).toLocaleString());
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
// what the monthly chart can show (one series at a time)
const SERIES = [
  { key: 'live', label: 'Links live', unit: 'links went live' },
  { key: 'joined', label: 'New bloggers', unit: 'bloggers joined' }
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statsData, setStatsData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [withdrawals, setWithdrawals] = useState(null);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [series, setSeries] = useState('live');
  const [search, setSearch] = useState('');

  // Each part loads on its own, so the page fills in as the numbers arrive
  useEffect(() => {
    adminAPI.getStats().then(r => setStatsData(r.statistics)).catch(e => setError(e.message));
    adminAPI.getWithdrawalRequests().then(r => setWithdrawals(r.withdrawals || [])).catch(() => setWithdrawals([]));
  }, []);
  useEffect(() => {
    adminAPI.getDashboardOverview(year).then(setOverview).catch(e => setError(e.message));
  }, [year]);

  const pending = useMemo(() => (withdrawals || []).filter(r => !r.status || r.status === 'pending' || r.status === 'Requested'), [withdrawals]);
  const pendingTotal = pending.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const shownRequests = useMemo(() => {
    if (!search) return pending;
    const q = search.toLowerCase();
    return pending.filter(r => r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q));
  }, [search, pending]);

  const p = overview?.pipeline;
  const monthRows = overview?.months || [];
  const active = SERIES.find(s => s.key === series);
  const yearTotal = monthRows.reduce((s, m) => s + (m[series] || 0), 0);
  const joinedThisYear = overview && overview.year === new Date().getFullYear() ? monthRows.reduce((s, m) => s + m.joined, 0) : null;

  // chart.js redraws when these change – keep them stable between renders
  const chartLabels = MONTHS;
  const chartData = useMemo(() => [{
    label: active.label,
    data: monthRows.map(m => m[series] || 0),
    backgroundColor: VIOLET,
    hoverBackgroundColor: '#6D28D9',
    borderRadius: 4,
    borderSkipped: 'bottom',
    maxBarThickness: 28
  }], [monthRows, series]); // eslint-disable-line react-hooks/exhaustive-deps
  const chartOptions = useMemo(() => ({
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A', padding: 10, cornerRadius: 8, displayColors: false,
        callbacks: { title: (items) => `${items[0].label} ${year}`, label: (c) => `${Number(c.raw).toLocaleString()} ${active.unit}` }
      }
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748B', font: { size: 12 } } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: '#EEF0F5' }, ticks: { color: '#94A3B8', font: { size: 11 }, precision: 0 } }
    }
  }), [year, series]); // eslint-disable-line react-hooks/exhaustive-deps

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-[1400px]">
      {error && (
        <div className="rounded-2xl px-5 py-4 border border-red-200 bg-red-50">
          <p className="text-sm text-red-600">Some numbers couldn't load: {error}</p>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-violet-500/20"
        style={{ background: 'linear-gradient(120deg, #4C1D95 0%, #6D28D9 45%, #8B5CF6 80%, #A855F7 100%)' }}>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-40 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-violet-200">{today}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0] || 'Admin'}</h2>
            <p className="mt-2 max-w-xl text-sm md:text-base text-violet-100">
              {p ? <>
                <b className="text-white">{fmt(p.waiting_approval)}</b> links are waiting for approval and{' '}
                <b className="text-white">{fmt(pending.length)}</b> withdrawal<br className="hidden lg:block" /> requests are open.
              </> : 'Loading today\'s numbers…'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <HeroLink to="/admin/orders" icon={ShoppingCart} label="Orders" primary />
              <HeroLink to="/admin/sites" icon={Globe} label="Sites" />
              <HeroLink to="/admin/wallet/withdrawal-requests" icon={Wallet} label="Withdrawals" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[400px] shrink-0">
            <HeroStat label="Links live this month" value={fmt(p?.live_this_month)} hint={p ? `${fmt(p.live_last_month)} last month` : ''} />
            <HeroStat label="Orders this month" value={fmt(overview?.orders.this_month)} hint={overview ? `${fmt(overview.orders.total)} in total` : ''} />
          </div>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={Users} tone="violet" label="Active bloggers" value={fmt(statsData?.bloggers_count)}
          hint={joinedThisYear !== null ? `+${fmt(joinedThisYear)} joined this year` : ''} to="/admin/bloggers" />
        <Kpi icon={Globe} tone="sky" label="Approved sites" value={fmt(overview?.sites.approved_sites)}
          hint={overview ? `${fmt(overview.sites.pending_sites)} waiting for review` : ''} to="/admin/sites" />
        <Kpi icon={Link2} tone="emerald" label="Links live" value={fmt(p?.live)}
          hint={p ? `${fmt(p.live_last_month)} went live last month` : ''} to="/admin/orders" />
        <Kpi icon={Wallet} tone="amber" label="Pending withdrawals" value={withdrawals ? money(pendingTotal) : '…'}
          hint={withdrawals ? `${fmt(pending.length)} request${pending.length === 1 ? '' : 's'} to review` : ''} to="/admin/wallet/withdrawal-requests" />
      </section>

      {/* ── Monthly chart + pipeline / team ── */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly activity</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                <b className="text-slate-900">{overview ? fmt(yearTotal) : '…'}</b> {active.unit} in {year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                {SERIES.map(s => (
                  <button key={s.key} onClick={() => setSeries(s.key)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${series === s.key ? 'bg-white text-violet-700 hover:text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <select value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Year"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-violet-500">
                {(overview?.years || [year]).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {/* fills the card, so it lines up with the pipeline + team column */}
          <div className="flex-1 min-h-[280px] relative">
            {overview ? <div className="absolute inset-0"><BarChart labels={chartLabels} datasets={chartData} options={chartOptions} height="100%" /></div>
              : <div className="absolute inset-0 rounded-xl bg-slate-50 animate-pulse" />}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Link pipeline</h3>
              <Link to="/admin/orders" className="text-xs font-semibold text-violet-600 hover:text-violet-800">Orders</Link>
            </div>
            <div className="space-y-3">
              <PipeRow icon={Send} label="With bloggers" value={p?.with_blogger} max={p && Math.max(p.with_blogger, p.waiting_approval, p.revision)} cls="bg-sky-500" iconCls="text-sky-600 bg-sky-50" />
              <PipeRow icon={Clock} label="Waiting for approval" value={p?.waiting_approval} max={p && Math.max(p.with_blogger, p.waiting_approval, p.revision)} cls="bg-amber-500" iconCls="text-amber-600 bg-amber-50" />
              <PipeRow icon={RotateCcw} label="Sent back for revision" value={p?.revision} max={p && Math.max(p.with_blogger, p.waiting_approval, p.revision)} cls="bg-orange-500" iconCls="text-orange-600 bg-orange-50" />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <MiniStat icon={CheckCircle2} cls="text-emerald-600" label="Live" value={fmt(p?.live)} />
              <MiniStat icon={Ban} cls="text-red-500" label="Refused" value={fmt(p?.refused)} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Team</h3>
              <Link to="/admin/team-members" className="text-xs font-semibold text-violet-600 hover:text-violet-800">Manage</Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <TeamStat icon={Users2} label="Managers" value={fmt(statsData?.managers_count)} />
              <TeamStat icon={BarChart3} label="Teams" value={fmt(statsData?.team_count)} />
              <TeamStat icon={User} label="Writers" value={fmt(statsData?.writers_count)} />
            </div>
          </Card>
        </div>
      </section>

      {/* ── Withdrawal requests ── */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pending withdrawal requests</h3>
            <p className="text-sm text-slate-500 mt-0.5">{withdrawals ? <>{fmt(pending.length)} waiting · <b className="text-slate-900">{money(pendingTotal)}</b> in total</> : 'Loading…'}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Blogger</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Requested</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!withdrawals ? (
                [1, 2, 3].map(i => <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-9 rounded-lg bg-slate-50 animate-pulse" /></td></tr>)
              ) : shownRequests.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <Sparkles className="h-6 w-6 mx-auto text-violet-400" />
                  <p className="mt-2 text-sm text-slate-500">{search ? 'No request matches your search' : 'No pending withdrawal requests – all caught up'}</p>
                </td></tr>
              ) : shownRequests.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center">{(r.user_name || '?').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{r.user_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500 truncate">{r.user_email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5"><MethodChip r={r} /></td>
                  <td className="px-6 py-3.5 text-right text-sm font-bold text-emerald-600 tabular-nums">{money(r.amount)}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-600 whitespace-nowrap">{r.datetime ? new Date(r.datetime).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => navigate(`/admin/wallet/withdrawal-requests/${r.id}`)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 hover:text-violet-800 hover:bg-violet-100 transition-colors">
                      <Eye className="h-3.5 w-3.5" />Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shownRequests.length > 10 && (
          <div className="px-6 py-3.5 border-t border-slate-100 text-center">
            <Link to="/admin/wallet/withdrawal-requests" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800">
              View all {fmt(shownRequests.length)} requests <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────

function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-sm ${className}`}>{children}</div>;
}

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
    <div className="rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm px-4 py-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
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
  amber: 'bg-amber-50 text-amber-600'
};

function Kpi({ icon: Icon, tone, label, value, hint, to }) {
  return (
    <Link to={to} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200">
      <div className="flex items-start justify-between">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="h-5 w-5" /></span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-violet-500 group-hover:translate-x-0.5" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-slate-500 min-h-[16px]">{hint}</div>
    </Link>
  );
}

function PipeRow({ icon: Icon, label, value, max, cls, iconCls }) {
  const pct = value && max ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${iconCls}`}><Icon className="h-4 w-4" /></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 truncate">{label}</span>
          <span className="font-bold text-slate-900 tabular-nums">{fmt(value)}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${cls} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, cls, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${cls}`} />
      <span className="text-sm text-slate-500">{label}</span>
      <span className="ml-auto text-sm font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

function TeamStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-violet-500" />
      <div className="mt-1.5 text-lg font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

function MethodChip({ r }) {
  const m = r.payment_method === 'bank' || r.beneficiary_account_number ? ['Bank transfer', 'bg-slate-100 text-slate-700']
    : r.payment_method === 'upi' || r.upi_id ? ['UPI', 'bg-fuchsia-50 text-fuchsia-700']
      : r.payment_method === 'qr' || r.qr_code_image ? ['QR code', 'bg-emerald-50 text-emerald-700']
        : r.payment_method === 'paypal' || r.paypal_email ? ['PayPal', 'bg-sky-50 text-sky-700']
          : null;
  return m ? <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${m[1]}`}>{m[0]}</span> : <span className="text-slate-400">–</span>;
}
