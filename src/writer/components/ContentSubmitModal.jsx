import React, { useState, useEffect } from 'react';
import { X, Send, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAutoSave, AutoSaveIndicator } from '../../hooks/useAutoSave';

/**
 * ContentSubmitModal - Modal for submitting written content
 */
export function ContentSubmitModal({ task, isOpen, onClose, onSubmit, submitting }) {
    // Auto-save content based on task ID
    const { value: content, setValue: setContent, clearSaved, isSaved } =
        useAutoSave(`content-submit-${task?.id}`, '');
    const [error, setError] = useState('');

    if (!isOpen || !task) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) {
            setError('Please enter your content');
            return;
        }
        if (content.trim().length < 100) {
            setError('Content must be at least 100 characters');
            return;
        }
        clearSaved(); // Clear auto-saved data on submit
        onSubmit(task.id, content);
    };

    const handleClose = () => {
        // Don't clear content on close - let auto-save preserve it
        setError('');
        onClose();
    };

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                Submit Content
                            </h2>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Task #{task.id} - {task.website_domain || 'Writing Assignment'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10" disabled={submitting}>
                        <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Instructions */}
                {task.content_instructions && (
                    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--background-dark)' }}>
                        <div className="text-sm mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Instructions</div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.content_instructions}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Content *</label>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{wordCount} words</span>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => { setContent(e.target.value); setError(''); }}
                            placeholder="Paste or write your content here..."
                            rows={12}
                            className="w-full rounded-xl px-4 py-3 resize-none"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: error ? '1px solid var(--error)' : '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit'
                            }}
                            disabled={submitting}
                        />
                        {error && (
                            <div className="flex items-center gap-1 mt-2 text-sm" style={{ color: 'var(--error)' }}>
                                <AlertCircle className="h-3 w-3" /> {error}
                            </div>
                        )}
                    </div>

                    <div className="p-3 rounded-xl mb-6" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                        <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: 'var(--primary-cyan)' }} />
                            <span>Your content will be reviewed by a manager before publication.</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} disabled={submitting}>
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
                                    Submit Content
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
