import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, Filter, ChevronDown, ChevronUp, Download, Eye, X } from 'lucide-react';
import api from '../../../lib/api';

const PAYMENT_METHODS = ['Bank', 'PayPal', 'UPI', 'QR Code'];

export function WithdrawalRequests() {
    const navigate = useNavigate();
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'datetime', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState([]);

    // Filter state
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        paymentMethod: '',
        startDate: '',
        endDate: ''
    });

    // Debounced filter state
    const [debouncedFilters, setDebouncedFilters] = useState(filters);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500);

        return () => clearTimeout(timer);
    }, [filters]);

    useEffect(() => {
        fetchWithdrawals();
    }, [debouncedFilters]);

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/wallet/withdrawal-requests', {
                params: {
                    filter_name: debouncedFilters.name || undefined,
                    filter_email: debouncedFilters.email || undefined,
                    filter_payment_method: debouncedFilters.paymentMethod || undefined,
                    filter_start_date: debouncedFilters.startDate || undefined,
                    filter_end_date: debouncedFilters.endDate || undefined
                }
            });
            setWithdrawals(response.data.withdrawals || []);
        } catch (err) {
            setError('Failed to load withdrawal requests');
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
    };

    const toggleExpand = (id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleApprove = async (id) => {
        try {
            await api.put(`/admin/wallet/withdrawal-requests/${id}/approve`);
            fetchWithdrawals();
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (reason) {
            try {
                await api.put(`/admin/wallet/withdrawal-requests/${id}/reject`, { reason });
                fetchWithdrawals();
            } catch (err) {
                console.error('Failed to reject:', err);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const downloadBankDetails = () => {
        const bankData = withdrawals
            .filter(w => w.bank_type)
            .map(w => ({
                Name: w.user_name,
                Email: w.user_email,
                BankType: w.bank_type,
                AccountNumber: w.beneficiary_account_number,
                BeneficiaryName: w.beneficiary_name,
                IFSC: w.ifsc_code,
                BankName: w.bene_bank_name,
                BranchName: w.bene_bank_branch_name
            }));

        const csv = [
            Object.keys(bankData[0] || {}).join(','),
            ...bankData.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bank_details.csv';
        a.click();
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({ name: '', email: '', paymentMethod: '', startDate: '', endDate: '' });
    };

    // Check if any filter is active
    const hasActiveFilters = filters.name || filters.email || filters.paymentMethod || filters.startDate || filters.endDate;
    const activeFilterCount = [filters.name, filters.email, filters.paymentMethod, filters.startDate, filters.endDate].filter(Boolean).length;

    const filteredWithdrawals = withdrawals
        .filter(w =>
            w.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';

            if (sortConfig.key === 'amount') {
                return sortConfig.direction === 'asc'
                    ? (aValue || 0) - (bValue || 0)
                    : (bValue || 0) - (aValue || 0);
            }

            if (sortConfig.key === 'datetime') {
                const aDate = new Date(aValue || 0);
                const bDate = new Date(bValue || 0);
                return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
            }

            return sortConfig.direction === 'asc'
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} style={{ color: 'var(--primary-cyan)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--primary-cyan)' }} />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                <p style={{ color: 'var(--error)' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ArrowUpRight size={28} style={{ color: 'var(--warning)' }} />
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Withdrawal Requests</h2>
                    <span className="ml-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--warning)', color: 'white' }}>
                        {withdrawals.length} pending
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
                    {hasActiveFilters && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center"
                            style={{ backgroundColor: 'var(--primary-orange)', color: 'white' }}>{activeFilterCount}</span>
                    )}
                </button>
            </div>

            {/* Collapsible Filters Section */}
            {filtersExpanded && (
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
                        {/* Date Range Filter */}
                        <div className="md:col-span-2">
                            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Date Range</label>
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
                            Showing {withdrawals.length} filtered results
                        </div>
                    )}
                </div>
            )}

            {/* Search and Table Container */}
            <div className="card overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                {/* Toolbar */}
                <div className="p-4 flex justify-end items-center" style={{ borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={downloadBankDetails}
                        className="premium-btn premium-btn-accent"
                    >
                        <Download className="h-4 w-4" />
                        Download Bank Details
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th className="text-left px-4 py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    User
                                </th>
                                <th className="text-left px-4 py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Payment Method
                                </th>
                                <th className="text-left px-4 py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Invoice number
                                </th>
                                <th
                                    className="text-left px-4 py-4 font-medium cursor-pointer"
                                    style={{ color: 'var(--text-secondary)' }}
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center gap-2">
                                        Amount
                                        <SortIcon column="amount" />
                                    </div>
                                </th>
                                <th className="text-left px-4 py-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Datetime
                                </th>
                                <th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWithdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                        No withdrawal requests found
                                    </td>
                                </tr>
                            ) : (
                                filteredWithdrawals.map((withdrawal) => (
                                    <React.Fragment key={withdrawal.id}>
                                        <tr
                                            className="hover:bg-opacity-50 transition-colors cursor-pointer"
                                            style={{ borderBottom: '1px solid var(--border)' }}
                                            onClick={() => toggleExpand(withdrawal.id)}
                                        >
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{withdrawal.user_name}</p>
                                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{withdrawal.user_email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {/* Priority: Check payment_method field first */}
                                                {(withdrawal.payment_method === 'bank' || withdrawal.payment_method?.includes('bank')) ? (
                                                    <div>
                                                        <span
                                                            className="px-2 py-1 rounded text-xs font-medium"
                                                            style={{
                                                                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                                                color: 'rgb(249, 115, 22)',
                                                                border: '1px solid rgb(249, 115, 22)'
                                                            }}
                                                        >
                                                            Bank Details
                                                        </span>
                                                        <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                            {withdrawal.bank_type && <p><strong>Bank Type:-</strong> {withdrawal.bank_type}</p>}
                                                            {withdrawal.beneficiary_account_number && <p><strong>Beneficiary Account Number:-</strong> {withdrawal.beneficiary_account_number}</p>}
                                                            {withdrawal.beneficiary_name && <p><strong>Beneficiary Name:-</strong> {withdrawal.beneficiary_name}</p>}
                                                            {withdrawal.customer_reference_number && <p><strong>Customer Reference Number:-</strong> {withdrawal.customer_reference_number}</p>}
                                                            {withdrawal.bene_bank_name && <p><strong>Beneficiary Bank Name:-</strong> {withdrawal.bene_bank_name}</p>}
                                                            {withdrawal.bene_bank_branch_name && <p><strong>Beneficiary Bank Branch Name:-</strong> {withdrawal.bene_bank_branch_name}</p>}
                                                            {withdrawal.ifsc_code && <p><strong>IFSC Code:-</strong> {withdrawal.ifsc_code}</p>}
                                                            {withdrawal.beneficiary_email_id && <p><strong>Beneficiary Email id:-</strong> {withdrawal.beneficiary_email_id}</p>}
                                                        </div>
                                                    </div>
                                                ) : withdrawal.payment_method === 'upi' ? (
                                                    <div>
                                                        <span
                                                            className="px-2 py-1 rounded text-xs font-medium"
                                                            style={{
                                                                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                                                color: 'rgb(168, 85, 247)',
                                                                border: '1px solid rgb(168, 85, 247)'
                                                            }}
                                                        >
                                                            UPI ID
                                                        </span>
                                                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                            {withdrawal.upi_id || '-'}
                                                        </p>
                                                    </div>
                                                ) : withdrawal.payment_method === 'qr' ? (
                                                    <div>
                                                        <span
                                                            className="px-2 py-1 rounded text-xs font-medium"
                                                            style={{
                                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                                color: 'rgb(34, 197, 94)',
                                                                border: '1px solid rgb(34, 197, 94)'
                                                            }}
                                                        >
                                                            QR Code
                                                        </span>
                                                        {withdrawal.qr_code_image ? (
                                                            <img
                                                                src={(withdrawal.qr_code_image.startsWith('http') || withdrawal.qr_code_image.startsWith('data:')) ? withdrawal.qr_code_image : `http://localhost:5001${withdrawal.qr_code_image}`}
                                                                alt="QR Code"
                                                                className="mt-2 w-20 h-20 object-cover rounded border cursor-pointer hover:scale-150 transition-transform"
                                                                style={{ borderColor: 'var(--border)' }}
                                                                onClick={() => window.open((withdrawal.qr_code_image.startsWith('http') || withdrawal.qr_code_image.startsWith('data:')) ? withdrawal.qr_code_image : `http://localhost:5001${withdrawal.qr_code_image}`, '_blank')}
                                                            />
                                                        ) : (
                                                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No QR image</p>
                                                        )}
                                                    </div>
                                                ) : (withdrawal.payment_method === 'paypal' || withdrawal.payment_method === 'paypal_id' || withdrawal.paypal_email) ? (
                                                    <div>
                                                        <span
                                                            className="px-2 py-1 rounded text-xs font-medium"
                                                            style={{
                                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                                color: 'rgb(59, 130, 246)',
                                                                border: '1px solid rgb(59, 130, 246)'
                                                            }}
                                                        >
                                                            Paypal ID
                                                        </span>
                                                        <p className="text-sm mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>
                                                            {withdrawal.paypal_email || '-'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4" style={{ color: 'var(--text-primary)' }}>
                                                {withdrawal.invoice_number}
                                            </td>
                                            <td className="px-4 py-4" style={{ color: 'var(--text-primary)' }}>
                                                {withdrawal.amount}
                                            </td>
                                            <td className="px-4 py-4" style={{ color: 'var(--text-primary)' }}>
                                                {formatDate(withdrawal.datetime)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/admin/wallet/withdrawal-requests/${withdrawal.id}`);
                                                    }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                                                    style={{ backgroundColor: 'var(--warning)', color: 'white' }}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', backgroundColor: 'var(--background-dark)' }}>
                                <td className="px-4 py-4" colSpan={3}></td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Amount</span>
                                        <span className="text-lg font-bold" style={{ color: 'var(--warning)' }}>
                                            ${filteredWithdrawals.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0).toFixed(2)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4" colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
