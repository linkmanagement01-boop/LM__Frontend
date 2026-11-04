import React, { useState } from 'react';
import {
  ArrowRight, CheckCircle, Wallet, ShieldCheck, PenTool, Link2, LayoutDashboard, MessagesSquare,
  Sparkles, BadgeCheck, Globe, Send, Plus, Minus, TrendingUp, BellRing, CircleDollarSign, FileCheck2, Check,
  Smartphone, Landmark, BookOpen, Target, Newspaper, Building2, Briefcase, Store,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '../components/Footer';
import { SiteNav } from '../components/SiteNav';

/**
 * Public home page – light theme, violet brand colour.
 * Sections: hero, logo ribbon, results, how it works, features, about, FAQ, call to action.
 */


const LOGOS = ['Inc42', 'The Write Life', 'Lifehack', 'Inc.', 'TechCrunch', 'Social Media Examiner'];

const STATS = [
  { value: '5,000+', label: 'Active Publishers', desc: 'Verified content creators.' },
  { value: '10k+', label: 'Monthly Orders', desc: 'Consistent inbound deal flow.' },
  { value: '98%', label: 'Satisfaction Rate', desc: 'From top tier publishers.' },
  { value: '24h', label: 'Support Turnaround', desc: 'Dedicated account managers.' },
];

const STEPS = [
  { icon: Globe, title: 'Sign up & list your sites', desc: 'Add your websites one by one or with a bulk file. Our team reviews each site.' },
  { icon: BellRing, title: 'Receive orders', desc: 'Relevant orders land in your dashboard, with the content ready to publish.' },
  { icon: Send, title: 'Publish & submit', desc: 'Publish the post and submit the live URL. We check the link automatically.' },
  { icon: Wallet, title: 'Get paid', desc: 'Your wallet is credited per link. Withdraw by PayPal, UPI or bank transfer.' },
];

const FEATURES = [
  { key: 'revenue', icon: CircleDollarSign, title: 'Continuous revenue', desc: 'Make upwards of $500 every month with consistent brand deals. No more feast or famine cycles.', big: true },
  { key: 'payouts', icon: ShieldCheck, title: 'Secure payouts', desc: 'Request payments whenever you want. Get paid within 24 hours.' },
  { key: 'content', icon: PenTool, title: 'Content written for you', desc: 'SEO-optimized articles from our writers that add authority to your website.' },
  { key: 'checks', icon: Link2, title: 'Automatic link checks', desc: 'Every live link is checked for you – no spreadsheets, no manual follow-ups.', big: true, dark: true },
  { key: 'dashboard', icon: LayoutDashboard, title: 'One clear dashboard', desc: 'Orders, sites, invoices and your wallet in one place, updated in real time.', big: true },
  { key: 'team', icon: MessagesSquare, title: 'A real team behind you', desc: 'Message your manager on every order and get answers fast.' },
];

/* Small illustrations inside the feature cards */
function RevenueVisual() {
  return (
    <div className="relative w-full h-full min-h-[150px] rounded-2xl bg-gradient-to-b from-violet-50 to-white border border-violet-100 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Earnings</span>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">$500+ / month</span>
      </div>
      <svg viewBox="0 0 300 110" className="w-full h-[110px] mt-2" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
          <linearGradient id="revLine" x1="0" x2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#d946ef" /></linearGradient>
        </defs>
        <path d="M0,92 C40,88 60,70 95,74 C130,78 150,52 185,50 C220,48 240,26 300,14 L300,110 L0,110 Z" fill="url(#revFill)" />
        <motion.path d="M0,92 C40,88 60,70 95,74 C130,78 150,52 185,50 C220,48 240,26 300,14" fill="none" stroke="url(#revLine)" strokeWidth="3.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut' }} />
        <circle cx="300" cy="14" r="5" fill="#d946ef" />
      </svg>
    </div>
  );
}

function PayoutVisual() {
  return (
    <div className="space-y-2">
      {[{ icon: Wallet, name: 'PayPal' }, { icon: Smartphone, name: 'UPI' }, { icon: Landmark, name: 'Bank transfer' }].map((m, i) => (
        <motion.div key={m.name} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12 }}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700"><m.icon size={16} className="text-violet-500" />{m.name}</span>
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>
        </motion.div>
      ))}
    </div>
  );
}

function ContentVisual() {
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="h-2.5 w-2/3 rounded-full bg-slate-300" />
      <div className="mt-3 space-y-2">
        <div className="h-2 w-full rounded-full bg-slate-200" />
        <div className="h-2 w-11/12 rounded-full bg-slate-200" />
        <div className="flex items-center gap-1.5"><div className="h-2 w-1/4 rounded-full bg-slate-200" /><div className="h-2 w-1/3 rounded-full bg-violet-400" /><div className="h-2 w-1/4 rounded-full bg-slate-200" /></div>
        <div className="h-2 w-4/5 rounded-full bg-slate-200" />
      </div>
      <span className="absolute -bottom-3 right-4 text-[11px] font-bold text-violet-700 bg-white border border-violet-200 px-2.5 py-1 rounded-full shadow-sm">Ready to publish</span>
    </div>
  );
}

function ChecksVisual() {
  return (
    <div className="w-full rounded-2xl bg-white/[0.06] border border-white/10 p-4">
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] text-violet-100 font-medium">
        <Link2 size={14} className="text-violet-300 shrink-0" /><span className="truncate">yourblog.com/best-travel-tips</span>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {['Page is live', 'Dofollow link', 'Anchor matches', 'No 404 errors'].map((c, i) => (
          <motion.div key={c} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2.5 text-[13px] font-semibold text-white">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-[#1E1336] flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>{c}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="w-full rounded-2xl border border-violet-100 bg-white shadow-[0_12px_30px_-18px_rgba(76,29,149,0.35)] p-4">
      <div className="flex flex-wrap gap-1.5">
        {['Orders', 'Sites', 'Invoices', 'Wallet'].map((t, i) => (
          <span key={t} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[{ k: 'Orders', v: '12' }, { k: 'Links', v: '86' }, { k: 'Wallet', v: '$1,240' }].map((s) => (
          <div key={s.k} className="rounded-xl bg-violet-50/70 px-3 py-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{s.k}</div>
            <div className="font-['Plus_Jakarta_Sans'] text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {[78, 55, 64].map((w, i) => (
          <div key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-400" /><div className="h-1.5 rounded-full bg-slate-100" style={{ width: `${w}%` }} /></div>
        ))}
      </div>
    </div>
  );
}

function TeamVisual() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-end gap-2">
        <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">M</span>
        <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 text-[13px] text-slate-700">Content for your site is ready to publish.</div>
      </div>
      <div className="flex items-end gap-2 justify-end">
        <div className="rounded-2xl rounded-br-md bg-violet-600 px-3.5 py-2 text-[13px] text-white">Done – live link submitted!</div>
        <span className="w-7 h-7 rounded-full bg-fuchsia-100 text-fuchsia-700 text-[11px] font-bold flex items-center justify-center shrink-0">You</span>
      </div>
    </div>
  );
}

const FEATURE_VISUALS = { revenue: RevenueVisual, payouts: PayoutVisual, content: ContentVisual, checks: ChecksVisual, dashboard: DashboardVisual, team: TeamVisual };

const SIDES = {
  publishers: { title: 'Publishers & bloggers', items: [{ icon: BookOpen, name: 'Blogs' }, { icon: Target, name: 'Niche sites' }, { icon: Newspaper, name: 'News & magazines' }] },
  advertisers: { title: 'Advertisers', items: [{ icon: Building2, name: 'Brands' }, { icon: Briefcase, name: 'Agencies' }, { icon: Store, name: 'Resellers' }] },
};

/** Animated dashed line with a dot travelling along it */
function Connector({ reverse }) {
  return (
    <div className="hidden md:block relative h-0.5 w-full border-t-2 border-dashed border-violet-300">
      <motion.span className="absolute -top-[5px] w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.7)]"
        animate={{ left: reverse ? ['100%', '0%'] : ['0%', '100%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  );
}

function SideCard({ side, align }) {
  const s = SIDES[side];
  return (
    <div className={`flex flex-col gap-2.5 ${align === 'right' ? 'md:items-end' : 'md:items-start'} items-center`}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 mb-1">{s.title}</span>
      {s.items.map((it, i) => (
        <motion.div key={it.name} initial={{ opacity: 0, x: align === 'right' ? 16 : -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.1 }}
          className="flex items-center gap-3 bg-white border border-violet-100 rounded-2xl pl-2 pr-5 py-2 shadow-sm w-[210px]">
          <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><it.icon size={17} /></span>
          <span className="font-semibold text-slate-800 text-sm">{it.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

const FAQS = [
  { q: 'Is it free to join?', a: 'Yes. Creating a publisher account and listing your websites is free.' },
  { q: 'Who writes the content?', a: 'Our writers prepare the content for every order. You review it, publish it on your site and submit the live link.' },
  { q: 'How and when do I get paid?', a: 'Each link is credited to your wallet as soon as it is verified. You can request a withdrawal whenever you want, by PayPal, UPI or bank transfer.' },
  { q: 'Which websites can I list?', a: 'Add any website you own. Every site is reviewed by our team before it starts receiving orders.' },
  { q: 'Can I list many websites at once?', a: 'Yes. Upload a bulk file with all your sites and prices and our team will review them together.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

function SectionHead({ eyebrow, title, desc, center = true }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.6 }} className={`mb-14 ${center ? 'text-center mx-auto' : ''} max-w-3xl`}>
      <span className="inline-flex items-center gap-2 text-violet-600 font-bold text-xs tracking-[0.2em] uppercase mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />{eyebrow}
      </span>
      <h2 className="font-['Plus_Jakarta_Sans'] text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">{title}</h2>
      {desc && <p className="text-slate-500 text-lg mt-4 leading-relaxed">{desc}</p>}
    </motion.div>
  );
}

/** Small floating notification used around the hero card */
function FloatChip({ icon: Icon, title, sub, tone, className, delay = 0 }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    pink: 'bg-fuchsia-50 text-fuchsia-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{ opacity: { delay, duration: 0.5 }, scale: { delay, duration: 0.5 }, y: { delay, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
      className={`absolute z-30 flex items-center gap-3 bg-white rounded-2xl pl-2.5 pr-4 py-2.5 shadow-[0_12px_30px_-8px_rgba(76,29,149,0.25)] border border-violet-100 ${className}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-4.5 h-4.5" size={18} /></div>
      <div className="leading-tight">
        <div className="text-[13px] font-bold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
    </motion.div>
  );
}

function HeroCard() {
  const orders = [
    { type: 'Guest Post', site: 'yourblog.com', status: 'Live', cls: 'bg-emerald-50 text-emerald-700' },
    { type: 'Niche Edit', site: 'travelnotes.io', status: 'Publishing', cls: 'bg-violet-50 text-violet-700' },
    { type: 'Guest Post', site: 'homecook.net', status: 'New order', cls: 'bg-fuchsia-50 text-fuchsia-700' },
  ];
  const bars = [32, 44, 38, 56, 50, 68, 90];
  return (
    <div className="relative bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_30px_80px_-20px_rgba(76,29,149,0.28)] border border-violet-100/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center"><Wallet size={16} className="text-white" /></div>
          <span className="font-bold text-slate-900 text-sm">Publisher wallet</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly revenue</div>
          <div className="font-['Plus_Jakarta_Sans'] text-[34px] sm:text-[42px] font-extrabold text-slate-900 tracking-tight leading-none mt-2">$47,300</div>
          <div className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            <TrendingUp size={13} />+12.5% this month
          </div>
        </div>
        <div className="hidden min-[400px]:flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
          {bars.map((h, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, delay: 0.6 + i * 0.08, type: 'spring' }}
              className={`w-2.5 sm:w-3.5 rounded-full ${i === bars.length - 1 ? 'bg-gradient-to-t from-violet-600 to-fuchsia-400' : 'bg-violet-100'}`} />
          ))}
        </div>
      </div>

      <div className="mt-7 pt-5 border-t border-slate-100 space-y-2.5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Recent orders</div>
        {orders.map((o, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.15 }}
            className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><FileCheck2 size={15} className="text-violet-500" /></div>
              <div className="leading-tight">
                <div className="text-[13px] font-bold text-slate-800">{o.type}</div>
                <div className="text-[11px] text-slate-400">{o.site}</div>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${o.cls}`}>{o.status}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[#FBFAFF] text-slate-700 antialiased overflow-x-hidden selection:bg-violet-600 selection:text-white">

      <SiteNav home />

      <main>
        {/* --- HERO --- */}
        <section id="home" className="relative pt-32 md:pt-40 pb-20 md:pb-28 overflow-hidden">
          {/* background: soft violet blobs + dotted grid */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full bg-violet-200/50 blur-[120px]" />
            <div className="absolute top-1/3 -left-48 w-[480px] h-[480px] rounded-full bg-fuchsia-200/40 blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(#7c3aed14_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 items-center relative z-10">
            <motion.div className="lg:col-span-7" initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}>
              <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-white border border-violet-100 shadow-sm">
                <span className="flex items-center justify-center w-6 h-6 bg-violet-600 text-white rounded-full"><Sparkles size={12} /></span>
                <span className="text-[13px] font-semibold text-slate-600">Trusted by 5,000+ publishers</span>
              </motion.div>

              <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className="font-['Plus_Jakarta_Sans'] mt-7 text-[2.6rem] sm:text-6xl lg:text-[4.1rem] leading-[1.05] font-extrabold tracking-tight text-slate-900">
                Unlock your{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 bg-clip-text text-transparent">revenue</span>
                  <svg className="absolute left-0 -bottom-2 w-full h-4 z-0" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
                    <motion.path d="M3 11 C 50 3, 120 3, 197 9" fill="none" stroke="#c4b5fd" strokeWidth="6" strokeLinecap="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.7 }} />
                  </svg>
                </span>
                <br />with sponsorships.
              </motion.h1>

              <motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className="mt-7 text-lg md:text-xl text-slate-500 max-w-[520px] leading-relaxed">
                Land brand deals, publish high-quality content, and get paid fast. One simple platform built for serious content businesses.
              </motion.p>

              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="mt-9 flex flex-col sm:flex-row gap-4">
                <a href="/signup" className="group inline-flex items-center justify-center gap-2 bg-violet-600 text-white hover:text-white px-8 py-4 rounded-full font-bold shadow-[0_14px_34px_-10px_rgba(124,58,237,0.65)] hover:bg-violet-700 hover:-translate-y-0.5 transition-all">
                  Get started free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-slate-700 bg-white border border-slate-200 hover:border-violet-300 hover:text-violet-700 transition-all shadow-sm">
                  See how it works
                </a>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" />Free to join</span>
                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" />Content written for you</span>
                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" />Fast payouts</span>
              </motion.div>
            </motion.div>

            <motion.div className="lg:col-span-5 relative max-w-[480px] w-full mx-auto lg:ml-auto lg:mr-0"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <div className="absolute -inset-6 bg-gradient-to-br from-violet-300/40 via-fuchsia-200/30 to-transparent rounded-[40px] blur-2xl" />
              <div className="relative sm:rotate-[1.5deg] sm:hover:rotate-0 transition-transform duration-500">
                <HeroCard />
              </div>
              <FloatChip icon={CircleDollarSign} tone="green" title="+$120 credited" sub="Guest Post verified" className="-left-4 sm:-left-12 -bottom-8 hidden sm:flex" delay={1.4} />
              <FloatChip icon={BellRing} tone="violet" title="New order" sub="Niche Edit · ready to publish" className="-right-4 sm:-right-8 -top-6 hidden sm:flex" delay={1.7} />
              <FloatChip icon={BadgeCheck} tone="pink" title="Link verified" sub="Live · dofollow" className="-right-4 sm:-right-10 top-[38%] hidden sm:flex" delay={2} />
            </motion.div>
          </div>
        </section>

        {/* --- LOGO RIBBON --- */}
        <section className="py-10 border-y border-violet-100 bg-white overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-slate-400 uppercase mb-7">Monetized by industry leaders</p>
          <div className="flex animate-marquee whitespace-nowrap">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-16 md:gap-28 mx-8">
                {[...LOGOS, ...LOGOS].map((brand, i) => (
                  <span key={`${copy}-${i}`} className="font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-extrabold tracking-tight text-slate-300 hover:text-violet-600 transition-colors cursor-default">{brand}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* --- RESULTS --- */}
        <section id="results" className="py-24 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHead eyebrow="Network scale" title={<>Results that keep <span className="text-violet-600">growing</span></>} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {STATS.map((s, i) => (
                <motion.div key={s.label} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} whileHover={{ y: -6 }}
                  className={`rounded-3xl p-6 md:p-8 border transition-shadow hover:shadow-[0_20px_50px_-20px_rgba(76,29,149,0.35)] ${i === 0 ? 'bg-gradient-to-br from-violet-600 to-purple-700 border-violet-600 text-white' : 'bg-white border-violet-100'}`}>
                  <div className={`font-['Plus_Jakarta_Sans'] text-4xl md:text-5xl font-extrabold tracking-tight ${i === 0 ? 'text-white' : 'text-slate-900'}`}>{s.value}</div>
                  <div className={`mt-3 font-bold ${i === 0 ? 'text-violet-100' : 'text-slate-800'}`}>{s.label}</div>
                  <div className={`text-sm mt-1 ${i === 0 ? 'text-violet-200' : 'text-slate-500'}`}>{s.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section id="how-it-works" className="py-24 md:py-28 bg-white border-y border-violet-100 relative overflow-hidden">
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-violet-100/60 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative">
            <SectionHead eyebrow="How it works" title="From sign-up to payout in 4 steps" desc="No pitching, no chasing invoices. We bring the orders and the content – you publish and get paid." />
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="hidden lg:block absolute top-[46px] left-[12%] right-[12%] border-t-2 border-dashed border-violet-200" />
              {STEPS.map((s, i) => (
                <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.12 }} className="relative text-center group">
                  <div className="relative mx-auto w-[92px] h-[92px] rounded-[28px] bg-white border border-violet-100 shadow-[0_14px_30px_-12px_rgba(76,29,149,0.3)] flex items-center justify-center group-hover:-translate-y-1.5 group-hover:rotate-[-4deg] transition-transform duration-300">
                    <s.icon className="w-9 h-9 text-violet-600" strokeWidth={1.8} />
                    <span className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white text-sm font-extrabold flex items-center justify-center ring-4 ring-white">{i + 1}</span>
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] mt-7 text-lg font-extrabold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-slate-500 leading-relaxed max-w-[260px] mx-auto">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FEATURES (bento) --- */}
        <section id="features" className="py-24 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHead eyebrow="Why publishers choose us" title={<>Everything you need to <span className="text-violet-600">earn more</span></>}
              desc="Most platforms hit a glass ceiling. Ours is built to grow your content business." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => {
                const Visual = FEATURE_VISUALS[f.key];
                return (
                  <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }} whileHover={{ y: -4 }}
                    className={`group relative overflow-hidden rounded-3xl p-7 md:p-8 border transition-shadow duration-300 hover:shadow-[0_24px_60px_-24px_rgba(76,29,149,0.4)]
                      ${f.big ? 'md:col-span-2' : ''} ${f.dark ? 'bg-[#1E1336] border-[#1E1336]' : 'bg-white border-violet-100 hover:border-violet-300'}`}>
                    {f.dark && <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-violet-600/40 blur-[70px]" />}
                    <div className={`relative h-full flex gap-7 ${f.big ? 'flex-col md:flex-row md:items-center' : 'flex-col'}`}>
                      <div className={f.big ? 'md:w-[44%] shrink-0' : ''}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:rotate-[-8deg] group-hover:scale-110
                          ${f.dark ? 'bg-white/10 text-violet-200' : 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white'}`}>
                          <f.icon size={22} strokeWidth={1.9} />
                        </div>
                        <h3 className={`font-['Plus_Jakarta_Sans'] mt-5 text-xl font-extrabold ${f.dark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                        <p className={`mt-2 leading-relaxed ${f.dark ? 'text-violet-200' : 'text-slate-500'}`}>{f.desc}</p>
                      </div>
                      <div className={`flex-1 ${f.big ? '' : 'mt-auto'}`}><Visual /></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- ABOUT --- */}
        <section id="about" className="py-24 md:py-28 bg-white border-y border-violet-100 relative overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[380px] bg-violet-100/60 blur-[110px] rounded-full pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 relative">
            <SectionHead eyebrow="Who we are" title={<>About <span className="text-violet-600">Link Management</span></>}
              desc="A Publisher Aggregator Platform that brings publishers and advertisers together." />

            {/* who we connect */}
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_minmax(40px,110px)_auto_minmax(40px,110px)_1fr] items-center gap-8 md:gap-4">
              <SideCard side="publishers" align="right" />
              <Connector />
              <div className="flex flex-col items-center order-first md:order-none">
                <div className="relative">
                  <motion.div className="absolute inset-0 rounded-full bg-violet-400/30" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />
                  <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-1.5 shadow-[0_20px_50px_-12px_rgba(124,58,237,0.6)]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <img src="/brand/logo-mark.svg" alt="" className="w-16 h-16" />
                    </div>
                  </div>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] mt-4 font-extrabold text-slate-900">Link Management</span>
                <span className="text-xs text-slate-500 mt-0.5">orders · content · payouts</span>
              </div>
              <Connector reverse />
              <SideCard side="advertisers" align="left" />
            </motion.div>

            {/* story */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { n: '01', title: 'What we do', text: 'Link Management is a Publisher Aggregator Platform which connects publishers and bloggers with Advertisers (Brands, Agencies and Resellers). The Platform is intended to help Publishers and Bloggers monetize their blogs/websites and open up a stable revenue stream for themselves.' },
                { n: '02', title: 'Why we built it', text: 'Our vast experience of working in the Content Marketing and Link Building industry has allowed us to connect with numerous publishers and advertisers. We wanted to create a positive and trustworthy platform, which helps both publishers and advertisers mutually benefit from each other.' },
              ].map((b, i) => (
                <motion.div key={b.n} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }} className="rounded-3xl border border-violet-100 bg-[#FBFAFF] p-8">
                  <div className="flex items-center gap-3">
                    <span className="font-['Plus_Jakarta_Sans'] text-sm font-extrabold text-violet-600 bg-violet-100 w-10 h-10 rounded-xl flex items-center justify-center">{b.n}</span>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-slate-900">{b.title}</h3>
                  </div>
                  <p className="mt-4 text-slate-500 leading-relaxed">{b.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-24 md:py-28">
          <div className="max-w-3xl mx-auto px-6">
            <SectionHead eyebrow="FAQ" title="Questions, answered" />
            <div className="space-y-3">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className={`rounded-2xl border bg-white transition-colors ${open ? 'border-violet-300 shadow-[0_12px_30px_-16px_rgba(76,29,149,0.35)]' : 'border-violet-100'}`}>
                    <button onClick={() => setOpenFaq(open ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left px-6 py-5">
                      <span className="font-bold text-slate-900">{f.q}</span>
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600'}`}>
                        {open ? <Minus size={16} /> : <Plus size={16} />}
                      </span>
                    </button>
                    <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-slate-500 leading-relaxed">{f.a}</p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- CALL TO ACTION --- */}
        <section className="pb-24 md:pb-28">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-[36px] bg-[#1E1336] px-8 py-14 md:px-16 md:py-20 text-center">
              <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-violet-600/40 blur-[90px]" />
              <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-fuchsia-500/30 blur-[90px]" />
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:22px_22px]" />
              <div className="relative">
                <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-[1.15]">
                  Ready to turn your website into a <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">steady income?</span>
                </h2>
                <p className="mt-5 text-violet-200 text-lg max-w-xl mx-auto">Join thousands of publishers earning from every post. It takes two minutes to start.</p>
                <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/signup" className="group inline-flex items-center justify-center gap-2 bg-white text-violet-700 hover:text-violet-800 px-8 py-4 rounded-full font-bold hover:-translate-y-0.5 transition-all shadow-[0_14px_34px_-10px_rgba(0,0,0,0.5)]">
                    Start free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-white hover:text-white border border-white/25 hover:bg-white/10 transition-colors">
                    I already have an account
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
