import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, Search, ChevronDown, Ban, X, Download, Check, Trash2 } from 'lucide-react';
import { adminAPI } from '../../../lib/api';
import ExportModal from '../../../components/ExportModal';
import { TrafficBatchBar, trafficRowFields } from '../../../components/SiteTraffic';
import { exportToCSV, exportToExcel } from '../../../utils/exportUtils';
import { useSiteFilters, SiteFilterPanel, SiteToolbar } from '../../../components/SiteFilters';
import { SiteCard } from '../../../components/SiteCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function SitesList() {
    const [websites, setWebsites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

    // Marketplace-style filters (panel + type / FC / sort toolbar); Approved sites by default
    const sf = useSiteFilters({ role: 'admin', defaults: { status: 'Approved' }, onChange: () => setPage(1) });

    // Fetch websites from admin API
    const fetchWebsites = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('authToken');

            const params = new URLSearchParams({ page, limit: pageSize === 'all' ? 100000 : pageSize, ...sf.params() });

            const response = await fetch(`${API_BASE_URL}/admin/sites/list?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (response.ok) {
                setWebsites(data.sites || []);
                setPagination(data.pagination || { total: 0, totalPages: 0 });
            } else {
                throw new Error(data.message || 'Failed to load websites');
            }
        } catch (err) {
            console.error('Error fetching websites:', err);
            setError(err.message || 'Failed to load websites');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sf.applied]); // eslint-disable-line react-hooks/exhaustive-deps

    // Export Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(new Set(websites.map(w => w.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (id) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRows(newSet);
    };

    const handleExport = ({ filename, format }) => {
        const dataToExport = websites
            .filter(w => selectedRows.has(w.id))
            .map(site => ({
                'Root Domain': site.root_domain || '',
                'Category': site.category || '',
                'Niche': site.website_niche || '',
                'Samples': site.sample_url || '',
                'Ahrefs': site.href_url || '',
                'DA': site.da || 0,
                'DR': site.dr || 0,
                'Traffic': site.traffic || 0,
                'RD': site.rd || 0,
                'Spam Score': site.spam_score || 0,
                'GP Price': site.gp_price || 0,
                'Niche Edit Price': site.niche_edit_price || 0,
                'FC GP': site.fc_gp || '',
                'FC NE': site.fc_ne || '',
                'Status': site.site_status === '1' ? 'Approved' : site.site_status === '2' ? 'Rejected' : 'Pending',
                'Country': site.country_source || '',
                'Paypal ID': site.paypal_id || '',
                'Skype': site.skype || '',
                'WhatsApp': site.whatsapp || '',
                'Email': site.email || '',
                'Date Added': site.created_at ? new Date(site.created_at).toLocaleDateString() : ''
            }));

        if (format === 'csv') {
            exportToCSV(dataToExport, filename || 'sites_export');
        } else {
            exportToExcel(dataToExport, filename || 'sites_export', format === 'xlsx');
        }
    };

    // Initial load
    useEffect(() => {
        fetchWebsites();
    }, [fetchWebsites]);

    const handleStatusUpdate = async (id, newStatusValue, field = 'site_status') => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/websites/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: newStatusValue })
            });

            if (response.ok) {
                const data = await response.json();
                const updatedSite = data.website || { [field]: newStatusValue };
                
                // Update local state
                setWebsites(prev => prev.map(site =>
                    site.id === id ? { ...site, ...updatedSite } : site
                ));
                if (selectedSite && selectedSite.id === id) {
                    setSelectedSite(prev => ({ ...prev, ...updatedSite }));
                }
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Update failed', error);
        }
    };

    const showingFrom = (page - 1) * (pageSize === 'all' ? pagination.total : pageSize) + 1;
    const showingTo = pageSize === 'all' ? pagination.total : Math.min(page * pageSize, pagination.total);

    // Ahrefs traffic saved by the LM Traffic Helper → update the row
    const handleTrafficSaved = (id, traffic) => {
        if (!traffic) return;
        setWebsites(prev => prev.map(site => site.id === id ? { ...site, ...trafficRowFields(traffic) } : site));
    };

    // Delete Handler
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this website? It will be moved to Deleted Sites.')) return;

        try {
            const data = await adminAPI.deleteWebsite(id);

            setWebsites(prev => prev.filter(site => site.id !== id));
            setSelectedSite(null);
        } catch (error) {
            console.error('Delete failed', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Failed to delete website';
            alert(errorMsg);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Globe className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
                        Marketplace Sites
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Browse and manage {pagination.total} websites
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search domain..."
                            value={sf.filters.search}
                            onChange={(e) => sf.set('search')(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-[var(--primary-cyan)] focus:border-transparent outline-none transition-all w-64"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <button
                        onClick={fetchWebsites}
                        disabled={loading}
                        className="p-2 rounded-xl hover:bg-[var(--background-light)] transition-colors disabled:opacity-50 border border-[var(--border)]"
                        title="Refresh Results"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                        onClick={() => window.open('/admin/sites/upload', '_self')}
                        className="px-4 py-2 rounded-xl bg-[var(--primary-cyan)] text-white hover:text-white font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        + Add Site
                    </button>
                </div>
            </div>

            {/* Main Layout: Sidebar + Grid */}
            <div className="flex items-start gap-6 relative">

                {/* 1. Filters (always open), like the marketplace */}
                <SiteFilterPanel f={sf} className="w-64 flex-shrink-0 sticky top-4 hidden lg:flex z-30" />

                {/* 2. Main Content Area */}
                <main className="flex-1 min-w-0 transition-all duration-300 relative z-10">

                    {/* Order type · FC · sort */}
                    <SiteToolbar f={sf} className="mb-4 p-2.5 rounded-xl bg-white border border-[var(--border)]" />

                    {/* Controls Bar */}
                    {/* one row; wraps only when it can't fit (small screens, or the extra buttons for selected sites) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl whitespace-nowrap" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                        <div className="flex flex-wrap items-center gap-3 min-w-0">
                            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)]"
                                    checked={websites.length > 0 && selectedRows.size === websites.length}
                                    onChange={handleSelectAll}
                                />
                                Select all
                            </label>
                            {selectedRows.size > 0 && (
                                <button
                                    onClick={() => setIsExportModalOpen(true)}
                                    className="premium-btn py-1.5 px-3 bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--primary-cyan)]/20 hover:bg-[var(--primary-cyan)]/20 text-xs"
                                >
                                    <Download className="h-4 w-4 mr-1.5" />
                                    Export ({selectedRows.size})
                                </button>
                            )}
                            <div className="text-sm font-medium shrink-0" style={{ color: 'var(--text-primary)' }} title="Sites shown on this page">
                                <span style={{ color: 'var(--primary-cyan)' }}>{showingFrom}-{showingTo}</span> of {pagination.total}
                            </div>
                            <TrafficBatchBar sites={websites} selectedIds={selectedRows} role="admin" status={sf.applied.status} />
                        </div>

                        <PaginationControls
                            page={page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                        />
                    </div>

                    {/* Results List (Expandable Rows) */}
                    {loading && websites.length === 0 ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--card-background)' }}></div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {websites.map((site, index) => (
                                <SiteCard
                                    role="admin"
                                    key={site.id}
                                    site={site}
                                    onOpen={() => setSelectedSite(site)}
                                    isSelected={selectedRows.has(site.id)}
                                    onToggleSelect={() => handleSelectRow(site.id)}
                                    onTrafficSaved={(t) => handleTrafficSaved(site.id, t)}
                                    fc={sf.fcOn}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                />
                            ))}
                            {websites.length === 0 && (
                                <div className="text-center py-20 rounded-xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                                    <div className="text-4xl mb-4">🔍</div>
                                    <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No websites found</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters</p>
                                    <button onClick={sf.reset} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-black" style={{ backgroundColor: 'var(--primary-cyan)' }}>Clear all filters</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Pagination */}
                    {websites.length > 0 && (
                        <div className="mt-6 flex justify-center">
                            <PaginationControls
                                page={page}
                                totalPages={pagination.totalPages}
                                onPageChange={setPage}
                                pageSize={pageSize}
                                onPageSizeChange={setPageSize}
                            />
                        </div>
                    )}

                </main>
            </div>

            {/* Quick status: approve / reject / delete */}
            {selectedSite && (
                <StatusModal
                    site={selectedSite}
                    onClose={() => setSelectedSite(null)}
                    onStatus={(v) => handleStatusUpdate(selectedSite.id, v, 'site_status')}
                    onDelete={() => handleDelete(selectedSite.id)}
                />
            )}

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                selectedCount={selectedRows.size}
            />
        </div>
    );
}

// --- SUB COMPONENTS ---

function PaginationControls({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
    return (
        <div className="flex items-center gap-3 shrink-0">
            <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-[var(--background-dark)] border border-[var(--border)] text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            >
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={200}>200 / page</option>
                <option value="all">View All</option>
            </select>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-[var(--background-light)] disabled:opacity-30 transition-colors text-[var(--text-primary)]"
                >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <div className="text-sm font-medium w-6 text-center">{page}</div>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-[var(--background-light)] disabled:opacity-30 transition-colors text-[var(--text-primary)]"
                >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
            </div>
        </div>
    );
}

function StatusModal({ site, onClose, onStatus, onDelete }) {
    const current = site.site_status === '1' ? 'approved' : site.site_status === '2' ? 'rejected' : 'pending';
    const chip = { approved: 'border-green-500/30 text-green-600 bg-green-500/10', rejected: 'border-red-500/30 text-red-600 bg-red-500/10', pending: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10' }[current];
    const Action = ({ icon: Icon, title, hint, tone, active, onClick }) => (
        <button onClick={onClick} disabled={active}
            className={`group w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all ${active ? 'cursor-default opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md'} ${tone.box}`}>
            <span className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm ${tone.icon}`}><Icon className="h-5 w-5" /></span>
            <span className="flex-1 min-w-0">
                <span className={`block text-sm font-bold ${tone.text}`}>{title}</span>
                <span className="block text-xs mt-0.5 text-slate-500">{active ? 'Current status' : hint}</span>
            </span>
        </button>
    );
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Site status</div>
                        <div className="mt-1 flex items-center gap-2 min-w-0">
                            <Globe className="h-4 w-4 shrink-0 text-[var(--primary-cyan)]" />
                            <span className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{site.root_domain}</span>
                        </div>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${chip}`}>{current}</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors" aria-label="Close">
                        <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <Action icon={Check} title="Approve" hint="Show this site to the team and on the marketplace" active={current === 'approved'} onClick={() => onStatus('1')}
                        tone={{ box: 'border-green-200 bg-green-50/60 hover:border-green-300', icon: 'bg-green-600', text: 'text-green-700' }} />
                    <Action icon={Ban} title="Reject" hint="Hide it from the team and the marketplace" active={current === 'rejected'} onClick={() => onStatus('2')}
                        tone={{ box: 'border-amber-200 bg-amber-50/60 hover:border-amber-300', icon: 'bg-amber-500', text: 'text-amber-700' }} />
                    <Action icon={Trash2} title="Delete" hint="Move it to Deleted Sites" onClick={onDelete}
                        tone={{ box: 'border-red-200 bg-red-50/60 hover:border-red-300', icon: 'bg-red-600', text: 'text-red-700' }} />
                </div>
            </div>
        </div>
    );
}
