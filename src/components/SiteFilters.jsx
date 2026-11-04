import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X, SlidersHorizontal, ShieldAlert, LayoutGrid, FileText, Link2, ArrowUpDown } from 'lucide-react';

/**
 * Marketplace-style filters for the team's Sites pages (admin + manager):
 * a filter panel (price, category, DR, DA, traffic, …) applied with "Apply Filters",
 * plus a toolbar with the order type tabs, the FC toggle and sort – those apply straight away.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const EMPTY = {
    search: '', status: '', email: '', website_niche: '', new_arrival: '',
    fc: '', type: '', category: '', sort: 'newest',
    min_price: '', max_price: '', min_dr: '', max_dr: '', min_da: '', max_da: '', min_traffic: '', max_traffic: ''
};
// Shown in the toolbar / header, not counted as panel filters
const TOOLBAR_KEYS = ['search', 'fc', 'type', 'sort'];
const SORTS = [
    { v: 'newest', l: 'Newest first' },
    { v: 'price_asc', l: 'Price: low to high' },
    { v: 'price_desc', l: 'Price: high to low' },
    { v: 'dr_desc', l: 'Highest DR' },
    { v: 'da_desc', l: 'Highest DA' },
    { v: 'traffic_desc', l: 'Most traffic' }
];
const TABS = [['', 'All', LayoutGrid], ['gp', 'Guest Post', FileText], ['ne', 'Niche Edit', Link2]];

/**
 * Filter state for a Sites page. `filters` = what's typed in the panel, `applied` = what the list uses.
 * role: 'admin' | 'manager' (categories endpoint); defaults: starting values (e.g. status 'Approved').
 */
export function useSiteFilters({ role, defaults = {}, onChange }) {
    const start = useMemo(() => ({ ...EMPTY, ...defaults }), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [filters, setFilters] = useState(start);
    const [applied, setApplied] = useState(start);
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const changed = (next) => { setApplied(next); onChange?.(); };

    // Categories of the listed sites (FC sites only when FC is on)
    useEffect(() => {
        setCatLoading(true);
        const p = new URLSearchParams();
        if (applied.fc) p.set('fc', '1');
        if (applied.status) p.set('filter_website_status', applied.status);
        const url = role === 'admin' ? `${API_BASE_URL}/admin/sites/categories` : `${API_BASE_URL}/manager/websites/categories`;
        fetch(`${url}?${p}`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } })
            .then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => setCategories([]))
            .finally(() => setCatLoading(false));
    }, [role, applied.fc, applied.status]);

    // Domain search applies while typing (short pause)
    useEffect(() => {
        const t = setTimeout(() => setApplied(a => {
            if (a.search === filters.search) return a;
            onChange?.();
            return { ...a, search: filters.search };
        }), 400);
        return () => clearTimeout(t);
    }, [filters.search]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (k) => (v) => setFilters(f => ({ ...f, [k]: v }));
    /** Change one value and apply it straight away (keeps the other typed values as they are) */
    const setNow = (k, v, extra = {}) => { setFilters(f => ({ ...f, [k]: v, ...extra })); changed({ ...applied, [k]: v, ...extra }); };
    const apply = () => changed({ ...filters, search: applied.search, fc: applied.fc, type: applied.type, sort: applied.sort });
    const reset = () => { setFilters(start); changed(start); };
    // FC (FC prices) applies straight away; the price range is for the other price list, so it's cleared
    const setFc = (on) => setNow('fc', on ? '1' : '', { min_price: '', max_price: '' });

    const activeCount = Object.entries(applied).filter(([k, v]) => !TOOLBAR_KEYS.includes(k) && v !== '' && v !== start[k]).length;

    /** Query parameters for the Sites list endpoints */
    const params = () => {
        const a = applied;
        const out = {};
        const put = (k, v) => { if (v !== '' && v !== undefined && v !== null) out[k] = v; };
        put('search_domain', a.search.trim());
        put('filter_website_status', a.status);
        put('search_email', a.email.trim());
        put('search_niche', a.website_niche.trim());
        put('filter_new_arrival', a.new_arrival);
        put('fc', a.fc);
        ['type', 'category', 'sort', 'min_price', 'max_price', 'min_dr', 'max_dr', 'min_da', 'max_da', 'min_traffic', 'max_traffic'].forEach(k => put(k, a[k]));
        return out;
    };

    return { filters, applied, set, setNow, setFc, apply, reset, activeCount, categories, catLoading, params, fcOn: applied.fc === '1' };
}

// ─── Panel ────────────────────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-900 hover:text-slate-900">
                {title}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-5 pb-4">{children}</div>}
        </div>
    );
}

const inputCls = 'w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-glow)]';

function Range({ min, max, onMin, onMax, onEnter, hint, placeholderMin = 'Min', placeholderMax = 'Max' }) {
    const key = (e) => { if (e.key === 'Enter') onEnter?.(); };
    return (
        <div>
            <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} type="number" min="0" placeholder={placeholderMin} value={min} onChange={e => onMin(e.target.value)} onKeyDown={key} />
                <input className={inputCls} type="number" min="0" placeholder={placeholderMax} value={max} onChange={e => onMax(e.target.value)} onKeyDown={key} />
            </div>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
        </div>
    );
}

/** Searchable category dropdown with site counts ('' = all categories) */
function CategoryPicker({ categories, value, onChange, loading }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

    const list = useMemo(() => {
        const t = q.trim().toLowerCase();
        return t ? categories.filter(c => c.name.toLowerCase().includes(t)) : categories;
    }, [categories, q]);

    const pick = (name) => { onChange(name); setOpen(false); };
    const Option = ({ name, count, active }) => (
        <button type="button" onClick={() => pick(name)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:text-[var(--color-primary)] font-semibold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'}`}>
            <span className="w-4 shrink-0 text-inherit">{active && <Check className="h-4 w-4" />}</span>
            <span className="flex-1 truncate text-inherit">{name || 'All categories'}</span>
            {count !== undefined && <span className="text-xs text-slate-400 tabular-nums">{count.toLocaleString()}</span>}
        </button>
    );

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`w-full h-10 flex items-center gap-2 rounded-lg border bg-white px-3 text-sm text-left transition ${open ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-glow)]' : 'border-slate-300 hover:border-slate-400'}`}>
                <span className={`flex-1 truncate ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{value || 'All categories'}</span>
                {value && (
                    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700" aria-label="Clear category"><X className="h-3.5 w-3.5" /></span>
                )}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search categories…"
                                className="w-full h-8 rounded-md bg-slate-50 border border-slate-200 pl-8 pr-2 text-sm text-slate-900 outline-none focus:border-[var(--color-primary)] focus:bg-white" />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                        {!q && <Option name="" active={!value} />}
                        {loading ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-400">Loading categories…</p>
                        ) : list.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-400">No category matches "{q}"</p>
                        ) : list.map(c => <Option key={c.name} name={c.name} count={c.count} active={value.toLowerCase() === c.name.toLowerCase()} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

function Select({ value, onChange, children }) {
    return (
        <div className="relative">
            <select className={`${inputCls} pr-8 appearance-none cursor-pointer`} value={value} onChange={e => onChange(e.target.value)}>{children}</select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
    );
}

/**
 * The filter panel. f = useSiteFilters(); className sizes/positions the panel on the page.
 * allStatusLabel: the label of the Status option '' (what the list shows with no status picked).
 */
export function SiteFilterPanel({ f, className = '', allStatusLabel = 'All statuses' }) {
    const { filters, set, apply, reset, activeCount, fcOn } = f;
    // never taller than the space left below it on screen, so "Apply Filters" stays visible (sections scroll inside)
    const ref = useRef(null);
    const [maxHeight, setMaxHeight] = useState(null);
    useEffect(() => {
        const fit = () => {
            const el = ref.current;
            if (!el) return;
            const top = Math.max(el.getBoundingClientRect().top, 0);
            setMaxHeight(Math.max(320, Math.floor(window.innerHeight - top - 16)));
        };
        fit();
        window.addEventListener('scroll', fit, true);
        window.addEventListener('resize', fit);
        return () => { window.removeEventListener('scroll', fit, true); window.removeEventListener('resize', fit); };
    }, []);
    return (
        <aside ref={ref} style={maxHeight ? { maxHeight } : undefined}
            className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />Filters
                </span>
                {activeCount > 0 && <button type="button" onClick={reset} className="text-xs font-medium text-slate-500 hover:text-[var(--color-primary)]">Clear all ({activeCount})</button>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Section title="Status">
                    <Select value={filters.status} onChange={(v) => f.setNow('status', v)}>
                        <option value="">{allStatusLabel}</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                    </Select>
                </Section>
                <Section title={fcOn ? 'FC Price ($)' : 'Price ($)'}>
                    <Range min={filters.min_price} max={filters.max_price} onMin={set('min_price')} onMax={set('max_price')} onEnter={apply}
                        hint={fcOn ? 'Filters by the FC prices' : null} />
                </Section>
                <Section title="Category">
                    <CategoryPicker categories={f.categories} loading={f.catLoading} value={filters.category} onChange={(v) => f.setNow('category', v)} />
                </Section>
                <Section title="Domain Rating (DR)" defaultOpen={false}>
                    <Range min={filters.min_dr} max={filters.max_dr} onMin={set('min_dr')} onMax={set('max_dr')} onEnter={apply} placeholderMin="0" placeholderMax="100" />
                </Section>
                <Section title="Domain Authority (DA)" defaultOpen={false}>
                    <Range min={filters.min_da} max={filters.max_da} onMin={set('min_da')} onMax={set('max_da')} onEnter={apply} placeholderMin="0" placeholderMax="100" />
                </Section>
                <Section title="Organic Traffic" defaultOpen={false}>
                    <Range min={filters.min_traffic} max={filters.max_traffic} onMin={set('min_traffic')} onMax={set('max_traffic')} onEnter={apply} />
                </Section>
                <Section title="More" defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Contact email</label>
                            <input className={inputCls} placeholder="Search by email" value={filters.email} onChange={e => set('email')(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Sub-niche</label>
                            <input className={inputCls} placeholder="e.g. Fitness" value={filters.website_niche} onChange={e => set('website_niche')(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">New arrivals (last 7 days)</label>
                            <Select value={filters.new_arrival} onChange={(v) => f.setNow('new_arrival', v)}>
                                <option value="">Any</option>
                                <option value="yes">Only new</option>
                                <option value="no">Hide new</option>
                            </Select>
                        </div>
                    </div>
                </Section>
            </div>

            <div className="p-4 border-t border-slate-200 shrink-0">
                <button type="button" onClick={apply}
                    className="w-full h-10 rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-white hover:text-white hover:bg-[var(--color-primary-hover)] shadow-sm transition-colors">
                    Apply Filters
                </button>
            </div>
        </aside>
    );
}

// ─── Toolbar: order type, FC, sort ───────────────────────────────────

export function SiteToolbar({ f, className = '' }) {
    const { applied, fcOn } = f;
    return (
        <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
            {/* Order type */}
            <div className="flex items-center gap-1 p-1 h-10 rounded-xl bg-slate-100 shrink-0">
                {TABS.map(([v, l, Icon]) => (
                    <button key={v} type="button" onClick={() => f.setNow('type', v)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold transition-all ${applied.type === v
                            ? 'bg-[var(--color-primary)] text-white hover:text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}>
                        <Icon className="h-4 w-4" />{l}
                    </button>
                ))}
            </div>

            {/* FC: only sites that take FC content, with their FC prices (off by default) */}
            <button type="button" onClick={() => f.setFc(!fcOn)} role="switch" aria-checked={fcOn}
                title="FC = sites that accept FC content, filtered and sorted by their FC prices"
                className={`inline-flex items-center gap-2.5 h-10 pl-3.5 pr-3 rounded-xl border text-sm font-semibold transition-all shrink-0 ${fcOn
                    ? 'border-red-200 bg-red-50 text-red-700 hover:text-red-700 shadow-sm shadow-red-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}>
                <ShieldAlert className={`h-4 w-4 ${fcOn ? 'text-red-600' : 'text-slate-400'}`} />
                FC prices
                <span className={`relative w-9 h-5 rounded-full transition-colors ${fcOn ? 'bg-red-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fcOn ? 'translate-x-4' : ''}`} />
                </span>
            </button>

            {/* Sort */}
            <div className="relative shrink-0">
                <ArrowUpDown className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-700 outline-none appearance-none cursor-pointer hover:border-slate-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-glow)] w-48"
                    value={applied.sort} onChange={e => f.setNow('sort', e.target.value)} aria-label="Sort sites">
                    {SORTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>
    );
}
