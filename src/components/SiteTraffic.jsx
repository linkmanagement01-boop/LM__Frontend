import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Activity, Loader2, Check, AlertCircle, X, Download, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Globe2, ListChecks, StopCircle, CheckCircle2, Ban, Lightbulb } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../lib/api';
import {
  isHelperInstalled, helperSupportsBatch, startTrafficCheck, startTrafficBatch, stopTrafficBatch, requestTrafficStatus,
  onTrafficResult, onTrafficProgress, ahrefsUrl, HELPER_DOWNLOAD_URL, BATCH_MAX,
} from '../lib/trafficHelper';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// The panel's brand colour (orange, violet in the admin panel) – read from the canvas, so charts follow the theme
const brand = (el, a = 1) => `rgb(${(el && getComputedStyle(el).getPropertyValue('--brand-rgb').trim()) || '249 115 22'} / ${a})`;

const compact = (n) => (n === null || n === undefined ? '-' : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n));

const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const countryName = (c) => {
  if (/^[a-z]{2}$/i.test(c) && regionNames) { try { return regionNames.of(c.toUpperCase()); } catch { /* not a region code */ } }
  return c;
};

// Flag emoji don't show on Windows, so use small flag images
function Flag({ code }) {
  const [failed, setFailed] = useState(false);
  if (!/^[a-z]{2}$/i.test(code) || failed) return <Globe2 className="h-3.5 w-4" style={{ color: 'var(--text-muted)' }} />;
  return <img src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`} width="20" height="15" alt="" className="rounded-[2px] shadow-sm shrink-0" onError={() => setFailed(true)} />;
}

const monthLabel = (ym, long = false) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' });
};

const checkedLabel = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Traffic data from a list row (ahrefs_* columns) or from GET /sites/:id/traffic */
const fromRow = (site) => (site.ahrefs_checked_at ? {
  organic_traffic: site.ahrefs_traffic,
  traffic_value: site.ahrefs_value,
  history: site.ahrefs_history || [],
  top_countries: site.ahrefs_countries || [],
  checked_at: site.ahrefs_checked_at,
} : null);

/** List row fields for a saved check (for onSaved handlers) */
export const trafficRowFields = (t) => ({
  ahrefs_traffic: t.organic_traffic,
  ahrefs_value: t.traffic_value,
  ahrefs_history: t.history,
  ahrefs_countries: t.top_countries,
  ahrefs_checked_at: t.checked_at,
  growth_pct: t.growth_pct,
  // the site's Traffic column follows the Ahrefs number (backend updates it; site_traffic = what the list shows)
  ...(t.site_traffic !== undefined ? { traffic: t.site_traffic } : {}),
  // Status rules (backend) – a new rule result replaces the old one; no result keeps an open one
  ...(t.site_status ? { site_status: t.site_status } : {}),
  ...(t.rule_action ? { ahrefs_rule: t.rule_action, ahrefs_rule_resolved: null } : {}),
});

/** Sidebar badge / Suggestions page refresh after a check or a decision */
export const SUGGESTIONS_CHANGED = 'lm:traffic-suggestions-changed';
export const notifySuggestionsChanged = () => window.dispatchEvent(new Event(SUGGESTIONS_CHANGED));

/**
 * "Check traffic" button – opens the free Ahrefs Traffic Checker through the LM Traffic Helper extension.
 * onSaved(traffic) is called when the result was saved.
 */
export function TrafficCheckButton({ site, role, onSaved, size = 'sm', label }) {
  const [state, setState] = useState('idle'); // idle | waiting | saved | error
  const [message, setMessage] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => onTrafficResult((r) => {
    if (String(r.site_id) !== String(site.id)) return;
    if (r.ok) {
      setState('saved');
      setMessage(r.message || 'Traffic saved');
      onSavedRef.current?.(r.traffic);
      if (r.traffic?.rule_action) notifySuggestionsChanged();
      setTimeout(() => setState('idle'), 4000);
    } else {
      setState(r.cancelled ? 'idle' : 'error');
      setMessage(r.message || 'Traffic was not saved');
    }
  }), [site.id]);

  const click = (e) => {
    e.stopPropagation();
    if (!isHelperInstalled()) return setShowInstall(true);
    setState('waiting');
    setMessage('Waiting for Ahrefs… finish the check in the new tab');
    startTrafficCheck(site, role);
  };

  const pad = size === 'xs' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
  const Icon = state === 'waiting' ? Loader2 : state === 'saved' ? Check : state === 'error' ? AlertCircle : Activity;
  const tone = state === 'saved' ? 'text-green-500 border-green-500/30 bg-green-500/10'
    : state === 'error' ? 'text-red-500 border-red-500/30 bg-red-500/10'
    : 'text-[var(--primary-cyan)] border-[var(--primary-cyan)]/30 bg-[var(--primary-cyan)]/10 hover:bg-[var(--primary-cyan)]/20';

  return (
    <>
      <button
        onClick={click}
        title={message || 'Check organic traffic on Ahrefs (free)'}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-bold whitespace-nowrap transition-colors ${pad} ${tone}`}
      >
        <Icon className={`h-3.5 w-3.5 ${state === 'waiting' ? 'animate-spin' : ''}`} />
        {state === 'waiting' ? 'Checking…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Retry' : (label || 'Check traffic')}
      </button>
      {showInstall && <InstallHelperModal domain={site.root_domain} onClose={() => setShowInstall(false)} />}
    </>
  );
}

function InstallHelperModal({ domain, onClose, update = false }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="w-full max-w-md rounded-xl p-6 shadow-2xl text-left" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{update ? 'Update the Traffic Helper' : 'Install the Traffic Helper'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--background-light)]"><X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {update
            ? 'Bulk checks need the new version of the LM Traffic Helper. Download it, unzip it over your old helper folder, then click the reload icon on the helper in chrome://extensions and reload this page.'
            : 'To save Ahrefs traffic to the site automatically, install the free LM Traffic Helper in Chrome (one time):'}
        </p>
        {!update && <ol className="text-sm space-y-1.5 list-decimal pl-5 mb-5" style={{ color: 'var(--text-primary)' }}>
          <li>Download the helper and unzip it into a folder you keep.</li>
          <li>Open <b>chrome://extensions</b> and turn on <b>Developer mode</b>.</li>
          <li>Click <b>Load unpacked</b> and choose the unzipped folder.</li>
          <li>Reload this page.</li>
        </ol>}
        <div className="flex flex-wrap gap-3">
          <a href={HELPER_DOWNLOAD_URL} download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-cyan)] text-black text-sm font-bold hover:opacity-90">
            <Download className="h-4 w-4" /> Download helper
          </a>
          {domain && <a href={ahrefsUrl(domain)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--background-light)]" style={{ color: 'var(--text-secondary)' }}>
            <ExternalLink className="h-4 w-4" /> Open Ahrefs only (not saved)
          </a>}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Bulk check ───────────────────────────────────────────────────────

const QUICK_COUNT = 10;
const AUTO_PAUSE_MS = 15000; // Auto: human-paced pause between two batches of 10

/**
 * "Check traffic (N selected)", "Check 10 unchecked" and "Re-check 10" for View All Sites, and the progress box.
 * Unchecked / re-check take sites from the whole list (backend queue), not just this page:
 * unchecked = newest added first, re-check = oldest check first (checked more than 7 days ago).
 * status = the list's status filter (admin); managers always get approved sites.
 * The helper checks the sites one after another in one Ahrefs tab; each row updates as its site is saved.
 * Auto (switch beside "Check 10 unchecked"): when a batch finishes, the next 10 unchecked start by themselves after a
 * short pause – until every site is checked, the switch is turned off, or a batch is stopped (Stop / Ahrefs limit / login).
 */
export function TrafficBatchBar({ sites, selectedIds, role, status = 'Approved' }) {
  const [modal, setModal] = useState(null); // install | update
  const [progress, setProgress] = useState(null);
  const [queue, setQueue] = useState(null); // { unchecked, recheck_due, recheck_min_days }
  const [loadingType, setLoadingType] = useState(null);
  const [note, setNote] = useState('');
  const [auto, setAuto] = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false); // pause before the next automatic batch
  const autoRef = useRef(false);
  const autoTimer = useRef(null);
  const runQueueRef = useRef(null);
  const setAutoOn = (on) => {
    autoRef.current = on;
    setAuto(on);
    if (!on) { clearTimeout(autoTimer.current); setAutoWaiting(false); }
  };
  useEffect(() => () => clearTimeout(autoTimer.current), []);

  const loadCounts = useCallback(() => {
    api.get(`/${role}/sites/traffic-queue`, { params: { status } }).then(({ data }) => setQueue(data)).catch(() => {});
  }, [role, status]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  useEffect(() => {
    const off = onTrafficProgress((p) => {
      if (p.status === 'idle') return;
      if (p.status === 'error' && autoRef.current) setAutoOn(false); // the helper could not start a batch
      if (p.status === 'error') return setProgress({ status: 'stopped', total: 0, done: 0, saved: 0, skipped: 0, message: p.message });
      if (p.total > 1) setProgress(p); // single checks show on their own button
      if (p.status === 'finished' || p.status === 'stopped') loadCounts();
      // Auto: a finished batch → the next 10 after a short pause; a stopped one (Stop, Ahrefs limit, login) ends Auto
      if (autoRef.current && p.status === 'stopped') { setAutoOn(false); setNote('Auto stopped'); }
      if (autoRef.current && p.status === 'finished') {
        clearTimeout(autoTimer.current);
        setAutoWaiting(true);
        autoTimer.current = setTimeout(() => {
          setAutoWaiting(false);
          if (autoRef.current) runQueueRef.current?.('unchecked');
        }, AUTO_PAUSE_MS);
      }
    });
    if (isHelperInstalled()) requestTrafficStatus(); // a batch may still be running after a page reload
    return off;
  }, [loadCounts]);

  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(''), 6000); return () => clearTimeout(t); }, [note]);

  const selected = sites.filter(s => selectedIds.has(s.id));
  const running = progress?.status === 'running';

  const run = (list) => {
    if (!isHelperInstalled()) return setModal('install');
    if (!helperSupportsBatch()) return setModal('update');
    if (!list.length) return;
    setProgress({ status: 'running', total: Math.min(list.length, BATCH_MAX), done: 0, saved: 0, skipped: 0, current: list[0].root_domain });
    startTrafficBatch(list, role);
  };

  /** Next 10 from the whole list */
  const runQueue = async (type) => {
    if (!isHelperInstalled()) return setModal('install');
    if (!helperSupportsBatch()) return setModal('update');
    try {
      setLoadingType(type);
      const { data } = await api.get(`/${role}/sites/traffic-queue`, { params: { type, status, limit: QUICK_COUNT } });
      setQueue(data);
      if (!data.sites.length) {
        if (type === 'unchecked' && autoRef.current) setAutoOn(false);
        return setNote(type === 'unchecked' ? 'All sites are checked' : `All sites were checked in the last ${data.recheck_min_days} days`);
      }
      run(data.sites);
    } catch {
      if (autoRef.current) setAutoOn(false);
      setNote('Could not load the next sites – try again');
    } finally {
      setLoadingType(null);
    }
  };
  runQueueRef.current = runQueue;

  const toggleAuto = () => {
    if (auto) return setAutoOn(false); // the batch already running finishes; no new one starts
    if (!isHelperInstalled()) return setModal('install');
    if (!helperSupportsBatch()) return setModal('update');
    setAutoOn(true);
    if (!running && !loadingType) runQueue('unchecked');
  };

  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <>
      <div className="flex items-center gap-2">
        {selected.length > 0 && (
          <button disabled={running} onClick={() => run(selected)} className={`${btn} border-brand/30 bg-brand/10 text-brand hover:bg-brand/20`}
            title={selected.length > BATCH_MAX ? `Only the first ${BATCH_MAX} are checked per batch` : 'Check Ahrefs traffic of the selected sites, one after another'}>
            <ListChecks className="h-3.5 w-3.5" />
            Check traffic ({selected.length > BATCH_MAX ? `first ${BATCH_MAX} of ${selected.length}` : `${selected.length} selected`})
          </button>
        )}
        {/* sites selected → the selection is what gets checked, so the quick buttons step aside (keeps the bar on one row) */}
        {selected.length === 0 && (<>
          <button disabled={running || !!loadingType || queue?.unchecked === 0} onClick={() => runQueue('unchecked')}
            className={`${btn} border-[var(--border)] hover:border-brand hover:text-brand`}
            style={{ color: 'var(--text-secondary)' }} title="Check the next never-checked sites from the whole list, newest added first">
            {loadingType === 'unchecked' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            {queue?.unchecked === 0 ? 'All sites checked' : `Check ${QUICK_COUNT} unchecked${queue ? ` (${queue.unchecked.toLocaleString()} left)` : ''}`}
          </button>
          {/* Auto: keeps clicking "Check 10 unchecked" for you, batch after batch */}
          <button type="button" role="switch" aria-checked={auto} onClick={toggleAuto} disabled={!auto && queue?.unchecked === 0}
            className={`${btn} ${auto ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] hover:border-brand hover:text-brand'}`}
            style={auto ? undefined : { color: 'var(--text-secondary)' }}
            title={auto ? 'Auto is on – the next 10 unchecked start by themselves after each batch. Click to turn it off.' : 'Turn on to check all unchecked sites automatically, 10 at a time'}>
            <span className={`relative inline-block w-7 h-4 rounded-full transition-colors ${auto ? 'bg-brand' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${auto ? 'translate-x-3' : ''}`} />
            </span>
            Auto{auto && autoWaiting ? ' · next 10 soon…' : ''}
          </button>
          <button disabled={running || !!loadingType} onClick={() => runQueue('recheck')}
            className={`${btn} border-[var(--border)] hover:border-brand hover:text-brand`}
            style={{ color: 'var(--text-secondary)' }}
            title={`Re-check the sites whose last check is oldest (checked more than ${queue?.recheck_min_days || 7} days ago) – repeated clicks go through the whole list`}>
            {loadingType === 'recheck' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-check {QUICK_COUNT}{queue ? ` (${queue.recheck_due.toLocaleString()} due)` : ''}
          </button>
        </>)}
        {note && <span className="text-xs font-medium text-brand">{note}</span>}
      </div>

      {progress && createPortal(<BatchProgress progress={progress} onClose={() => setProgress(null)} />, document.body)}
      {modal && <InstallHelperModal update={modal === 'update'} onClose={() => setModal(null)} />}
    </>
  );
}

function BatchProgress({ progress: p, onClose }) {
  const running = p.status === 'running';
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <div className="fixed bottom-5 right-5 w-80 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ zIndex: 9998, backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {running ? <Loader2 className="h-4 w-4 animate-spin text-brand" />
            : p.status === 'finished' ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <AlertCircle className="h-4 w-4 text-red-500" />}
          {running ? 'Checking traffic…' : p.status === 'finished' ? 'Bulk check finished' : 'Bulk check stopped'}
        </div>
        {!running && <button onClick={onClose} className="p-1 rounded hover:bg-[var(--background-light)]"><X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {p.total > 0 && (
        <>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span><b style={{ color: 'var(--text-primary)' }}>{p.done}</b> of {p.total} done</span>
            <span><span className="text-green-500 font-bold">{p.saved} saved</span>{p.skipped > 0 && <span className="text-red-500 font-bold"> · {p.skipped} skipped</span>}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgb(var(--brand-rgb) / 0.7), rgb(var(--brand-rgb)))' }} />
          </div>
        </>
      )}

      {running && p.current && (
        <div className="text-xs truncate mb-1" style={{ color: 'var(--text-secondary)' }}>Now: <b style={{ color: 'var(--text-primary)' }}>{p.current}</b></div>
      )}
      {running && (
        <div className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Keep the Ahrefs tab open. If it asks you to verify you are human, complete it.</div>
      )}
      {!running && p.message && <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{p.message}</div>}

      {running && (
        <button onClick={stopTrafficBatch} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20">
          <StopCircle className="h-3.5 w-3.5" /> Stop
        </button>
      )}
    </div>
  );
}

// ─── Graph + countries ────────────────────────────────────────────────

/** Ahrefs-style area graph of monthly organic traffic */
export function TrafficChart({ history, height = 220 }) {
  const data = {
    labels: history.map(h => monthLabel(h.date)),
    datasets: [{
      data: history.map(h => h.traffic),
      borderColor: (c) => brand(c.chart.canvas),
      borderWidth: 2.5,
      cubicInterpolationMode: 'monotone', // smooth without dipping below/above the real points
      fill: true,
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        if (!chart.chartArea) return brand(chart.canvas, 0.15);
        const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
        g.addColorStop(0, brand(chart.canvas, 0.35));
        g.addColorStop(1, brand(chart.canvas, 0.02));
        return g;
      },
      pointRadius: history.length > 14 ? 0 : 3,
      pointBackgroundColor: '#fff',
      pointBorderColor: (c) => brand(c.chart.canvas),
      pointBorderWidth: 2,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: (c) => brand(c.chart.canvas),
      pointHoverBorderColor: '#fff',
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#111827',
        bodyColor: '#374151',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        titleFont: { weight: 'bold', size: 13 },
        bodyFont: { size: 13 },
        callbacks: {
          title: (items) => monthLabel(history[items[0].dataIndex].date, true),
          label: (c) => `${c.parsed.y.toLocaleString()} visits`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 12 } },
      y: {
        position: 'right',
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(148,163,184,0.18)' },
        ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 5, callback: (v) => compact(v) },
      },
    },
  };
  return <div style={{ height }}><Line data={data} options={options} /></div>;
}

/** Top countries with share bars */
export function CountryList({ countries }) {
  return (
    <div className="space-y-2.5">
      {countries.map((c) => (
        <div key={c.country} className="flex items-center gap-3 text-sm">
          <Flag code={c.country} />
          <span className="w-36 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{countryName(c.country)}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden min-w-[60px]" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.share || 0)}%`, background: 'linear-gradient(90deg, rgb(var(--brand-rgb) / 0.7), rgb(var(--brand-rgb)))' }} />
          </div>
          <span className="w-14 text-right text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            {c.share !== null && c.share !== undefined ? `${Number(c.share).toFixed(1)}%` : '-'}
          </span>
          <span className="w-14 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
            {c.traffic !== null && c.traffic !== undefined ? compact(c.traffic) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Opens on hover (desktop) or click; a click pins it open until clicking outside.
 * Rendered in a portal with fixed position so table scroll areas don't cut it off.
 */
export function HoverPopover({ trigger, children, width = 520 }) {
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(width, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const h = popRef.current?.offsetHeight || 320;
    const below = r.bottom + 8 + h < window.innerHeight;
    setPos({ left, width: w, top: below ? r.bottom + 8 : Math.max(12, r.top - 8 - h) });
  }, [width]);

  const show = () => { clearTimeout(closeTimer.current); place(); setOpen(true); };
  const hide = () => { if (pinned) return; closeTimer.current = setTimeout(() => setOpen(false), 150); };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(place); // re-place once the real height is known
    const onDown = (e) => {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) { setOpen(false); setPinned(false); }
    };
    const onScroll = () => { if (!pinned) setOpen(false); else place(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, pinned, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={(e) => { e.stopPropagation(); if (pinned) { setPinned(false); setOpen(false); } else { show(); setPinned(true); } }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${open ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] hover:border-brand hover:text-brand'}`}
        style={open ? undefined : { color: 'var(--text-secondary)' }}
      >
        {trigger}
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          onMouseEnter={() => clearTimeout(closeTimer.current)}
          onMouseLeave={hide}
          onClick={(e) => e.stopPropagation()}
          className="fixed rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150"
          style={{ zIndex: 10000, top: pos.top, left: pos.left, width: pos.width, backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

function PopoverHeader({ domain, traffic, title }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</div>
        <div className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{domain}</div>
      </div>
      <div className="flex gap-5 shrink-0 text-right">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Organic traffic</div>
          <div className="text-xl font-extrabold text-brand">{compact(traffic.organic_traffic)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Traffic value</div>
          <div className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>${compact(traffic.traffic_value || 0)}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Second line of a site row: Ahrefs traffic · graph (hover/click) · top countries (hover/click) · Check traffic.
 * site needs the ahrefs_* list fields; onSaved(traffic) after a new check.
 */
/** +86% / −20% over the last 3 months vs the 3 before */
export function GrowthPill({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${up ? 'text-green-600 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}
      title="Last 3 months vs the 3 months before">
      <Icon className="h-3 w-3" /> {up ? '+' : ''}{Math.round(pct)}%
    </span>
  );
}

/** What the status rules did to this site (open items only, site still rejected) */
function RuleBadge({ site, role }) {
  if (!site.ahrefs_rule || site.ahrefs_rule_resolved || site.site_status !== '2') return null;
  if (site.ahrefs_rule === 'auto_rejected') {
    return (
      <Link to={`/${role}/sites/suggestions?tab=auto_rejected`} title="Rejected automatically because Ahrefs traffic was 200 or less – review on the Suggestions page"
        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20">
        <Ban className="h-3 w-3" /> Auto-rejected · low traffic
      </Link>
    );
  }
  return (
    <Link to={`/${role}/sites/suggestions`} title="Rejected, but traffic is 500+ and growing – decide on the Suggestions page"
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md text-green-600 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20">
      <Lightbulb className="h-3 w-3" /> Growing · in Suggestions
    </Link>
  );
}

/** Tiny traffic line (no axes) */
export function Sparkline({ history, width = 120, height = 34 }) {
  if (!history || history.length < 2) return null;
  const data = {
    labels: history.map(h => monthLabel(h.date)),
    datasets: [{ data: history.map(h => h.traffic), borderColor: (c) => brand(c.chart.canvas), borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: (c) => brand(c.chart.canvas, 0.12), cubicInterpolationMode: 'monotone' }],
  };
  const options = {
    responsive: false, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
  };
  return <Line data={data} options={options} width={width} height={height} />;
}

export function AhrefsStrip({ site, role, onSaved }) {
  const t = fromRow(site);
  const history = t?.history || [];
  const countries = t?.top_countries || [];
  const top = countries[0];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" onClick={(e) => e.stopPropagation()}>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md bg-brand/10 text-brand border border-brand/20">
        <Activity className="h-3 w-3" /> Ahrefs
      </span>

      {!t ? (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Organic traffic not checked yet</span>
      ) : (
        <>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Organic traffic <b className="text-sm text-brand ml-1">{t.organic_traffic !== null ? Number(t.organic_traffic).toLocaleString() : '-'}</b>
            <span className="ml-1">/ mo</span>
          </span>
          <GrowthPill pct={site.growth_pct} />
          <RuleBadge site={site} role={role} />

          {history.length > 1 ? (
            <HoverPopover trigger={<><TrendingUp className="h-3.5 w-3.5" /> Traffic graph</>}>
              <PopoverHeader domain={site.root_domain} traffic={t} title="Organic traffic graph" />
              <TrafficChart history={history} height={240} />
              <div className="text-[11px] mt-3 text-right" style={{ color: 'var(--text-muted)' }}>Ahrefs · checked {checkedLabel(t.checked_at)}</div>
            </HoverPopover>
          ) : null}

          {countries.length > 0 && (
            <HoverPopover width={440} trigger={<><Flag code={top.country} /> Top countries{countries.length > 1 ? ` (${countries.length})` : ''}</>}>
              <PopoverHeader domain={site.root_domain} traffic={t} title="Top countries" />
              <CountryList countries={countries} />
              <div className="text-[11px] mt-4 text-right" style={{ color: 'var(--text-muted)' }}>Share of organic traffic · Ahrefs · checked {checkedLabel(t.checked_at)}</div>
            </HoverPopover>
          )}

          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Checked {checkedLabel(t.checked_at)}</span>
        </>
      )}

      <span>
        <TrafficCheckButton site={site} role={role} size="xs" onSaved={onSaved} label={t ? 'Re-check' : 'Check traffic'} />
      </span>
    </div>
  );
}

/** Ahrefs numbers as label/value rows – the "Volume" column of the admin site card (Re-check sits in the card header) */
export function AhrefsVolume({ site, role, Row }) {
  const t = fromRow(site);
  const history = t?.history || [];
  const countries = t?.top_countries || [];
  const top = countries[0];

  return (
    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
      <Row label="Ahrefs traffic" value={t && t.organic_traffic !== null ? (
        countries.length > 0 ? (
          <HoverPopover width={440} trigger={<>{Number(t.organic_traffic).toLocaleString()} <Flag code={top.country} /></>}>
            <PopoverHeader domain={site.root_domain} traffic={t} title="Top countries" />
            <CountryList countries={countries} />
            <div className="text-[11px] mt-4 text-right" style={{ color: 'var(--text-muted)' }}>Share of organic traffic · Ahrefs · checked {checkedLabel(t.checked_at)}</div>
          </HoverPopover>
        ) : Number(t.organic_traffic).toLocaleString()
      ) : <span style={{ color: 'var(--text-muted)' }}>Not checked</span>} />
      {t && (
        <Row label={<span title="Last 3 months vs the 3 months before">Growth</span>} value={
          <span className="inline-flex items-center gap-1.5">
            {history.length > 1 && (
              <HoverPopover trigger={<><TrendingUp className="h-3.5 w-3.5" /> Graph</>}>
                <PopoverHeader domain={site.root_domain} traffic={t} title="Organic traffic graph" />
                <TrafficChart history={history} height={240} />
                <div className="text-[11px] mt-3 text-right" style={{ color: 'var(--text-muted)' }}>Ahrefs · checked {checkedLabel(t.checked_at)}</div>
              </HoverPopover>
            )}
            <GrowthPill pct={site.growth_pct} />
            <RuleBadge site={site} role={role} />
          </span>
        } />
      )}
      {t && <div className="text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>Checked {checkedLabel(t.checked_at)}</div>}
    </div>
  );
}

/** Ahrefs traffic card for a site's details: number, graph, top countries + Check traffic */
export function SiteTrafficCard({ site, role }) {
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/${role}/sites/${site.id}/traffic`);
      setTraffic(data.traffic);
    } catch (err) {
      console.error('Failed to load site traffic', err);
    } finally {
      setLoading(false);
    }
  }, [site.id, role]);

  useEffect(() => { load(); }, [load]);

  const history = traffic?.history || [];
  const countries = traffic?.top_countries || [];

  return (
    <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ahrefs Organic Traffic</h4>
          {traffic?.checked_at && (
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Checked {checkedLabel(traffic.checked_at)}</div>
          )}
        </div>
        <TrafficCheckButton site={site} role={role} onSaved={(t) => (t ? setTraffic(t) : load())} label={traffic ? 'Re-check' : 'Check traffic'} />
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center"><RefreshCw className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : !traffic ? (
        <div className="text-sm rounded-xl p-4 text-center" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}>
          Not checked yet. Click <b>Check traffic</b> to get organic traffic, the traffic graph and top countries from Ahrefs.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-bold text-brand">{compact(traffic.organic_traffic)}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Organic traffic / month</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-bold text-emerald-500">${compact(traffic.traffic_value || 0)}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Traffic value</div>
            </div>
          </div>

          {history.length > 1 && (
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}>
              <TrafficChart history={history} height={180} />
            </div>
          )}

          {countries.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Top countries</div>
              <CountryList countries={countries} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
