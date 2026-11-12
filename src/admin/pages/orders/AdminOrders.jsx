import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Eye, RefreshCw, FileText, SlidersHorizontal, Columns, Calendar, Download } from 'lucide-react';
import { adminAPI } from '../../../lib/api';
import ExportModal from '../../../components/ExportModal';
import { exportToCSV, exportToExcel } from '../../../utils/exportUtils';

export function AdminOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    
    // Managers data for filtering and reassigning
    const [managers, setManagers] = useState([]);
    
    // Reassign modal state
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignOrderId, setReassignOrderId] = useState(null);
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [reassignLoading, setReassignLoading] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [total, setTotal] = useState(0);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [showColumnToggle, setShowColumnToggle] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        order_id: '',
        category: '',
        client_name: '',
        client_website: '',
        ordered_at_from: '',
        ordered_at_to: '',
        manager_id: ''
    });

    // Fetch managers for filter dropdowns
    useEffect(() => {
        const fetchManagers = async () => {
            try {
                const response = await adminAPI.getUsers();
                if (response && response.users) {
                    setManagers(response.users.filter(m => m.role === 'Manager' && m.status === 1));
                }
            } catch (error) {
                console.error('Failed to fetch managers:', error);
            }
        };
        fetchManagers();
    }, []);

    // Column visibility state
    const [visibleColumns, setVisibleColumns] = useState({
        manager: true,
        client_name: true,
        status: true,
        website: true,
        tat: true,
        no_of_links: true,
        order_type: true,
        order_package: true,
        category: true,
        ordered_at: true,
        completed_at: true
    });

    const allColumns = [
        { key: 'manager', label: 'Manager' },
        { key: 'client_name', label: 'Client Name' },
        { key: 'status', label: 'Status' },
        { key: 'website', label: 'Website' },
        { key: 'tat', label: 'TAT' },
        { key: 'no_of_links', label: 'No of Links' },
        { key: 'order_type', label: 'Order Type' },
        { key: 'order_package', label: 'Order Package' },
        { key: 'category', label: 'Category' },
        { key: 'ordered_at', label: 'Ordered At' },
        { key: 'completed_at', label: 'Completed At' }
    ];

    // Quick search runs on the server (all orders, not just this page), a moment after typing stops
    const [appliedSearch, setAppliedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => {
            const q = filters.search.trim();
            setAppliedSearch(prev => {
                if (prev !== q) setPage(1);
                return q;
            });
        }, 400);
        return () => clearTimeout(t);
    }, [filters.search]);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Build query params
            const queryParams = { page, limit: pageSize };
            if (appliedSearch) queryParams.search = appliedSearch;
            if (filters.status) queryParams.status = filters.status;
            if (filters.order_id) queryParams.order_id = filters.order_id;
            if (filters.category) queryParams.category = filters.category;
            if (filters.client_name) queryParams.client_name = filters.client_name;
            if (filters.client_website) queryParams.client_website = filters.client_website;
            if (filters.ordered_at_from) queryParams.ordered_at_from = filters.ordered_at_from;
            if (filters.ordered_at_to) queryParams.ordered_at_to = filters.ordered_at_to;
            if (filters.manager_id) queryParams.manager_id = filters.manager_id;

            const response = await adminAPI.getOrders(queryParams);
            setOrders(response.orders || []);
            setTotal(response.total || 0);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, appliedSearch, filters.status, filters.order_id, filters.category, filters.client_name, filters.client_website, filters.ordered_at_from, filters.ordered_at_to, filters.manager_id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filteredOrders = orders; // the server already applied the search

    const getStatusBadge = (status, workflowLocation) => {
        const statusStyles = {
            'Pending': { bg: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24' },
            'In Process': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' },
            'Completed': { bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' },
            'Rejected': { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' },
            'Unknown': { bg: 'rgba(107, 114, 128, 0.2)', color: '#6B7280' }
        };
        return statusStyles[status] || statusStyles['Unknown'];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };


    const clearFilters = () => {
        setFilters({
            search: '',
            status: '',
            order_id: '',
            category: '',
            client_name: '',
            client_website: '',
            ordered_at_from: '',
            ordered_at_to: '',
            manager_id: ''
        });
        setPage(1);
    };

    const hasActiveFilters = filters.status || filters.order_id || filters.category ||
        filters.client_name || filters.client_website ||
        filters.ordered_at_from || filters.ordered_at_to || filters.manager_id;

    const totalPages = Math.ceil(total / pageSize);

    // Export Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(new Set(filteredOrders.map(o => o.id)));
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

    const handleReassign = async () => {
        if (!selectedManagerId) return;
        try {
            setReassignLoading(true);
            await adminAPI.reassignClientOrder(reassignOrderId, selectedManagerId);
            setIsReassignModalOpen(false);
            fetchOrders();
        } catch (err) {
            console.error('Failed to reassign:', err);
            setError('Failed to reassign order');
        } finally {
            setReassignLoading(false);
        }
    };

    const handleExport = ({ filename, format }) => {
        const dataToExport = filteredOrders
            .filter(o => selectedRows.has(o.id))
            .map(order => ({
                'Order ID': order.order_id || `#${order.id}`,
                'Manager': order.manager_name || '',
                'Client Name': order.client_name || '',
                'Status': order.status_label || '',
                'Website': order.client_website || '',
                'TAT': order.tat || '',
                'No of Links': order.no_of_links || 0,
                'Order Type': order.order_type || '',
                'Order Package': order.order_package || '',
                'Category': order.category || '',
                'Ordered At': formatDate(order.created_at),
                'Completed At': formatDate(order.completed_at)
            }));

        if (format === 'csv') {
            exportToCSV(dataToExport, filename || 'orders_export');
        } else {
            exportToExcel(dataToExport, filename || 'orders_export', format === 'xlsx');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header and Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h1>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} results
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                    {/* Export Toggle */}
                    {selectedRows.size > 0 && (
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="p-2.5 rounded-xl transition-all duration-300 hover:bg-[var(--primary-cyan)]/10 flex items-center gap-2 bg-[var(--primary-cyan)]/5"
                            title="Export Selected"
                            style={{ border: '1px solid rgba(107, 240, 255, 0.3)' }}
                        >
                            <Download className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                            <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--primary-cyan)' }}>Export ({selectedRows.size})</span>
                        </button>
                    )}
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative p-2.5 rounded-xl transition-all duration-300 ${showFilters ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20' : 'hover:bg-white/10'
                            }`}
                        title="Toggle Filters"
                        style={{ border: showFilters ? '1px solid rgba(107, 240, 255, 0.3)' : '1px solid transparent' }}
                    >
                        <SlidersHorizontal className={`h-5 w-5 transition-all duration-300 ${showFilters ? 'text-cyan-400' : ''}`}
                            style={{ color: showFilters ? 'var(--primary-cyan)' : 'var(--text-muted)' }} />
                        {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                        )}
                    </button>

                    {/* Column Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnToggle(!showColumnToggle)}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${showColumnToggle ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'hover:bg-white/10'
                                }`}
                            title="Toggle Columns"
                            style={{ border: showColumnToggle ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent' }}
                        >
                            <Columns className="h-5 w-5" style={{ color: showColumnToggle ? '#A855F7' : 'var(--text-muted)' }} />
                        </button>

                        {/* Column Toggle Popup */}
                        {showColumnToggle && (
                            <div
                                className="absolute right-0 top-12 z-50 w-56 rounded-xl shadow-xl animate-in slide-in-from-top-2 duration-200"
                                style={{
                                    backgroundColor: 'var(--card-background)',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
                                }}
                            >
                                <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Columns</h4>
                                </div>
                                <div className="p-2 max-h-80 overflow-y-auto">
                                    {allColumns.map(col => (
                                        <label
                                            key={col.key}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns[col.key]}
                                                onChange={() => setVisibleColumns(v => ({ ...v, [col.key]: !v[col.key] }))}
                                                className="w-4 h-4 rounded accent-cyan-400"
                                            />
                                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>
        </div>

        {/* Collapsible Filters Panel */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div
                    className="card p-5 rounded-2xl"
                    style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Filters
                        </h3>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                                Reset
                            </button>
                        )}
                    </div>

                    {/* First Row: Ordered At Date */}
                    <div className="mb-4">
                        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>Ordered At</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filters.ordered_at_from}
                                onChange={e => { setFilters(f => ({ ...f, ordered_at_from: e.target.value })); setPage(1); }}
                                className="flex-1 px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                            <span className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>to</span>
                            <input
                                type="date"
                                value={filters.ordered_at_to}
                                onChange={e => { setFilters(f => ({ ...f, ordered_at_to: e.target.value })); setPage(1); }}
                                className="flex-1 px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    {/* Second Row: Other Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Order ID</label>
                            <input
                                type="text"
                                value={filters.order_id}
                                onChange={e => { setFilters(f => ({ ...f, order_id: e.target.value })); setPage(1); }}
                                placeholder="Search..."
                                className="w-full px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Category</label>
                            <input
                                type="text"
                                value={filters.category}
                                onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
                                placeholder="Search..."
                                className="w-full px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Client Name</label>
                            <input
                                type="text"
                                value={filters.client_name}
                                onChange={e => { setFilters(f => ({ ...f, client_name: e.target.value })); setPage(1); }}
                                placeholder="Search..."
                                className="w-full px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Client Website</label>
                            <input
                                type="text"
                                value={filters.client_website}
                                onChange={e => { setFilters(f => ({ ...f, client_website: e.target.value })); setPage(1); }}
                                placeholder="Search..."
                                className="w-full px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</label>
                            <select
                                value={filters.status}
                                onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                                className="w-full px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Select an option</option>
                                <option value="Completed">Completed</option>
                                <option value="In Process">In Process</option>
                                <option value="Pending">Pending</option>
                                <option value="Manager">Manager</option>
                                <option value="Team">Team</option>
                                <option value="Writer">Writer</option>
                                <option value="Blogger">Blogger</option>
                            </select>
                        </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Assigned Manager</label>
                                <select
                                    value={filters.manager_id}
                                    onChange={e => { setFilters(f => ({ ...f, manager_id: e.target.value })); setPage(1); }}
                                    className="w-full px-3 py-2 rounded-xl text-sm"
                                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">All Managers</option>
                                    <option value="unassigned">Unassigned</option>
                                    {managers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                    </div>
                </div>
            </div>

            {/* Quick Search */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                <div className="relative">
                    <input
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        type="text"
                        placeholder="Quick search by order id, client, manager, website..."
                        className="w-full rounded-xl px-10 py-2"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <p className="text-red-400">{error}</p>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">&times;</button>
                </div>
            )}

            {/* Orders Table */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead style={{ backgroundColor: 'var(--background-dark)' }}>
                            <tr>
                                <th className="px-4 py-3 text-left w-12">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                                        checked={filteredOrders.length > 0 && selectedRows.size === filteredOrders.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Order ID</th>
                                {visibleColumns.manager && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Manager</th>}
                                {visibleColumns.client_name && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Client Name</th>}
                                {visibleColumns.status && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Status</th>}
                                {visibleColumns.website && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Website</th>}
                                {visibleColumns.tat && <th className="px-4 py-3 text-center text-sm" style={{ color: 'var(--text-muted)' }}>TAT</th>}
                                {visibleColumns.no_of_links && <th className="px-4 py-3 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No of Links</th>}
                                {visibleColumns.order_type && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Order Type</th>}
                                {visibleColumns.order_package && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Order Package</th>}
                                {visibleColumns.category && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Category</th>}
                                {visibleColumns.ordered_at && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Ordered At</th>}
                                {visibleColumns.completed_at && <th className="px-4 py-3 text-left text-sm" style={{ color: 'var(--text-muted)' }}>Completed At</th>}
                                <th className="px-4 py-3 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                        <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const statusStyle = getStatusBadge(order.status_label);
                                    return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-white/5">
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                                                    checked={selectedRows.has(order.id)}
                                                    onChange={() => handleSelectRow(order.id)}
                                                />
                                            </td>
                                            {/* Order ID */}
                                            <td className="px-4 py-3">
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{order.order_id || `#${order.id}`}</div>
                                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>New Order</div>
                                            </td>
                                            {/* Manager */}
                                            {visibleColumns.manager && (
                                                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                                                    {order.manager_name || 'Unassigned'}
                                                </td>
                                            )}
                                            {/* Client Name */}
                                            {visibleColumns.client_name && (
                                                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{order.client_name || 'N/A'}</td>
                                            )}
                                            {/* Status with Workflow Location */}
                                            {visibleColumns.status && (
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="px-2 py-1 rounded text-xs font-medium"
                                                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                                                    >
                                                        {order.status_label || 'Unknown'}
                                                    </span>
                                                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                        {order.workflow_location || ''}
                                                    </div>
                                                </td>
                                            )}
                                            {/* Website */}
                                            {visibleColumns.website && (
                                                <td className="px-4 py-3">
                                                    {order.client_website ? (
                                                        <a
                                                            href={order.client_website.startsWith('http') ? order.client_website : `https://${order.client_website}`}
                                                            className="text-sm hover:underline"
                                                            style={{ color: 'var(--primary-cyan)' }}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {order.client_website.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 30)}
                                                            {order.client_website.length > 30 ? '...' : ''}
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                    )}
                                                </td>
                                            )}
                                            {/* TAT */}
                                            {visibleColumns.tat && (
                                                <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>-</td>
                                            )}
                                            {/* No of Links */}
                                            {visibleColumns.no_of_links && (
                                                <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>{order.no_of_links || 1}</td>
                                            )}
                                            {/* Order Type */}
                                            {visibleColumns.order_type && (
                                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {order.order_type === 'gp' ? 'Guest Post' : order.order_type === 'niche' ? 'niche' : order.order_type || '-'}
                                                </td>
                                            )}
                                            {/* Order Package */}
                                            {visibleColumns.order_package && (
                                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {order.order_package || '-'}
                                                </td>
                                            )}
                                            {/* Category */}
                                            {visibleColumns.category && (
                                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {order.category || '-'}
                                                </td>
                                            )}
                                            {/* Ordered At */}
                                            {visibleColumns.ordered_at && (
                                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {formatDate(order.created_at)}
                                                </td>
                                            )}
                                            {/* Completed At */}
                                            {visibleColumns.completed_at && (
                                                <td className="px-4 py-3 text-sm" style={{ color: order.completed_at ? 'var(--success)' : 'var(--text-muted)' }}>
                                                    {order.completed_at ? formatDate(order.completed_at) : '-'}
                                                </td>
                                            )}
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                                                        className="p-2 rounded-lg transition-all hover:bg-white/10"
                                                        title="View Order Details"
                                                    >
                                                        <Eye size={16} style={{ color: 'var(--primary-cyan)' }} />
                                                    </button>
                                                    {order.is_unapproved_client_order && (
                                                        <button
                                                            onClick={() => {
                                                                setReassignOrderId(order.id);
                                                                setSelectedManagerId(order.manager_id || '');
                                                                setIsReassignModalOpen(true);
                                                            }}
                                                            className="p-2 rounded-lg transition-all hover:bg-white/10"
                                                            title="Reassign Manager"
                                                        >
                                                            <RefreshCw size={16} className="text-purple-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Per page:</span>
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                        className="px-3 py-1.5 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        First
                    </button>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const startPage = Math.max(1, page - 2);
                            const pageNum = startPage + i;
                            if (pageNum > totalPages) return null;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm ${page === pageNum ? 'font-bold' : ''}`}
                                    style={{
                                        backgroundColor: page === pageNum ? 'var(--primary-cyan)' : 'var(--background-dark)',
                                        color: page === pageNum ? 'var(--background-dark)' : 'var(--text-primary)',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        Next
                    </button>
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm"
                        style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        Last
                    </button>
                </div>
            </div>

            {/* Click outside to close column toggle */}
            {showColumnToggle && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowColumnToggle(false)}
                />
            )}
            
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                selectedCount={selectedRows.size}
            />

            {/* Reassign Manager Modal */}
            {isReassignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--card-background)] rounded-2xl w-full max-w-md p-6 border border-[var(--border)] shadow-xl mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reassign Order</h3>
                            <button onClick={() => setIsReassignModalOpen(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                                    Select New Manager
                                </label>
                                <select
                                    value={selectedManagerId}
                                    onChange={(e) => setSelectedManagerId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-dark)] focus:outline-none focus:border-[var(--primary-cyan)] transition-colors"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <option value="">Select a manager...</option>
                                    {managers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsReassignModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-medium border border-[var(--border)] hover:bg-white/5 transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReassign}
                                    disabled={!selectedManagerId || reassignLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center disabled:opacity-50 transition-colors"
                                    style={{ backgroundColor: 'var(--primary-cyan)', color: 'var(--background-dark)' }}
                                >
                                    {reassignLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Confirm Reassign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminOrders;
