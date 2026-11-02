import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lightbulb, Ban, RefreshCw, CheckCircle2, XCircle, Undo2, Info } from 'lucide-react';
import api from '../lib/api';
import { AhrefsStrip, GrowthPill, Sparkline, trafficRowFields, notifySuggestionsChanged, SUGGESTIONS_CHANGED } from './SiteTraffic';

/** Open Suggestions counts for the sidebar badge – refreshes after checks and decisions */
export function useTrafficSuggestionCount(role) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => api.get(`/${role}/sites/traffic-suggestions/counts`)
      .then(({ data }) => { if (alive) setCount((data.suggested || 0) + (data.auto_rejected || 0)); })
      .catch(() => {});
    load();
    window.addEventListener(SUGGESTIONS_CHANGED, load);
    return () => { alive = false; window.removeEventListener(SUGGESTIONS_CHANGED, load); };
  }, [role]);
  return count;
}

const TABS = [
  { key: 'suggested', label: 'Suggested to activate', icon: Lightbulb, tone: 'text-green-600' },
  { key: 'auto_rejected', label: 'Auto-rejected', icon: Ban, tone: 'text-red-500' },
];

/**
 * Sites → Suggestions (admin + manager).
 * Ahrefs checks run status rules: low-traffic approved sites are rejected automatically, and rejected sites
 * that are growing are suggested. A manager decides here.
 */
export function TrafficSuggestionsPage({ role }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'auto_rejected' ? 'auto_rejected' : 'suggested';
  const [sites, setSites] = useState([]);
  const [counts, setCounts] = useState({ suggested: 0, auto_rejected: 0 });
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({}); // site id → decision in progress

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/${role}/sites/traffic-suggestions`, { params: { tab } });
      setSites(data.sites || []);
      setCounts(data.counts || { suggested: 0, auto_rejected: 0 });
      setRules(data.rules);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load suggestions');
    } finally {
      setLoading(false);
    }
  }, [role, tab]);

  useEffect(() => { load(); }, [load]);

  const decide = async (site, decision) => {
    try {
      setBusy(b => ({ ...b, [site.id]: decision }));
      const { data } = await api.post(`/${role}/sites/${site.id}/traffic-decision`, { decision });
      setSites(prev => prev.filter(s => s.id !== site.id));
      if (data.counts) setCounts(data.counts);
      notifySuggestionsChanged();
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save the decision');
      load();
    } finally {
      setBusy(b => { const n = { ...b }; delete n[site.id]; return n; });
    }
  };

  // A re-check from this page: the site may leave the list (no longer growing / handled elsewhere)
  const onRechecked = (id, traffic) => {
    if (!traffic) return;
    setSites(prev => prev.map(s => (s.id === id ? { ...s, ...trafficRowFields(traffic) } : s)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lightbulb className="h-6 w-6 text-orange-500" /> Site Suggestions
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Decisions from Ahrefs traffic checks – activate growing rejected sites, and review automatic rejections.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="self-start md:self-auto p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--background-light)] disabled:opacity-50" title="Refresh">
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {rules && (
        <div className="flex items-start gap-2 text-xs rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
          <div>
            When a site's Ahrefs traffic is checked: an <b>approved</b> site with <b>{rules.auto_reject_max} or less</b> organic traffic is rejected automatically,
            and a <b>rejected</b> site with <b>{rules.suggest_min}+</b> traffic that is <b>growing</b> (last 3 months at least {rules.growth_min_pct}% above the 3 before, latest month not falling) is suggested here.
            Pending sites are never changed.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {TABS.map(({ key, label, icon: Icon, tone }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setParams(key === 'suggested' ? {} : { tab: key })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${active ? 'border-orange-500' : 'border-transparent hover:border-[var(--border)]'}`}
              style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              <Icon className={`h-4 w-4 ${tone}`} /> {label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${counts[key] ? 'bg-orange-500 text-white' : 'bg-[var(--background-light)]'}`}>{counts[key] || 0}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}

      {loading && !sites.length ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--card-background)' }} />)}</div>
      ) : !sites.length ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nothing waiting</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tab === 'suggested' ? 'No rejected sites are growing right now. Sites show up here after their Ahrefs traffic is checked.' : 'No automatic rejections to review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map(site => (
            <SuggestionCard key={site.id} site={site} role={role} tab={tab} busy={busy[site.id]} onDecide={decide} onRechecked={onRechecked} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ site, role, tab, busy, onDecide, onRechecked }) {
  const suggested = tab === 'suggested';
  const handled = site.site_status !== '2' || (site.ahrefs_rule && site.ahrefs_rule !== tab) || site.ahrefs_rule_resolved;
  const when = site.rule_at ? new Date(site.rule_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const btn = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50';

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Domain */}
        <div className="flex items-center gap-3 min-w-0 lg:w-72">
          <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-lg border bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[var(--primary-cyan)] border-[var(--border)]">
            {site.root_domain.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{site.root_domain}</div>
            <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-red-500/30 text-red-500 bg-red-500/10">Rejected</span>
              <span className="truncate">{site.category || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-5 text-center">
          {[['DA', site.da], ['DR', site.dr], ['RD', site.rd]].map(([l, v]) => (
            <div key={l}>
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{v ?? '-'}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
          <div>
            <div className="font-bold text-[var(--primary-cyan)]">${site.gp_price || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>GP</div>
          </div>
        </div>

        {/* Traffic + trend */}
        <div className="flex items-center gap-4 lg:ml-auto">
          <div className="text-right">
            <div className="text-xl font-extrabold text-orange-500">{site.ahrefs_traffic !== null ? Number(site.ahrefs_traffic).toLocaleString() : '-'}</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Ahrefs / mo</span>
              <GrowthPill pct={site.growth_pct} />
            </div>
          </div>
          <Sparkline history={site.ahrefs_history} />
        </div>

        {/* Decision */}
        <div className="flex items-center gap-2 lg:pl-4 lg:border-l" style={{ borderColor: 'var(--border)' }}>
          {handled ? (
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Updated by the new check – refresh</span>
          ) : suggested ? (
            <>
              <button disabled={!!busy} onClick={() => onDecide(site, 'activate')} className={`${btn} bg-green-600 hover:bg-green-700 text-white`}>
                <CheckCircle2 className="h-4 w-4" /> {busy === 'activate' ? 'Saving…' : 'Make Active'}
              </button>
              <button disabled={!!busy} onClick={() => onDecide(site, 'keep')} className={`${btn} border border-[var(--border)] hover:bg-[var(--background-light)]`} style={{ color: 'var(--text-secondary)' }}>
                <XCircle className="h-4 w-4" /> {busy === 'keep' ? 'Saving…' : 'Keep Rejected'}
              </button>
            </>
          ) : (
            <>
              <button disabled={!!busy} onClick={() => onDecide(site, 'undo')} className={`${btn} bg-green-600 hover:bg-green-700 text-white`}>
                <Undo2 className="h-4 w-4" /> {busy === 'undo' ? 'Saving…' : 'Make Active Again'}
              </button>
              <button disabled={!!busy} onClick={() => onDecide(site, 'confirm')} className={`${btn} border border-[var(--border)] hover:bg-[var(--background-light)]`} style={{ color: 'var(--text-secondary)' }}>
                <XCircle className="h-4 w-4" /> {busy === 'confirm' ? 'Saving…' : 'Keep Rejected'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="rounded-lg px-3 py-2 border border-dashed border-orange-500/25 bg-orange-500/[0.03]">
          <AhrefsStrip site={site} role={role} onSaved={(t) => onRechecked(site.id, t)} />
        </div>
        <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {suggested ? `Suggested ${when} – traffic 500+ and growing.` : `Rejected automatically ${when} – Ahrefs traffic was 200 or less.`}
        </div>
      </div>
    </div>
  );
}
