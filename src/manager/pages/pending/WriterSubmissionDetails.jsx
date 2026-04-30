import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Globe, DollarSign, FileText, Link2, ExternalLink, Info, XCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { managerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Layout } from '../../components/layout/Layout';

/**
 * WriterSubmissionDetails - Manager views Writer's submitted content
 * Matches production layout at /pending-approval-for-writers/:id
 * Shows different layouts for Niche Edit vs Guest Post orders
 * 
 * AUTO-ROUTING: When pushing to bloggers, each site is automatically
 * assigned to its owner (the vendor who uploaded the site)
 * 
 * REJECTION: Manager can toggle specific websites as rejected with reasons
 */
export function WriterSubmissionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showSuccess, showError } = useToast();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Check if coming from reject button (URL has ?reject=true)
    const startInRejectMode = searchParams.get('reject') === 'true';

    // Rejection mode state
    const [rejectionMode, setRejectionMode] = useState(startInRejectMode);
    const [rejectedWebsites, setRejectedWebsites] = useState({}); // { websiteId: { rejected: bool, reason: string } }
    const [globalRejectionReason, setGlobalRejectionReason] = useState('');
    
    // Email notification state
    const [sendEmail, setSendEmail] = useState(true);

    const fetchTask = useCallback(async () => {
        try {
            setLoading(true);
            const response = await managerAPI.getTask(id);
            console.log('Writer Submission Task:', response.task);
            setTask(response.task);

            // Initialize rejection state for all websites
            const initialRejectionState = {};
            (response.task?.selected_websites || []).forEach(site => {
                initialRejectionState[site.id] = { rejected: false, reason: '' };
            });
            setRejectedWebsites(initialRejectionState);
        } catch (err) {
            console.error('Error fetching task:', err);
            showError('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    }, [id, showError]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    // Check if order is Niche Edit
    const isNicheEdit = task?.order_type?.toLowerCase().includes('niche');

    // Toggle rejection for a website
    const toggleWebsiteRejection = (websiteId) => {
        setRejectedWebsites(prev => ({
            ...prev,
            [websiteId]: {
                ...prev[websiteId],
                rejected: !prev[websiteId]?.rejected
            }
        }));
    };

    // Update rejection reason for a website
    const updateWebsiteRejectionReason = (websiteId, reason) => {
        setRejectedWebsites(prev => ({
            ...prev,
            [websiteId]: {
                ...prev[websiteId],
                reason
            }
        }));
    };

    // Toggle all websites
    const toggleAllWebsites = (shouldReject) => {
        const updated = {};
        websites.forEach(site => {
            updated[site.id] = {
                rejected: shouldReject,
                reason: rejectedWebsites[site.id]?.reason || ''
            };
        });
        setRejectedWebsites(updated);
    };

    // Get count of rejected websites
    const rejectedCount = Object.values(rejectedWebsites).filter(w => w.rejected).length;

    // Push to Bloggers - Auto-routes each site to its owner
    const handlePushToBloggers = async () => {
        try {
            setProcessing(true);
            await managerAPI.pushToBloggers(id, sendEmail);
            showSuccess('Tasks pushed to bloggers! Each site was assigned to its owner.');
            navigate('/manager/pending/writers');
        } catch (err) {
            showError('Failed to push to bloggers: ' + (err?.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    // Submit rejection with website-level details
    const handleRejectSubmission = async () => {
        if (rejectedCount === 0) {
            showError('Please select at least one website to reject');
            return;
        }

        if (!globalRejectionReason.trim()) {
            showError('Please provide a rejection reason');
            return;
        }

        try {
            setProcessing(true);

            // Format rejected websites for API
            const rejectedWebsitesArray = Object.entries(rejectedWebsites)
                .filter(([_, data]) => data.rejected)
                .map(([websiteId, data]) => ({
                    website_id: parseInt(websiteId),
                    rejected: true,
                    reason: data.reason || globalRejectionReason
                }));

            await managerAPI.rejectWriterSubmission(id, globalRejectionReason, rejectedWebsitesArray);
            showSuccess(`Rejected ${rejectedCount} website(s) and sent back to writer`);
            navigate('/manager/pending/writers');
        } catch (err) {
            showError('Failed to reject: ' + (err?.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="h-8 w-8 border-2 border-[var(--primary-cyan)] border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!task) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-screen text-center">
                    <p className="text-[var(--text-muted)] mb-4">Submission not found</p>
                    <button
                        onClick={() => navigate('/manager/pending/writers')}
                        className="premium-btn premium-btn-primary"
                    >
                        Back to List
                    </button>
                </div>
            </Layout>
        );
    }

    const websites = task.selected_websites || [];

    // Render a single data row
    const DataRow = ({ label, value, isLink = false }) => (
        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
            <div className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">
                {label}
            </div>
            <div className="flex-1 text-[var(--text-primary)] break-all">
                {isLink && value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-cyan)] transition-colors text-[var(--accent)]"
                    >
                        {value}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    value || <span className="text-[var(--text-muted)]">-</span>
                )}
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/manager/pending/writers')}
                        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Pending Writers
                    </button>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                {rejectionMode ? 'Reject Writer Content' : 'Push To Blogger'}
                            </h1>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                {rejectionMode
                                    ? 'Toggle websites to reject and send back to writer'
                                    : 'Review approved content before sending to vendors'}
                            </p>
                        </div>

                        {/* Mode Toggle Button */}
                        <button
                            onClick={() => setRejectionMode(!rejectionMode)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${rejectionMode
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-[var(--card-background)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {rejectionMode ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                            {rejectionMode ? 'Cancel Rejection' : 'Reject Content'}
                        </button>
                    </div>

                    {/* Rejection Controls - Only show in rejection mode */}
                    {rejectionMode && (
                        <div className="premium-card p-6 border-red-500/30 bg-red-500/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Rejection Mode Active
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => toggleAllWebsites(true)}
                                        className="px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                    >
                                        Reject All
                                    </button>
                                    <button
                                        onClick={() => toggleAllWebsites(false)}
                                        className="px-3 py-1.5 text-sm rounded-lg bg-[var(--card-background)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Global Rejection Reason *
                                </label>
                                <textarea
                                    value={globalRejectionReason}
                                    onChange={(e) => setGlobalRejectionReason(e.target.value)}
                                    placeholder="Enter the main reason for rejection (applies to all selected websites)..."
                                    rows={3}
                                    className="premium-input w-full"
                                />
                            </div>

                            <p className="text-sm text-[var(--text-muted)]">
                                Selected for rejection: <span className="text-red-400 font-bold">{rejectedCount}</span> / {websites.length} websites
                            </p>
                        </div>
                    )}

                    {/* Per-Website Sections */}
                    {websites.length === 0 ? (
                        <div className="premium-card p-8 text-center text-[var(--text-muted)]">
                            No website submissions found
                        </div>
                    ) : (
                        websites.map((site, index) => {
                            const isRejected = rejectedWebsites[site.id]?.rejected;

                            return (
                                <div
                                    key={site.id}
                                    className={`premium-card overflow-hidden transition-all ${rejectionMode && isRejected
                                        ? 'border-2 border-red-500/50 bg-red-500/5'
                                        : ''
                                        }`}
                                >
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card-background)] to-white/[0.02] flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            {/* Rejection Toggle - Only show in rejection mode */}
                                            {rejectionMode && (
                                                <button
                                                    onClick={() => toggleWebsiteRejection(site.id)}
                                                    className={`p-2 rounded-lg transition-all ${isRejected
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-[var(--background-dark)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                    title={isRejected ? 'Click to un-reject' : 'Click to reject this website'}
                                                >
                                                    {isRejected ? (
                                                        <ToggleRight className="h-6 w-6" />
                                                    ) : (
                                                        <ToggleLeft className="h-6 w-6" />
                                                    )}
                                                </button>
                                            )}

                                            <h2 className={`text-lg font-semibold flex items-center gap-2 ${isRejected ? 'text-red-400' : 'text-[var(--text-primary)]'
                                                }`}>
                                                <Globe className={`h-5 w-5 ${isRejected ? 'text-red-400' : 'text-[var(--primary-cyan)]'}`} />
                                                {site.domain_url}
                                                {isRejected && (
                                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                        REJECTED
                                                    </span>
                                                )}
                                            </h2>
                                        </div>
                                        <span className={`premium-badge ${isNicheEdit ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                            {isNicheEdit ? 'Niche Order' : 'GP Order'}
                                        </span>
                                    </div>

                                    {/* Per-Website Rejection Reason - Only show in rejection mode when rejected */}
                                    {rejectionMode && isRejected && (
                                        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                                            <input
                                                type="text"
                                                value={rejectedWebsites[site.id]?.reason || ''}
                                                onChange={(e) => updateWebsiteRejectionReason(site.id, e.target.value)}
                                                placeholder="Specific reason for this website (optional, uses global reason if empty)"
                                                className="w-full px-3 py-2 rounded-lg bg-[var(--background-dark)] border border-red-500/30 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-6">
                                        {isNicheEdit ? (
                                            /* ========== NICHE EDIT LAYOUT ========== */
                                            <div className="space-y-1">
                                                <DataRow label="Root domain" value={site.domain_url} />
                                                <DataRow label="Anchor" value={site.anchor_text} />
                                                <DataRow label="Target Url" value={site.target_url} isLink />
                                                <DataRow label="Post url" value={site.copy_url || site.post_url} isLink />
                                                <DataRow label="Price" value={site.niche_price || site.gp_price || '0'} />
                                                <DataRow label="Insert After" value={site.insert_after} />
                                                <DataRow label="Insert Statement" value={site.statement} />
                                                <DataRow label="Note" value={site.notes || site.writer_note} />
                                            </div>
                                        ) : (
                                            /* ========== GUEST POST LAYOUT ========== */
                                            <div className="space-y-1">
                                                <DataRow label="Root domain" value={site.domain_url} />
                                                <DataRow label="Price" value={site.gp_price || site.niche_price || '0'} />
                                                <DataRow label="Anchor" value={site.anchor_text} />
                                                <DataRow label="Title" value={site.article_title} />
                                                <DataRow label="Doc urls" value={site.doc_urls || site.content_link} isLink />
                                                <DataRow label="External Doc Files Url" value={site.content_file} isLink />
                                                <DataRow label="Note" value={site.notes || site.writer_note} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Action Buttons */}
                    <div className="premium-card p-6 sticky bottom-6 z-10 border-t border-[var(--border)] shadow-2xl shadow-black/50">
                        {!rejectionMode ? (
                            <>
                                {/* Info Box */}
                                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-6 flex items-start gap-3">
                                    <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-cyan-100/80">
                                        <strong>Auto-Routing System:</strong> Each website will be automatically assigned to its owner (the vendor who uploaded the site). Please verify all details before pushing.
                                    </p>
                                </div>

                                {/* Email Toggle */}
                                <div className="flex justify-center mb-6">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-[var(--background-dark)] border border-[var(--border)] hover:border-cyan-500/30 transition-colors">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={sendEmail}
                                                onChange={(e) => setSendEmail(e.target.checked)}
                                            />
                                            <div className={`w-10 h-6 bg-gray-700 rounded-full shadow-inner transition-colors ${sendEmail ? 'bg-cyan-500' : ''}`}></div>
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendEmail ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-sm font-medium text-[var(--text-primary)] select-none">
                                            Send Email Notification to Bloggers
                                        </span>
                                    </label>
                                </div>

                                {/* Action Button - Push to Blogger */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={handlePushToBloggers}
                                        disabled={processing || websites.length === 0}
                                        className="premium-btn premium-btn-primary px-8 py-4 h-auto text-lg w-full md:w-auto min-w-[300px] justify-center shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                                    >
                                        {processing ? (
                                            <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="h-5 w-5 mr-2" />
                                                Push to Blogger
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Rejection Warning */}
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-200/80">
                                        <strong>Rejection Mode:</strong> Selected websites ({rejectedCount}) will be sent back to the writer with red highlighting so they know which content to fix.
                                    </p>
                                </div>

                                {/* Action Button - Submit Rejection */}
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => setRejectionMode(false)}
                                        className="px-6 py-3 rounded-lg text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRejectSubmission}
                                        disabled={processing}
                                        className="premium-btn px-8 py-3 h-auto text-lg min-w-[250px] justify-center bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 mr-2" />
                                                Reject {rejectedCount} Website(s)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default WriterSubmissionDetails;
