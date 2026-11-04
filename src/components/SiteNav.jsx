import React, { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

/**
 * The public website's top bar (home page, FAQ page, …).
 * home: on the home page the items scroll to its sections; on other pages they open those sections on the home page.
 * current: the item for the page you're on (e.g. 'FAQ') – shown highlighted.
 */
const NAV = ['Home', 'About', 'Features', 'Results', 'How it Works', 'FAQ'];

export function SiteNav({ home = false, current = null }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // FAQ has its own page (content managed in Admin → FAQs); the rest are sections of the home page
  const href = (item) => {
    if (item === 'FAQ') return '/faq';
    const section = `#${item.toLowerCase().replace(/ /g, '-')}`;
    return home ? section : `/${section}`;
  };
  const on = (item) => item === current;

  return (
    <>
      {/* --- MOBILE MENU --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl md:hidden flex flex-col pt-24 px-8 pb-8">
          <button onClick={() => setMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col gap-7 text-center text-2xl font-extrabold text-slate-800">
            {NAV.map((item) => (
              <a key={item} onClick={() => setMobileMenuOpen(false)} href={href(item)}
                className={`${on(item) ? 'text-violet-600' : 'text-slate-800'} hover:text-violet-600 transition-colors`}>{item}</a>
            ))}
            <div className="h-px w-full bg-slate-200 my-2" />
            <a href="/login" className="text-slate-600 hover:text-violet-700">Login</a>
            <a href="/signup" className="mx-auto inline-flex items-center gap-2 bg-violet-600 text-white hover:text-white hover:bg-violet-700 px-8 py-3.5 rounded-full text-lg">Start Free <ArrowRight size={18} /></a>
          </div>
        </div>
      )}

      {/* --- NAVIGATION --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-violet-100 shadow-[0_4px_30px_rgba(76,29,149,0.05)] py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href={home ? '#home' : '/'} className="flex items-center gap-3 group hover:text-inherit">
            <img src="/brand/logo-mark.svg" alt="" className="w-9 h-9 group-hover:rotate-[-8deg] transition-transform duration-300" />
            <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg tracking-tight text-[#1E1B4B]">Link <span className="text-violet-600">Management</span></span>
          </a>

          <div className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-md p-1.5 rounded-full border border-violet-100 shadow-sm">
            {NAV.map((item) => (
              <a key={item} href={href(item)} aria-current={on(item) ? 'page' : undefined}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${on(item) ? 'bg-violet-600 text-white hover:text-white' : 'text-slate-600 hover:text-violet-700 hover:bg-violet-50'}`}>
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a href="/login" className="hidden md:block text-sm font-bold text-slate-600 hover:text-violet-700 transition-colors">Login</a>
            <a href="/signup" className="hidden md:inline-flex h-11 items-center gap-2 rounded-full bg-violet-600 px-6 font-bold text-white hover:text-white text-sm shadow-[0_8px_24px_-6px_rgba(124,58,237,0.55)] hover:bg-violet-700 hover:-translate-y-0.5 transition-all">
              Start Free <ArrowRight size={16} />
            </a>
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 text-slate-700 bg-white border border-violet-100 rounded-full shadow-sm" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
