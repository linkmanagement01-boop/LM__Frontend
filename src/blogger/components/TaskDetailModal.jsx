import React from 'react';
import { X, ExternalLink, Calendar, User, FileText, Globe, DollarSign } from 'lucide-react';
import { mapTaskStatus } from './OrdersTable';

/**
 * TaskDetailModal - Modal for viewing task details
 * @param {Object} task - Task object to display
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onSubmitLink - Callback to open submit link modal
 */
export function TaskDetailModal({ task, isOpen, onClose, onSubmitLink }) {
    if (!isOpen || !task) return null;

    const displayStatus = mapTaskStatus(task.current_status);
    const canSubmitLink = displayStatus === 'pending';

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#22C55E';
            case 'rejected': return '#EF4444';
            case 'waiting': return '#3B82F6';
            default: return '#F59E0B';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                border: '1px solid rgba(124, 58, 237, 0.3)',
                                color: '#7C3AED'
                            }}
                        >
                            TASK-{task.id}
                        </span>
                        <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                            Task Details
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Status */}
                <div className="mb-6">
                    <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Status</div>
                    <span
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: `${getStatusColor(displayStatus)}20`, color: getStatusColor(displayStatus) }}
                    >
                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                    </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-dark)' }}>
                        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                            <Globe className="h-4 w-4" />
                            Website
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>
                            {task.website_domain || 'Not specified'}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-dark)' }}>
                        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                            <Calendar className="h-4 w-4" />
                            Assigned Date
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>
                            {new Date(task.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-dark)' }}>
                        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                            <DollarSign className="h-4 w-4" />
                            Payment Amount
                        </div>
                        <div style={{ color: 'var(--success)' }}>
                            ${parseFloat(task.payment_amount || 0).toFixed(2)}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-dark)' }}>
                        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                            <User className="h-4 w-4" />
                            Writer
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>
                            {task.writer_name || 'Not assigned'}
                        </div>
                    </div>
                </div>

                {/* Topic URL */}
                {task.suggested_topic_url && (
                    <div className="mb-6">
                        <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Suggested Topic</div>
                        <a
                            href={task.suggested_topic_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors"
                            style={{ backgroundColor: 'var(--background-dark)', color: 'var(--primary-cyan)' }}
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span className="truncate">{task.suggested_topic_url}</span>
                        </a>
                    </div>
                )}

                {/* Content Instructions */}
                {task.content_instructions && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                            <FileText className="h-4 w-4" />
                            Instructions
                        </div>
                        <div
                            className="p-4 rounded-xl text-sm whitespace-pre-wrap"
                            style={{ backgroundColor: 'var(--background-dark)', color: 'var(--text-secondary)' }}
                        >
                            {task.content_instructions}
                        </div>
                    </div>
                )}

                {/* Live URL (if submitted) */}
                {task.live_published_url && (
                    <div className="mb-6">
                        <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Published URL</div>
                        <a
                            href={task.live_published_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span className="truncate">{task.live_published_url}</span>
                        </a>
                    </div>
                )}

                {/* Rejection Reason */}
                {task.rejection_reason && (
                    <div className="mb-6">
                        <div className="text-sm mb-2" style={{ color: 'var(--error)' }}>Rejection Reason</div>
                        <div
                            className="p-4 rounded-xl text-sm"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-secondary)' }}
                        >
                            {task.rejection_reason}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Close
                    </button>
                    {canSubmitLink && (
                        <button
                            onClick={() => {
                                onClose();
                                onSubmitLink(task);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                            style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                color: '#FFFFFF'
                            }}
                        >
                            Submit Live Link
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
