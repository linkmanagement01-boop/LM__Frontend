import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, User, Globe, Check, Link2, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import { managerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Layout } from '../../components/layout/Layout';

/**
 * BloggerSubmissionDetails - Manager reviews blogger's submitted URL
 * Matches production layout at /pending-approval-for-bloggers/:id
 */
export function BloggerSubmissionDetails() {
    const { id } = useParams(); // detail_id
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await managerAPI.getBloggerSubmission(id);
            console.log('Blogger Submission Detail:', response.detail);
            setDetail(response.detail);
        } catch (err) {
            console.error('Error fetching detail:', err);
            showError('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    }, [id, showError]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // Determine order type
    const isNicheEdit = () => {
        const orderType = (detail?.order_type || '').toLowerCase();
        return orderType.includes('niche') || orderType.includes('edit');
    };

    const isGuestPost = () => {
        const orderType = (detail?.order_type || '').toLowerCase();
        return orderType.includes('guest') || orderType.includes('gp') || orderType === 'guest post';
    };

    // Determine option type for Niche Edit
    const isReplaceOption = () => {
        const option = (detail?.option || '').toLowerCase();
        return option === 'replace' || option === 'replacement';
    };

    // Finalize - mark complete and credit blogger
    const handleFinalize = async () => {
        try {
            setProcessing(true);
            await managerAPI.finalizeFromBlogger(id);
            showSuccess('Order finalized and blogger credited!');
            navigate('/manager/pending/bloggers');
        } catch (err) {
            showError('Failed to finalize: ' + (err?.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    // Detail Row Component
    const DetailRow = ({ label, value, isLink = false, icon: Icon }) => (
        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">
                {label}
            </span>
            <span className="flex-1 text-[var(--text-primary)] break-all">
                {Icon && <Icon className="h-4 w-4 inline mr-2 text-[var(--primary-cyan)]" />}
                {isLink && value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-cyan)] transition-colors"
                    >
                        {value}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    value || '-'
                )}
            </span>
        </div>
    );

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="h-8 w-8 border-2 border-[var(--primary-cyan)] border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!detail) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-screen text-center">
                    <p className="text-[var(--text-muted)] mb-4">Submission not found</p>
                    <button
                        onClick={() => navigate('/manager/pending/bloggers')}
                        className="premium-btn premium-btn-primary"
                    >
                        Back to List
                    </button>
                </div>
            </Layout>
        );
    }

    const orderType = detail.order_type || 'Unknown';

    return (
        <Layout>
            <div className="p-8 max-w-4xl mx-auto min-h-screen">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/manager/pending/bloggers')}
                    className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Pending Bloggers
                </button>

                {/* Main Card - Blogger Pushed Data */}
                <div className="premium-card p-8">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-main)]">
                                Blogger Submission
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Review data submitted by the blogger</p>
                        </div>

                        {/* Order Type Badge */}
                        <div className="flex items-center gap-2">
                            <span className={`premium-badge ${isNicheEdit() ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                {orderType}
                            </span>
                            {isNicheEdit() && detail.option && (
                                <span className={`premium-badge ${isReplaceOption() ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    {detail.option}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="space-y-1">
                        {/* Order ID */}
                        <DetailRow label="Order ID" value={`#${detail.order_id}`} />

                        {/* Vendor */}
                        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">Vendor</span>
                            <span className="flex-1 text-[var(--text-primary)]">
                                <User className="h-4 w-4 inline mr-2 text-[var(--primary-cyan)]" />
                                {detail.vendor_name} <span className="text-[var(--text-muted)]">({detail.vendor_email})</span>
                            </span>
                        </div>

                        {/* Root Domain */}
                        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">Root Domain</span>
                            <span className="flex-1 text-[var(--text-primary)]">
                                <Globe className="h-4 w-4 inline mr-2 text-[var(--primary-cyan)]" />
                                {detail.root_domain}
                            </span>
                        </div>

                        {/* Order Type */}
                        <DetailRow label="Order Type" value={orderType} />

                        {/* Guest Post specific fields */}
                        {isGuestPost() && (
                            <>
                                <DetailRow label="Doc URL" value={detail.doc_urls} isLink icon={FileText} />
                                <DetailRow label="Title" value={detail.title} />
                                {detail.upload_doc_file && (
                                    <DetailRow label="Uploaded File" value={detail.upload_doc_file} isLink icon={FileText} />
                                )}
                            </>
                        )}

                        {/* Niche Edit specific fields */}
                        {isNicheEdit() && (
                            <>
                                <DetailRow label="Post URL" value={detail.post_url} isLink icon={ExternalLink} />
                                <DetailRow label="Option" value={detail.option || 'Insert'} />

                                {isReplaceOption() ? (
                                    <>
                                        <DetailRow label="Replace With" value={detail.insert_after} />
                                        <DetailRow label="Replace Statement" value={detail.insert_statement} />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow label="Insert After" value={detail.insert_after} />
                                        <DetailRow label="Insert Statement" value={detail.insert_statement} />
                                    </>
                                )}
                            </>
                        )}

                        {/* Common fields */}
                        <DetailRow label="Anchor" value={detail.anchor} />
                        <DetailRow label="Target URL" value={detail.url} isLink icon={Link2} />
                        <DetailRow label="Notes" value={detail.notes} />
                        <DetailRow label="Client Name" value={detail.client_name} />
                        <DetailRow label="Category" value={detail.category} />

                        {/* Link Verification */}
                        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">Link Verification</span>
                            <span className={`font-medium ${detail.link_status === 'Live'
                                    ? 'text-emerald-400'
                                    : detail.link_status === 'Issue'
                                        ? 'text-amber-400'
                                        : detail.link_status === 'Not Found' || detail.link_status === 'Error'
                                            ? 'text-red-400'
                                            : 'text-[var(--text-secondary)]'
                                }`}>
                                {detail.link_check_result || detail.link_verification || 'Not Verified'}
                            </span>
                        </div>

                        {/* Upfront Payment */}
                        <div className="flex items-center py-3 border-b border-[var(--border)] last:border-0 border-dashed">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">Upfront payment</span>
                            <div className="flex items-center gap-2">
                                {detail.upfront_payment ? (
                                    <>
                                        <ToggleRight className="h-6 w-6 text-[var(--primary-cyan)]" />
                                        <span className="text-[var(--primary-cyan)]">Yes</span>
                                    </>
                                ) : (
                                    <>
                                        <ToggleLeft className="h-6 w-6 text-[var(--text-muted)]" />
                                        <span className="text-[var(--text-muted)]">No</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Price */}
                        <div className="flex py-3 border-b border-[var(--border)] last:border-0 border-dashed">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider">Price</span>
                            <span className="text-emerald-400 font-bold text-lg">
                                ${parseFloat(detail.price || 0).toFixed(2)}
                            </span>
                        </div>

                        {/* Submit URL - The blogger's submitted live URL */}
                        <div className="flex py-4 mt-4 bg-[var(--background-dark)] rounded-xl p-4 border border-[var(--border)]">
                            <span className="w-1/3 text-sm font-medium text-[var(--text-secondary)] flex-shrink-0 uppercase tracking-wider flex items-center">Submit URL</span>
                            <a
                                href={detail.submitted_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-[var(--primary-cyan)] transition-colors text-emerald-400 font-medium break-all"
                            >
                                <Link2 className="h-4 w-4" />
                                {detail.submitted_url}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end">
                        <button
                            onClick={handleFinalize}
                            disabled={processing}
                            className="premium-btn premium-btn-primary px-8 py-3 h-auto text-base"
                        >
                            {processing ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="h-5 w-5" />
                            )}
                            Approve & Finalize
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default BloggerSubmissionDetails;
