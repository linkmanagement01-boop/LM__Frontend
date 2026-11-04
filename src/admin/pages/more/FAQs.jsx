import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Pencil, Plus, ExternalLink, HelpCircle } from 'lucide-react';
import { FAQ_TABS, plainText } from './FaqShared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/** Admin → More Links → FAQs: the questions on the public /faq page, one tab per audience */
export function FAQs() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('advertiser');

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${API_BASE_URL}/admin/faqs`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json();
                if (response.ok) setFaqs(data.faqs || []);
            } catch (error) {
                console.error('Failed to fetch faqs:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const counts = useMemo(() => Object.fromEntries(FAQ_TABS.map(t => [t.value, faqs.filter(f => (f.category || 'advertiser') === t.value).length])), [faqs]);
    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return faqs
            .filter(f => (f.category || 'advertiser') === tab)
            .filter(f => !q || plainText(f.question).toLowerCase().includes(q) || plainText(f.answer).toLowerCase().includes(q));
    }, [faqs, tab, search]);

    return (
        <div className="max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">FAQs</h1>
                    <p className="text-sm text-slate-500 mt-1">The questions on the public FAQ page – one tab per audience.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <a href="/faq" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                        <ExternalLink className="h-4 w-4" />View FAQ page
                    </a>
                    <Link to="/admin/more/faqs/create"
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:text-white hover:bg-violet-700 shadow-sm">
                        <Plus className="h-4 w-4" />New FAQ
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100">
                        {FAQ_TABS.map(({ value, label, icon: Icon }) => (
                            <button key={value} onClick={() => setTab(value)}
                                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold transition-all ${tab === value ? 'bg-white text-violet-700 hover:text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                                <Icon className="h-4 w-4" />{label}
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === value ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'}`}>{counts[value] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
                ) : shown.length === 0 ? (
                    <div className="py-16 text-center">
                        <HelpCircle className="h-8 w-8 mx-auto text-violet-300" />
                        <p className="mt-2 text-sm text-slate-500">{search ? 'No question matches your search' : 'No questions in this tab yet'}</p>
                        {!search && <Link to="/admin/more/faqs/create" className="inline-block mt-3 text-sm font-semibold text-violet-600 hover:text-violet-800">Add the first one</Link>}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map(f => (
                            <li key={f.id} className="flex items-start gap-4 px-5 py-4 hover:bg-violet-50/40 transition-colors">
                                <span className="mt-0.5 h-7 min-w-[28px] px-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center tabular-nums" title="Order">{f.sort_order ?? 0}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900">{plainText(f.question)}</div>
                                    <div className="text-sm text-slate-500 mt-1 line-clamp-2">{plainText(f.answer) || '—'}</div>
                                </div>
                                <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${f.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {f.is_active ? 'Shown' : 'Hidden'}
                                </span>
                                <Link to={`/admin/more/faqs/edit/${f.id}`} title="Edit"
                                    className="shrink-0 h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50">
                                    <Pencil className="h-4 w-4" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
