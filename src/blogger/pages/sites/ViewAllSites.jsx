import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, Eye, X, ExternalLink, Download } from 'lucide-react';
import { bloggerAPI } from '../../../lib/api';
import ExportModal from '../../../components/ExportModal';
import { exportToCSV, exportToExcel } from '../../../utils/exportUtils';

export function ViewAllSites() {
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

  // Fetch websites from blogger API
  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bloggerAPI.getSites({ page, limit: pageSize });
      setWebsites(response.sites || []);
      setPagination(response.pagination || { total: 0, totalPages: 0 });
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
      r = r.filter(x => (x.root_domain || '').toLowerCase().includes(filters.domain.toLowerCase()));
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
        exportToCSV(dataToExport, filename || 'blogger_sites');
    } else {
        exportToExcel(dataToExport, filename || 'blogger_sites', format === 'xlsx');
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>View All Sites {'>'} List</div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Globe className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          View All Sites
        </h2>
        <button
          onClick={fetchWebsites}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-red-400">{error}</p>
          <button onClick={fetchWebsites} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', color: '#FFFFFF' }}>
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
        <div className="mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <input
            placeholder="Search domain..."
            value={filters.domain}
            onChange={(e) => { setFilters({ ...filters, domain: e.target.value }); }}
            className="rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            placeholder="Category"
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); }}
            className="rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); }}
            className="rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">All Status</option>
            <option value="1">Active</option>
            <option value="2">Inactive</option>
          </select>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => { setFilters({ category: '', domain: '', status: '' }); }}
              className="h-10 px-4 rounded-xl text-sm font-semibold border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
            {selectedRows.size > 0 && (
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ml-auto"
                style={{ 
                  backgroundColor: 'rgba(124, 58, 237, 0.1)', 
                  border: '1px solid rgba(124, 58, 237, 0.3)', 
                  color: 'var(--primary-cyan)' 
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export ({selectedRows.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Showing X to Y of Z */}
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing {showingFrom} to {showingTo} of {pagination.total} results
      </div>

      {/* Loading State */}
      {loading && websites.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading websites...</p>
        </div>
      )}

      {/* Table with horizontal scroll */}
      {!loading && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead style={{ backgroundColor: 'var(--background-dark)' }}>
                <tr>
                  <th className="px-3 py-3 text-center w-12">
                    <input 
                        type="checkbox" 
                        className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                        checked={rows.length > 0 && selectedRows.size === rows.length}
                        onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Root Domain</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>DR</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>DA</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>RD</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Spam</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Traffic</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prices</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>FC Prices</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Email</th>
                  <th className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((site, index) => (
                  <tr key={site.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-3 text-center">
                        <input 
                            type="checkbox" 
                            className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                            checked={selectedRows.has(site.id)}
                            onChange={() => handleSelectRow(site.id)}
                        />
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {site.root_domain}
                        </div>
                        {/* one line – full category list on hover */}
                        <div className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }} title={site.category || ''}>
                          {site.category || 'General'} • {site.created_at ? new Date(site.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{site.dr || '-'}</td>
                    <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{site.da || '-'}</td>
                    <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{site.rd || '-'}</td>
                    <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{site.spam_score || '-'}</td>
                    <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{site.traffic || '-'}</td>
                    {/* GP / niche edit (and their FC prices) stacked to keep the table on one screen */}
                    <td className="px-3 py-3 text-center text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>GP</span> {site.gp_price || '0'}</div>
                      <div className="mt-0.5"><span style={{ color: 'var(--text-muted)' }}>NE</span> {site.niche_edit_price || '0'}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>GP</span> {site.fc_gp || '0'}</div>
                      <div className="mt-0.5"><span style={{ color: 'var(--text-muted)' }}>NE</span> {site.fc_ne || '0'}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: site.site_status === '1' || site.site_status === 1 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: site.site_status === '1' || site.site_status === 1 ? 'var(--success)' : 'var(--error)'
                        }}
                      >
                        {site.website_status || (site.site_status === '1' || site.site_status === 1 ? 'Active' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }} title={site.email || ''}>
                      {site.email || '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelectedSite(site)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" style={{ color: 'var(--primary-cyan)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>No websites found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Site Details Modal */}
      {selectedSite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-background)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Site Details - {selectedSite.root_domain}
              </h3>
              <button
                onClick={() => setSelectedSite(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <DetailRow label="Website Niche" value={selectedSite.website_niche} />
              <DetailRow
                label="Sample URL"
                value={selectedSite.sample_url}
                isLink
              />
              <DetailRow
                label="Href URL"
                value={selectedSite.href_url}
                isLink
              />
              <DetailRow label="Paypal ID" value={selectedSite.paypal_id} />
              <DetailRow label="Skype" value={selectedSite.skype} />
              <DetailRow label="WhatsApp" value={selectedSite.whatsapp} />
              <DetailRow label="Country Source" value={selectedSite.country_source} />

              <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Site Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="DA" value={selectedSite.da} />
                  <MetricCard label="DR" value={selectedSite.dr} />
                  <MetricCard label="RD" value={selectedSite.rd} />
                  <MetricCard label="Traffic" value={selectedSite.traffic} />
                  <MetricCard label="Spam Score" value={selectedSite.spam_score} />
                  <MetricCard label="GP Price" value={`$${selectedSite.gp_price || 0}`} />
                  <MetricCard label="Niche Price" value={`$${selectedSite.niche_edit_price || 0}`} />
                  <MetricCard label="Status" value={selectedSite.website_status || 'N/A'} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-background)' }}>
              <button
                onClick={() => setSelectedSite(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                Cancel
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
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="sm:w-40 flex-shrink-0 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {isLink && value && value !== 'N/A' ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm flex items-center gap-1 hover:underline"
          style={{ color: 'var(--primary-cyan)' }}
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {value || 'N/A'}
        </span>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)' }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{value || '-'}</div>
    </div>
  );
}
