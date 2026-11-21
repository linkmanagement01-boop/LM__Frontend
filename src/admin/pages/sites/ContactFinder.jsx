import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Download, Play, Square, Trash2, Loader2, AlertTriangle, Copy, Check, Mail, ExternalLink } from 'lucide-react';
import { contactFinderAPI } from '../../../lib/api';
import { exportToExcel } from '../../../utils/exportUtils';

/**
 * Contact Finder – paste domains, get the e-mails and social profiles each website shows publicly.
 * Runs on our server (free, no paid API); nothing is saved to Link Management. Results stay in this browser.
 */
const SOCIALS = [
  ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['x', 'X / Twitter'],
  ['tiktok', 'TikTok'], ['pinterest', 'Pinterest'], ['snapchat', 'Snapchat'], ['telegram', 'Telegram'], ['threads', 'Threads']
];
const CHIP = {
  linkedin: 'bg-sky-50 text-sky-800 border-sky-200', youtube: 'bg-red-50 text-red-700 border-red-200', facebook: 'bg-blue-50 text-blue-800 border-blue-200',
  instagram: 'bg-pink-50 text-pink-700 border-pink-200', x: 'bg-slate-100 text-slate-800 border-slate-300', tiktok: 'bg-slate-100 text-slate-800 border-slate-300',
  pinterest: 'bg-rose-50 text-rose-700 border-rose-200', snapchat: 'bg-yellow-50 text-yellow-800 border-yellow-200', telegram: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  threads: 'bg-slate-100 text-slate-800 border-slate-300'
};
const MAX_DOMAINS = 200;
const PARALLEL = 3;
const STORE = 'lm-contact-finder';
const keyOf = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');
const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };

export default function ContactFinder() {
  const saved = useMemo(load, []);
  const [text, setText] = useState(saved.text || '');
  const [rows, setRows] = useState(saved.rows || []);
  const [results, setResults] = useState(saved.results || {});
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState([]);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const stopRef = useRef(false);

  // results survive a reload (this browser only)
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ text, rows, results })); } catch { /* storage full / blocked */ } }, [text, rows, results]);

  const uniqueKeys = useMemo(() => [...new Set(rows.map(keyOf).filter(Boolean))], [rows]);
  // a check that failed with an error (server limit, network) is not done – the next run checks it again
  const isDone = (k) => !!results[k] && results[k].status !== 'error';
  const done = uniqueKeys.filter(isDone).length;
  const found = uniqueKeys.filter(k => results[k]?.emails?.length).length;

  const takeList = () => {
    // one domain per line; a pasted spreadsheet row keeps only its first cell
    const list = text.split(/\r?\n/).map(l => l.split('\t')[0].trim()).filter(l => /\.[a-z]{2,}/i.test(l));
    setRows(list);
    return list;
  };

  const start = async () => {
    setNotice('');
    const list = takeList();
    const todo = [...new Set(list.map(keyOf).filter(Boolean))].filter(k => !isDone(k)).slice(0, MAX_DOMAINS);
    if (!todo.length) return setNotice(list.length ? 'All domains are already checked.' : 'Paste at least one domain.');
    stopRef.current = false;
    setRunning(true);
    const queue = [...todo];
    let failsInRow = 0;
    const worker = async () => {
      while (queue.length && !stopRef.current) {
        const k = queue.shift();
        setCurrent(c => [...c, k]);
        let r;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { r = await contactFinderAPI.check(k); break; } catch (err) {
            if (err?.response?.status === 429) { await new Promise(res => setTimeout(res, 2000)); continue; }
            r = { domain: k, status: 'error', emails: [], socials: {}, note: err?.response?.data?.message || 'Check failed – try again' }; break;
          }
        }
        r = r || { domain: k, status: 'error', emails: [], socials: {}, note: 'Server busy – try again' };
        // several errors in a row = the server is refusing (limit / restart) – stop instead of marking the whole list failed
        failsInRow = r.status === 'error' ? failsInRow + 1 : 0;
        if (failsInRow >= 4) { stopRef.current = true; setNotice('The server stopped answering for a moment. Wait a minute, then click "Check the remaining" – the failed rows are checked again.'); }
        setResults(prev => ({ ...prev, [k]: r }));
        setCurrent(c => c.filter(x => x !== k));
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setRunning(false); setCurrent([]);
  };

  const stop = () => { stopRef.current = true; };

  const clearAll = () => {
    if (!window.confirm('Clear the list and all results?')) return;
    setText(''); setRows([]); setResults({}); setNotice('');
  };

  const recheck = (k) => setResults(prev => { const n = { ...prev }; delete n[k]; return n; });

  const copy = async (value, id) => {
    try { await navigator.clipboard.writeText(value); setCopied(id); setTimeout(() => setCopied(''), 1200); } catch { /* clipboard blocked */ }
  };

  const download = () => {
    exportToExcel(rows.map(d => {
      const r = results[keyOf(d)] || {};
      return {
        'Domain': d,
        'Emails': (r.emails || []).join(', '),
        ...Object.fromEntries(SOCIALS.map(([key, label]) => [label, (r.socials?.[key] || []).map(x => x.url).join(', ')])),
        'Contact form': r.contact_form || '',
        'Note': r.status && r.status !== 'ok' ? r.note : (r.note || ''),
        'Pages checked': (r.pages_checked || []).length || ''
      };
    }), 'contact-finder', true);
  };

  const todoCount = uniqueKeys.filter(k => !isDone(k)).length;

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><AtSign className="h-6 w-6 text-violet-600" />Contact Finder</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Paste any domains to find the e-mails and social profiles (LinkedIn, YouTube, Facebook, Instagram, X, TikTok, Pinterest, Snapchat…) each website shows publicly. Free – nothing is saved to your sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={download} disabled={!rows.length || !done}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40">
            <Download className="h-4 w-4" />Download Excel
          </button>
          <button onClick={clearAll} disabled={running || (!rows.length && !text)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" />Clear
          </button>
        </div>
      </div>

      <div className="grid gap-5 items-start lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* List + controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="cf-list">Domains (one per line)</label>
            <textarea id="cf-list" value={text} onChange={e => setText(e.target.value)} disabled={running} rows={14}
              placeholder={'example.com\nanother-site.org'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 font-mono outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-50" />
            <p className="text-xs text-slate-500 mt-1.5">Paste straight from your sheet's Domain column. Order and duplicates are kept for the download. Up to {MAX_DOMAINS} new domains per run.</p>
          </div>

          {running ? (
            <button onClick={stop} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:text-white hover:bg-red-700">
              <Square className="h-4 w-4" />Stop
            </button>
          ) : (
            <button onClick={start} disabled={done > 0 && !todoCount && rows.join('\n') === text.trim()}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:text-white hover:bg-violet-700 shadow-sm disabled:opacity-50 disabled:cursor-default">
              <Play className="h-4 w-4" />
              {!done ? 'Find contacts' : todoCount ? `Check the remaining ${todoCount}` : rows.join('\n') === text.trim() ? 'All domains checked' : 'Check new domains'}
            </button>
          )}
          {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>}

          {(running || done > 0) && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                {running ? <Loader2 className="h-4 w-4 animate-spin text-violet-600" /> : <Mail className="h-4 w-4 text-violet-600" />}
                {running ? `Checking – ${done} of ${uniqueKeys.length} done` : `${done} of ${uniqueKeys.length} checked`}
              </div>
              <div className="text-xs text-slate-500 mt-1">{found} with an e-mail · {done - found} without</div>
              {uniqueKeys.length > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${Math.round((done / uniqueKeys.length) * 100)}%` }} />
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">
            For each domain we read the homepage plus its Contact, About, Write-for-us, Advertise and Privacy pages – about 3–10 seconds per site, 3 at a time. Sites that block automated checks, or hide their e-mail on purpose, are marked so the team can check them by hand. Results stay on this page if you reload.
          </p>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">Results</span>
            <span className="text-xs text-slate-500">{rows.length ? `${done} of ${uniqueKeys.length} domains checked · ${rows.length} rows` : 'No list yet'}</span>
          </div>
          <div className="max-h-[680px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-2.5 w-10">#</th><th className="px-4 py-2.5 min-w-[160px]">Domain</th><th className="px-4 py-2.5 min-w-[250px]">E-mails</th><th className="px-4 py-2.5">Social profiles</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">Paste your domains on the left and click Find contacts.</td></tr>
                ) : rows.map((d, i) => {
                  const k = keyOf(d); const r = results[k];
                  const isNow = current.includes(k);
                  const socials = r ? SOCIALS.filter(([key]) => r.socials?.[key]?.length) : [];
                  return (
                    <tr key={i} className={`align-top ${isNow ? 'bg-violet-50/60' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{d}</div>
                        {r && <div className="text-[11px] text-slate-400 mt-0.5">{(r.pages_checked || []).length} page{(r.pages_checked || []).length === 1 ? '' : 's'} read{r.status !== 'ok' && !running ? <> · <button onClick={() => recheck(k)} className="underline hover:text-violet-700">check again</button></> : null}</div>}
                      </td>
                      {isNow ? (
                        <td colSpan={2} className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking</span></td>
                      ) : !r ? (
                        <td colSpan={2} className="px-4 py-2.5 text-xs text-slate-400">Waiting</td>
                      ) : r.status !== 'ok' ? (
                        <td colSpan={2} className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{r.note}</span></td>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 min-w-[250px]">
                            {r.emails.length ? (
                              <div className="space-y-1">
                                {r.emails.map(e => (
                                  <div key={e} className="flex items-center gap-1.5">
                                    <a href={`mailto:${e}`} className="text-slate-800 hover:text-violet-700 whitespace-nowrap">{e}</a>
                                    <button onClick={() => copy(e, `${k}:${e}`)} title="Copy" className="text-slate-400 hover:text-violet-700 shrink-0">
                                      {copied === `${k}:${e}` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : <span className="text-xs font-semibold text-amber-700">{r.note}</span>}
                            {r.contact_form && <a href={r.contact_form} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-violet-700">Contact form <ExternalLink className="h-3 w-3" /></a>}
                          </td>
                          <td className="px-4 py-2.5">
                            {socials.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {socials.flatMap(([key, label]) => r.socials[key].map(s => (
                                  <a key={`${key}:${s.handle}`} href={s.url} target="_blank" rel="noreferrer" title={s.url}
                                    className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold hover:opacity-80 ${CHIP[key]}`}>
                                    <span className="shrink-0">{label}:</span> <span className="font-normal truncate max-w-[170px]">{s.handle}</span>
                                  </a>
                                )))}
                              </div>
                            ) : <span className="text-xs text-slate-400">None shown</span>}
                          </td>
                        </>
                      )}
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
