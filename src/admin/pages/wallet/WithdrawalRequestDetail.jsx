import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Send } from 'lucide-react';
import api from '../../../lib/api';

export function WithdrawalRequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [withdrawal, setWithdrawal] = useState(null);
    const [orders, setOrders] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [remarksError, setRemarksError] = useState('');
    const [perPage, setPerPage] = useState(10);

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/wallet/withdrawal-requests/${id}`);
            setWithdrawal(response.data.withdrawal);
            setOrders(response.data.orders || []);
            setTotalAmount(response.data.total_amount || 0);
        } catch (err) {
            setError('Failed to load withdrawal request details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    };

    const handleSubmit = async () => {
        // Validate remarks
        if (!remarks.trim()) {
            setRemarksError('Remarks is required');
            return;
        }
        setRemarksError('');

        try {
            setSubmitting(true);
            await api.put(`/admin/wallet/withdrawal-requests/${id}/approve`, { remarks: remarks.trim() });
            // Redirect back to withdrawal requests list
            navigate('/admin/wallet/withdrawal-requests');
        } catch (err) {
            console.error('Failed to approve:', err);
            setError(err.response?.data?.message || 'Failed to approve withdrawal request');
        } finally {
            setSubmitting(false);
        }
    };

    // Pagination
    const displayedOrders = orders.slice(0, perPage);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
            </div>
        );
    }

    if (error && !withdrawal) {
        return (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                <p style={{ color: 'var(--error)' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/wallet/withdrawal-requests')}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Payment History Detail
                </h2>
            </div>

            {/* User Info */}
            {withdrawal && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                    <div className="flex flex-wrap gap-6">
                        <div>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>User: </span>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{withdrawal.user_name}</span>
                        </div>
                        <div>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Invoice: </span>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{withdrawal.invoice_number}</span>
                        </div>
                        <div>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Amount: </span>
                            <span className="font-bold" style={{ color: 'var(--success)' }}>${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background-dark)' }}>
                        <tr>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Created at
                            </th>
                            <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Order Id
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            displayedOrders.map((order) => (
                                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td className="px-4 py-4" style={{ color: 'var(--text-primary)' }}>
                                        {formatDate(order.created_at)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div>
                                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {order.order_id}
                                            </p>
                                            {order.submit_url && (
                                                <a
                                                    href={order.submit_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm flex items-center gap-1 hover:underline"
                                                    style={{ color: 'var(--text-muted)' }}
                                                >
                                                    URL:- {order.submit_url}
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Per page</span>
                    <select
                        value={perPage}
                        onChange={(e) => setPerPage(Number(e.target.value))}
                        className="px-3 py-1 rounded-lg text-sm"
                        style={{
                            backgroundColor: 'var(--background-dark)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Remarks Section */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Remarks</h3>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <textarea
                        value={remarks}
                        onChange={(e) => {
                            setRemarks(e.target.value);
                            if (e.target.value.trim()) setRemarksError('');
                        }}
                        placeholder="Enter remarks (required)"
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                        style={{
                            backgroundColor: 'var(--background-dark)',
                            border: remarksError ? '1px solid var(--error)' : '1px solid var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    {remarksError && (
                        <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>{remarksError}</p>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                    <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
                style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white'
                }}
            >
                {submitting ? 'Submitting...' : 'Submit'}
            </button>
        </div>
    );
}
