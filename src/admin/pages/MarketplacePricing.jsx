import React, { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Admin → Marketplace Pricing
 * Simple table: "blogger price from–to → marketplace price" (fixed price or +%).
 * The same rules are applied to each site's Guest Post price and Niche Edit price.
 */
const MARKETPLACE_LABELS = { whitelabel: 'White-label Marketplace' };
const EXAMPLES = [5, 10, 15, 20, 25, 30, 50, 60, 100, 200];

// Same calculation as the server (shown live while editing)
const previewPrice = (bloggerPrice, rules) => {
    const sorted = [...rules].filter(r => r.value !== '' && r.min_price !== '').sort((a, b) => Number(a.min_price) - Number(b.min_price));
    if (!sorted.length) return null;
    const p = Number(bloggerPrice);
    const rule = sorted.find(r => p >= Number(r.min_price) && (r.max_price === '' || r.max_price === null || p <= Number(r.max_price))) || sorted[sorted.length - 1];
    const price = rule.mode === 'percent' ? p * (1 + Number(rule.value) / 100) : Number(rule.value);
    return Math.round(price * 100) / 100;
};

export function MarketplacePricing() {
    const { showSuccess, showError } = useToast();
    const [marketplace, setMarketplace] = useState('whitelabel');
    const [marketplaces, setMarketplaces] = useState(['whitelabel']);
    const [kind, setKind] = useState('normal'); // 'normal' | 'fc'
    const [rulesByKind, setRulesByKind] = useState({ normal: [], fc: [] });
    const rules = rulesByKind[kind];
    const setRules = (next) => setRulesByKind(prev => ({ ...prev, [kind]: typeof next === 'function' ? next(prev[kind]) : next }));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async (mp = marketplace) => {
        try {
            setLoading(true);
            const data = await adminAPI.getMarketplacePricing(mp);
            setMarketplaces(data.marketplaces || ['whitelabel']);
            const toRows = (list) => (list || []).map(r => ({ ...r, max_price: r.max_price === null ? '' : r.max_price }));
            setRulesByKind({ normal: toRows(data.rules), fc: toRows(data.fc_rules) });
        } catch (err) {
            showError(err.message || 'Failed to load prices');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(marketplace); }, [marketplace]); // eslint-disable-line react-hooks/exhaustive-deps

    const update = (i, field, value) => setRules(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    const addRow = () => {
        const last = rules[rules.length - 1];
        const from = last ? (last.max_price === '' ? Number(last.min_price) + 25 : Math.round((Number(last.max_price) + 0.01) * 100) / 100) : 0;
        setRules(prev => [...prev, { min_price: from, max_price: '', mode: 'fixed', value: '' }]);
    };
    const removeRow = (i) => setRules(prev => prev.filter((_, idx) => idx !== i));

    const save = async () => {
        try {
            setSaving(true);
            const data = await adminAPI.saveMarketplacePricing(marketplace, rules.map(r => ({
                min_price: r.min_price, max_price: r.max_price === '' ? null : r.max_price, mode: r.mode, value: r.value
            })), kind);
            setRules((data.rules || []).map(r => ({ ...r, max_price: r.max_price === null ? '' : r.max_price })));
            showSuccess(`${kind === 'fc' ? 'FC prices' : 'Marketplace prices'} saved – new prices show on the marketplace right away`);
        } catch (err) {
            showError(err.message || 'Failed to save prices');
        } finally {
            setSaving(false);
        }
    };

    const examples = useMemo(() => EXAMPLES.map(p => ({ p, price: previewPrice(p, rules) })), [rules]);
    const input = 'premium-input w-full py-2 text-sm';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Store className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} /> Marketplace Pricing
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Set what clients pay on the marketplace, based on the blogger's price. Applied to both Guest Post and Niche Edit prices.
                    </p>
                    <div className="inline-flex mt-4 p-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
                        {[['normal', 'Normal prices'], ['fc', 'FC prices']].map(([k, label]) => (
                            <button key={k} onClick={() => setKind(k)}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${kind === k ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        {kind === 'fc'
                            ? "FC prices use each site's FC Guest Post / FC Niche Edit price, and are shown when a client turns FC on."
                            : "Normal prices use each site's Guest Post / Niche Edit price (FC off – the default)."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="premium-input py-2 text-sm">
                        {marketplaces.map(m => <option key={m} value={m}>{MARKETPLACE_LABELS[m] || m}</option>)}
                    </select>
                    <button onClick={() => load()} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]" title="Reload">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                {/* Rules */}
                <div className="premium-card p-5">
                    <div className="grid grid-cols-[1fr_1fr_1.2fr_1fr_40px] gap-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        <span>Blogger price from ($)</span><span>To ($)</span><span>Marketplace price</span><span>Value</span><span></span>
                    </div>
                    {loading ? (
                        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                    ) : (
                        <div className="space-y-2">
                            {rules.map((r, i) => (
                                <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_1fr_40px] gap-3 items-center">
                                    <input type="number" min="0" step="0.01" className={input} value={r.min_price} onChange={(e) => update(i, 'min_price', e.target.value)} />
                                    <input type="number" min="0" step="0.01" className={input} placeholder="and above" value={r.max_price} onChange={(e) => update(i, 'max_price', e.target.value)} />
                                    <select className={input} value={r.mode} onChange={(e) => update(i, 'mode', e.target.value)}>
                                        <option value="fixed">Fixed price ($)</option>
                                        <option value="percent">Increase by %</option>
                                    </select>
                                    <div className="relative">
                                        <input type="number" min="0" step="0.01" className={`${input} pr-7`} value={r.value} onChange={(e) => update(i, 'value', e.target.value)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>{r.mode === 'percent' ? '%' : '$'}</span>
                                    </div>
                                    <button onClick={() => removeRow(i)} className="p-2 rounded-lg hover:bg-red-500/10" title="Remove this row">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
                        <button onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-muted)]" style={{ color: 'var(--text-secondary)' }}>
                            <Plus className="h-4 w-4" /> Add price range
                        </button>
                        <button onClick={save} disabled={saving || loading} className="premium-btn premium-btn-primary px-5 py-2 disabled:opacity-60">
                            <Save className="h-4 w-4" /> {saving ? 'Saving…' : kind === 'fc' ? 'Save FC prices' : 'Save prices'}
                        </button>
                    </div>
                    <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                        Leave "To" empty on the last row for "and above". Sites whose blogger price is N/A or 0 are not shown on the marketplace.
                        Orders already placed keep the price the client paid.
                    </p>
                </div>

                {/* Live preview */}
                <div className="premium-card p-5">
                    <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Preview{kind === 'fc' ? ' – FC prices' : ''}</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ color: 'var(--text-muted)' }}>
                                <th className="text-left pb-2 font-medium">{kind === 'fc' ? 'Blogger FC price' : 'Blogger price'}</th>
                                <th className="text-right pb-2 font-medium">Client pays</th>
                            </tr>
                        </thead>
                        <tbody>
                            {examples.map(({ p, price }) => (
                                <tr key={p} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>${p}</td>
                                    <td className="py-1.5 text-right font-semibold" style={{ color: 'var(--success)' }}>{price === null ? '-' : `$${price}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default MarketplacePricing;
