import React, { useState } from 'react';
import { ExternalLink, ShieldAlert, FileText, Ban, Eye, Mail, Copy, Check, Tag } from 'lucide-react';
import { AhrefsVolume, TrafficCheckButton, HoverPopover } from './SiteTraffic';

/**
 * One site on the Sites pages: header (domain, tags, prices, actions), four stat columns, footer.
 * role 'admin' adds Edit Site, Edit metrics and the footer actions; 'manager' views only.
 * onOpen: the eye button (admin: approve / reject / delete, manager: site details).
 */
export function SiteCard({ site, role = 'admin', onOpen, isSelected, onToggleSelect, onTrafficSaved, fc, style }) {
    const isAdmin = role === 'admin';
    const [editingMetrics, setEditingMetrics] = useState(false);
    const [metrics, setMetrics] = useState({
        da: site.da || '', dr: site.dr || '', traffic: site.traffic || '', rd: site.rd || '',
        gp_price: site.gp_price || '', niche_edit_price: site.niche_edit_price || '', spam_score: site.spam_score || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSaveMetrics = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('authToken');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_BASE}/admin/websites/${site.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(metrics)
            });
            if (response.ok) {
                setEditingMetrics(false);
                Object.assign(site, metrics);
            } else {
                alert('Failed to save metrics');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving metrics');
        } finally {
            setSaving(false);
        }
    };

    // Check if a site is "NEW" (added within the last 30 days)
    const isSiteNew = (createdAt) => {
        if (!createdAt) return false;
        const addedDate = new Date(createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return addedDate >= thirtyDaysAgo;
    };

    const statusLabel = site.site_status === '1' ? 'Approved' : site.site_status === '2' ? 'Rejected' : 'Pending';
    const statusCls = site.site_status === '1' ? 'border-green-500/30 text-green-500 bg-green-500/10' : site.site_status === '2' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10';
    const spam = Number(site.spam_score) || 0;
    const money = (v) => (v !== null && v !== undefined && v !== '' && Number(v) > 0 ? `$${Number(v).toLocaleString()}` : 'N/A');
    const shortDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '-');
    // FC (Forbidden Category) on → only the FC prices, highlighted; off → every price the site has
    const all = [['Guest Post', site.gp_price], ['Niche Edit', site.niche_edit_price], ['FC GP', site.fc_gp, true], ['FC NE', site.fc_ne, true]];
    const prices = (fc ? all.filter(([, , isFc]) => isFc) : all)
        .filter(([, v]) => Number(v) > 0).map(([label, value, isFc]) => ({ label, value, hot: fc && isFc }));

    return (
        <div
            className="rounded-xl transition-shadow duration-300 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards overflow-hidden"
            style={{ backgroundColor: 'var(--card-background)', border: `1px solid ${isSelected ? 'var(--primary-cyan)' : 'var(--border)'}`, ...style }}
        >
            {/* Header: domain · tags · price · actions */}
            <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <input
                        type="checkbox"
                        className="w-4 h-4 shrink-0 rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                        checked={isSelected}
                        onChange={() => onToggleSelect()}
                    />
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <a href={`https://${site.root_domain}`} target="_blank" rel="noreferrer"
                            className="font-bold text-base truncate text-[var(--primary-cyan)] hover:underline hover:text-[var(--primary-cyan)]">
                            {site.root_domain}
                        </a>
                        {isSiteNew(site.created_at) && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand text-white uppercase tracking-wider">New</span>}
                        {/* category – the category + website niche show in a hover card, like the email */}
                        <CategoryPopover domain={site.root_domain} category={site.category || site.niche || 'General'} niche={site.website_niche} />
                        <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase ${statusCls}`}>{site.website_status || statusLabel}</span>
                        {site.email && (
                            /* icon only – the address shows in a hover card, like the Ahrefs popups */
                            <EmailPopover domain={site.root_domain} email={site.email} />
                        )}
                        <TrafficCheckButton site={site} role={role} size="xs" onSaved={onTrafficSaved} label={site.ahrefs_checked_at ? 'Re-check' : 'Check traffic'} />
                    </div>
                </div>

                <div className="flex items-center gap-3 justify-between md:justify-end">
                    {/* every price the site has (none set → "No price") */}
                    <div className="flex items-center gap-4">
                        {prices.length ? prices.map(p => (
                            <div key={p.label} className="text-right leading-tight">
                                <div className={`text-xs whitespace-nowrap ${p.hot ? 'text-red-600 font-semibold' : ''}`} style={p.hot ? undefined : { color: 'var(--text-muted)' }}>{p.label}</div>
                                <div className={`text-lg font-bold ${p.hot ? 'text-red-600' : 'text-[var(--primary-cyan)]'}`}>{money(p.value)}</div>
                            </div>
                        )) : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No price</span>}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpen(); }}
                        className="h-10 w-10 flex items-center justify-center rounded-lg border hover:bg-[var(--background-light)] transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        title={isAdmin ? 'Quick view / status' : 'Site details'}
                    >
                        <Eye className="h-4 w-4 pointer-events-none" />
                    </button>
                    {isAdmin && <button
                        onClick={() => window.open(`/admin/sites/edit/${site.id}`, '_self')}
                        className="h-10 px-5 rounded-lg bg-[var(--primary-cyan)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                        Edit Site
                    </button>}
                </div>
            </div>

            {/* Body: four columns */}
            {editingMetrics ? (
                <div className="border-t px-5 py-5" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[['DA', 'da'], ['DR', 'dr'], ['Traffic', 'traffic'], ['RD', 'rd'], ['Spam %', 'spam_score'], ['GP Price', 'gp_price'], ['NE Price', 'niche_edit_price']].map(([label, key]) => (
                            <div key={key}>
                                <label className="text-[10px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                                <input
                                    type="number"
                                    value={metrics[key]}
                                    onChange={(e) => setMetrics(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--primary-cyan)]/30"
                                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setEditingMetrics(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>Cancel</button>
                        <button onClick={handleSaveMetrics} disabled={saving} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white disabled:opacity-50"
                            style={{ backgroundColor: 'var(--primary-cyan)' }}>{saving ? 'Saving...' : 'Save metrics'}</button>
                    </div>
                </div>
            ) : (
                <div className="border-t grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
                    {/* prices are in the header and the status is a chip there, so they aren't repeated here */}
                    <CardColumn title="Authority">
                        <StatRow label="DA (Moz)" value={site.da || '-'} />
                        <StatRow label="DR (Ahrefs)" value={site.dr || '-'} />
                    </CardColumn>
                    <CardColumn title="Links & Trust">
                        <StatRow label="Ref. Domains" value={site.rd ? Number(site.rd).toLocaleString() : '-'} />
                        <StatRow label="Spam Score" value={<span className={spam > 5 ? 'text-red-500' : ''}>{spam}%</span>} />
                    </CardColumn>
                    <CardColumn title="Volume">
                        {site.ahrefs_traffic == null && <StatRow label="Traffic" value={site.traffic && !isNaN(site.traffic) ? Number(site.traffic).toLocaleString() : (site.traffic || '-')} />}
                        <AhrefsVolume site={site} role={role} Row={StatRow} />
                    </CardColumn>
                    <CardColumn title="Activity">
                        <StatRow label="Manual Tag" value={site.website_status || '-'} />
                        <StatRow label="Latest Order" value={site.lo_created_at ? shortDate(site.lo_created_at) : 'Never used'} />
                    </CardColumn>
                </div>
            )}

            {/* Footer: added date · quick actions */}
            <div className="border-t px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-dark)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Added <b style={{ color: 'var(--text-primary)' }}>{shortDate(site.created_at)}</b></span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {site.sample_url && (
                        <a href={site.sample_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            Sample <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                    {isAdmin && <>
                        <FooterAction icon={FileText} label="Guidelines" />
                        <FooterAction icon={ShieldAlert} label="Report" />
                        <FooterAction icon={Ban} label="Block" />
                    </>}
                    {isAdmin && !editingMetrics && (
                        <button onClick={() => setEditingMetrics(true)} className="font-semibold text-[var(--primary-cyan)] hover:underline">Edit metrics</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function EmailPopover({ domain, email }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
    };
    return (
        <HoverPopover width={360} trigger={<Mail className="h-3.5 w-3.5" aria-label={email} />}>
            <div className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Contact email</div>
            <div className="text-sm font-semibold truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{domain}</div>
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-dark)' }}>
                <Mail className="h-4 w-4 shrink-0 text-[var(--primary-cyan)]" />
                <span className="flex-1 text-sm font-bold break-all" style={{ color: 'var(--text-primary)' }}>{email}</span>
                <button onClick={copy} title={copied ? 'Copied' : 'Copy email'}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--background-light)] hover:text-[var(--primary-cyan)]"
                    style={{ color: 'var(--text-muted)' }}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
        </HoverPopover>
    );
}

export function CategoryPopover({ domain, category, niche }) {
    const niches = String(niche || '').split(',').map(n => n.trim()).filter(Boolean);
    return (
        <HoverPopover width={360} trigger={<span className="text-xs font-medium">{category}</span>}>
            <div className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</div>
            <div className="text-sm font-semibold truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{domain}</div>
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-dark)' }}>
                <Tag className="h-4 w-4 shrink-0 text-[var(--primary-cyan)]" />
                <span className="flex-1 text-sm font-bold break-all" style={{ color: 'var(--text-primary)' }}>{category}</span>
            </div>
            {/* only when the site has a website niche */}
            {niches.length > 0 && <>
                <div className="text-[11px] uppercase font-bold tracking-wider mt-4" style={{ color: 'var(--text-muted)' }}>Website niche</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {niches.map(n => (
                        <span key={n} className="px-2.5 py-1 rounded-lg border text-xs font-semibold" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-dark)', color: 'var(--text-primary)' }}>{n}</span>
                    ))}
                </div>
            </>}
        </HoverPopover>
    );
}

export function CardColumn({ title, children }) {
    return (
        <div className="px-5 py-4 border-b sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
            <div className="space-y-2.5">{children}</div>
        </div>
    );
}

export function StatRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
        </div>
    );
}

export function FooterAction({ icon: Icon, label }) {
    return (
        <button className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Icon className="h-3.5 w-3.5" /> {label}
        </button>
    );
}
