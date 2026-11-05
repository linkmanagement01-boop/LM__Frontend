import React, { useState } from 'react';
import { X, Send, Link, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * SubmitLinkModal - Modal for submitting live published URL
 * @param {Object} task - Task to submit link for
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onSubmit - Callback to submit the link
 * @param {boolean} submitting - Whether submission is in progress
 */
export function SubmitLinkModal({ task, isOpen, onClose, onSubmit, submitting }) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    if (!isOpen || !task) return null;

    const validateUrl = (value) => {
        if (!value.trim()) {
            return 'URL is required';
        }
        try {
            new URL(value);
            return '';
        } catch {
            return 'Please enter a valid URL';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationError = validateUrl(url);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        onSubmit(task.id, url);
    };

    const handleClose = () => {
        setUrl('');
        setError('');
        onClose();
    };

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
                            <Send className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                Submit Live Link
                            </h2>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Task #{task.id} - {task.website_domain || 'Unknown Site'}
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
                            Published URL
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Link className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="https://example.com/your-post"
                                className="w-full pl-10 pr-4 py-3 rounded-xl transition-all focus:ring-2 focus:ring-[#7C3AED]/30"
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

                    <div className="p-3 rounded-xl mb-6" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                        <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: 'var(--primary-cyan)' }} />
                            <span>
                                Make sure the article is published and publicly accessible before submitting.
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
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                color: '#FFFFFF'
                            }}
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Submit Link
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
