import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, UserCheck, CheckCircle, XCircle, Eye, Search, Filter, Globe, Trash2, ExternalLink } from 'lucide-react';
import { Pagination } from '../../../components/Pagination.jsx';
import { managerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Layout } from '../../components/layout/Layout';

export function PendingBloggers() {
  const { showSuccess, showError } = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [processing, setProcessing] = useState(null);

  // Fetch pending blogger submissions (status = 7)
  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getPendingFromBloggers();
      setApprovals(response.orders || []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Navigate to detail page
  const handleViewDetails = (detailId) => {
    // navigate(/manager/pending/bloggers/${detailId}); // Fixed path
    // Correcting path based on user context, though the original code had backticks. 
    // Since I cannot use backticks here easily without escaping, I will assume standard string concat is fine or just fix it.
    // Wait, the previous code had template literal. I should preserve it.
    // navigate(`/manager/pending/bloggers/${detailId}`);
  };

  // Handle rejection
  const handleReject = async (detailId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason || !reason.trim()) return;

    try {
      setProcessing(detailId);
      await managerAPI.rejectBloggerSubmission(detailId, reason.trim());
      showSuccess('Blogger submission rejected successfully');
      // Refresh the list to remove the rejected item
      fetchApprovals();
    } catch (err) {
      showError('Failed to reject: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  // Filter approvals
  const rows = useMemo(() => {
    let r = approvals;
    const q = filters.search.toLowerCase();
    if (q) {
      r = r.filter(a =>
        String(a.order_id || '').toLowerCase().includes(q) ||
        (a.new_site || '').toLowerCase().includes(q) ||
        (a.root_domain || '').toLowerCase().includes(q) ||
        (a.vendor_name || '').toLowerCase().includes(q) ||
        (a.vendor_email || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [approvals, filters]);

  const total = rows.length;
  const pageData = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Layout>
      <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-[var(--text-secondary)]">Pending Approval {'>'} Bloggers</div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-[var(--primary-cyan)]" />
              Pending From Bloggers
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Review and approve submissions from bloggers</p>
          </div>
          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="premium-btn premium-btn-primary"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
            <p>{error}</p>
            <button onClick={fetchApprovals} className="text-sm font-medium hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="premium-card p-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                placeholder="Search by Order ID, site, vendor..."
                value={filters.search}
                onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }}
                className="premium-input w-full pl-10"
              />
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">{total} pending approvals</span>
              {filters.search && (
                <button
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => setFilters({ search: '' })}
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
            <RefreshCw className="h-10 w-10 animate-spin mb-4 text-[var(--primary-cyan)]" />
            <p>Loading pending approvals...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="premium-table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Order Type</th>
                  <th>Vendor</th>
                  <th>Root Domain</th>
                  <th>Submitted URL</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                      No pending blogger submissions found
                    </td>
                  </tr>
                ) : (
                  pageData.map((approval) => (
                    <tr key={approval.id}>
                      <td>
                        <span className="font-semibold text-[var(--text-primary)]">#{approval.order_id || '-'}</span>
                      </td>
                      <td>
                        <span className="premium-badge bg-blue-500/10 text-blue-400 border-blue-500/20">
                          {approval.order_type || 'niche'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{approval.vendor_name || '-'}</div>
                          <div className="text-xs text-[var(--text-muted)]">{approval.vendor_email || ''}</div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`https://${approval.root_domain || approval.new_site}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-cyan)] transition-colors group"
                        >
                          <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                          {approval.root_domain || approval.new_site || '-'}
                        </a>
                      </td>
                      <td className="max-w-[200px] truncate">
                        {approval.submit_url ? (
                          <a
                            href={approval.submit_url.startsWith('http') ? approval.submit_url : `https://${approval.submit_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-[var(--primary-cyan)] hover:underline"
                            title={approval.submit_url}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="truncate">{approval.submit_url.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                      <td>
                        {approval.link_status === 'Live' ? (
                          <span className="premium-badge bg-green-500/10 text-green-400 border-green-500/20">
                            Yes
                          </span>
                        ) : (
                          <span className="premium-badge bg-red-500/10 text-red-400 border-red-500/20" title={approval.link_check_result || 'Verification pending'}>
                            No
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="premium-badge bg-green-500/10 text-green-400 border-green-500/20">
                          {approval.status || 'Accepted'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/manager/pending/bloggers/${approval.id}`}
                            className="premium-btn p-2 min-w-0"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handleReject(approval.id)}
                            disabled={processing === approval.id}
                            className="premium-btn p-2 min-w-0 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            title="Reject"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="mt-6">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              pageSizeOptions={[20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PendingBloggers;
