import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, CircleDollarSign, ShieldCheck } from 'lucide-react';

/**
 * Shared layout for Login / Sign up: violet brand panel on the left (desktop), form on the right.
 * Matches the public home page theme.
 */

/** Input styling shared by the auth forms */
export const authInput = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15 transition-all duration-200';
export const authIcon = 'absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-violet-600 transition-colors';
export const authLabel = 'block text-xs font-bold text-slate-500 tracking-wider mb-2';
export const authButton = 'w-full bg-violet-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-violet-700 active:scale-[0.98] transition-all duration-200 shadow-[0_12px_28px_-10px_rgba(124,58,237,0.6)] disabled:opacity-50 disabled:cursor-not-allowed group';

function Wordmark({ light }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 group hover:text-inherit">
      <img src={light ? '/brand/logo-mark-white.svg' : '/brand/logo-mark.svg'} alt="" className="w-10 h-10 group-hover:rotate-[-8deg] transition-transform duration-300" />
      <span className={`font-['Plus_Jakarta_Sans'] font-extrabold text-xl tracking-tight ${light ? 'text-white' : 'text-[#1E1B4B]'}`}>
        Link <span className={light ? 'text-violet-300' : 'text-violet-600'}>Management</span>
      </span>
    </Link>
  );
}

export function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="min-h-screen bg-[#FBFAFF] text-slate-900 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">

      {/* --- Brand panel (desktop) --- */}
      <aside className="hidden lg:flex relative overflow-hidden bg-[#1E1336] text-white flex-col justify-between p-12 xl:p-16">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-violet-600/45 blur-[110px]" />
        <div className="absolute -bottom-40 -right-32 w-[480px] h-[480px] rounded-full bg-fuchsia-500/30 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative"><Wordmark light /></div>

        <div className="relative max-w-md">
          <h2 className="font-['Plus_Jakarta_Sans'] text-4xl xl:text-[2.75rem] font-extrabold leading-[1.12] tracking-tight text-white">
            Turn your website into a <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">steady income.</span>
          </h2>
          <ul className="mt-8 space-y-3.5 text-violet-100">
            {['Orders arrive with the content ready to publish', 'Your wallet is credited for every verified link', 'Withdraw by PayPal, UPI or bank transfer'].map((t) => (
              <li key={t} className="flex items-start gap-3 text-violet-100"><CheckCircle size={19} className="text-violet-300 mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{ opacity: { delay: 0.4 }, y: { delay: 0.4, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
            className="mt-10 inline-flex items-center gap-3 bg-white rounded-2xl pl-2.5 pr-5 py-2.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CircleDollarSign size={20} /></span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900">+$120 credited</span>
              <span className="block text-xs text-slate-500">Guest Post verified</span>
            </span>
          </motion.div>
        </div>

        <div className="relative text-sm text-violet-200">Trusted by 5,000+ publishers</div>
      </aside>

      {/* --- Form side --- */}
      <main className="relative flex flex-col items-center justify-center px-5 py-12 sm:px-8 overflow-hidden">
        <div className="lg:hidden absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full bg-violet-200/50 blur-[100px] pointer-events-none" />
        <div className={`relative w-full ${wide ? 'max-w-[560px]' : 'max-w-[440px]'}`}>
          <div className="lg:hidden mb-10 flex justify-center"><Wordmark /></div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-[2rem] font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-2 mb-8">{subtitle}</p>
          {children}
          {footer && <div className="mt-8 pt-6 border-t border-slate-200/70 text-center text-sm text-slate-500 font-medium">{footer}</div>}
          <div className="mt-8 flex justify-center items-center gap-2 text-slate-400 font-medium text-xs">
            <ShieldCheck className="w-4 h-4" /><span>Secure SSL encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      <p className="text-sm text-red-600 font-medium">{message}</p>
    </div>
  );
}
