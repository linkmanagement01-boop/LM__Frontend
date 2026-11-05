import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownToLine, RefreshCw, ExternalLink, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Link } from 'react-router-dom';

/**
 * RequestWithdrawal - Page for bloggers to request withdrawal for completed orders
 */
export function RequestWithdrawal() {
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { showSuccess, showError } = useToast();

    // Payment details state
    const [availableMethods, setAvailableMethods] = useState([]);
    const [paypalId, setPaypalId] = useState('');
    const [upiId, setUpiId] = useState('');
    const [qrCodeImage, setQrCodeImage] = useState('');
    const [bankDetails, setBankDetails] = useState({});
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch withdrawable orders and payment details in parallel
            const [ordersRes, paymentRes] = await Promise.all([
                api.get('/blogger/withdrawable-orders'),
                api.get('/blogger/payment-details')
            ]);

            setOrders(ordersRes.data.orders || []);

            const paymentData = paymentRes.data;
            const methods = paymentData.available_methods || ['paypal'];
            setAvailableMethods(methods);
            setPaypalId(paymentData.paypal_id || '');
            setUpiId(paymentData.upi_id || '');
            setQrCodeImage(paymentData.qr_code_image || '');
            setBankDetails(paymentData.bank_details || {});

            // Set default payment method based on available methods
            if (methods.includes('bank') && paymentData.bank_details?.beneficiary_account_number) {
                setSelectedPaymentMethod('bank');
            } else if (methods.includes('upi_id') && paymentData.upi_id) {
                setSelectedPaymentMethod('upi');
            } else if (methods.includes('qr_code') && paymentData.qr_code_image) {
                setSelectedPaymentMethod('qr');
            } else if (methods.includes('paypal')) {
                setSelectedPaymentMethod('paypal');
            } else if (methods.length > 0) {
                // Default to first available method
                setSelectedPaymentMethod(methods[0] === 'upi_id' ? 'upi' : methods[0] === 'qr_code' ? 'qr' : methods[0]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOrder = (orderId) => {
        setSelectedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedOrders.size === orders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(orders.map(o => o.id)));
        }
    };

    const selectedTotal = orders
        .filter(o => selectedOrders.has(o.id))
        .reduce((sum, o) => sum + o.price, 0);

    const hasValidPaymentMethod = () => {
        switch (selectedPaymentMethod) {
            case 'bank':
                return !!bankDetails?.beneficiary_account_number;
            case 'upi':
                return !!upiId;
            case 'qr':
                return !!qrCodeImage;
            case 'paypal':
                return !!paypalId;
            default:
                return false;
        }
    };

    const hasBank = availableMethods.includes('bank');
    const hasUpi = availableMethods.includes('upi_id');
    const hasQr = availableMethods.includes('qr_code');
    const hasPaypal = availableMethods.includes('paypal');

    const handleSubmit = async () => {
        if (selectedOrders.size === 0) {
            showError('Please select at least one order');
            return;
        }

        if (!hasValidPaymentMethod()) {
            showError('Please set your payment details first');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/blogger/submit-withdrawal', {
                order_ids: Array.from(selectedOrders),
                payment_method: selectedPaymentMethod
            });

            showSuccess('Withdrawal request submitted successfully!');
            setSelectedOrders(new Set());
            fetchData(); // Refresh the list
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            showError(error.response?.data?.message || 'Failed to submit withdrawal request');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    const renderPaymentMethodInfo = () => {
        if (!selectedPaymentMethod) return null;

        const DetailItem = ({ label, value }) => (
            <div className="flex justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--text-secondary)] shrink-0">{label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)] min-w-0 break-all text-right">{value}</span>
            </div>
        );

        switch (selectedPaymentMethod) {
            case 'bank':
                return bankDetails?.beneficiary_account_number ? (
                    <div className="premium-card p-4 mt-4 bg-[var(--background-dark)]">
                        <DetailItem label="Account Type" value={bankDetails.bank_type} />
                        <DetailItem label="Account Number" value={bankDetails.beneficiary_account_number} />
                        <DetailItem label="Beneficiary Name" value={bankDetails.beneficiary_name} />
                        <DetailItem label="Bank Name" value={bankDetails.bene_bank_name} />
                        <DetailItem label="IFSC Code" value={bankDetails.ifsc_code} />
                    </div>
                ) : null;
            case 'upi':
                return upiId ? (
                    <div className="premium-card p-4 mt-4 bg-[var(--background-dark)]">
                        <DetailItem label="UPI ID" value={upiId} />
                    </div>
                ) : null;
            case 'qr':
                return qrCodeImage ? (
                    <div className="premium-card p-4 mt-4 bg-[var(--background-dark)] flex justify-center">
                        <img src={qrCodeImage} alt="QR Code" className="max-w-[200px] rounded-lg border border-[var(--border)]" />
                    </div>
                ) : null;
            case 'paypal':
                return paypalId ? (
                    <div className="premium-card p-4 mt-4 bg-[var(--background-dark)]">
                        <DetailItem label="PayPal ID" value={paypalId} />
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary-cyan)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)]">
                            <ArrowDownToLine className="h-8 w-8" />
                        </div>
                        Request Withdrawal
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 ml-1">Select completed orders and request payout.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2.5 rounded-xl hover:bg-[var(--card-background)] border border-transparent hover:border-[var(--border)] transition-all shadow-sm hover:shadow text-[var(--text-secondary)] self-start md:self-auto"
                    title="Refresh Data"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Orders List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="premium-card p-6">
                        <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm font-medium">Select the orders you wish to withdraw funds for. Total amount updates automatically.</p>
                        </div>

                        {/* Orders Table */}
                        <div className="premium-table-container">
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th className="w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.size === orders.length && orders.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background-dark)] accent-[var(--primary-cyan)] cursor-pointer"
                                            />
                                        </th>
                                        <th>Order Details</th>
                                        <th>Date</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr
                                            key={order.id}
                                            onClick={() => handleSelectOrder(order.id)}
                                            className={`cursor-pointer transition-colors ${selectedOrders.has(order.id) ? 'bg-[var(--primary-cyan)]/5' : ''}`}
                                        >
                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.id)}
                                                    onChange={() => handleSelectOrder(order.id)}
                                                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background-dark)] accent-[var(--primary-cyan)] cursor-pointer"
                                                />
                                            </td>
                                            <td>
                                                <div className="font-bold text-[var(--text-primary)]">#{order.order_id || order.id}</div>
                                                <div className="text-sm text-[var(--text-secondary)] mb-1">{order.root_domain}</div>
                                                {order.submit_url && (
                                                    <a
                                                        href={order.submit_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs flex items-center gap-1 text-[var(--primary-cyan)] hover:underline break-all"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {order.submit_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="text-sm text-[var(--text-muted)]">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="text-right font-bold text-emerald-500">
                                                ${order.price.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-[var(--text-muted)]">
                                                No withdrawable orders found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment & Summary */}
                <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="premium-card p-6 border-t-4 border-t-[var(--primary-cyan)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-[var(--primary-cyan)]" /> Summary
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Selected Orders</span>
                                <span className="font-bold text-[var(--text-primary)]">{selectedOrders.size}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                                <span className="text-[var(--text-secondary)]">Total Amount</span>
                                <span className="text-2xl font-bold text-emerald-500">${selectedTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || selectedOrders.size === 0 || !hasValidPaymentMethod()}
                            className="premium-btn premium-btn-accent w-full justify-center"
                        >
                            {submitting ? 'Processing...' : 'Submit Request'}
                        </button>
                        {(!hasValidPaymentMethod() && selectedOrders.size > 0) && (
                            <p className="text-xs text-[var(--error)] mt-2 text-center">
                                Please select a valid payment method below.
                            </p>
                        )}
                    </div>

                    {/* Payment Method Card */}
                    <div className="premium-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Payout Method</h3>
                            <Link to="/blogger/payments/fill-details" className="text-xs font-bold text-[var(--primary-cyan)] hover:underline uppercase tracking-wider">
                                Manage
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {/* Payment Options */}
                            {hasBank && (
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === 'bank'
                                        ? 'bg-[var(--primary-cyan)]/10 border-[var(--primary-cyan)]'
                                        : 'bg-[var(--background-dark)] border-transparent hover:border-[var(--border)]'
                                    }`}>
                                    <input type="radio" name="paymentMethod" value="bank" checked={selectedPaymentMethod === 'bank'} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="accent-[var(--primary-cyan)]" />
                                    <span className={`font-medium ${selectedPaymentMethod === 'bank' ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-secondary)]'}`}>Bank Transfer</span>
                                    {bankDetails?.beneficiary_account_number && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                </label>
                            )}

                            {hasQr && (
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === 'qr'
                                        ? 'bg-[var(--primary-cyan)]/10 border-[var(--primary-cyan)]'
                                        : 'bg-[var(--background-dark)] border-transparent hover:border-[var(--border)]'
                                    }`}>
                                    <input type="radio" name="paymentMethod" value="qr" checked={selectedPaymentMethod === 'qr'} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="accent-[var(--primary-cyan)]" />
                                    <span className={`font-medium ${selectedPaymentMethod === 'qr' ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-secondary)]'}`}>QR Code</span>
                                    {qrCodeImage && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                </label>
                            )}

                            {hasUpi && (
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === 'upi'
                                        ? 'bg-[var(--primary-cyan)]/10 border-[var(--primary-cyan)]'
                                        : 'bg-[var(--background-dark)] border-transparent hover:border-[var(--border)]'
                                    }`}>
                                    <input type="radio" name="paymentMethod" value="upi" checked={selectedPaymentMethod === 'upi'} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="accent-[var(--primary-cyan)]" />
                                    <span className={`font-medium ${selectedPaymentMethod === 'upi' ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-secondary)]'}`}>UPI ID</span>
                                    {upiId && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                </label>
                            )}

                            {hasPaypal && (
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === 'paypal'
                                        ? 'bg-[var(--primary-cyan)]/10 border-[var(--primary-cyan)]'
                                        : 'bg-[var(--background-dark)] border-transparent hover:border-[var(--border)]'
                                    }`}>
                                    <input type="radio" name="paymentMethod" value="paypal" checked={selectedPaymentMethod === 'paypal'} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="accent-[var(--primary-cyan)]" />
                                    <span className={`font-medium ${selectedPaymentMethod === 'paypal' ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-secondary)]'}`}>PayPal</span>
                                    {paypalId && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                </label>
                            )}
                        </div>

                        {/* Selected Method Details Preview */}
                        {hasValidPaymentMethod() && (
                            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                {renderPaymentMethodInfo()}
                            </div>
                        )}

                        {!hasValidPaymentMethod() && (
                            <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
                                <Link to="/blogger/payments/fill-details" className="text-sm font-medium text-[var(--error)] hover:underline flex items-center justify-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> Setup payment details
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
