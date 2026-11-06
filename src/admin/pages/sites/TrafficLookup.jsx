import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Download, Play, Square, Trash2, Loader2, AlertTriangle, Globe, Check } from 'lucide-react';
import {
  isHelperInstalled, helperSupportsLookup, helperSupportsAuthority, helperSupportsAuthorityOnly, startTrafficLookup, stopTrafficBatch, requestTrafficStatus,
  onTrafficResult, onTrafficProgress, cleanDomain, HELPER_DOWNLOAD_URL, LOOKUP_MAX
} from '../../../lib/trafficHelper';
import { exportToExcel } from '../../../utils/exportUtils';

/**
 * Traffic Lookup: paste any list of domains (they don't have to be our sites) → the LM Traffic Helper checks each on
 * Ahrefs in its own window → the ticked fields per domain → download as Excel, in the pasted order.
 *  - Country + Traffic come from Ahrefs' Traffic Checker
 *  - DR + RD come from Ahrefs' Website Authority Checker (RD = its Backlinks number, as our sheet uses RD)
 * A page is only opened when one of its fields is ticked. Nothing is saved to the sites; the list and its results are
 * kept in this browser until cleared.
 */
const STORE = 'lm_traffic_lookup_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; } };

const FIELDS = [
  { key: 'country', label: 'Country', head: 'Country', excel: 'Country Source', page: 'traffic' },
  { key: 'traffic', label: 'Traffic', head: 'Traffic', excel: 'Traffic', page: 'traffic' },
  { key: 'dr', label: 'DR', head: 'DR', excel: 'DR', page: 'authority' },
  { key: 'rd', label: 'RD', head: 'RD', excel: 'RD', page: 'authority' },
];
const ALL_ON = { country: true, traffic: true, dr: true, rd: true };

// Ahrefs gives two-letter codes; names as the sites sheet writes them
const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const countryName = (code) => {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return '';
  if (c === 'US') return 'USA';
  if (c === 'GB' || c === 'UK') return 'UK';
  try { return regionNames?.of(c) || c; } catch { return c; }
};
const keyOf = (d) => cleanDomain(d).toLowerCase();

/**
 * Result per domain: { tr, country, share, traffic, auth, dr, rd, authMessage, fail }
 *  tr = Traffic Checker read · auth = true read / false didn't load / missing not asked · fail = nothing read (message)
 * Older saved results: { ok, country, traffic, message, auth, dr, rd, backlinks } → converted here.
 */
const fromSaved = (r) => {
  if (!r || 'tr' in r) return r;
  const { ok, message, backlinks, ...rest } = r;
  return {
    ...rest,
    tr: !!ok,
    ...(ok ? {} : { fail: message || 'Failed' }),
    // RD used to be "linking websites" with a separate backlinks number – RD is the backlinks now
    ...('backlinks' in r ? { rd: backlinks ?? null } : {}),
  };
};

export function TrafficLookup() {
  const saved = load();
  const [text, setText] = useState(saved?.rows?.join('\n') || '');
  const [rows, setRows] = useState(saved?.rows || []);          // pasted order, duplicates kept
  const [results, setResults] = useState(() => Object.fromEntries(Object.entries(saved?.results || {}).map(([k, r]) => [k, fromSaved(r)])));
  const [fields, setFields] = useState(() => ({ ...ALL_ON, ...(saved?.fields || {}) })); // all ticked by default
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ rows, results, fields })); } catch { /* storage full or blocked */ } }, [rows, results, fields]);

  useEffect(() => {
    const offResult = onTrafficResult((r) => {
      if (!r.site_id || !String(r.site_id).startsWith('lk:')) return; // not one of ours
      const key = String(r.site_id).slice(3);
      setResults(prev => {
        const old = prev[key] || {};
        if (!r.ok) return { ...prev, [key]: { ...old, fail: r.cancelled ? 'Not checked' : (r.message || 'Failed') } };
        const next = { ...old, fail: undefined };
        // traffic_checked: false = only DR & RD were asked (helper 1.6+); older helpers always check the traffic
        if (r.traffic_checked !== false) {
          const top = [...(r.traffic?.top_countries || [])].sort((a, b) => (b.share || 0) - (a.share || 0))[0];
          Object.assign(next, { tr: true, country: top ? countryName(top.country) : '', share: top?.share ?? null, traffic: r.traffic?.organic_traffic ?? null });
        }
        // authority: { dr, backlinks } read · null = that page didn't load · missing = not asked
        if (r.authority) Object.assign(next, { auth: true, dr: r.authority.dr, rd: r.authority.backlinks, authMessage: undefined });
        else if (r.authority === null) Object.assign(next, { auth: false, authMessage: r.message || 'DR & RD not loaded' });
        return { ...prev, [key]: next };
      });
    });
    const offProgress = onTrafficProgress((p) => setProgress(p));
    if (isHelperInstalled()) requestTrafficStatus(); // a lookup may still be running after a reload
    return () => { offResult(); offProgress(); };
  }, []);

  const cols = FIELDS.filter(f => fields[f.key]);
  const wantTraffic = fields.country || fields.traffic;
  const wantAuth = fields.dr || fields.rd;
  const authCols = cols.filter(c => c.page === 'authority').length;

  const uniqueKeys = useMemo(() => [...new Set(rows.map(keyOf).filter(Boolean))], [rows]);
  // a domain is done when every ticked field's page has been read
  const needs = (k) => (wantTraffic && !results[k]?.tr) || (wantAuth && !results[k]?.auth);
  const todo = uniqueKeys.filter(needs);
  const running = progress?.status === 'running';
  const done = uniqueKeys.filter(k => !needs(k)).length;

  const toggle = (key) => setFields(f => ({ ...f, [key]: !f[key] }));

  const takeList = () => {
    // one domain per line; a pasted spreadsheet row keeps only its first cell
    const list = text.split(/\r?\n/).map(l => l.split('\t')[0].trim()).filter(l => /\.[a-z]{2,}/i.test(l));
    setRows(list);
    return list;
  };

  const start = () => {
    setNotice('');
    if (!cols.length) return setNotice('Tick at least one field to check.');
    if (!isHelperInstalled()) return setNotice('install');
    const list = takeList();
    const keys = [...new Set(list.map(keyOf).filter(Boolean))].filter(needs);
    if (!keys.length) return setNotice(list.length ? 'All domains are already checked.' : 'Paste at least one domain.');
    const batch = keys.slice(0, LOOKUP_MAX);
    // open each Ahrefs page only if a ticked field still needs it
    const traffic = wantTraffic && batch.some(k => !results[k]?.tr);
    const authority = wantAuth && batch.some(k => !results[k]?.auth);
    const need = !traffic ? '1.6.0' : authority ? '1.5.0' : '1.3.0';
    if (!helperSupportsLookup() || (authority && !helperSupportsAuthority()) || (authority && !traffic && !helperSupportsAuthorityOnly())) return setNotice(`update:${need}`);
    setProgress({ status: 'running', total: batch.length, done: 0, saved: 0, skipped: 0, current: batch[0] });
    startTrafficLookup(batch.map(k => ({ key: `lk:${k}`, domain: k })), 'admin', { traffic, authority });
  };

  const clearAll = () => {
    if (!window.confirm('Clear the list and all results?')) return;
    setText(''); setRows([]); setResults({}); setProgress(null); setNotice('');
  };

  const value = (r, key) => {
    if (!r) return '';
    if (key === 'country') return r.tr ? r.country : '';
    if (key === 'traffic') return r.tr && r.traffic != null ? r.traffic : '';
    return r.auth && r[key] != null ? r[key] : '';
  };

  const download = () => {
    exportToExcel(rows.map(d => {
      const r = results[keyOf(d)];
      return { 'Domain': d, ...Object.fromEntries(cols.map(c => [c.excel, value(r, c.key)])) };
    }), 'traffic-lookup', true);
  };

  const status = (content, cls = '') => <td colSpan={cols.length} className={`px-4 py-2 ${cls}`}>{content}</td>;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Globe className="h-6 w-6 text-violet-600" />Traffic Lookup</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Paste any domains to get their country, traffic, DR and RD from Ahrefs – untick what you don't need. They don't need to be in Link Management, and nothing is saved to your sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={download} disabled={!rows.length || !cols.length}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40">
            <Download className="h-4 w-4" />Download Excel
          </button>
          <button onClick={clearAll} disabled={running || (!rows.length && !text)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" />Clear
          </button>
        </div>
      </div>

      <div className="grid gap-5 items-start lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* List + controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="lk-list">Domains (one per line)</label>
            <textarea id="lk-list" value={text} onChange={e => setText(e.target.value)} disabled={running} rows={14}
              placeholder={'example.com\nanother-site.org'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 font-mono outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-50" />
            <p className="text-xs text-slate-500 mt-1.5">Paste straight from your sheet's Domain column. Order and duplicates are kept for the download. Up to {LOOKUP_MAX} new domains per run.</p>
          </div>

          {/* Which fields to check – all ticked by default */}
          <div className={running ? 'opacity-60 pointer-events-none' : ''}>
            <div className="text-sm font-semibold text-slate-700 mb-1.5">Check</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(f => {
                const on = fields[f.key];
                return (
                  <button key={f.key} type="button" onClick={() => toggle(f.key)} disabled={running} role="checkbox" aria-checked={on}
                    className={`flex items-center gap-2.5 h-10 px-3 rounded-xl border text-sm font-semibold transition-colors ${on ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    <span className={`h-4 w-4 rounded grid place-items-center border ${on ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Country &amp; Traffic come from Ahrefs' Traffic Checker, DR &amp; RD (Backlinks) from its Website Authority Checker. Each ticked pair adds one Ahrefs page per domain – untick a pair to make the run faster.
            </p>
          </div>

          {running ? (
            <button onClick={stopTrafficBatch} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:text-white hover:bg-red-700">
              <Square className="h-4 w-4" />Stop
            </button>
          ) : (
            <button onClick={start} disabled={!cols.length || (done > 0 && !todo.length && rows.join('\n') === text.trim())}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:text-white hover:bg-violet-700 shadow-sm disabled:opacity-50 disabled:cursor-default">
              <Play className="h-4 w-4" />
              {!cols.length ? 'Tick a field to check' : !done ? 'Start checking' : todo.length ? `Check the remaining ${todo.length}` : rows.join('\n') === text.trim() ? 'All domains checked' : 'Check new domains'}
            </button>
          )}

          {notice === 'install' && <Notice>The LM Traffic Helper isn't installed in this browser. <a href={HELPER_DOWNLOAD_URL} className="font-semibold text-violet-700 underline">Download it</a> and follow the README inside.</Notice>}
          {notice.startsWith('update:') && <Notice>This check needs helper {notice.slice(7)}. <a href={HELPER_DOWNLOAD_URL} className="font-semibold text-violet-700 underline">Download the new zip</a>, unzip it over your helper folder, then click Reload on the helper in chrome://extensions.</Notice>}
          {notice && notice !== 'install' && !notice.startsWith('update:') && <Notice>{notice}</Notice>}

          {progress && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                {running ? <Loader2 className="h-4 w-4 animate-spin text-violet-600" /> : <Activity className="h-4 w-4 text-violet-600" />}
                {running ? `Checking ${progress.done + 1 > progress.total ? progress.total : progress.done + 1} of ${progress.total}` : progress.status === 'finished' ? 'Finished' : progress.status === 'stopped' ? 'Stopped' : 'Ready'}
              </div>
              {running && progress.current && <div className="text-xs text-slate-500 mt-1 truncate">Now: {progress.current}</div>}
              {progress.message && <div className="text-xs text-slate-600 mt-1">{progress.message}</div>}
              {progress.total > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Ahrefs runs in a small separate window, a few seconds per page – keep it visible beside this page (not covered or minimised) so its security check passes by itself. If it asks you to verify you are human, that window comes to the front: complete it and the list continues. Results stay on this page if you reload.
          </p>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">Results</span>
            <span className="text-xs text-slate-500">{rows.length ? `${done} of ${uniqueKeys.length} domains checked · ${rows.length} rows` : 'No list yet'}</span>
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 w-12">#</th><th className="px-4 py-2.5">Domain</th>
                  {cols.map(c => <th key={c.key} className={`px-4 py-2.5 ${c.key === 'country' ? '' : 'text-right'}`}>{c.head}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={cols.length + 2} className="px-4 py-14 text-center text-sm text-slate-500">Paste your domains on the left and click Start checking.</td></tr>
                ) : rows.map((d, i) => {
                  const k = keyOf(d); const r = results[k];
                  const isNow = running && progress?.current && keyOf(progress.current) === k;
                  const anyRead = r && (r.tr || r.auth !== undefined);
                  return (
                    <tr key={i} className={isNow ? 'bg-violet-50/60' : ''}>
                      <td className="px-4 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{d}</td>
                      {!cols.length ? null
                        : isNow ? status(<span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking</span>)
                          : r?.fail && !anyRead ? status(<span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{r.fail}</span>)
                            : !anyRead ? status(<span className="text-xs text-slate-400">Waiting</span>)
                              : <>
                                {cols.filter(c => c.page === 'traffic').map(c => (
                                  <td key={c.key} className={`px-4 py-2 ${c.key === 'country' ? 'text-slate-800' : 'text-right tabular-nums text-slate-600'}`}>
                                    {c.key === 'country' ? (r.tr ? (r.country || '–') : '') : (value(r, c.key) === '' ? '' : Number(value(r, c.key)).toLocaleString())}
                                  </td>
                                ))}
                                {authCols > 0 && (r.auth === false
                                  ? <td colSpan={authCols} className="px-4 py-2 text-right text-xs font-semibold text-amber-700" title={r.authMessage}>{authCols > 1 ? 'DR & RD not loaded' : 'Not loaded'}</td>
                                  : cols.filter(c => c.page === 'authority').map(c => (
                                    <td key={c.key} className={`px-4 py-2 text-right tabular-nums ${c.key === 'dr' ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                      {value(r, c.key) === '' ? '' : Number(value(r, c.key)).toLocaleString()}
                                    </td>
                                  )))}
                              </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Notice({ children }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{children}</div>;
}
