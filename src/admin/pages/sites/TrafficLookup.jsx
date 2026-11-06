import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Download, Play, Square, Trash2, Loader2, AlertTriangle, Globe } from 'lucide-react';
import {
  isHelperInstalled, helperSupportsLookup, helperSupportsAuthority, startTrafficLookup, stopTrafficBatch, requestTrafficStatus,
  onTrafficResult, onTrafficProgress, cleanDomain, HELPER_DOWNLOAD_URL, LOOKUP_MAX
} from '../../../lib/trafficHelper';
import { exportToExcel } from '../../../utils/exportUtils';

/**
 * Traffic Lookup: paste any list of domains (they don't have to be our sites) → the LM Traffic Helper checks each on
 * Ahrefs in its own window → top country + organic traffic per domain (optionally DR, RD and backlinks from the Website
 * Authority Checker) → download as Excel, in the pasted order.
 * Nothing is saved to the sites; the list and its results are kept in this browser until cleared.
 */
const STORE = 'lm_traffic_lookup_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; } };

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

export function TrafficLookup() {
  const saved = load();
  const [text, setText] = useState(saved?.rows?.join('\n') || '');
  const [rows, setRows] = useState(saved?.rows || []);          // pasted order, duplicates kept
  // key → { country, share, traffic, ok, message, auth, dr, rd }
  // (results saved before RD meant Backlinks had RD = linking websites and a separate backlinks number → RD takes the backlinks)
  const [results, setResults] = useState(() => Object.fromEntries(Object.entries(saved?.results || {}).map(([k, r]) => {
    if (!r || !('backlinks' in r)) return [k, r];
    const { backlinks, ...rest } = r;
    return [k, { ...rest, rd: backlinks ?? null }];
  })));
  const [withAuth, setWithAuth] = useState(!!saved?.withAuth);   // 'Also check DR & RD' – off by default
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ rows, results, withAuth })); } catch { /* storage full or blocked */ } }, [rows, results, withAuth]);

  useEffect(() => {
    const offResult = onTrafficResult((r) => {
      if (!r.site_id || !String(r.site_id).startsWith('lk:')) return; // not one of ours
      const key = String(r.site_id).slice(3);
      const top = [...(r.traffic?.top_countries || [])].sort((a, b) => (b.share || 0) - (a.share || 0))[0];
      // authority: { dr, rd, backlinks } when DR & RD were read, null when that step didn't load, missing when not asked
      const a = r.authority;
      setResults(prev => ({
        ...prev,
        [key]: r.ok
          ? {
            ok: true, country: top ? countryName(top.country) : '', share: top?.share ?? null, traffic: r.traffic?.organic_traffic ?? null, message: top ? '' : 'No country data',
            // RD column = the Backlinks number on Ahrefs' Website Authority Checker (how our sheet uses RD)
            ...(a ? { auth: true, dr: a.dr, rd: a.backlinks }
              : a === null ? { auth: false, authMessage: r.message || 'DR & RD not loaded' }
                : { auth: prev[key]?.auth, dr: prev[key]?.dr, rd: prev[key]?.rd })
          }
          : { ok: false, message: r.cancelled ? 'Not checked' : (r.message || 'Failed') }
      }));
    });
    const offProgress = onTrafficProgress((p) => setProgress(p));
    if (isHelperInstalled()) requestTrafficStatus(); // a lookup may still be running after a reload
    return () => { offResult(); offProgress(); };
  }, []);

  const uniqueKeys = useMemo(() => [...new Set(rows.map(keyOf).filter(Boolean))], [rows]);
  // with DR & RD on, a domain checked before without them counts as still to do
  const needs = (k) => !results[k]?.ok || (withAuth && !results[k]?.auth);
  const todo = uniqueKeys.filter(needs);
  const showAuth = withAuth || Object.values(results).some(r => r?.auth);
  const running = progress?.status === 'running';
  const done = uniqueKeys.filter(k => !needs(k)).length;

  const takeList = () => {
    // one domain per line; a pasted spreadsheet row keeps only its first cell
    const list = text.split(/\r?\n/).map(l => l.split('\t')[0].trim()).filter(l => /\.[a-z]{2,}/i.test(l));
    setRows(list);
    return list;
  };

  const start = () => {
    setNotice('');
    if (!isHelperInstalled()) return setNotice('install');
    if (!helperSupportsLookup() || (withAuth && !helperSupportsAuthority())) return setNotice('update');
    const list = takeList();
    const keys = [...new Set(list.map(keyOf).filter(Boolean))].filter(needs);
    if (!keys.length) return setNotice(list.length ? 'All domains are already checked.' : 'Paste at least one domain.');
    const batch = keys.slice(0, LOOKUP_MAX);
    setProgress({ status: 'running', total: batch.length, done: 0, saved: 0, skipped: 0, current: batch[0] });
    startTrafficLookup(batch.map(k => ({ key: `lk:${k}`, domain: k })), 'admin', { authority: withAuth });
  };

  const clearAll = () => {
    if (!window.confirm('Clear the list and all results?')) return;
    setText(''); setRows([]); setResults({}); setProgress(null); setNotice('');
  };

  const download = () => {
    exportToExcel(rows.map(d => {
      const r = results[keyOf(d)] || {};
      return {
        'Domain': d,
        'Country Source': r.ok ? r.country : '',
        'Traffic': r.ok && r.traffic !== null ? r.traffic : '',
        ...(showAuth ? { 'DR': r.dr ?? '', 'RD': r.rd ?? '' } : {})
      };
    }), 'traffic-lookup', true);
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Globe className="h-6 w-6 text-violet-600" />Traffic Lookup</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Paste any domains to get each one's top country and organic traffic from Ahrefs (and DR &amp; RD if you tick the box). They don't need to be in Link Management, and nothing is saved to your sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={download} disabled={!rows.length}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40">
            <Download className="h-4 w-4" />Download Excel
          </button>
          <button onClick={clearAll} disabled={running || (!rows.length && !text)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" />Clear
          </button>
        </div>
      </div>

      <div className={`grid gap-5 items-start ${showAuth ? 'lg:grid-cols-[360px_minmax(0,1fr)]' : 'lg:grid-cols-[360px_minmax(0,640px)]'}`}>
        {/* List + controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="lk-list">Domains (one per line)</label>
            <textarea id="lk-list" value={text} onChange={e => setText(e.target.value)} disabled={running} rows={14}
              placeholder={'example.com\nanother-site.org'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 font-mono outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-50" />
            <p className="text-xs text-slate-500 mt-1.5">Paste straight from your sheet's Domain column. Order and duplicates are kept for the download. Up to {LOOKUP_MAX} new domains per run.</p>
          </div>
          {/* DR & RD: a second Ahrefs page per domain – slower and more human checks, so off by default */}
          <label className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${withAuth ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 hover:border-slate-300'} ${running ? 'opacity-60 pointer-events-none' : ''}`}>
            <input type="checkbox" checked={withAuth} onChange={e => setWithAuth(e.target.checked)} disabled={running}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm">
              <span className="font-semibold text-slate-800">Also check DR &amp; RD</span>
              <span className="block text-xs text-slate-500 mt-0.5">Adds DR (Domain Rating) and RD (Backlinks) from Ahrefs' Website Authority Checker. About twice as slow, and Ahrefs may ask the human check more often.</span>
            </span>
          </label>

          {running ? (
            <button onClick={stopTrafficBatch} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:text-white hover:bg-red-700">
              <Square className="h-4 w-4" />Stop
            </button>
          ) : (
            <button onClick={start} disabled={done > 0 && !todo.length && rows.join('\n') === text.trim()}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:text-white hover:bg-violet-700 shadow-sm disabled:opacity-50 disabled:cursor-default">
              <Play className="h-4 w-4" />
              {!done ? 'Start checking' : todo.length ? `Check the remaining ${todo.length}` : rows.join('\n') === text.trim() ? 'All domains checked' : 'Check new domains'}
            </button>
          )}

          {notice === 'install' && <Notice>The LM Traffic Helper isn't installed in this browser. <a href={HELPER_DOWNLOAD_URL} className="font-semibold text-violet-700 underline">Download it</a> and follow the README inside.</Notice>}
          {notice === 'update' && <Notice>{withAuth ? 'Checking DR & RD needs helper 1.5.0.' : 'Traffic Lookup needs helper 1.3.0.'} <a href={HELPER_DOWNLOAD_URL} className="font-semibold text-violet-700 underline">Download the new zip</a>, unzip it over your helper folder, then click Reload on the helper in chrome://extensions.</Notice>}
          {notice && notice !== 'install' && notice !== 'update' && <Notice>{notice}</Notice>}

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
            Ahrefs runs in a small separate window, a few seconds per domain – keep it visible beside this page (not covered or minimised) so its security check passes by itself. If it asks you to verify you are human, that window comes to the front: complete it and the list continues. Results stay on this page if you reload.
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
                <tr><th className="px-4 py-2.5 w-12">#</th><th className="px-4 py-2.5">Domain</th><th className="px-4 py-2.5">Country</th><th className="px-4 py-2.5 text-right">Traffic</th>
                  {showAuth && <><th className="px-4 py-2.5 text-right">DR</th><th className="px-4 py-2.5 text-right">RD</th></>}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={showAuth ? 6 : 4} className="px-4 py-14 text-center text-sm text-slate-500">Paste your domains on the left and click Start checking.</td></tr>
                ) : rows.map((d, i) => {
                  const k = keyOf(d); const r = results[k];
                  const isNow = running && progress?.current && keyOf(progress.current) === k;
                  return (
                    <tr key={i} className={isNow ? 'bg-violet-50/60' : ''}>
                      <td className="px-4 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{d}</td>
                      {/* country cell also shows checking / failed while there's no country yet */}
                      <td className="px-4 py-2 text-slate-800">
                        {isNow ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking</span>
                          : r?.ok ? (r.country || '–')
                            : r ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{r.message}</span>
                              : <span className="text-xs text-slate-400">Waiting</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">{r?.ok && r.traffic !== null ? Number(r.traffic).toLocaleString() : ''}</td>
                      {showAuth && (r?.ok && r.auth === false
                        ? <td colSpan="2" className="px-4 py-2 text-right text-xs font-semibold text-amber-700" title={r.authMessage}>DR &amp; RD not loaded</td>
                        : <>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800">{r?.ok && r.dr != null ? r.dr : ''}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-600">{r?.ok && r.rd != null ? Number(r.rd).toLocaleString() : ''}</td>
                        </>)}
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
