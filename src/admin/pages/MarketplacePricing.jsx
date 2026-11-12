import React, { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Trash2, Save, RefreshCw, IndianRupee, CheckCircle2, AlertTriangle } from 'lucide-react';
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

            <PaymentSettings />
        </div>
    );
}

/** ₹ rate + top-up fees (India: GST + Razorpay fee; abroad: PayPal platform fee) + which gateways are set up */
function PaymentSettings() {
    const { showSuccess, showError } = useToast();
    const [settings, setSettings] = useState(null);
    const [form, setForm] = useState({ inr_per_usd: '', razorpay_gst_pct: '', razorpay_fee_pct: '', paypal_fee_pct: '' });
    const [saving, setSaving] = useState(false);

    const fill = (d) => {
        setSettings(d);
        setForm({
            inr_per_usd: d.inr_per_usd ? String(d.inr_per_usd) : '',
            razorpay_gst_pct: String(d.fees.razorpay_gst_pct),
            razorpay_fee_pct: String(d.fees.razorpay_fee_pct),
            paypal_fee_pct: String(d.fees.paypal_fee_pct)
        });
    };
    useEffect(() => {
        adminAPI.getMarketplacePaymentSettings().then(fill).catch(err => showError(err.message || 'Failed to load payment settings'));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const n = (k) => Number(form[k]);
    const rateOk = n('inr_per_usd') >= 1 && n('inr_per_usd') <= 1000;
    const pctOk = (k) => form[k] !== '' && n(k) >= 0 && n(k) <= 50;
    const valid = rateOk && ['razorpay_gst_pct', 'razorpay_fee_pct', 'paypal_fee_pct'].every(pctOk);
    const dirty = settings && (n('inr_per_usd') !== (settings.inr_per_usd || 0)
        || ['razorpay_gst_pct', 'razorpay_fee_pct', 'paypal_fee_pct'].some(k => n(k) !== settings.fees[k]));

    const save = async () => {
        try {
            setSaving(true);
            const d = await adminAPI.saveMarketplacePaymentSettings({
                inr_per_usd: n('inr_per_usd'),
                fees: { razorpay_gst_pct: n('razorpay_gst_pct'), razorpay_fee_pct: n('razorpay_fee_pct'), paypal_fee_pct: n('paypal_fee_pct') }
            });
            showSuccess(d.message);
            fill(await adminAPI.getMarketplacePaymentSettings());
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to save payment settings');
        } finally {
            setSaving(false);
        }
    };

    const Status = ({ ok, children }) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
            {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{children}
        </span>
    );
    // plain function (not a component) so the input keeps focus while typing
    const field = (k, label, suffix, width = 'w-28') => (
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
            <div className="relative w-fit">
                <input type="number" min="0" step="0.01" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className={`premium-input ${width} py-2 pr-8 text-sm`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>{suffix}</span>
            </div>
        </div>
    );

    // Example for $100 – same formula as the storefront
    const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
    const ex = (() => {
        if (!valid) return null;
        const base = r2(100 * n('inr_per_usd'));
        const tax = r2(base * n('razorpay_gst_pct') / 100);
        const fee = r2((base + tax) * n('razorpay_fee_pct') / 100);
        const ppFee = r2(100 * n('paypal_fee_pct') / 100);
        const inr = (v) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return { india: `${inr(base)} + GST ${inr(tax)} + fee ${inr(fee)} = ${inr(r2(base + tax + fee))}`, abroad: `$100.00 + fee $${ppFee.toFixed(2)} = $${r2(100 + ppFee).toFixed(2)}` };
    })();

    return (
        <div className="premium-card p-5">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <IndianRupee className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} /> Payments – rate &amp; fees
            </h3>
            <p className="text-sm mt-1 max-w-3xl" style={{ color: 'var(--text-muted)' }}>
                Clients in <b>India</b> top up with <b>Razorpay in ₹</b>: amount × rate, + GST on the amount, + payment fee on (amount + GST).
                Clients in <b>other countries</b> top up with <b>PayPal in $</b>: amount + platform fee, no GST.
                The wallet always gets the $ amount the client chose. Changes apply to new top-ups only.
            </p>
            {settings && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                    <Status ok={settings.razorpay.configured}>Razorpay {settings.razorpay.configured ? `keys set (${settings.razorpay.mode} mode)` : 'keys not set'}</Status>
                    <Status ok={settings.razorpay.webhook}>Webhook secret {settings.razorpay.webhook ? 'set' : 'not set'}</Status>
                    <Status ok={settings.paypal.configured}>PayPal {settings.paypal.configured ? `set (${settings.paypal.mode})` : 'not set'}</Status>
                </div>
            )}

            <div className="grid md:grid-cols-[auto_auto_1fr] gap-4 mt-5 items-end">
                <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>India – Razorpay</p>
                    <div className="flex flex-wrap gap-3">
                        {field('inr_per_usd', '₹ per $1', '₹')}
                        {field('razorpay_gst_pct', 'GST', '%', 'w-24')}
                        {field('razorpay_fee_pct', 'Payment fee', '%', 'w-24')}
                    </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Other countries – PayPal</p>
                    {field('paypal_fee_pct', 'Platform fee', '%')}
                </div>
                <div className="flex md:justify-end">
                    <button onClick={save} disabled={saving || !valid || !dirty} className="premium-btn premium-btn-primary py-2 disabled:opacity-50">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save payment settings'}
                    </button>
                </div>
            </div>

            {settings && !settings.inr_per_usd && (
                <p className="text-xs mt-3 font-semibold text-amber-700">No ₹ rate set yet – Indian clients can't top up with Razorpay until you save one.</p>
            )}
            {!valid && settings && <p className="text-xs mt-3 font-semibold text-amber-700">Rate must be ₹1–₹1000 and every fee 0–50%.</p>}
            {ex && (
                <div className="text-xs mt-3 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                    <p>Example, a $100 top-up – <b>India:</b> {ex.india}</p>
                    <p>Example, a $100 top-up – <b>other countries:</b> {ex.abroad}</p>
                </div>
            )}
        </div>
    );
}

export default MarketplacePricing;
