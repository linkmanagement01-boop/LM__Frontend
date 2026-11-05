import React, { useState } from 'react';
import { X, Send, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * WithdrawalModal - Modal for requesting withdrawal
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onSubmit - Callback to submit withdrawal request
 * @param {number} availableBalance - Available balance for withdrawal
 * @param {number} minAmount - Minimum withdrawal amount
 * @param {boolean} submitting - Whether submission is in progress
 */
export function WithdrawalModal({ isOpen, onClose, onSubmit, availableBalance = 0, minAmount = 50, submitting }) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const validateAmount = (value) => {
        const numValue = parseFloat(value);
        if (!value.trim()) {
            return 'Amount is required';
        }
        if (isNaN(numValue) || numValue <= 0) {
            return 'Please enter a valid amount';
        }
        if (numValue < minAmount) {
            return `Minimum withdrawal amount is $${minAmount}`;
        }
        if (numValue > availableBalance) {
            return 'Amount exceeds available balance';
        }
        return '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationError = validateAmount(amount);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        onSubmit(parseFloat(amount));
    };

    const handleClose = () => {
        setAmount('');
        setError('');
        onClose();
    };

    const presetAmounts = [50, 100, 200, 500].filter(a => a <= availableBalance);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md rounded-2xl p-6"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                Request Withdrawal
                            </h2>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Available: ${availableBalance.toFixed(2)}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        disabled={submitting}
                    >
                        <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Withdrawal Amount
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <span style={{ color: 'var(--text-muted)' }}>$</span>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                min={minAmount}
                                max={availableBalance}
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder={`Min $${minAmount}`}
                                className="w-full pl-8 pr-4 py-3 rounded-xl transition-all focus:ring-2 focus:ring-[#7C3AED]/30"
                                style={{
                                    backgroundColor: 'var(--background-dark)',
                                    border: error ? '1px solid var(--error)' : '1px solid var(--border)',
                                    color: 'var(--text-primary)'
                                }}
                                disabled={submitting}
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-1 mt-2 text-sm" style={{ color: 'var(--error)' }}>
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Preset amounts */}
                    {presetAmounts.length > 0 && (
                        <div className="mb-4">
                            <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Quick Select</div>
                            <div className="flex gap-2 flex-wrap">
                                {presetAmounts.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setAmount(String(preset))}
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                        style={{
                                            backgroundColor: amount === String(preset) ? 'var(--primary-cyan)' : 'var(--background-dark)',
                                            color: amount === String(preset) ? 'var(--background-dark)' : 'var(--text-secondary)',
                                            border: '1px solid var(--border)'
                                        }}
                                        disabled={submitting}
                                    >
                                        ${preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-3 rounded-xl mb-6" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                        <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: 'var(--primary-cyan)' }} />
                            <span>
                                Withdrawals are typically processed within 2-3 business days.
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
                            style={{ color: 'var(--text-secondary)' }}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || availableBalance < minAmount}
                            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                color: '#FFFFFF'
                            }}
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Request Withdrawal
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
