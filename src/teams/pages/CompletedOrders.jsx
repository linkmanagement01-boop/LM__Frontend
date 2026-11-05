import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../components/Pagination.jsx';
import { teamAPI } from '../../lib/api';
import { RefreshCw, Eye, CheckCircle, Search, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CompletedOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ date: '', orderId: '', orderType: '', manager: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch completed orders from API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamAPI.getCompletedOrders();
      setOrders(response.orders || []);
    } catch (err) {
      console.error('Error fetching completed orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Get unique managers for filter dropdown
  const managers = useMemo(() => {
    const unique = [...new Set(orders.map(o => o.manager_name).filter(Boolean))];
    return unique;
  }, [orders]);

  // Filter orders
  const rows = useMemo(() => {
    let r = orders;
    if (filters.date) r = r.filter(x => new Date(x.updated_at).toDateString() === new Date(filters.date).toDateString());
    if (filters.orderId) r = r.filter(x => `${x.order_id || x.id}`.toLowerCase().includes(filters.orderId.toLowerCase()));
    if (filters.orderType) r = r.filter(x => x.order_type === filters.orderType);
    if (filters.manager) r = r.filter(x => x.manager_name === filters.manager);
    return r;
  }, [orders, filters]);

  const total = rows.length;
  const pageData = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex bg-[var(--card-background)] p-6 rounded-2xl border border-[var(--border)] items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
            Completed Orders
          </h1>
          <p className="text-[var(--text-muted)] mt-2">History of successfully processed orders</p>
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

      {/* Error State */}
      {error && (
        <div className="premium-card p-4 border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>{error}</span>
          <button onClick={fetchOrders} className="flex items-center gap-2 hover:underline">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
            <Filter className="h-4 w-4 text-[var(--primary-cyan)]" />
            Filters
          </div>
          {(filters.date || filters.orderId || filters.orderType || filters.manager) && (
            <button
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              onClick={() => { setFilters({ date: '', orderId: '', orderType: '', manager: '' }); setPage(1); }}
            >
              <X className="h-3 w-3" /> Reset all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] ml-1">Completed Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => { setFilters({ ...filters, date: e.target.value }); setPage(1); }}
              className="premium-input w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] ml-1">Order ID</label>
            <div className="relative">
              <input
                value={filters.orderId}
                onChange={(e) => { setFilters({ ...filters, orderId: e.target.value }); setPage(1); }}
                placeholder="Search by ID"
                className="premium-input w-full pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] ml-1">Order Type</label>
            <select
              value={filters.orderType}
              onChange={(e) => { setFilters({ ...filters, orderType: e.target.value }); setPage(1); }}
              className="premium-input w-full appearance-none"
            >
              <option value="">All Types</option>
              <option value="Guest Post">Guest Post</option>
              <option value="Niche Edit">Niche Edit</option>
              <option value="Link Insertion">Link Insertion</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] ml-1">Manager</label>
            <select
              value={filters.manager}
              onChange={(e) => { setFilters({ ...filters, manager: e.target.value }); setPage(1); }}
              className="premium-input w-full appearance-none"
            >
              <option value="">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {!loading && (
        <div className="premium-table-container">
          <table className="premium-table table-compact">
            <thead>
              <tr>
                <th className="w-[120px]">Order ID</th>
                <th>Order Type</th>
                <th>Category</th>
                <th>Manager</th>
                <th>Client</th>
                <th className="text-center">Links</th>
                <th>Package</th>
                <th className="text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[var(--primary-cyan)]" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CheckCircle className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
                      <span>No completed orders found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[var(--primary-cyan)]">
                      {r.order_id || `#${r.id}`}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {r.order_type || 'Guest Post'}
                    </td>
                    <td>
                      <span className="premium-badge whitespace-nowrap bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20">
                        {r.category || 'General'}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)]">{r.manager_name || 'N/A'}</td>
                    {/* client name with the website under it */}
                    <td>
                      <div className="text-[var(--text-primary)]">{r.client_name || 'N/A'}</div>
                      {r.client_website && (
                        <a href={r.client_website} className="text-xs text-[var(--primary-cyan)] hover:underline truncate max-w-[180px] inline-block align-bottom" target="_blank" rel="noreferrer">
                          {r.client_website}
                        </a>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-primary)]">
                        {r.no_of_links || 1}
                      </span>
                    </td>
                    <td className="max-w-[220px]">
                      {/* package text can be long – two lines, full text on hover */}
                      <div className="line-clamp-2 text-xs text-[var(--text-secondary)]" title={r.order_package || ''}>{r.order_package || 'N/A'}</div>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => navigate(`/teams/completed-orders/${r.id}/detail`)}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-cyan)] hover:bg-[var(--primary-cyan)]/10 transition-colors inline-flex"
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
    </div>
  );
}

export default CompletedOrders;
