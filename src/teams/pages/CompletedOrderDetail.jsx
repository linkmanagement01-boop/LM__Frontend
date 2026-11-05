import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, Calendar, Clock, CheckCircle, AlertCircle, ExternalLink, Globe } from 'lucide-react';
import { teamAPI } from '../../lib/api';

export function CompletedOrderDetail() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await teamAPI.getCompletedOrderDetail(id);
            setData(response);
        } catch (err) {
            console.error('Error fetching order detail:', err);
            setError(err.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="h-12 w-12 border-2 border-[var(--primary-cyan)] border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-[var(--text-muted)] animate-pulse">Loading order details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="premium-card p-6 border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6" />
                    <p className="font-medium">{error}</p>
                </div>
                <button
                    onClick={fetchOrderDetail}
                    className="premium-btn bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const { order, timeline } = data;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Link to="/teams/completed-orders" className="hover:text-[var(--primary-cyan)] transition-colors flex items-center gap-1 group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Completed Orders
                </Link>
                <span>/</span>
                <span className="text-[var(--text-primary)]">Order #{order.id}</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    Order Detail
                    <span className="text-2xl text-[var(--text-muted)] font-mono font-normal">#{order.order_id || order.id}</span>
                </h1>
                <div className={`premium-badge ${order.current_status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        order.current_status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20'
                    }`}>
                    {order.status || order.current_status}
                </div>
            </div>

            {/* Message Section */}
            {order.message && (
                <div className="premium-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--primary-cyan)]/5 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[var(--primary-cyan)]" />
                        <h3 className="font-semibold text-[var(--primary-cyan)]">Message</h3>
                    </div>
                    <div className="p-6 text-[var(--text-secondary)] leading-relaxed">
                        <div
                            dangerouslySetInnerHTML={{ __html: order.message }}
                            className="prose prose-invert max-w-none prose-a:text-[var(--primary-cyan)] prose-headings:text-[var(--text-primary)]"
                        />
                    </div>
                </div>
            )}

            {/* Order Info */}
            <div className="premium-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Order Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem label="Client Name" value={order.client_name} />
                    <InfoItem label="Client Website" value={order.client_website} isLink />
                    <InfoItem label="Number of Links" value={order.no_of_links || 1} />
                    <InfoItem label="Order Type" value={order.order_type || 'Guest Post'} />
                    <InfoItem label="Order Package" value={order.order_package} />
                    <InfoItem label="Order ID" value={order.order_id} />
                </div>
            </div>

            {/* Timeline Events */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--primary-cyan)]" />
                    Activity History
                </h3>

                {timeline.map((event, index) => (
                    <div key={index} className="premium-card overflow-hidden transition-all duration-300 hover:border-[var(--primary-cyan)]/30">
                        {/* Event Header */}
                        <div className={`px-6 py-3 border-b flex justify-between items-center ${event.type === 'manager_rejected'
                                ? 'bg-red-500/10 border-red-500/20'
                                : 'bg-[var(--background-dark)] border-[var(--border)]'
                            }`}>
                            <div className="flex items-center gap-3">
                                <Clock className={`h-4 w-4 ${event.type === 'manager_rejected' ? 'text-red-400' : 'text-[var(--text-muted)]'}`} />
                                <span className={`text-sm font-medium ${event.type === 'manager_rejected' ? 'text-red-300' : 'text-[var(--text-secondary)]'}`}>
                                    {formatDate(event.timestamp)}
                                </span>
                            </div>
                            {event.type === 'manager_rejected' && (
                                <span className="premium-badge bg-red-500/20 text-red-300 border-red-500/30 text-xs">Rejected</span>
                            )}
                        </div>

                        {/* Event Content */}
                        <div className="p-6 space-y-4">
                            <h4 className={`text-base font-semibold ${event.type === 'manager_rejected' ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                                {event.title}
                            </h4>

                            {/* Order Created */}
                            {event.type === 'order_created' && event.description && (
                                <p className="text-[var(--text-secondary)] bg-[var(--background-dark)] p-4 rounded-xl border border-[var(--border)]">
                                    {event.description}
                                </p>
                            )}

                            {/* Team Pushed to Manager */}
                            {event.type === 'team_pushed' && event.sites && (
                                <div className="space-y-4">
                                    <div className="premium-table-container">
                                        <table className="premium-table">
                                            <thead>
                                                <tr>
                                                    <th>Root Domain</th>
                                                    <th>Price</th>
                                                    <th>URL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {event.sites.map((site, siteIndex) => (
                                                    <tr key={siteIndex}>
                                                        <td className="font-medium text-[var(--text-primary)]">{site.root_domain}</td>
                                                        <td className="text-[var(--text-secondary)]">{site.price}</td>
                                                        <td>
                                                            {site.url && site.url !== '-' ? (
                                                                <a href={site.url} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline flex items-center gap-1 group">
                                                                    <span className="truncate max-w-[200px]">{site.url}</span>
                                                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </a>
                                                            ) : <span className="text-[var(--text-muted)]">-</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {event.note && (
                                                    <tr className="bg-[var(--background-dark)]">
                                                        <td className="font-semibold text-[var(--text-muted)]">Note</td>
                                                        <td colSpan={2} className="text-[var(--text-primary)] italic">{event.note}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Manager Disapproved */}
                            {event.type === 'manager_rejected' && (
                                <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                                    <div className="flex gap-2">
                                        <span className="font-semibold text-red-400">Note:</span>
                                        <span className="text-red-300 italic">{event.note}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {timeline.length === 0 && (
                    <div className="premium-card p-12 text-center flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
                        <p className="text-[var(--text-muted)]">No activity history available for this order.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoItem({ label, value, isLink }) {
    return (
        <div className="bg-[var(--background-dark)] p-4 rounded-xl border border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-semibold">{label}</div>
            {isLink && value ? (
                <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--primary-cyan)] hover:underline flex items-center gap-1 font-medium truncate"
                >
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{value}</span>
                </a>
            ) : (
                <div className="font-medium text-[var(--text-primary)] truncate">
                    {value || <span className="text-[var(--text-muted)]">N/A</span>}
                </div>
            )}
        </div>
    );
}

export default CompletedOrderDetail;
