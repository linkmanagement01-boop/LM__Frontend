import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle, Eye, Search } from 'lucide-react';
import { writerAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

import { Pagination } from '../../components/Pagination.jsx';

/**
 * Writer Completed Orders Page
 * Shows all completed orders for the writer with columns: Order ID, Manager, Order Type, Pushed Date
 */
export function CompletedOrders() {
    const navigate = useNavigate();
    const { showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Fetch completed orders
    const fetchCompletedOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await writerAPI.getCompletedOrders();
            setOrders(response.orders || []);
        } catch (err) {
            console.error('Error fetching completed orders:', err);
            showError('Failed to load completed orders');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchCompletedOrders();
    }, [fetchCompletedOrders]);

    // Filter orders by search
    const filteredOrders = orders.filter(order => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            (order.manual_order_id || '').toLowerCase().includes(searchLower) ||
            (order.manager_name || '').toLowerCase().includes(searchLower) ||
            (order.order_type || '').toLowerCase().includes(searchLower)
        );
    });

    // Paginate
    const total = filteredOrders.length;
    const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '-';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        Completed Orders
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-1">
                        View and track your entire history of completed work.
                    </p>
                </div>
                <button
                    onClick={fetchCompletedOrders}
                    disabled={loading}
                    className="premium-btn premium-btn-accent"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="premium-card p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search by Order ID, Manager, or Order Type..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="premium-input w-full pl-10"
                        />
                    </div>
                    <div className="px-4 py-2 bg-[var(--background-dark)] rounded-lg text-sm text-[var(--text-secondary)] font-medium border border-[var(--border)]">
                        {total} orders found
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && orders.length === 0 && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[var(--border)] border-t-[var(--primary-cyan)]"></div>
                    <p className="mt-4 text-[var(--text-muted)] font-medium">Loading history...</p>
                </div>
            )}

            {/* Table */}
            {!loading && (
                <div className="premium-table-container">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Manager</th>
                                <th>Order Type</th>
                                <th>Pushed Date</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedOrders.map((order) => (
                                <tr key={order.id} className="group">
                                    <td className="font-medium">
                                        <span className="text-[var(--primary-cyan)]">
                                            {order.manual_order_id || `ORD-${order.id}`}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-[var(--background-dark)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] border border-[var(--border)]">
                                                {(order.manager_name || 'M')[0]}
                                            </div>
                                            {order.manager_name || 'Manager'}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="premium-badge"
                                            style={{
                                                backgroundColor: order.order_type === 'GP' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                color: order.order_type === 'GP' ? '#7C3AED' : '#16A34A'
                                            }}
                                        >
                                            {order.order_type || 'Guest Post'}
                                        </span>
                                    </td>
                                    <td className="text-[var(--text-secondary)]">
                                        {formatDate(order.pushed_date || order.completed_at || order.created_at)}
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => navigate(`/writer/completed-orders/${order.id}/detail`)}
                                            className="premium-btn premium-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                                        >
                                            View <Eye className="h-3 w-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-[var(--text-muted)]">
                                        {search ? 'No orders match your search' : 'No completed orders found'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
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
