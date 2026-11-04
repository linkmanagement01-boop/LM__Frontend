import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Megaphone, FileText, PenSquare, Plus, Search, X, ArrowRight, HelpCircle } from 'lucide-react';
import { Footer } from '../components/Footer';
import { SiteNav } from '../components/SiteNav';

/**
 * Public FAQ page (/faq) – three tabs; the questions come from Admin → More Links → FAQs.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const TABS = [
  { value: 'advertiser', label: 'Advertiser', icon: Megaphone, blurb: 'Buying links and placing orders' },
  { value: 'publisher', label: 'Publisher', icon: FileText, blurb: 'Selling links on your sites' },
  { value: 'content_writing', label: 'Content Writing', icon: PenSquare, blurb: 'Articles written for your orders' }
];

// Answers are written in the admin's rich-text box – keep simple formatting only
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'SPAN', 'IMG']);
// the only attributes kept: a link's href and an image's src (web or embedded image only)
const KEEP = { A: 'href', IMG: 'src' };
const cleanHtml = (html) => {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const walk = (node) => {
    [...node.children].forEach((el) => {
      if (!ALLOWED.has(el.tagName)) { el.replaceWith(...el.childNodes); return walk(node); }
      [...el.attributes].forEach(a => { if (KEEP[el.tagName] !== a.name) el.removeAttribute(a.name); });
      if (el.tagName === 'IMG') {
        if (!/^(https?:|data:image\/(png|jpe?g|gif|webp);)/i.test(el.getAttribute('src') || '')) { el.remove(); return; }
        el.setAttribute('alt', ''); el.setAttribute('loading', 'lazy');
      }
      if (el.tagName === 'A') {
        if (!/^(https?:|mailto:|\/)/i.test(el.getAttribute('href') || '')) el.removeAttribute('href');
        el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer');
      }
      walk(el);
    });
  };
  walk(doc.body.firstChild);
  return doc.body.firstChild.innerHTML;
};
const plain = (html) => new DOMParser().parseFromString(String(html || '').replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, '$& '), 'text/html').body.textContent.replace(/\s+/g, ' ').trim();

export function FaqPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(t => t.value === params.get('tab')) ? params.get('tab') : 'advertiser';
  const [faqs, setFaqs] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { document.title = 'FAQ – Link Management'; }, []);
  useEffect(() => {
    fetch(`${API_BASE_URL}/public/faqs`).then(r => r.json())
      .then(d => setFaqs((d.faqs || []).map(f => ({ ...f, q: plain(f.question), html: cleanHtml(f.answer) }))))
      .catch(() => { setFaqs([]); setFailed(true); });
  }, []);

  const q = search.trim().toLowerCase();
  const list = useMemo(() => (faqs || []).filter(f => (q
    // searching looks through every tab
    ? (f.q.toLowerCase().includes(q) || plain(f.html).toLowerCase().includes(q))
    : f.category === tab)), [faqs, tab, q]);
  // first question of a tab starts open
  useEffect(() => { setOpen(list[0]?.id ?? null); }, [tab, faqs]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (v) => { setSearch(''); setParams(v === 'advertiser' ? {} : { tab: v }, { replace: true }); };
  const count = (v) => (faqs || []).filter(f => f.category === v).length;
  const tabOf = (v) => TABS.find(t => t.value === v);

  return (
    <div className="min-h-screen bg-[#FBFAFF] font-['Inter'] text-slate-800 overflow-x-hidden selection:bg-violet-200">
      <SiteNav current="FAQ" />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute top-10 left-[-8%] h-64 w-64 rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-10 md:pt-36 md:pb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-xs font-bold uppercase tracking-wider text-violet-700">
            <HelpCircle className="h-3.5 w-3.5" /> Help centre
          </span>
          <h1 className="mt-4 font-['Plus_Jakarta_Sans'] text-4xl md:text-5xl font-extrabold tracking-tight text-[#1E1B4B]">
            Frequently asked <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">questions</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-slate-600">
            Answers for advertisers, publishers and writers. Can't find what you need? Write to us and we'll get back to you within 48 hours.
          </p>
          <div className="relative mt-7 max-w-xl">
            <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all questions…" aria-label="Search questions"
              className="w-full h-14 rounded-2xl border border-violet-100 bg-white pl-12 pr-12 text-base text-slate-900 shadow-lg shadow-violet-500/5 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </header>

      {/* Tabs + questions */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {TABS.map(({ value, label, icon: Icon, blurb }) => {
              const on = !q && tab === value;
              return (
                <button key={value} onClick={() => pick(value)}
                  className={`shrink-0 lg:w-full flex items-center gap-3 rounded-2xl px-4 py-3 lg:py-3.5 text-left transition-all ${on
                    ? 'bg-violet-600 text-white hover:text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white text-slate-700 hover:text-violet-700 border border-violet-100 hover:border-violet-200'}`}>
                  <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${on ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${on ? 'text-white' : 'text-inherit'}`}>{label}</span>
                    <span className={`hidden lg:block text-xs mt-0.5 ${on ? 'text-violet-100' : 'text-slate-500'}`}>{blurb}</span>
                  </span>
                  {faqs && <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count(value)}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {q && <p className="mb-4 text-sm text-slate-500">{list.length} result{list.length === 1 ? '' : 's'} for “{search.trim()}”</p>}
          {!faqs ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-[68px] rounded-2xl bg-white border border-violet-100 animate-pulse" />)}</div>
          ) : list.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-200 bg-white px-6 py-14 text-center">
              <HelpCircle className="h-8 w-8 mx-auto text-violet-300" />
              <p className="mt-3 text-sm text-slate-500">{failed ? 'The questions could not be loaded – please try again later.' : q ? 'No question matches your search.' : 'Questions for this topic are coming soon.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((f) => {
                const isOpen = open === f.id;
                return (
                  <div key={f.id} className={`rounded-2xl border bg-white transition-all ${isOpen ? 'border-violet-200 shadow-lg shadow-violet-500/5' : 'border-violet-100 hover:border-violet-200'}`}>
                    <button onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}
                      className="w-full flex items-center gap-4 px-5 md:px-6 py-5 text-left">
                      <span className="flex-1 min-w-0">
                        {q && <span className="block text-[11px] font-bold uppercase tracking-wider text-violet-500 mb-1">{tabOf(f.category)?.label}</span>}
                        <span className={`block text-base font-bold ${isOpen ? 'text-violet-700' : 'text-[#1E1B4B]'}`}>{f.q}</span>
                      </span>
                      <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-violet-600 text-white rotate-45' : 'bg-violet-50 text-violet-600'}`}>
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="faq-answer px-5 md:px-6 pb-6 -mt-1 text-[15px] leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: f.html }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-10 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-5"
            style={{ background: 'linear-gradient(120deg, #4C1D95 0%, #6D28D9 50%, #A855F7 100%)' }}>
            <div>
              <h2 className="text-xl font-bold text-white">Still have a question?</h2>
              <p className="mt-1 text-sm text-violet-100">Create a free account and our team will help you get started.</p>
            </div>
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-white text-sm font-bold text-violet-700 hover:text-violet-800 shadow-md">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
