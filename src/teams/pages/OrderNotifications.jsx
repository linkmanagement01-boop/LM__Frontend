import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.jsx';
import { teamAPI } from '../../lib/api';
import { RefreshCw, ArrowRight, Bell, Search, ExternalLink, Box } from 'lucide-react';

export function OrderNotifications() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamAPI.getOrderNotifications();
      setOrders(response.orders || []);
    } catch (err) {
      console.error('Error fetching order notifications:', err);
      setError(err.message || 'Failed to load orders');
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
      o.client_name?.toLowerCase().includes(term) ||
      o.order_type?.toLowerCase().includes(term) ||
      o.category?.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const total = filteredOrders.length;
  const pageData = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  // Handle push to manager
  const handlePush = (orderId) => {
    navigate(`/teams/order-notifications/push/${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex bg-[var(--card-background)] p-6 rounded-2xl border border-[var(--border)] items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <Bell className="h-8 w-8 text-[var(--primary-cyan)]" />
            Order Notifications
          </h1>
          <p className="text-[var(--text-muted)] mt-2">Manage new orders and assign tasks</p>
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
            placeholder="Search by ID, client, type..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="premium-input w-full pl-9"
          />
        </div>
        <div className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-secondary)] min-w-[120px] justify-center">
          <Box className="h-4 w-4" />
          <span>{total} Orders</span>
        </div>
      </div>

      {/* Table */}
      {!loading && (
        <div className="premium-table-container">
          <table className="premium-table table-compact">
            <thead>
              <tr>
                <th className="w-[100px]">Order ID</th>
                <th>Order Type</th>
                <th>Category</th>
                <th>Client Name</th>
                <th>Client Website</th>
                <th className="text-center">Links</th>
                <th>Package</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[var(--primary-cyan)]" />
                      <span>Loading notifications...</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Bell className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
                      <span>No new order notifications</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[var(--primary-cyan)]">
                      {r.manual_order_id || `#${r.id}`}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {r.order_type || 'Guest Post'}
                    </td>
                    <td>
                      <span className="premium-badge whitespace-nowrap bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20">
                        {r.category || 'General'}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)]">{r.client_name || 'N/A'}</td>
                    <td>
                      {r.client_website ? (
                        <a
                          href={r.client_website}
                          className="text-[var(--primary-cyan)] hover:underline flex items-center gap-1 group truncate max-w-[150px]"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="truncate">{r.client_website}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : <span className="text-[var(--text-muted)]">N/A</span>}
                    </td>
                    <td className="text-center">
                      <span className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-primary)]">
                        {r.no_of_links || 1}
                      </span>
                    </td>
                    <td className="max-w-[220px]">
                      {/* package text can be long – two lines, full text on hover */}
                      <div className="line-clamp-2 text-xs text-[var(--text-secondary)]" title={r.order_package || ''}>{r.order_package || 'Standard'}</div>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handlePush(r.id)}
                        className="premium-btn bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90 px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        Push <ArrowRight className="h-3 w-3" />
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

export default OrderNotifications;
