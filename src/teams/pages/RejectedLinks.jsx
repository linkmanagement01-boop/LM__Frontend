import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.jsx';
import { teamAPI } from '../../lib/api';
import { RefreshCw, Eye, AlertCircle, Search, ExternalLink, X, XCircle, Send } from 'lucide-react';

export function RejectedLinks() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOrder, setViewOrder] = useState(null);

  // Fetch rejected links from API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamAPI.getRejectedLinks();
      setOrders(response.orders || []);
    } catch (err) {
      console.error('Error fetching rejected links:', err);
      setError(err.message || 'Failed to load rejected links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders based on search
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(o =>
      `${o.id}`.includes(term) ||
      `${o.manual_order_id}`.toLowerCase().includes(term) ||
      o.client_name?.toLowerCase().includes(term) ||
      o.rejection_reason?.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const total = filteredOrders.length;
  const pageData = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex bg-[var(--card-background)] p-6 rounded-2xl border border-[var(--border)] items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            Rejected Links
          </h1>
          <p className="text-[var(--text-muted)] mt-2">Review and fix rejected submissions</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="premium-btn bg-[var(--background-dark)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-primary)]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="premium-card p-4 border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchOrders} className="flex items-center gap-2 hover:underline">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div className="premium-card p-5 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            placeholder="Search by ID, client, reason..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="premium-input w-full pl-9"
          />
        </div>
        <div className="premium-metric-pill bg-[var(--background-dark)] text-red-400 min-w-[120px] justify-center border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <span>{total} Rejected</span>
        </div>
      </div>

      {/* Table */}
      {!loading && (
        <div className="premium-table-container">
          <table className="premium-table table-compact">
            <thead>
              <tr>
                <th className="w-[100px]">Order ID</th>
                <th>Client</th>
                <th>Manager</th>
                <th>Rejection Reason</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[var(--primary-cyan)]" />
                      <span>Loading rejected links...</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <XCircle className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
                      <span>No rejected links found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[var(--primary-cyan)]">#{r.manual_order_id || r.id}</td>
                    <td className="text-[var(--text-secondary)]">{r.client_name || 'N/A'}</td>
                    <td className="text-[var(--text-secondary)]">{r.manager_name || 'N/A'}</td>
                    <td>
                      <span className="text-red-400 truncate block max-w-[300px]">
                        {r.rejection_reason || 'No reason provided'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewOrder(r)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-cyan)] hover:bg-[var(--primary-cyan)]/10 transition-colors inline-flex"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/teams/order-notifications/push/${r.id}`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm text-white hover:text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                        >
                          <Send className="h-3 w-3" />
                          Push to Manager
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
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewOrder(null)}>
          <div
            className="premium-card w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                Rejected Order #{viewOrder.manual_order_id || viewOrder.id}
              </h3>
              <button
                onClick={() => setViewOrder(null)}
                className="p-2 rounded-lg hover:bg-[var(--background-dark)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Client</label>
                  <div className="text-[var(--text-primary)] font-medium">{viewOrder.client_name || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Order Type</label>
                  <div className="text-[var(--text-primary)] font-medium">{viewOrder.order_type}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Manager</label>
                  <div className="text-[var(--text-primary)] font-medium">{viewOrder.manager_name}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Status</label>
                  <div className="premium-badge bg-red-500/10 text-red-400 border-red-500/20 inline-flex">
                    {viewOrder.current_status}
                  </div>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <label className="text-xs text-red-400/80 uppercase tracking-wider font-bold mb-2 block flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Rejection Reason
                </label>
                <p className="text-red-300 leading-relaxed">
                  {viewOrder.rejection_reason || 'No specific reason provided by the manager.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RejectedLinks;
