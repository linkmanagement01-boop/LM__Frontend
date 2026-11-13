import React from 'react';

/**
 * The site details an Outreach Team member enters for a client's requested domain (also used by managers to review/edit).
 * Required to submit / approve: blogger email, GP price (or NE price), website niche, main category.
 */
export const MAIN_CATEGORIES = [
    'General', 'Technology', 'Education', 'Business', 'Finance', 'Crypto', 'Health', 'Fitness', 'Food', 'Travel', 'Lifestyle',
    'Fashion & Beauty', 'Home Improvement', 'Real Estate', 'Construction', 'Design', 'Automotive', 'Entertainment', 'Celebrity',
    'News', 'Sports', 'Gaming', 'Parenting', 'Pets', 'Religion', 'Marketing', 'Legal', 'Casino', 'CBD', 'Adult'
];

export const EMPTY_DETAILS = {
    blogger_email: '', gp_price: '', ne_price: '', website_niche: '', category: '',
    fc_accepted: false, fc_gp: '', fc_ne: '', da: '', dr: '', traffic: '', country: '', sample_url: '', note: ''
};

/** API details (numbers / null) → form values (strings) */
export const toForm = (d = {}) => Object.fromEntries(Object.entries(EMPTY_DETAILS).map(([k, empty]) => {
    const v = d[k];
    if (k === 'fc_accepted') return [k, !!v];
    return [k, v === null || v === undefined ? empty : String(v)];
}));

/** Same rule as the server, to show what's still missing before submitting */
export const missingFields = (f) => {
    const m = [];
    if (!f.blogger_email.trim()) m.push('Blogger email');
    if (!(Number(f.gp_price) > 0) && !(Number(f.ne_price) > 0)) m.push('GP price');
    if (!f.website_niche.trim()) m.push('Website niche');
    if (!f.category) m.push('Main category');
    if (f.fc_accepted && !(Number(f.fc_gp) > 0) && !(Number(f.fc_ne) > 0)) m.push('FC price');
    return m;
};

const Field = ({ label, required, hint, children, className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {label}{required && <span className="text-red-500"> *</span>}
        </label>
        {children}
        {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
);

export function OutreachDetailsForm({ value, onChange, readOnly = false }) {
    const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    const input = 'premium-input w-full py-2 text-sm disabled:opacity-70';
    const money = (k, ph) => (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
            <input type="number" min="0" step="0.01" className={`${input} pl-7`} value={value[k]} onChange={set(k)} placeholder={ph} disabled={readOnly} />
        </div>
    );
    return (
        <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Blogger email" required hint="The site owner's email – if they already have a blogger account, the site is linked to it">
                    <input type="email" className={input} value={value.blogger_email} onChange={set('blogger_email')} placeholder="owner@site.com" disabled={readOnly} />
                </Field>
                <Field label="Main category" required>
                    <select className={input} value={value.category} onChange={set('category')} disabled={readOnly}>
                        <option value="">Select…</option>
                        {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        {value.category && !MAIN_CATEGORIES.includes(value.category) && <option value={value.category}>{value.category}</option>}
                    </select>
                </Field>
                <Field label="Website niche" required hint="2–5 topics, e.g. Technology, Gaming, Lifestyle" className="sm:col-span-2">
                    <input className={input} value={value.website_niche} onChange={set('website_niche')} placeholder="Technology, Gaming, Lifestyle" maxLength={500} disabled={readOnly} />
                </Field>
            </div>

            <div>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Blogger prices (what the site charges us)</p>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="GP price" required>{money('gp_price', 'e.g. 25')}</Field>
                    <Field label="NE price">{money('ne_price', 'optional')}</Field>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={value.fc_accepted} onChange={set('fc_accepted')} disabled={readOnly} className="h-4 w-4 accent-[var(--primary-cyan)]" />
                    FC content accepted (Casino / CBD / Crypto)
                </label>
                {value.fc_accepted && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <Field label="FC GP price">{money('fc_gp', 'e.g. 50')}</Field>
                        <Field label="FC NE price">{money('fc_ne', 'optional')}</Field>
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Site metrics <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(optional – shown on the marketplace card)</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="DA"><input type="number" min="0" max="100" className={input} value={value.da} onChange={set('da')} disabled={readOnly} /></Field>
                    <Field label="DR"><input type="number" min="0" max="100" className={input} value={value.dr} onChange={set('dr')} disabled={readOnly} /></Field>
                    <Field label="Traffic"><input type="number" min="0" className={input} value={value.traffic} onChange={set('traffic')} disabled={readOnly} /></Field>
                    <Field label="Country"><input className={input} value={value.country} onChange={set('country')} placeholder="USA" disabled={readOnly} /></Field>
                </div>
            </div>

            <Field label="Sample post URL">
                <input className={input} value={value.sample_url} onChange={set('sample_url')} placeholder="https://site.com/a-published-article" disabled={readOnly} />
            </Field>
            <Field label="Note for the manager">
                <textarea className={`${input} min-h-[70px]`} value={value.note} onChange={set('note')} maxLength={1000} placeholder="Anything the manager should know – turnaround, link type, contact details…" disabled={readOnly} />
            </Field>
        </div>
    );
}
