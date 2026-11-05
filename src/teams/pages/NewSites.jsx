import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, Eye, X, ExternalLink, Search, Filter, Database, Check, Download, ChevronDown } from 'lucide-react';
import { teamAPI } from '../../lib/api';
import { Pagination } from '../../components/Pagination';
import ExportModal from '../../components/ExportModal';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

// prices can be blank or "N/A" – only numbers get a $
const price = (v) => (v !== null && v !== undefined && v !== '' && !isNaN(Number(v)) ? `$${v}` : '-');

export function NewSites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '', domain: '', status: ''
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch websites from API
  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamAPI.getWebsites({ page, limit: pageSize });
      setWebsites(response.sites || response.websites || []);
      setPagination(response.pagination || { total: response.sites?.length || response.websites?.length || 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError(err.message || 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  // Filter websites (client-side for search)
  const rows = useMemo(() => {
    let r = websites;
    if (filters.category) {
      r = r.filter(x => (x.category || '').toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.domain) {
      r = r.filter(x => (x.root_domain || x.domain_url || '').toLowerCase().includes(filters.domain.toLowerCase()));
    }
    if (filters.status) {
      r = r.filter(x => String(x.site_status) === filters.status);
    }
    return r;
  }, [websites, filters]);

  // Calculate showing range
  const showingFrom = (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, pagination.total);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(rows.map(r => r.id)));
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
    const dataToExport = rows
        .filter(r => selectedRows.has(r.id))
        .map(site => ({
            'Root Domain': site.root_domain || site.domain_url || '',
            'Category': site.category || 'General',
            'DA': site.da || 0,
            'DR': site.dr || 0,
            'Traffic': site.traffic || 0,
            'GP Price': site.gp_price || 0,
            'Niche Price': site.niche_edit_price || site.niche_price || 0,
            'Status': site.website_status || (site.site_status === '1' || site.site_status === 1 ? 'Active' : 'Inactive'),
            'Email': site.email || '',
            'Date Added': site.created_at ? new Date(site.created_at).toLocaleDateString() : ''
        }));

    if (format === 'csv') {
        exportToCSV(dataToExport, filename || 'teams_new_sites');
    } else {
        exportToExcel(dataToExport, filename || 'teams_new_sites', format === 'xlsx');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex bg-[var(--card-background)] p-6 rounded-2xl border border-[var(--border)] items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <Database className="h-8 w-8 text-[var(--primary-cyan)]" />
            View All Sites
          </h1>
          <p className="text-[var(--text-muted)] mt-2">Browse and search available websites for guest posts</p>
        </div>
        <button
          onClick={fetchWebsites}
          disabled={loading}
          className="premium-btn bg-[var(--background-dark)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-primary)]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="premium-card p-4 border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>{error}</span>
          <button onClick={fetchWebsites} className="flex items-center gap-2 hover:underline">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="premium-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              placeholder="Search domain..."
              value={filters.domain}
              onChange={(e) => { setFilters({ ...filters, domain: e.target.value }); }}
              className="premium-input pl-10"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          </div>

          <div className="relative min-w-[180px]">
            <input
              placeholder="Filter by Category"
              value={filters.category}
              onChange={(e) => { setFilters({ ...filters, category: e.target.value }); }}
              className="premium-input pl-10"
            />
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          </div>

          <div className="relative min-w-[150px]">
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); }}
              className="premium-input w-full pl-10 pr-9 appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--text-muted)]" />
            <Check className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          </div>

          {(filters.domain || filters.category || filters.status) && (
            <button
              onClick={() => { setFilters({ category: '', domain: '', status: '' }); }}
              className="premium-btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4"
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </button>
          )}

          {selectedRows.size > 0 && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="premium-btn bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--primary-cyan)]/30 hover:bg-[var(--primary-cyan)]/20 px-4 ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export ({selectedRows.size})
            </button>
          )}
        </div>
      </div>

      {/* Showing X to Y of Z */}
      {!loading && (
        <div className="text-sm text-[var(--text-muted)] px-1">
          Showing <span className="font-mono text-[var(--text-primary)]">{showingFrom}</span> to <span className="font-mono text-[var(--text-primary)]">{showingTo}</span> of <span className="font-mono text-[var(--text-primary)]">{pagination.total}</span> results
        </div>
      )}

      {/* Table */}
      <div className="premium-table-container">
        <table className="premium-table table-compact">
          <thead>
            <tr>
              <th className="w-12 text-center p-4">
                <input 
                    type="checkbox" 
                    className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                    checked={rows.length > 0 && selectedRows.size === rows.length}
                    onChange={handleSelectAll}
                />
              </th>
              <th>Root Domain</th>
              <th className="text-center">DR</th>
              <th className="text-center">DA</th>
              <th className="text-center">Traffic</th>
              <th className="text-center">Prices</th>
              <th className="text-center">Status</th>
              <th>Email</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && websites.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-[var(--primary-cyan)]" />
                    <span>Loading websites...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Database className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
                    <span>No websites found matching your filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((site) => (
                <tr key={site.id}>
                  <td className="text-center p-4">
                     <input 
                        type="checkbox" 
                        className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                        checked={selectedRows.has(site.id)}
                        onChange={() => handleSelectRow(site.id)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-[var(--background-dark)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${site.root_domain || site.domain_url}&sz=32`}
                          className="w-4 h-4 opacity-70"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          alt=""
                        />
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {site.root_domain || site.domain_url}
                        </div>
                        {/* category · date added */}
                        <div className="text-xs text-[var(--text-muted)]">
                          {site.category || 'General'}{site.created_at ? ` · ${new Date(site.created_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-secondary)]">
                      {site.dr || '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-secondary)]">
                      {site.da || '-'}
                    </span>
                  </td>
                  <td className="text-center text-[var(--text-primary)] font-mono text-xs">
                    {site.traffic || '-'}
                  </td>
                  <td className="text-center text-xs whitespace-nowrap">
                    <div className="text-[var(--text-primary)]"><span className="text-[var(--text-muted)]">GP</span> {price(site.gp_price)}</div>
                    <div className="text-[var(--text-primary)] mt-0.5"><span className="text-[var(--text-muted)]">NE</span> {price(site.niche_edit_price || site.niche_price)}</div>
                  </td>
                  <td className="text-center">
                    <span
                      className={`premium-badge ${site.site_status === '1' || site.site_status === 1
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                    >
                      {site.website_status || (site.site_status === '1' || site.site_status === 1 ? 'Active' : 'Inactive')}
                    </span>
                  </td>
                  <td className="text-[var(--text-secondary)] text-sm truncate max-w-[170px]" title={site.email || ''}>
                    {site.email || '-'}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setSelectedSite(site)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-cyan)] hover:bg-[var(--primary-cyan)]/10 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* Pagination (Simplified) */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="premium-btn bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="premium-btn bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-[var(--background-dark)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded px-2 py-1"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Site Details Modal */}
      {selectedSite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 p-6 border-b border-[var(--border)] bg-[var(--card-background)]/90 backdrop-blur flex items-center justify-between z-10">
              <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <Globe className="h-5 w-5 text-[var(--primary-cyan)]" />
                Site Details
              </h3>
              <button
                onClick={() => setSelectedSite(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-[var(--background-dark)] p-4 rounded-xl border border-[var(--border)]">
                <div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{selectedSite.root_domain || selectedSite.domain_url}</div>
                  <div className="text-sm text-[var(--text-muted)] mt-1">{selectedSite.website_niche || selectedSite.category || 'General'}</div>
                </div>
                <a
                  href={`https://${selectedSite.root_domain || selectedSite.domain_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-btn bg-[var(--card-background)] border border-[var(--border)] hover:border-[var(--primary-cyan)] text-[var(--text-primary)]"
                >
                  Visit Site <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow label="Sample URL" value={selectedSite.sample_url} isLink />
                <DetailRow label="Href URL" value={selectedSite.href_url} isLink />
                <DetailRow label="Paypal ID" value={selectedSite.paypal_id} />
                <DetailRow label="Skype" value={selectedSite.skype} />
                <DetailRow label="WhatsApp" value={selectedSite.whatsapp} />
                <DetailRow label="Country" value={selectedSite.country_source} />
              </div>

              <div className="border-t border-[var(--border)] pt-6">
                <h4 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4 text-[var(--text-muted)]" />
                  Site Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="DA" value={selectedSite.da} />
                  <MetricCard label="DR" value={selectedSite.dr} />
                  <MetricCard label="RD" value={selectedSite.rd} />
                  <MetricCard label="Traffic" value={selectedSite.traffic} />
                  <MetricCard label="Spam Score" value={selectedSite.spam_score} />
                  <MetricCard label="GP Price" value={price(selectedSite.gp_price)} highlighted />
                  <MetricCard label="Niche Price" value={price(selectedSite.niche_edit_price || selectedSite.niche_price)} highlighted />
                  <div className="bg-[var(--background-dark)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center">
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</div>
                    <span
                      className={`premium-badge ${selectedSite.site_status === '1' || selectedSite.site_status === 1
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                    >
                      {selectedSite.website_status || (selectedSite.site_status === '1' || selectedSite.site_status === 1 ? 'Active' : 'Inactive')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--card-background)] rounded-b-2xl">
              <button
                onClick={() => setSelectedSite(null)}
                className="premium-btn w-full justify-center bg-[var(--background-dark)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-primary)]"
              >
                Close
              </button>
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
  );
}

// Helper Components
function DetailRow({ label, value, isLink }) {
  return (
    <div className="p-3 bg-[var(--background-dark)] rounded-xl border border-[var(--border)]">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
      {isLink && value && value !== 'N/A' ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium flex items-center gap-1 hover:underline text-[var(--primary-cyan)] truncate"
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {value || 'N/A'}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, highlighted }) {
  return (
    <div
      className={`p-4 rounded-xl border ${highlighted ? 'border-[var(--primary-cyan)]/30 bg-[var(--primary-cyan)]/5' : 'border-[var(--border)] bg-[var(--background-dark)]'} flex flex-col items-center text-center`}
    >
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-bold text-lg ${highlighted ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-primary)]'}`}>
        {value || '-'}
      </div>
    </div>
  );
}

export default NewSites;
