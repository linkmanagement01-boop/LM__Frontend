import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Globe, Search, SlidersHorizontal, ChevronDown, ChevronUp, ExternalLink, ShieldAlert, FileText, Ban, X, Eye, Mail } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function DeletedSites() {
    const [websites, setWebsites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);

    // Advanced Filter State
    const [filters, setFilters] = useState({
        domain: '', category: '', website_niche: '', email: '',
        status: '', website_status: '', fc_gp: '', fc_ne: '', new_arrival: '', added_on: '',
        da: { val: '', op: '' }, dr: { val: '', op: '' }, rd: { val: '', op: '' },
        traffic: { val: '', op: '' }, gp_price: { val: '', op: '' }, niche_edit_price: { val: '', op: '' }
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

    // Fetch websites from admin API
    const fetchWebsites = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('authToken');

            const params = new URLSearchParams();
            params.append('page', page);
            if (pageSize === 'all') {
                params.append('limit', 100000);
            } else {
                params.append('limit', pageSize);
            }

            // Filters
            if (filters.domain) params.append('search_domain', filters.domain);
            if (filters.category) params.append('search_category', filters.category);
            if (filters.website_niche) params.append('search_niche', filters.website_niche);
            if (filters.email) params.append('search_email', filters.email);
            if (filters.status) params.append('filter_status', filters.status);
            if (filters.website_status) params.append('filter_website_status', filters.website_status);
            if (filters.fc_gp) params.append('filter_fc_gp', filters.fc_gp);
            if (filters.fc_ne) params.append('filter_fc_ne', filters.fc_ne);
            if (filters.new_arrival) params.append('filter_new_arrival', filters.new_arrival.toLowerCase());
            if (filters.added_on) params.append('filter_added_on', filters.added_on);

            const appendRange = (key, stateKey) => {
                const { val, op } = filters[stateKey];
                if (val !== '' && op !== '') {
                    params.append(`filter_${key}_val`, val);
                    params.append(`filter_${key}_op`, op);
                }
            };
            appendRange('da', 'da'); appendRange('dr', 'dr'); appendRange('rd', 'rd');
            appendRange('traffic', 'traffic'); appendRange('gp_price', 'gp_price'); appendRange('niche_price', 'niche_edit_price');

            const response = await fetch(`${API_BASE_URL}/admin/sites/deleted-list?${params.toString()}`, {
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
    }, [page, pageSize, filters]);

    // Initial load
    useEffect(() => {
        fetchWebsites();
    }, [page, pageSize, filters]);

    const updateFilter = (section, key, value) => {
        setPage(1);
        if (section) {
            setFilters(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const resetFilters = () => {
        setFilters({
            domain: '', category: '', website_niche: '', email: '',
            status: '', website_status: '', fc_gp: '', fc_ne: '', new_arrival: '', added_on: '',
            da: { val: '', op: '' }, dr: { val: '', op: '' }, rd: { val: '', op: '' },
            traffic: { val: '', op: '' }, gp_price: { val: '', op: '' }, niche_edit_price: { val: '', op: '' }
        });
        setPage(1);
    };

    const showingFrom = (page - 1) * (pageSize === 'all' ? pagination.total : pageSize) + 1;
    const showingTo = pageSize === 'all' ? pagination.total : Math.min(page * pageSize, pagination.total);

    // Restore Handler
    const handleRestore = async (id) => {
        if (!window.confirm('Are you sure you want to restore this website?')) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/sites/${id}/restore`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setWebsites(prev => prev.filter(site => site.id !== id));
                setSelectedSite(null);
            } else {
                alert('Failed to restore website');
            }
        } catch (error) {
            console.error('Restore failed', error);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Globe className="h-6 w-6 text-red-500" />
                        Deleted Sites
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Manage soft-deleted websites ({pagination.total})
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
                            value={filters.domain}
                            onChange={(e) => updateFilter(null, 'domain', e.target.value)}
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
                        className="p-2 rounded-xl hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-50 border border-[var(--border)]"
                        title="Refresh Results"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>

            {/* Main Layout: Sidebar + Grid */}
            <div className="flex items-start gap-6 relative">

                {/* 1. Filter Sidebar (Hover Animated) */}
                <aside className="group w-16 hover:w-72 transition-all duration-300 ease-in-out flex-shrink-0 sticky top-4 h-[calc(100vh-120px)] overflow-hidden hidden lg:flex flex-col bg-[var(--card-background)] border border-[var(--border)] rounded-xl z-30 ring-1 ring-black/5 hover:ring-[var(--primary-cyan)]/30 hover:shadow-xl hover:shadow-[var(--primary-cyan)]/5">

                    {/* Collapsed View Header (Always Visible) */}
                    <div className="h-16 flex items-center justify-center border-b border-[var(--border)] shrink-0 group-hover:justify-start group-hover:px-6 transition-all duration-300 w-72">
                        <SlidersHorizontal className="h-5 w-5 text-[var(--primary-cyan)] shrink-0" />
                        <h3 className="font-semibold text-[var(--text-primary)] ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 truncate">Filters</h3>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 w-72 custom-scrollbar">
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <button onClick={resetFilters} className="text-xs hover:underline" style={{ color: 'var(--primary-cyan)' }}>Reset All</button>
                            </div>

                            {/* Status Group */}
                            <FilterSection title="Status">
                                <select value={filters.website_status} onChange={(e) => updateFilter(null, 'website_status', e.target.value)} className="w-full bg-[var(--background-dark)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary-cyan)] outline-none">
                                    <option value="">All Statuses</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </FilterSection>

                            {/* Category Group */}
                            <FilterSection title="Category / Niche">
                                <input
                                    placeholder="e.g. Technology"
                                    value={filters.category}
                                    onChange={(e) => updateFilter(null, 'category', e.target.value)}
                                    className="w-full bg-[var(--background-dark)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary-cyan)] outline-none mb-2"
                                />
                                <input
                                    placeholder="Sub-niche"
                                    value={filters.website_niche}
                                    onChange={(e) => updateFilter(null, 'website_niche', e.target.value)}
                                    className="w-full bg-[var(--background-dark)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary-cyan)] outline-none"
                                />
                            </FilterSection>

                            {/* Contact Group */}
                            <FilterSection title="Contact">
                                <input
                                    placeholder="Search by email"
                                    value={filters.email}
                                    onChange={(e) => updateFilter(null, 'email', e.target.value)}
                                    className="w-full bg-[var(--background-dark)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary-cyan)] outline-none"
                                />
                            </FilterSection>

                            {/* Metrics Group */}
                            <FilterSection title="Metrics">
                                <div className="space-y-4">
                                    <RangeInput label="DA (Domain Authority)" state={filters.da} onChange={(k, v) => updateFilter('da', k, v)} />
                                    <RangeInput label="DR (Domain Rating)" state={filters.dr} onChange={(k, v) => updateFilter('dr', k, v)} />
                                    <RangeInput label="Traffic" state={filters.traffic} onChange={(k, v) => updateFilter('traffic', k, v)} />
                                </div>
                            </FilterSection>

                            {/* Price Group */}
                            <FilterSection title="Budget (USD)">
                                <div className="space-y-4">
                                    <RangeInput label="GP Price" state={filters.gp_price} onChange={(k, v) => updateFilter('gp_price', k, v)} />
                                    <RangeInput label="Niche Edit Price" state={filters.niche_edit_price} onChange={(k, v) => updateFilter('niche_edit_price', k, v)} />
                                </div>
                            </FilterSection>

                            {/* Extra Filters */}
                            <FilterSection title="Attributes">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-secondary)]">FC GP Comp.</span>
                                        <select value={filters.fc_gp} onChange={(e) => updateFilter(null, 'fc_gp', e.target.value)} className="bg-[var(--background-dark)] border border-[var(--border)] rounded px-2 py-1 text-xs">
                                            <option value="">Any</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-secondary)]">FC NE Comp.</span>
                                        <select value={filters.fc_ne} onChange={(e) => updateFilter(null, 'fc_ne', e.target.value)} className="bg-[var(--background-dark)] border border-[var(--border)] rounded px-2 py-1 text-xs">
                                            <option value="">Any</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-secondary)]">New Arrival</span>
                                        <select value={filters.new_arrival} onChange={(e) => updateFilter(null, 'new_arrival', e.target.value)} className="bg-[var(--background-dark)] border border-[var(--border)] rounded px-2 py-1 text-xs">
                                            <option value="">Any</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                </div>
                            </FilterSection>
                        </div>
                    </div>
                </aside>

                {/* 2. Main Content Area */}
                <main className="flex-1 min-w-0 transition-all duration-300 relative z-10">

                    {/* Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Showing <span style={{ color: 'var(--primary-cyan)' }}>{showingFrom}-{showingTo}</span> of {pagination.total}
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
                                <ExpandableSiteRow
                                    key={site.id}
                                    site={site}
                                    onOpenModal={() => setSelectedSite(site)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                />
                            ))}
                            {websites.length === 0 && (
                                <div className="text-center py-20 rounded-xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                                    <div className="text-4xl mb-4">🔍</div>
                                    <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No websites found</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters</p>
                                    <button onClick={resetFilters} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-black" style={{ backgroundColor: 'var(--primary-cyan)' }}>Clear all filters</button>
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

            {/* Modal (Restored & Enhanced) */}
            {selectedSite && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    style={{ zIndex: 9999 }}
                >
                    <div className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl relative" style={{ backgroundColor: '#18181b', border: '1px solid var(--border)' }}>
                        <div className="sticky top-0 p-4 border-b flex items-center justify-between bg-[var(--surface)] z-10" style={{ borderColor: 'var(--border)' }}>
                            <div>
                                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedSite.root_domain}</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: #{selectedSite.id}</p>
                            </div>
                            <button onClick={() => setSelectedSite(null)} className="p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"><X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Layout matching user screenshot: Label - Value list */}
                            <div className="space-y-4">
                                <InfoRow label="Website niche" value={selectedSite.website_niche || '-'} />
                                <InfoRow label="Sample url" value={selectedSite.sample_url} isLink />
                                <InfoRow label="Href url" value={selectedSite.href_url} isLink />
                                <InfoRow label="Paypal id" value={selectedSite.paypal_id || 'N/A'} />
                                <InfoRow label="Skype" value={selectedSite.skype || 'N/A'} />
                                <InfoRow label="Whatsapp" value={selectedSite.whatsapp || 'N/A'} />
                                <InfoRow label="Country source" value={selectedSite.country_source || '-'} />
                            </div>

                            {/* SEO Metrics (Keeping these as they are valuable) */}
                            <div className="pt-4 border-t border-[var(--border)]">
                                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide opacity-70">SEO Metrics</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <MetricBox label="DA" value={selectedSite.da} color="#FF6B6B" />
                                    <MetricBox label="DR" value={selectedSite.dr} color="#4ECDC4" />
                                    <MetricBox label="Traffic" value={selectedSite.traffic} color="#FFD166" />
                                    <MetricBox label="RD" value={selectedSite.rd} color="#1A535C" />
                                </div>
                            </div>

                            {/* Status & Action Buttons */}
                            <div className="pt-6 border-t border-[var(--border)] flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold text-[var(--text-primary)]">
                                        Status: <span className={`${selectedSite.website_status === 'Approved' ? 'text-green-500' : selectedSite.website_status === 'Rejected' ? 'text-red-500' : 'text-yellow-500'}`}>{selectedSite.website_status || 'Pending'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {/* Restore Button */}
                                    <button
                                        onClick={() => handleRestore(selectedSite.id)}
                                        className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors flex items-center gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-1" /> Restore Site
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---

function FilterSection({ title, children }) {
    return (
        <div className="border-b border-[var(--border)] pb-5 last:border-0">
            <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</h4>
            {children}
        </div>
    );
}

function RangeInput({ label, state, onChange }) {
    return (
        <div className="bg-[var(--surface-muted)] rounded-lg p-2">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="text-[var(--primary-cyan)]">{state.op} {state.val}</span>
            </div>
            <div className="flex gap-1">
                <select
                    value={state.op}
                    onChange={(e) => onChange('op', e.target.value)}
                    className="w-1/3 bg-[var(--surface-muted)] rounded px-1 py-1 text-xs border border-[var(--border)] outline-none"
                >
                    <option value="">Op</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                </select>
                <input
                    type="number"
                    placeholder="Val"
                    value={state.val}
                    onChange={(e) => onChange('val', e.target.value)}
                    className="w-2/3 bg-[var(--surface-muted)] rounded px-2 py-1 text-xs border border-[var(--border)] outline-none"
                />
            </div>
        </div>
    );
}

function PaginationControls({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
    return (
        <div className="flex items-center gap-4">
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
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] disabled:opacity-30 transition-colors"
                >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <div className="text-sm font-medium w-6 text-center">{page}</div>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] disabled:opacity-30 transition-colors"
                >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
            </div>
        </div>
    );
}

function ExpandableSiteRow({ site, onOpenModal, style }) {
    const [expanded, setExpanded] = useState(false);

    // Check if a site is "NEW" (added within the last 30 days)
    const isSiteNew = (createdAt) => {
        if (!createdAt) return false;
        const addedDate = new Date(createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return addedDate >= thirtyDaysAgo;
    };

    return (
        <div
            className={`group rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards ${expanded ? 'ring-1 ring-[var(--primary-cyan)] shadow-lg' : ''}`}
            style={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border)',
                ...style
            }}
        >
            {/* Top Row (Summary) */}
            <div
                className="p-4 flex flex-col md:flex-row items-center cursor-pointer gap-4 md:gap-6"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Left: Domain & Meta */}
                <div className="flex-1 min-w-0 flex items-center gap-4 w-full md:w-auto">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-lg border transition-colors ${expanded ? 'bg-[var(--primary-cyan)] text-black border-[var(--primary-cyan)]' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[var(--primary-cyan)] border-[var(--border)]'}`}>
                        {site.root_domain.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-base truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {site.root_domain}
                            {isSiteNew(site.created_at) && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white uppercase tracking-wider">NEW</span>}
                        </h3>
                        {/* Summary Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${site.website_status === 'Approved' ? 'border-green-500/30 text-green-400 bg-green-500/10' : site.website_status === 'Rejected' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                                {site.website_status || 'Pending'}
                            </span>
                            <span>•</span>
                            <span>{site.category || 'General'}</span>
                        </div>
                        {site.email && (
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-[var(--primary-cyan)]/10 border border-[var(--primary-cyan)]/20 w-fit max-w-full" title={site.email}>
                                <Mail className="h-3 w-3 text-[var(--primary-cyan)] shrink-0" />
                                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{site.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Expanded Stats (Latest Order) */}
                <div className="grid grid-cols-3 gap-8 w-full md:w-auto text-center md:text-left">
                    <div className="text-center">
                        <div className="text-lg font-bold text-[var(--primary-cyan)]">{site.da || '-'}</div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">DA</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-[var(--text-primary)]">{formatCompactNumber(site.traffic)}</div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Traffic</div>
                    </div>
                    <div className="text-center hidden lg:block">
                        <div className="text-lg font-bold text-[var(--text-primary)]">
                            {site.lo_created_at ? new Date(site.lo_created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never Used'}
                        </div>
                        <div className="text-[10px] text-[var(--primary-cyan)] uppercase font-bold tracking-wider">Latest Order</div>
                    </div>
                </div>

                {/* Right: Prices & Actions */}
                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[var(--border)] pt-3 md:pt-0 pl-4 border-l-0 md:border-l border-[var(--border)]">
                    <div className="flex gap-6">
                        <div className="text-right">
                            <div className="text-lg font-bold text-[var(--primary-cyan)]">${site.gp_price || 0}</div>
                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">GP</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-[var(--text-primary)]">${site.niche_edit_price || 0}</div>
                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Edit</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Eye Icon for Modal */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
                            className="p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--primary-cyan)] hover:opacity-80 transition-colors relative z-20"
                            title="Quick View / Status"
                        >
                            <Eye className="h-5 w-5 pointer-events-none" />
                        </button>

                        <button className={`p-2 rounded-full transition-transform duration-300 ${expanded ? 'rotate-180 bg-[var(--surface-muted)]' : 'hover:bg-[var(--surface-muted)]'}`}>
                            <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-8 mb-8">
                        <DetailItem label="Domain Rating" value={site.dr} />
                        <DetailItem label="Referring Domains" value={site.rd} />
                        <DetailItem label="Spam Score" value={`${site.spam_score || 0}%`} highlight={site.spam_score && site.spam_score > 5} />

                        <DetailItem label="Status" value={site.website_status} highlight={site.website_status === 'Pending'} />
                        <DetailItem label="Added On" value={new Date(site.created_at).toLocaleDateString()} />
                        <DetailItem label="FC GP" value={site.fc_gp || 'No'} />
                        <DetailItem label="FC NE" value={site.fc_ne || 'No'} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <ActionButton icon={FileText} label="Guidelines" />
                        <ActionButton icon={ShieldAlert} label="Report Website" color="text-yellow-500" />
                        <ActionButton icon={Ban} label="Add to Blocklist" color="text-red-500" />
                        <a
                            href={site.sample_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium hover:bg-green-500/20 transition-colors ml-auto"
                        >
                            <ExternalLink className="h-4 w-4" /> View Sample
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(`/admin/sites/edit/${site.id}`, '_self'); }}
                            className="hidden md:flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--primary-cyan)] text-black text-sm font-bold hover:opacity-90 transition-opacity"
                        >
                            Edit Site
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, highlight }) {
    return (
        <div>
            <div className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wide mb-1 opacity-70">{label}</div>
            <div className={`text-sm font-medium ${highlight ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{value || '-'}</div>
        </div>
    )
}

function ActionButton({ icon: Icon, label, color = "text-[var(--text-muted)]" }) {
    return (
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors ${color} text-sm font-medium`}>
            <Icon className="h-4 w-4" /> {label}
        </button>
    )
}

function formatCompactNumber(number) {
    if (!number) return '0';
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
}

function MetricBox({ label, value, color }) {
    return (
        <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: color || 'white' }}>{formatCompactNumber(value)}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{label}</div>
        </div>
    );
}

function InfoRow({ label, value, isLink }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-1">
            <div className="w-full sm:w-40 font-bold text-[var(--text-muted)] text-sm shrink-0">{label}</div>
            <div className="flex-1 text-sm font-medium text-[var(--text-primary)] break-all">
                {isLink && value ? (
                    <a href={value} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline flex items-center gap-1">
                        {value} <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    value || 'N/A'
                )}
            </div>
        </div>
    );
}
