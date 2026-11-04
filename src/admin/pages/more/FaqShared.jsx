import React from 'react';
import { Megaphone, PenSquare, FileText } from 'lucide-react';
import { RichTextEditor } from '../../../components/RichTextEditor';

/** The FAQ page's tabs (category value → label) – same order as on the public /faq page */
export const FAQ_TABS = [
    { value: 'advertiser', label: 'Advertiser', icon: Megaphone },
    { value: 'publisher', label: 'Publisher', icon: FileText },
    { value: 'content_writing', label: 'Content Writing', icon: PenSquare }
];
export const tabLabel = (v) => FAQ_TABS.find(t => t.value === v)?.label || 'Advertiser';

/**
 * Old questions were saved from a rich-text box ("<p>…</p>") – show them as plain text.
 * DOMParser documents are inert (a div's innerHTML would load <img onerror=…> and run it).
 */
export const plainText = (html) =>
    // a space after each block so paragraphs / list items don't run together
    (new DOMParser().parseFromString(String(html || '').replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, '$& '), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();

const label = 'block text-sm font-semibold text-slate-700 mb-1.5';
const input = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';

/** Fields shared by Create / Edit FAQ. form: { question, answer, is_active, category, sort_order } */
export function FaqFields({ form, setForm }) {
    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    return (
        <div className="space-y-5">
            <div>
                <span className={label}>Tab on the FAQ page<span className="text-red-500">*</span></span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {FAQ_TABS.map(({ value, label: l, icon: Icon }) => {
                        const on = (form.category || 'advertiser') === value;
                        return (
                            <button key={value} type="button" onClick={() => set('category', value)}
                                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-all ${on
                                    ? 'border-violet-500 bg-violet-50 text-violet-700 hover:text-violet-700 ring-4 ring-violet-500/10'
                                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}>
                                <Icon className="h-4 w-4" />{l}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className={label} htmlFor="faq-q">Question<span className="text-red-500">*</span></label>
                <input id="faq-q" className={input} value={form.question} onChange={e => set('question', e.target.value)}
                    placeholder="e.g. What does each order status mean?" />
            </div>

            <div>
                <RichTextEditor label="Answer" value={form.answer} onChange={(v) => set('answer', v)} placeholder="Write the answer…" required={true} />
            </div>

            <div className="flex flex-wrap items-end gap-6">
                <div className="w-40">
                    <label className={label} htmlFor="faq-order">Order</label>
                    <input id="faq-order" type="number" className={input} value={form.sort_order ?? 0} onChange={e => set('sort_order', e.target.value)} />
                    <p className="text-xs text-slate-500 mt-1">Lower numbers show first</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer pb-6">
                    <span className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-violet-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-[22px]' : 'left-[2px]'}`} />
                    </span>
                    <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} className="hidden" />
                    <span className="text-sm font-medium text-slate-700">Show on the FAQ page</span>
                </label>
            </div>
        </div>
    );
}

export const btnPrimary = 'inline-flex items-center justify-center h-10 px-5 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:text-white hover:bg-violet-700 shadow-sm disabled:opacity-50 transition-colors';
export const btnGhost = 'inline-flex items-center justify-center h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-colors';
