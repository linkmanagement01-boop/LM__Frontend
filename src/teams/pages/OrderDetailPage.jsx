import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, FileText, User, Calendar, Link as LinkIcon, ExternalLink, CheckCircle, Info } from 'lucide-react';
import { teamAPI } from '../../lib/api';

export function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const response = await teamAPI.getOrderById(id);
                setOrder(response.task || response.order);
            } catch (err) {
                console.error('Error fetching order:', err);
                setError(err.message || 'Failed to load order details');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--text-muted)] gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary-cyan)]"></div>
                <p>Loading order details...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="premium-card p-10 text-center max-w-lg mx-auto mt-10">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <Info className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Order Not Found</h2>
                <p className="text-red-400 mb-6">{error || 'The requested order details could not be found.'}</p>
                <button
                    onClick={() => navigate('/teams/completed-orders')}
                    className="premium-btn bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate('/teams/completed-orders')}
                    className="p-2 rounded-xl border border-[var(--border)] bg-[var(--background-dark)] hover:bg-[var(--card-background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">
                        Order Details
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                        <span className="font-mono text-[var(--primary-cyan)]">#{order.id}</span>
                        <span>•</span>
                        <span>{order.client_name}</span>
                        <span>•</span>
                        <span className="uppercase text-xs tracking-wide bg-[var(--background-dark)] px-2 py-0.5 rounded border border-[var(--border)]">{order.order_type || 'Guest Post'}</span>
                    </div>
                </div>
            </div>

            {/* Order Info Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="premium-card p-4">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</div>
                    <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${order.current_status === 'Active' ? 'bg-green-400' : 'bg-[var(--primary-cyan)]'}`}></span>
                        {order.current_status || 'Unknown'}
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Created Date</div>
                    <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Requirement</div>
                    <div className="font-medium text-[var(--text-primary)]">
                        {order.no_of_links || 1} links <span className="text-[var(--text-muted)] mx-1">|</span> DA 20+
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Package</div>
                    <div className="font-medium text-[var(--text-primary)]">
                        {order.order_package || 'Standard'}
                    </div>
                </div>
            </div>

            {/* Client & Manager Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card p-6 h-full">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                        <div className="p-2 rounded-lg bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)]">
                            <User className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Client Information</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
                            <span className="text-sm text-[var(--text-muted)]">Client Name</span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{order.client_name || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
                            <span className="text-sm text-[var(--text-muted)]">Website</span>
                            <span className="text-sm">
                                {order.client_website ? (
                                    <a href={order.client_website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[var(--primary-cyan)] hover:underline">
                                        {order.client_website} <ExternalLink className="h-3 w-3" />
                                    </a>
                                ) : <span className="text-[var(--text-secondary)]">N/A</span>}
                            </span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
                            <span className="text-sm text-[var(--text-muted)]">Category</span>
                            <span className="premium-badge inline-flex bg-[var(--background-dark)] border-[var(--border)] px-2 py-1 text-xs">
                                {order.category || 'General'}
                            </span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
                            <span className="text-sm text-[var(--text-muted)]">Manager</span>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[var(--primary-cyan)]/20 text-[var(--primary-cyan)] flex items-center justify-center text-[10px] font-bold">
                                    {order.manager_name ? order.manager_name.charAt(0) : 'M'}
                                </div>
                                <span className="text-sm text-[var(--text-primary)]">{order.manager_name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes Section - if exists, otherwise expand client details or show placeholder */}
                {order.notes ? (
                    <div className="premium-card p-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                            <div className="p-2 rounded-lg bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)]">
                                <FileText className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notes & Instructions</h2>
                        </div>
                        <div className="flex-1 rounded-xl bg-[var(--background-dark)] border border-[var(--border)] p-4 overflow-y-auto max-h-[200px] custom-scrollbar">
                            <div
                                dangerouslySetInnerHTML={{ __html: order.notes }}
                                className="prose prose-invert prose-sm max-w-none prose-a:text-[var(--primary-cyan)] prose-headings:text-[var(--text-primary)] text-[var(--text-secondary)]"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="premium-card p-6 h-full flex items-center justify-center text-[var(--text-muted)] border-dashed">
                        <div>No additional notes provided</div>
                    </div>
                )}
            </div>

            {/* Selected Websites Table */}
            <div className="premium-card overflow-hidden">
                <div className="p-6 border-b border-[var(--border)] bg-[var(--card-background)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)]">
                            <Globe className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Selected Websites</h2>
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">
                        {order.selected_websites ? order.selected_websites.length : (order.website_domain ? 1 : 0)} websites
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[var(--background-dark)] border-b border-[var(--border)]">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Website</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Metrics</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Traffic</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pricing</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Live URL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {order.selected_websites && order.selected_websites.length > 0 ? (
                                order.selected_websites.map((site, index) => (
                                    <tr key={site.id || index} className="hover:bg-[var(--primary-cyan)]/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-[var(--primary-cyan)]" />
                                                <span className="font-medium text-[var(--text-primary)]">{site.domain_url || site.website_domain || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase">DA</span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">{site.da || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase">DR</span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">{site.dr || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-secondary)]">{site.traffic || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-[var(--text-muted)]">GP: <span className="text-green-400 font-mono">${site.gp_price || site.website_gp_price || '0'}</span></div>
                                                <div className="text-xs text-[var(--text-muted)]">Niche: <span className="text-green-400 font-mono">${site.niche_price || site.website_niche_price || '0'}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-xs text-[var(--text-muted)]">Anchor: <span className="text-[var(--text-secondary)]">{site.anchor_text || site.anchor || '-'}</span></div>
                                                {site.target_url || site.url ? (
                                                    <a href={site.target_url || site.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--primary-cyan)] hover:underline">
                                                        Target Link <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : <span className="text-xs text-[var(--text-muted)]">No Target Link</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {site.submit_url || order.live_published_url ? (
                                                <a href={site.submit_url || order.live_published_url} target="_blank" rel="noreferrer" className="premium-badge inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 border-green-500/20 px-2 py-1 text-xs hover:bg-green-500/20 transition-colors">
                                                    <CheckCircle className="h-3 w-3" /> Live Link
                                                </a>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)] italic">Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Show single website from order if no selected_websites array
                                order.website_domain ? (
                                    <tr className="hover:bg-[var(--primary-cyan)]/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-[var(--primary-cyan)]" />
                                                <span className="font-medium text-[var(--text-primary)]">{order.website_domain}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase">DA</span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">{order.website_da || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase">DR</span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">{order.website_dr || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-secondary)]">{order.website_traffic || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-[var(--text-muted)]">GP: <span className="text-green-400 font-mono">${order.website_gp_price || '0'}</span></div>
                                                <div className="text-xs text-[var(--text-muted)]">Niche: <span className="text-green-400 font-mono">${order.website_niche_price || '0'}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-muted)] text-sm">-</td>
                                        <td className="px-6 py-4">
                                            {order.live_published_url ? (
                                                <a href={order.live_published_url} target="_blank" rel="noreferrer" className="premium-badge inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 border-green-500/20 px-2 py-1 text-xs hover:bg-green-500/20 transition-colors">
                                                    <CheckCircle className="h-3 w-3" /> Live Link
                                                </a>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)] italic">Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-[var(--text-muted)]">
                                            No websites selected for this order
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default OrderDetailPage;
