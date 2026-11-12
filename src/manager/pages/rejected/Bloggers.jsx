import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Pagination } from '../../../components/Pagination.jsx';
import { managerAPI } from '../../../lib/api';

export const RejectedBloggers = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const EMPTY = { orderId: '', user: '', domain: '' };
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY); // searched on the server, a moment after typing stops

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await managerAPI.getRejectedOrders(page, pageSize, { order_id: applied.orderId.trim(), user: applied.user.trim(), domain: applied.domain.trim() });
      setOrders(response.orders || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Error fetching rejected orders:', err);
      setError(err.message || 'Failed to load rejected orders');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applied]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Typing pauses for a moment → search the whole list from page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied(a => (a.orderId === filters.orderId && a.user === filters.user && a.domain === filters.domain ? a : filters));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filters]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredOrders = orders; // the server already applied the searches
  const searching = !!(applied.orderId || applied.user || applied.domain);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rejected Orders - Bloggers</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">{total} {searching ? 'matching' : 'total'} rejected orders</span>
          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-center justify-between">
          <p className="text-red-400">{error}</p>
          <button onClick={fetchOrders} className="btn btn-sm">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium text-text-secondary">Filters</div>
          <button className="text-error text-sm" onClick={() => setFilters(EMPTY)}>Reset</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Order Id</label>
            <input
              className="input w-full"
              placeholder="Search by order ID..."
              value={filters.orderId}
              onChange={(e) => setFilters(f => ({ ...f, orderId: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">User name/email</label>
            <input
              className="input w-full"
              placeholder="Search by blogger name or email..."
              value={filters.user}
              onChange={(e) => setFilters(f => ({ ...f, user: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Domain</label>
            <input
              className="input w-full"
              placeholder="Search by root domain..."
              value={filters.domain}
              onChange={(e) => setFilters(f => ({ ...f, domain: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="premium-table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Order Id</th>
              <th>Order Type</th>
              <th>Blogger</th>
              <th>Root Domain</th>
              <th>Status</th>
              <th>Reject Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {searching ? 'No rejected orders match your search' : 'No rejected blogger orders'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{order.order_id || `#${order.id}`}</td>
                  <td className="px-4 py-3">
                    <span className="badge">{order.order_type || 'Guest Post'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.blogger_name || 'N/A'}</div>
                    <div className="text-xs text-text-secondary">{order.blogger_email || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    {order.website_url ? (
                      <a href={`https://${order.website_url}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {order.website_url}
                      </a>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${order.status === 12
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-orange-500/20 text-orange-400'
                      }`}>
                      {order.status === 12 ? 'Rejected by Blogger' : 'Rejected by Manager'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={order.status === 12 ? 'text-red-400' : 'text-orange-400'}>
                      {order.rejection_reason || 'No reason provided'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(order.updated_at || order.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4">
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
    </Layout>
  );
};

export default RejectedBloggers;
