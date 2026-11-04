import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, X, ExternalLink, Search, ChevronDown, Download } from 'lucide-react';
import { managerAPI } from '../../lib/api';
import { Layout } from '../components/layout/Layout';
import ExportModal from '../../components/ExportModal';
import { SiteTrafficCard, TrafficBatchBar, trafficRowFields } from '../../components/SiteTraffic';
import { SiteCard } from '../../components/SiteCard';
import { useSiteFilters, SiteFilterPanel, SiteToolbar } from '../../components/SiteFilters';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

export function Sites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  // Marketplace-style filters (panel + type / FC / sort toolbar); approved sites unless a status is picked
  const sf = useSiteFilters({ role: 'manager', onChange: () => setPage(1) });
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch websites from manager API
  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pageSize === 'all' ? 100000 : pageSize
      };

      Object.assign(params, sf.params());

      const response = await managerAPI.getWebsites(params);
      setWebsites(response.sites || []);
      setPagination(response.pagination || { total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError(err.message || 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sf.applied]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

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
            'Email': site.email || '',
            'Date Added': site.created_at ? new Date(site.created_at).toLocaleDateString() : ''
        }));

    if (format === 'csv') {
        exportToCSV(dataToExport, filename || 'manager_sites');
    } else {
        exportToExcel(dataToExport, filename || 'manager_sites', format === 'xlsx');
    }
  };

  // Ahrefs traffic saved by the LM Traffic Helper → update the row
  const handleTrafficSaved = (id, traffic) => {
    if (!traffic) return;
    setWebsites(prev => prev.map(site => site.id === id ? { ...site, ...trafficRowFields(traffic) } : site));
  };

  // Calculate showing range
  const showingFrom = pagination.total ? (page - 1) * (pageSize === 'all' ? pagination.total : pageSize) + 1 : 0;
  const showingTo = pageSize === 'all' ? pagination.total : Math.min(page * pageSize, pagination.total);

  return (
    <Layout>
      {/* same layout as the admin Sites page */}
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-main)]">
              <Globe className="h-6 w-6 text-[var(--primary-cyan)]" />
              View All Sites
            </h1>
            <p className="text-sm mt-1 text-[var(--text-secondary)]">Browse {pagination.total.toLocaleString()} websites</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search domain..."
                value={sf.filters.search}
                onChange={(e) => sf.set('search')(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl text-sm border border-[var(--border)] bg-white text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary-cyan)] focus:border-transparent outline-none transition-all w-64"
              />
            </div>
            <button
              onClick={fetchWebsites}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-[var(--background-light)] transition-colors disabled:opacity-50 border border-[var(--border)]"
              title="Refresh Results"
            >
              <RefreshCw className={`h-5 w-5 text-[var(--text-muted)] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters + list */}
        <div className="flex items-start gap-6 relative">
          {/* Filters (always open), like the marketplace */}
          <SiteFilterPanel f={sf} className="w-64 flex-shrink-0 sticky top-4 hidden lg:flex z-30" allStatusLabel="Approved (default)" />

          <main className="flex-1 min-w-0 relative z-10">
            {error && (
              <div className="mb-4 rounded-xl px-4 py-3 border border-red-200 bg-red-50 flex items-center justify-between gap-3">
                <p className="text-sm text-red-600">{error}</p>
                <button onClick={fetchWebsites} className="text-sm font-semibold text-red-600 hover:text-red-700">Retry</button>
              </div>
            )}

            {/* Order type · FC · sort */}
            <SiteToolbar f={sf} className="mb-4 p-2.5 rounded-xl bg-white border border-[var(--border)]" />

            {/* Controls bar – one row; wraps only when it can't fit */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl whitespace-nowrap bg-[var(--card-background)] border border-[var(--border)]">
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
                <div className="text-sm font-medium shrink-0 text-[var(--text-primary)]" title="Sites shown on this page">
                  <span className="text-[var(--primary-cyan)]">{showingFrom}-{showingTo}</span> of {pagination.total}
                </div>
                <TrafficBatchBar sites={websites} selectedIds={selectedRows} role="manager" />
              </div>
              <PaginationControls page={page} totalPages={pagination.totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
            </div>

            {/* Sites */}
            {loading && websites.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl animate-pulse bg-[var(--card-background)]" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {websites.map((site, index) => (
                  <SiteCard
                    key={site.id}
                    role="manager"
                    site={site}
                    onOpen={() => setSelectedSite(site)}
                    isSelected={selectedRows.has(site.id)}
                    onToggleSelect={() => handleSelectRow(site.id)}
                    onTrafficSaved={(t) => handleTrafficSaved(site.id, t)}
                    fc={sf.fcOn}
                    fcCategory={sf.fcCategory}
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                ))}
                {websites.length === 0 && (
                  <div className="text-center py-20 rounded-xl bg-[var(--card-background)] border border-[var(--border)]">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No websites found</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Try adjusting your filters</p>
                    <button onClick={sf.reset} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white hover:text-white bg-[var(--primary-cyan)] hover:opacity-90">Clear all filters</button>
                  </div>
                )}
              </div>
            )}

            {websites.length > 0 && (
              <div className="mt-6 flex justify-center">
                <PaginationControls page={page} totalPages={pagination.totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
              </div>
            )}
          </main>
        </div>

        {/* Site Details Modal */}
        {selectedSite && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="premium-card w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl relative" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
              {/* Modal Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--background-dark)]">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Globe size={20} className="text-[var(--primary-cyan)]" />
                    {selectedSite.root_domain}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] rounded border border-[var(--primary-cyan)]/20">{selectedSite.category}</span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--background-dark)] text-[var(--text-secondary)] rounded border border-[var(--border)]">ID: #{selectedSite.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow label="Website Niche" value={selectedSite.website_niche} />
                    <DetailRow label="Country Source" value={selectedSite.country_source} />
                    <DetailRow label="Paypal ID" value={selectedSite.paypal_id} />
                    <DetailRow label="Skype" value={selectedSite.skype} />
                    <DetailRow label="WhatsApp" value={selectedSite.whatsapp} />
                    <DetailRow label="Added On" value={selectedSite.created_at ? new Date(selectedSite.created_at).toLocaleDateString() : '-'} />
                  </div>

                  <div className="bg-[var(--background-dark)] rounded-xl p-4 border border-[var(--border)]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Links</h4>
                    <div className="space-y-2">
                      <DetailRow label="Sample URL" value={selectedSite.sample_url} isLink />
                      <DetailRow label="Href URL" value={selectedSite.href_url} isLink />
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">SEO Metrics & Pricing</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricCard label="DA" value={selectedSite.da} color="text-blue-400" />
                      <MetricCard label="DR" value={selectedSite.dr} color="text-purple-400" />
                      <MetricCard label="RD" value={selectedSite.rd} color="text-teal-500" />
                      <MetricCard label="Traffic" value={selectedSite.traffic} color="text-yellow-400" />
                      <MetricCard label="Spam Score" value={selectedSite.spam_score} color={parseInt(selectedSite.spam_score) > 10 ? 'text-red-400' : 'text-green-400'} />
                      <MetricCard label="GP Price" value={`$${selectedSite.gp_price || 0}`} color="text-emerald-400" />
                      <MetricCard label="Niche Price" value={`$${selectedSite.niche_edit_price || 0}`} color="text-blue-400" />
                      <MetricCard label="FC GP" value={`$${selectedSite.fc_gp || 0}`} color="text-brand" />
                      <MetricCard label="FC Niche" value={`$${selectedSite.fc_ne || 0}`} color="text-purple-400" />
                    </div>
                  </div>

                  <SiteTrafficCard key={selectedSite.id} site={selectedSite} role="manager" />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--background-dark)] shrink-0">
                <button onClick={() => setSelectedSite(null)} className="w-full premium-btn py-2.5">Close Details</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExport}
            selectedCount={selectedRows.size}
        />
      </div>
    </Layout>
  );
}

// --- Sub Components ---


function PaginationControls({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  return (
    <div className="flex items-center gap-4">
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        className="bg-[var(--background-dark)] border border-[var(--border)] text-xs rounded-lg px-2 py-1.5 focus:outline-none text-[var(--text-primary)]"
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
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-[var(--text-primary)]"
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
        <div className="text-sm font-medium w-6 text-center text-[var(--text-primary)]">{page}</div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-[var(--text-primary)]"
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </button>
      </div>
    </div>
  );
}


function DetailRow({ label, value, isLink }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-[var(--border)] pb-2 last:border-0">
      <span className="sm:w-32 flex-shrink-0 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
        {label}
      </span>
      {isLink && value && value !== 'N/A' ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm flex items-center gap-1.5 text-[var(--primary-cyan)] hover:underline break-all font-medium"
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-sm text-[var(--text-primary)] break-words font-medium">
          {value || 'N/A'}
        </span>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 bg-[var(--background-dark)] border border-[var(--border)] text-center">
      <div className={`font-bold text-xl mb-1 ${color || 'text-[var(--text-primary)]'}`}>{value || '-'}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">{label}</div>
    </div>
  );
}

export default Sites;
