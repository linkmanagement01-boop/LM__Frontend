import React, { useState, useEffect } from 'react';
import { Clock, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink, CreditCard, Smartphone, QrCode, Filter, X, Calendar, Eye, Download } from 'lucide-react';
import ExportModal from '../../../components/ExportModal';
import { exportToCSV, exportToExcel } from '../../../utils/exportUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../lib/api';

const PAYMENT_METHODS = ['Bank', 'PayPal', 'UPI', 'QR Code'];

export function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = location.pathname.startsWith('/accountant') ? '/accountant' : '/admin';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter state
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        paymentMethod: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchPayments();
    }, [page, limit, sortConfig, filters]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(new Set(payments.map(p => p.id)));
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
        const dataToExport = payments
            .filter(p => selectedRows.has(p.id))
            .map(payment => ({
                'ID': payment.id,
                'User Details': payment.user_name + " (" + payment.user_email + ")",
                'Requested Amount': payment.amount || 0,
                'Payment Method': payment.payment_method || '',
                'Beneficiary Name': payment.beneficiary_name || payment.ac_holder_name || '',
                'Account Number': payment.beneficiary_account_number || payment.account_number || '',
                'IFSC/SWIFT': payment.ifsc_code || payment.swift_code || '',
                'Bank Name': payment.bank_name || payment.bene_bank_name || '',
                'PayPal Email': payment.paypal_email || '',
                'UPI ID': payment.upi_id || '',
                'Status': payment.status === 1 ? 'Paid' : payment.status === 2 ? 'Rejected' : 'Pending',
                'Remarks': payment.remarks ? payment.remarks.replace(/\\r\\n|\\r|\\n/g, ' - ') : '',
                'Date Added': payment.request_date ? new Date(payment.request_date).toLocaleDateString() : '',
                'Clearance Date': payment.clearance_date ? new Date(payment.clearance_date).toLocaleDateString() : ''
            }));

        if (format === 'csv') {
            exportToCSV(dataToExport, filename || 'payment_history');
        } else {
            exportToExcel(dataToExport, filename || 'payment_history', format === 'xlsx');
        }
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            // Auto-switch to clearance_date ASC when date filter is active
            const hasDateFilter = filters.startDate || filters.endDate;
            const effectiveSortBy = hasDateFilter ? 'clearance_date' : sortConfig.key;
            const effectiveSortOrder = hasDateFilter ? 'asc' : sortConfig.direction;

            const response = await api.get('/admin/wallet/payment-history', {
                params: {
                    page,
                    limit,
                    sort_by: effectiveSortBy,
                    sort_order: effectiveSortOrder,
                    // Server-side filter params
                    filter_name: filters.name || undefined,
                    filter_email: filters.email || undefined,
                    filter_payment_method: filters.paymentMethod || undefined,
                    filter_start_date: filters.startDate || undefined,
                    filter_end_date: filters.endDate || undefined
                }
            });
            setPayments(response.data.payments || []);
            setTotal(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
        } catch (err) {
            setError('Failed to load payment history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
        setPage(1);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = async (e) => {
        e?.preventDefault();
        setPage(1);
        try {
            setLoading(true);
            const response = await api.get('/admin/wallet/payment-history', {
                params: {
                    page: 1,
                    limit,
                    search: searchTerm,
                    sort_by: sortConfig.key,
                    sort_order: sortConfig.direction
                }
            });
            setPayments(response.data.payments || []);
            setTotal(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
        } catch (err) {
            setError('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPaymentMethodDisplay = (payment) => {
        // Determine type based on data presence or payment_method string
        const method = (payment.payment_method || '').toLowerCase();

        // Priority: Check payment_method field first, then fall back to presence of data

        // Bank Transfer - check payment_method first
        if (method === 'bank' || method.includes('bank')) {
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-500 flex items-center gap-1">
                            <CreditCard size={10} /> Bank Transfer
                        </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {(payment.beneficiary_name || payment.ac_holder_name) && (
                            <p><span className="text-[var(--text-muted)]">Beneficiary:</span> {payment.beneficiary_name || payment.ac_holder_name}</p>
                        )}
                        {(payment.beneficiary_account_number || payment.account_number) && (
                            <p><span className="text-[var(--text-muted)]">Acc No:</span> {payment.beneficiary_account_number || payment.account_number}</p>
                        )}
                        {payment.ifsc_code && (
                            <p><span className="text-[var(--text-muted)]">IFSC:</span> {payment.ifsc_code}</p>
                        )}
                        {payment.swift_code && (
                            <p><span className="text-[var(--text-muted)]">SWIFT:</span> {payment.swift_code}</p>
                        )}
                        {(payment.bank_name || payment.bene_bank_name) && (
                            <p><span className="text-[var(--text-muted)]">Bank:</span> {payment.bank_name || payment.bene_bank_name}</p>
                        )}
                        {payment.bene_bank_branch_name && (
                            <p><span className="text-[var(--text-muted)]">Branch:</span> {payment.bene_bank_branch_name}</p>
                        )}
                        {payment.bank_address && (
                            <p><span className="text-[var(--text-muted)]">Address:</span> {payment.bank_address}</p>
                        )}
                        {payment.bank_type && (
                            <p><span className="text-[var(--text-muted)]">Type:</span> {payment.bank_type}</p>
                        )}
                    </div>
                </div>
            );
        }

        // PayPal
        if (method.includes('paypal') || method === 'paypal_id' || (!method && payment.paypal_email)) {
            const payLink = payment.paypal_email && payment.paypal_email.startsWith('http')
                ? payment.paypal_email
                : `https://paypal.me/${payment.paypal_email}`;

            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-[#0070BA]/20 text-[#0070BA] flex items-center gap-1">
                            <ExternalLink size={10} /> PayPal
                        </span>
                    </div>
                    <a
                        href={payLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline text-[var(--primary-cyan)] break-all"
                    >
                        {payment.paypal_email}
                    </a>
                </div>
            );
        }

        // UPI
        if (method.includes('upi') || (!method && payment.upi_id)) {
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-500 flex items-center gap-1">
                            <Smartphone size={10} /> UPI
                        </span>
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-mono">{payment.upi_id}</span>
                </div>
            );
        }

        // QR Code
        if (method.includes('qr') || (!method && payment.qr_code_image)) {
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-500 flex items-center gap-1">
                            <QrCode size={10} /> QR Code
                        </span>
                    </div>
                    {payment.qr_code_image ? (
                        <img
                            src={(payment.qr_code_image.startsWith('http') || payment.qr_code_image.startsWith('data:')) ? payment.qr_code_image : `http://localhost:5001${payment.qr_code_image}`}
                            alt="QR Code"
                            className="w-16 h-16 object-cover rounded border border-[var(--border)] cursor-pointer hover:scale-150 transition-transform origin-left"
                            onClick={() => window.open((payment.qr_code_image.startsWith('http') || payment.qr_code_image.startsWith('data:')) ? payment.qr_code_image : `http://localhost:5001${payment.qr_code_image}`, '_blank')}
                        />
                    ) : (
                        <span className="text-xs text-[var(--text-muted)]">No QR image</span>
                    )}
                </div>
            );
        }

        // Fallback - no payment method specified
        return (
            <span className="text-sm text-[var(--text-muted)]">-</span>
        );
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} style={{ color: 'var(--primary-cyan)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--primary-cyan)' }} />;
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (error) {
        return (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                <p style={{ color: 'var(--error)' }}>{error}</p>
            </div>
        );
    }

    // Reset filters - also reset to page 1
    const resetFilters = () => {
        setFilters({ name: '', email: '', paymentMethod: '', startDate: '', endDate: '' });
        setPage(1);
    };

    // Check if any filter is active
    const hasActiveFilters = filters.name || filters.email || filters.paymentMethod || filters.startDate || filters.endDate;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={28} style={{ color: 'var(--primary-cyan)' }} />
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Payment History</h2>
                    <span className="ml-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--primary-cyan)', color: 'white' }}>
                        {total.toLocaleString()} total
                    </span>
                </div>
                {/* Filter Icon Button */}
                <button
                    onClick={() => setFiltersExpanded(!filtersExpanded)}

                    className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
                    style={{ border: '1px solid var(--border)' }}
                    title="Toggle Filters"
                >
                    <Filter size={20} style={{ color: filtersExpanded ? 'var(--primary-cyan)' : 'var(--text-muted)' }} />
                    {
                        hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--primary-orange)]"></span>
                        )
                    }
                </button >
            </div >

            {/* Collapsible Filters Section */}
            {
                filtersExpanded && (
                    <div
                        className="rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300"
                        style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</h3>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
                                    style={{ color: 'var(--error)' }}
                                >
                                    Reset All
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Name Filter */}
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
                                <input
                                    type="text"
                                    value={filters.name}
                                    onChange={e => setFilters({ ...filters, name: e.target.value })}
                                    placeholder="Search name..."
                                    className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            {/* Email Filter */}
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
                                <input
                                    type="text"
                                    value={filters.email}
                                    onChange={e => setFilters({ ...filters, email: e.target.value })}
                                    placeholder="Search email..."
                                    className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            {/* Payment Method Filter */}
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Payment Method</label>
                                <select
                                    value={filters.paymentMethod}
                                    onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Select an option</option>
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {/* Clearance Date Range Filter */}
                            <div className="md:col-span-2">
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Clearance Date Range</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="date"
                                            value={filters.startDate}
                                            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                            className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                                            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                            placeholder="Start Date"
                                        />
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="date"
                                            value={filters.endDate}
                                            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                            min={filters.startDate || undefined}
                                            className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                                            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                            placeholder="End Date"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <div className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                Showing {payments.length} of {total.toLocaleString()} filtered results
                            </div>
                        )}
                    </div>
                )
            }

            {/* Table Container */}
            <div className="card overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                {/* Toolbar */}
                <div className="p-4 flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Left: Export Action */}
                    <div className="flex items-center gap-4">
                        {selectedRows.size > 0 && (
                            <button
                                onClick={() => setIsExportModalOpen(true)}
                                className="premium-btn py-1.5 px-3 bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--primary-cyan)]/20 hover:bg-[var(--primary-cyan)]/20 text-xs"
                            >
                                <Download className="h-4 w-4 mr-1.5" />
                                Export ({selectedRows.size})
                            </button>
                        )}
                    </div>
                
                    {/* Rows per page */}
                    <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                        {[50, 100, 200].map((rowCount) => (
                            <button
                                key={rowCount}
                                onClick={() => handleLimitChange(rowCount)}
                                className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    backgroundColor: limit === rowCount ? 'var(--primary-cyan)' : 'var(--background-dark)',
                                    color: limit === rowCount ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                {rowCount}
                            </button>
                        ))}
                        <span style={{ color: 'var(--text-muted)' }}>rows</span>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search user..."
                            value={searchTerm}
                            onChange={handleSearch}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                            className="pl-10 pr-4 py-2 rounded-lg w-64"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </form>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th className="text-left px-4 py-3" style={{ width: '5%' }}>
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                                        checked={payments.length > 0 && selectedRows.size === payments.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                {/* 1. User Column */}
                                <th
                                    className="text-left px-4 py-3 font-medium cursor-pointer"
                                    style={{ color: 'var(--text-secondary)', width: '20%' }}
                                    onClick={() => handleSort('user_name')}
                                >
                                    <div className="flex items-center gap-2">
                                        User
                                        <SortIcon column="user_name" />
                                    </div>
                                </th>

                                {/* 2. Payment Method Details Column */}
                                <th
                                    className="text-left px-4 py-3 font-medium"
                                    style={{ color: 'var(--text-secondary)', width: '30%' }}
                                >
                                    Payment Details
                                </th>

                                {/* 3. Amount Column */}
                                <th
                                    className="text-right px-4 py-3 font-medium cursor-pointer"
                                    style={{ color: 'var(--text-secondary)', width: '15%' }}
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center gap-2 justify-end">
                                        Amount
                                        <SortIcon column="amount" />
                                    </div>
                                </th>

                                {/* 4. DateTime & Remarks Column (Request Date, Clearance Date, Remarks) */}
                                <th
                                    className="text-left px-4 py-3 font-medium cursor-pointer"
                                    style={{ color: 'var(--text-secondary)', width: '35%' }}
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center gap-2">
                                        Date & Remarks
                                        <SortIcon column="created_at" />
                                    </div>
                                </th>

                                {/* 5. Action Column */}
                                <th
                                    className="text-right px-4 py-3 font-medium"
                                    style={{ color: 'var(--text-secondary)', width: '10%' }}
                                >
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                        {hasActiveFilters ? 'No payments match your filters' : 'No payments found'}
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-opacity-50 transition-colors"
                                        style={{ borderBottom: '1px solid var(--border)' }}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-4 align-top">
                                            <input 
                                                type="checkbox" 
                                                className="mt-1 rounded border-[var(--border)] text-[var(--primary-cyan)] focus:ring-[var(--primary-cyan)] cursor-pointer"
                                                checked={selectedRows.has(payment.id)}
                                                onChange={() => handleSelectRow(payment.id)}
                                            />
                                        </td>
                                        
                                        {/* User */}
                                        <td className="px-4 py-4 align-top">
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{payment.user_name}</p>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{payment.user_email}</p>
                                            </div>
                                        </td>

                                        {/* Payment Details */}
                                        <td className="px-4 py-4 align-top">
                                            {getPaymentMethodDisplay(payment)}
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-4 text-right align-top">
                                            <span className="font-semibold text-lg" style={{ color: 'var(--success)' }}>
                                                ${parseFloat(payment.amount || 0).toFixed(2)}
                                            </span>
                                        </td>

                                        {/* Date & Remarks */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                {/* Row 1: Requested Date */}
                                                <div className="grid grid-cols-[70px_1fr_auto] items-center text-sm gap-2">
                                                    <span className="text-[var(--text-muted)]">Requested:</span>
                                                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(payment.request_date)}</span>
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded ${payment.status === 1 ? 'bg-green-500/20 text-green-500' :
                                                            payment.status === 2 ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                                                            }`}
                                                    >
                                                        {payment.status === 1 ? 'Paid' : payment.status === 2 ? 'Rejected' : 'Pending'}
                                                    </span>
                                                </div>

                                                {/* Row 2: Cleared Date */}
                                                <div className="grid grid-cols-[70px_1fr_auto] items-center text-sm gap-2">
                                                    <span className="text-[var(--text-muted)]">Cleared:</span>
                                                    <span style={{ color: payment.clearance_date ? 'var(--success)' : 'var(--text-muted)' }}>
                                                        {payment.clearance_date ? formatDate(payment.clearance_date) : '-'}
                                                    </span>
                                                    <span className="w-[50px]"></span>
                                                </div>

                                                {/* Row 3: Remarks */}
                                                <div className="text-sm">
                                                    <span className="text-[var(--text-muted)]">Remarks: </span>
                                                    <span className={`${payment.remarks ? 'text-[var(--text-secondary)] italic' : 'text-[var(--text-muted)]'}`}>
                                                        {payment.remarks || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Action Column */}
                                        <td className="px-4 py-4 align-middle text-right">
                                            <button
                                                onClick={() => navigate(`${basePath}/wallet/invoices/${payment.id}`)}
                                                className="p-2 rounded-lg hover:bg-white/10 transition-colors inline-flex items-center justify-center group"
                                                title="View Invoice Details"
                                                style={{ color: 'var(--primary-cyan)' }}
                                            >
                                                <Eye size={18} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 flex justify-between items-center flex-wrap gap-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} payments
                    </div>

                    <div className="flex items-center gap-2">
                        {/* First page */}
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={page === 1}
                            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <ChevronLeft size={16} />
                            <ChevronLeft size={16} className="-ml-2" />
                        </button>

                        {/* Previous */}
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Page numbers */}
                        {getPageNumbers().map((pageNum) => (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className="px-3 py-2 rounded-lg transition-colors min-w-[40px]"
                                style={{
                                    backgroundColor: page === pageNum ? 'var(--primary-cyan)' : 'var(--background-dark)',
                                    color: page === pageNum ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                {pageNum}
                            </button>
                        ))}

                        {/* Next */}
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>

                        {/* Last page */}
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={page === totalPages}
                            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <ChevronRight size={16} />
                            <ChevronRight size={16} className="-ml-2" />
                        </button>
                    </div>
                </div>
            </div>
            
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                selectedCount={selectedRows.size}
            />
        </div >
    );
}
