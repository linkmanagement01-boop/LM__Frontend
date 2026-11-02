import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Globe, Search, SlidersHorizontal, ChevronDown, ChevronUp, ExternalLink, ShieldAlert, FileText, Ban, X, Eye, Mail, Download } from 'lucide-react';
import { adminAPI } from '../../../lib/api';
import ExportModal from '../../../components/ExportModal';
import { SiteTrafficCard, AhrefsStrip, TrafficBatchBar, trafficRowFields } from '../../../components/SiteTraffic';
import { exportToCSV, exportToExcel } from '../../../utils/exportUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function SitesList() {
    const [websites, setWebsites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Advanced Filter State
    const [filters, setFilters] = useState({
        domain: '', category: '', website_niche: '', email: '',
        status: '', website_status: 'Approved', fc_gp: '', fc_ne: '', new_arrival: '', added_on: '',
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
    }, [page, pageSize, filters]);

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
    }, [page, pageSize, filters]);

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
            status: '', website_status: 'Approved', fc_gp: '', fc_ne: '', new_arrival: '', added_on: '',
            da: { val: '', op: '' }, dr: { val: '', op: '' }, rd: { val: '', op: '' },
            traffic: { val: '', op: '' }, gp_price: { val: '', op: '' }, niche_edit_price: { val: '', op: '' }
        });
        setPage(1);
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
                        className="p-2 rounded-xl hover:bg-[var(--background-light)] transition-colors disabled:opacity-50 border border-[var(--border)]"
                        title="Refresh Results"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                        onClick={() => window.open('/admin/sites/upload', '_self')}
                        className="px-4 py-2 rounded-xl bg-[var(--primary-cyan)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        + Add Site
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
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)]"
                                    checked={websites.length > 0 && selectedRows.size === websites.length}
                                    onChange={handleSelectAll}
                                />
                                Select All Current Page
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
                            <div className="text-sm font-medium ml-2" style={{ color: 'var(--text-primary)' }}>
                                Showing <span style={{ color: 'var(--primary-cyan)' }}>{showingFrom}-{showingTo}</span> of {pagination.total}
                            </div>
                            <TrafficBatchBar sites={websites} selectedIds={selectedRows} role="admin" status={filters.website_status} />
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
                                    isSelected={selectedRows.has(site.id)}
                                    onToggleSelect={() => handleSelectRow(site.id)}
                                    onTrafficSaved={(t) => handleTrafficSaved(site.id, t)}
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

            {/* Site Details Modal */}
            {selectedSite && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    style={{ zIndex: 9999 }}
                >
                    <div className="premium-card flex flex-col p-0 overflow-hidden shadow-2xl relative w-full max-w-2xl max-h-[85vh]" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                        <div className="p-6 border-b flex items-center justify-between shrink-0" style={{ backgroundColor: 'var(--background-dark)', borderColor: 'var(--border)' }}>
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Globe className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                                    {selectedSite.root_domain}
                                </h3>
                                <div className="flex gap-2 mt-2 font-medium">
                                    <span className="text-xs px-2 py-0.5 rounded border" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--primary-cyan)', borderColor: 'rgba(6,182,212,0.2)' }}>
                                        {selectedSite.category || 'General'}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.05)' }}>
                                        ID: #{selectedSite.id}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedSite(null)} className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors">
                                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
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

                            <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                                <h4 className="font-semibold mb-4 text-xs uppercase tracking-wide text-[var(--text-muted)]">SEO Metrics</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <MetricBox label="DA" value={selectedSite.da} color="#3b82f6" />
                                    <MetricBox label="DR" value={selectedSite.dr} color="#a855f7" />
                                    <MetricBox label="Traffic" value={selectedSite.traffic} color="#eab308" />
                                    <MetricBox label="RD" value={selectedSite.rd} color="#f97316" />
                                </div>
                            </div>

                            <SiteTrafficCard key={selectedSite.id} site={selectedSite} role="admin" />

                            {/* Status & Action Buttons */}
                            <div className="pt-6 border-t flex flex-col gap-4" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold text-white">
                                        Status: <span className={`${selectedSite.site_status === '1' ? 'text-green-500' : selectedSite.site_status === '2' ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {selectedSite.site_status === '1' ? 'Approved' : selectedSite.site_status === '2' ? 'Rejected' : 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {/* Approve Button */}
                                    {(selectedSite.site_status !== '1') && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedSite.id, '1', 'site_status')}
                                            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-lg">✓</span> Approved
                                        </button>
                                    )}

                                    {/* Reject Button */}
                                    {(selectedSite.site_status !== '2') && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedSite.id, '2', 'site_status')}
                                            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-lg">✕</span> Rejected
                                        </button>
                                    )}

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(selectedSite.id)}
                                        className="px-6 py-2.5 rounded-lg bg-[var(--background-light)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold transition-colors border border-[var(--border)] ml-auto"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-4 border-t shrink-0 flex items-center justify-end" style={{ backgroundColor: 'var(--background-dark)', borderColor: 'var(--border)' }}>
                            <button onClick={() => setSelectedSite(null)} className="premium-btn py-2 px-6">Close Details</button>
                        </div>
                    </div>
                </div>
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
        <div className="bg-[var(--background-dark)] border border-[var(--border)] rounded-lg p-2">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="text-[var(--primary-cyan)]">{state.op} {state.val}</span>
            </div>
            <div className="flex gap-1">
                <select
                    value={state.op}
                    onChange={(e) => onChange('op', e.target.value)}
                    className="w-1/3 bg-[var(--background-light)] rounded px-1 py-1 text-xs border border-[var(--border)] outline-none text-[var(--text-primary)]"
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
                    className="w-2/3 bg-[var(--background-light)] rounded px-2 py-1 text-xs border border-[var(--border)] outline-none text-[var(--text-primary)]"
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

function ExpandableSiteRow({ site, onOpenModal, isSelected, onToggleSelect, onTrafficSaved, style }) {
    const [expanded, setExpanded] = useState(false);
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
                    <div className="flex items-center justify-center shrink-0 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                            checked={isSelected}
                            onChange={() => onToggleSelect()}
                        />
                    </div>
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-lg border transition-colors ${expanded ? 'bg-[var(--primary-cyan)] text-black border-[var(--primary-cyan)]' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[var(--primary-cyan)] border-[var(--border)]'}`}>
                        {site.root_domain.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-base truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {site.root_domain}
                            {isSiteNew(site.created_at) && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white uppercase tracking-wider">NEW</span>}
                        </h3>
                        {/* Summary Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${site.site_status === '1' ? 'border-green-500/30 text-green-400 bg-green-500/10' : site.site_status === '2' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                                {site.website_status || (site.site_status === '1' ? 'Approved' : site.site_status === '2' ? 'Rejected' : 'Pending')}
                            </span>
                            <span>•</span>
                            <span>{site.category || 'General'}</span>
                        </div>
                        {site.email && (
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-[var(--primary-cyan)]/10 border border-[var(--primary-cyan)]/20 w-fit max-w-full" title={site.email}>
                                <Mail className="h-3 w-3 text-[var(--primary-cyan)] shrink-0" />
                                <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{site.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Expanded Stats */}
                <div className="grid grid-cols-4 gap-8 w-full md:w-auto text-center md:text-left">
                    <div className="text-center">
                        <div className="text-lg font-bold text-[var(--primary-cyan)]">{site.da || '-'}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>DA</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCompactNumber(site.traffic)}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Traffic</div>
                    </div>
                    <div className="text-center hidden lg:block">
                        <div className={`w-8 h-8 flex items-center justify-center mx-auto rounded border text-base font-bold ${site.site_status === '1' ? 'bg-green-500/10 text-green-400 border-green-500/20' : site.site_status === '2' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                            {site.site_status === '1' ? 'A' : site.site_status === '2' ? 'R' : 'P'}
                        </div>
                        <div className="text-[10px] mt-1 uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</div>
                    </div>
                    <div className="text-center hidden lg:block">
                        <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {site.lo_created_at ? new Date(site.lo_created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never Used'}
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Latest Order</div>
                    </div>
                </div>

                {/* Right: Prices & Actions */}
                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 pl-4 border-l-0 md:border-l" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex gap-6">
                        <div className="text-right">
                            <div className="text-lg font-bold text-[var(--primary-cyan)]">${site.gp_price || 0}</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>GP</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>${site.niche_edit_price || 0}</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Edit</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
                            className="p-2 rounded-lg hover:bg-[var(--background-light)] text-[var(--primary-cyan)] hover:text-[var(--text-primary)] transition-colors relative z-20"
                            title="Quick View / Status"
                        >
                            <Eye className="h-5 w-5 pointer-events-none" />
                        </button>
                        <button className={`p-2 rounded-full transition-transform duration-300 ${expanded ? 'rotate-180 bg-[var(--background-light)]' : 'hover:bg-[var(--background-light)]'}`}>
                            <ChevronDown className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Ahrefs line: traffic · graph · top countries (free Traffic Checker via the LM Traffic Helper) */}
            <div className="px-4 pb-3">
                <div className="rounded-lg px-3 py-2 border border-dashed border-orange-500/25 bg-orange-500/[0.03]">
                    <AhrefsStrip site={site} role="admin" onSaved={onTrafficSaved} />
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t p-6 animate-in slide-in-from-top-2 fade-in duration-300" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-dark)' }}>
                    {/* Editable Metrics Section */}
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Site Metrics</h4>
                        {!editingMetrics ? (
                            <button
                                onClick={() => setEditingMetrics(true)}
                                className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                style={{ color: 'var(--primary-cyan)', backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
                            >
                                ✏️ Edit Metrics
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingMetrics(false)}
                                    className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                    style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveMetrics}
                                    disabled={saving}
                                    className="text-xs font-bold px-4 py-1 rounded-lg text-black transition-colors disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--primary-cyan)' }}
                                >
                                    {saving ? 'Saving...' : '✓ Save Metrics'}
                                </button>
                            </div>
                        )}
                    </div>

                    {editingMetrics ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                            {[['DA', 'da'], ['DR', 'dr'], ['Traffic', 'traffic'], ['RD', 'rd'], ['Spam %', 'spam_score'], ['GP Price', 'gp_price'], ['NE Price', 'niche_edit_price']].map(([label, key]) => (
                                <div key={key}>
                                    <label className="text-[10px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                                    <input
                                        type="number"
                                        value={metrics[key]}
                                        onChange={(e) => setMetrics(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--primary-cyan)]/30"
                                        style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-8 mb-8">
                            <DetailItem label="Domain Rating" value={site.dr} />
                            <DetailItem label="Referring Domains" value={site.rd} />
                            <DetailItem label="Spam Score" value={`${site.spam_score || 0}%`} highlight={site.spam_score && site.spam_score > 5} />
                            <DetailItem label="Manual Tag" value={site.website_status || '-'} highlight={site.website_status === 'Pending'} />
                            <DetailItem label="Added On" value={new Date(site.created_at).toLocaleDateString()} />
                            <DetailItem label="FC GP" value={site.fc_gp || 'No'} />
                            <DetailItem label="FC NE" value={site.fc_ne || 'No'} />
                        </div>
                    )}

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
            <div className="text-xs uppercase font-bold tracking-wide mb-1 opacity-70" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className={`text-sm font-medium ${highlight ? 'text-red-400' : ''}`} style={highlight ? {} : { color: 'var(--text-primary)' }}>{value || '-'}</div>
        </div>
    )
}

function ActionButton({ icon: Icon, label, color = "text-gray-400" }) {
    return (
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--background-light)] transition-colors ${color} text-sm font-medium`}>
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
        <div className="p-3 rounded-lg border text-center" style={{ backgroundColor: 'var(--background-dark)', borderColor: 'var(--border)' }}>
            <div className="text-2xl font-bold mb-1" style={{ color: color || 'var(--text-primary)' }}>{formatCompactNumber(value)}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

function InfoRow({ label, value, isLink }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div className="w-full sm:w-40 font-bold text-xs uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="flex-1 text-sm font-medium break-all" style={{ color: 'var(--text-primary)' }}>
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
