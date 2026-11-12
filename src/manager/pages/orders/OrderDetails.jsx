import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink, User, Users, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Link2, Edit3, Send, Eye, Wifi, WifiOff } from 'lucide-react';
import { managerAPI } from '../../../lib/api';
import { useSocket } from '../../../context/SocketContext.jsx';
import { Layout } from '../../components/layout/Layout';

export const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { socket, isConnected, joinOrderRoom, leaveOrderRoom } = useSocket();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrderDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await managerAPI.getOrderDetails(id);
            setData(response);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError(err.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    // Join order room for real-time updates
    useEffect(() => {
        if (socket && isConnected && id) {
            joinOrderRoom(id);
            socket.on('order-detail-updated', () => fetchOrderDetails());
            socket.on('workflow-changed', (d) => {
                if (String(d.orderId) === String(id)) fetchOrderDetails();
            });
            socket.on('url-submitted', (d) => {
                if (String(d.orderId) === String(id)) fetchOrderDetails();
            });
        }
        return () => {
            if (socket && id) {
                leaveOrderRoom(id);
                socket.off('order-detail-updated');
                socket.off('workflow-changed');
                socket.off('url-submitted');
            }
        };
    }, [socket, isConnected, id, joinOrderRoom, leaveOrderRoom, fetchOrderDetails]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const style = {
            'Team Assigned': 'border-blue-500/30 bg-blue-500/10 text-blue-300',
            'Team Submitted': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
            'Writer Assigned': 'border-purple-500/30 bg-purple-500/10 text-purple-300',
            'Writer Submitted': 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
            'Completed': 'border-green-500/30 bg-green-500/10 text-green-300',
            'Blogger Submitted': 'border-teal-500/30 bg-teal-500/10 text-teal-300',
            'In Review': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
            'Rejected': 'border-red-500/30 bg-red-500/10 text-red-300',
            'Pending': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
            'Blogger Pushed': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        };
        return style[status] || 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    };

    // Renders a simple key-value info row
    const InfoRow = ({ label, value, isLink, isBold }) => (
        <tr className="border-b border-[var(--border)] last:border-b-0">
            <td className="py-3 px-4 text-[var(--text-muted)] font-semibold text-sm whitespace-nowrap w-[200px]">{label}</td>
            <td className={`py-3 px-4 text-sm ${isBold ? 'font-bold' : ''} text-[var(--text-primary)]`}>
                {isLink && value ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline break-all">
                        {value}
                    </a>
                ) : (value || '-')}
            </td>
        </tr>
    );

    // Renders the dark timestamp header bar
    const StepTimestamp = ({ date }) => (
        <div className="bg-[var(--background-dark)] text-[var(--text-muted)] text-xs font-semibold px-5 py-2.5 border-b border-[var(--border)]">
            {formatDate(date)}
        </div>
    );

    if (loading) {
        return (
            <Layout>
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary-cyan)]" />
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="p-6">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={fetchOrderDetails} className="premium-btn premium-btn-accent">Retry</button>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!data?.order) {
        return (
            <Layout>
                <div className="p-6">
                    <div className="text-center text-[var(--text-muted)] py-12">Order not found</div>
                </div>
            </Layout>
        );
    }

    const { order, processes } = data;
    const orderTypeLower = (order.order_type || '').toLowerCase();
    const isGuestPost = orderTypeLower.includes('gp') || orderTypeLower.includes('guest');
    const isNicheEdit = orderTypeLower.includes('niche');

    const teamAssignedProcess = processes.find(p => p.status === 1);
    const writerAssignedProcess = processes.find(p => p.status === 2);
    const writerSubmittedProcess = processes.find(p => p.status === 3);
    const bloggerPushedProcess = processes.find(p => p.status === 5);

    return (
        <Layout>
            <div className="p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/manager/orders/view')} className="p-2.5 rounded-xl hover:bg-white/10 text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)]">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Order #{order.order_id}</h1>
                                <span className={`premium-badge rounded-md border ${isGuestPost ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'}`}>
                                    {isGuestPost ? 'Guest Post' : 'Niche Edit'}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-2">
                                <span>ID: {order.id}</span>
                                <span>•</span>
                                <Clock size={12} /> {formatDate(order.created_at)}
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchOrderDetails} className="premium-btn border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>

                {/* Message / Instructions */}
                {order.message && (
                    <div className="premium-card overflow-hidden">
                        <div className="bg-[var(--primary-cyan)]/10 border-b border-[var(--primary-cyan)]/20 px-5 py-2.5">
                            <span className="text-sm font-bold text-[var(--primary-cyan)]">Message</span>
                        </div>
                        <div className="p-5 text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: order.message }} />
                    </div>
                )}

                {/* Order Summary Table */}
                <div className="premium-card overflow-hidden">
                    <div className="premium-table-container">
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Order Id</th>
                                    <th>Client Name</th>
                                    <th>Client Website</th>
                                    <th>No of Links</th>
                                    <th>Order Type</th>
                                    <th>Order Package</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <span className={`premium-badge ${getStatusBadge(order.current_workflow_status)}`}>
                                            {order.current_workflow_status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="font-mono text-[var(--primary-cyan)]">{order.order_id || order.id}</td>
                                    <td className="font-medium text-[var(--text-primary)]">{order.client_name || '-'}</td>
                                    <td>
                                        {order.client_website ? (
                                            <a href={order.client_website.startsWith('http') ? order.client_website : `https://${order.client_website}`} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline">
                                                {order.client_website}
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="text-center">{order.no_of_links || 1}</td>
                                    <td>{isGuestPost ? 'gp' : 'niche'}</td>
                                    <td>{order.order_package || 'Standard'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ==================== STEP 1: NEW ORDER CREATED ==================== */}
                {teamAssignedProcess && (
                    <div className="premium-card overflow-hidden">
                        <StepTimestamp date={teamAssignedProcess.created_at} />
                        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-blue-500/10 p-5">
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">New Order Created</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                Order Assigned to Team: <span className="text-[var(--primary-cyan)] font-medium">{teamAssignedProcess.team_name || 'N/A'}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* ==================== STEP 2: TEAM PUSHED TO MANAGER ==================== */}
                {teamAssignedProcess && teamAssignedProcess.blogger_assignments?.length > 0 && (
                    <div className="premium-card overflow-hidden">
                        <StepTimestamp date={teamAssignedProcess.created_at} />
                        <div className="bg-gradient-to-r from-cyan-500/10 to-transparent border-b border-cyan-500/10 p-5">
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">Team Pushed to Manager</h3>
                        </div>
                        <div className="p-5">
                            <div className="premium-table-container">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Root Domain</th>
                                            <th>Price</th>
                                            {isNicheEdit && <th>Url</th>}
                                            <th>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamAssignedProcess.blogger_assignments.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <a href={`https://${item.website}`} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline font-medium">
                                                        {item.website}
                                                    </a>
                                                </td>
                                                <td className="text-[var(--text-primary)] font-mono">{item.price || 0}</td>
                                                {isNicheEdit && (
                                                    <td>
                                                        {item.post_url ? (
                                                            <a href={item.post_url.startsWith('http') ? item.post_url : `https://${item.post_url}`} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline text-xs break-all">
                                                                {item.post_url}
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                )}
                                                <td className="text-[var(--text-secondary)]">{item.note || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== STEP 3: MANAGER PUSHED TO WRITER ==================== */}
                {writerAssignedProcess && (
                    <div className="premium-card overflow-hidden">
                        <StepTimestamp date={writerAssignedProcess.created_at} />
                        <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-purple-500/10 p-5">
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">Manager Pushed to Writer</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Writer info sub-card */}
                            <div className="bg-[var(--background-dark)] border border-[var(--border)] rounded-xl p-4">
                                <div className="text-sm font-semibold text-[var(--text-primary)]">
                                    Writer:{writerAssignedProcess.writer_name || 'N/A'}
                                </div>
                            </div>
                            {/* Details per item */}
                            {writerAssignedProcess.blogger_assignments?.length > 0 && (
                                <div className="space-y-4">
                                    {writerAssignedProcess.blogger_assignments.map((item) => (
                                        <div key={item.id} className="premium-table-container">
                                            <table className="premium-table">
                                                <tbody>
                                                    <InfoRow label="Root Domain" value={item.website} isLink />
                                                    {isNicheEdit ? (
                                                        <>
                                                            {/* NICHE: Root Domain, Target URL, Anchor, Post URL, Note */}
                                                            <InfoRow label="Url" value={item.target_url} isLink />
                                                            <InfoRow label="Anchor" value={item.anchor} />
                                                            <InfoRow label="Post URL" value={item.post_url} isLink />
                                                            <InfoRow label="Note" value={item.note} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* GP: Root Domain, URL, Anchor, Post URL, Title, Note */}
                                                            <InfoRow label="Url" value={item.target_url} isLink />
                                                            <InfoRow label="Anchor" value={item.anchor} />
                                                            <InfoRow label="Post URL" value={item.post_url} isLink />
                                                            <InfoRow label="Title" value={item.title} isLink />
                                                            <InfoRow label="Note" value={item.note} />
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== STEP 4: WRITER PUSHED TO MANAGER ==================== */}
                {writerSubmittedProcess && (
                    <div className="premium-card overflow-hidden">
                        <StepTimestamp date={writerSubmittedProcess.created_at} />
                        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border-b border-indigo-500/10 p-5">
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">Writer Pushed to Manager</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Writer info sub-card */}
                            <div className="bg-[var(--background-dark)] border border-[var(--border)] rounded-xl p-4">
                                <div className="text-sm font-semibold text-[var(--text-primary)]">
                                    Writer:{writerSubmittedProcess.writer_name || 'N/A'}
                                </div>
                            </div>
                            {writerSubmittedProcess.blogger_assignments?.length > 0 && (
                                <div className="space-y-4">
                                    {writerSubmittedProcess.blogger_assignments.map((item) => (
                                        <div key={item.id} className="premium-table-container">
                                            <table className="premium-table">
                                                <tbody>
                                                    <InfoRow label="Root Domain" value={item.website} isLink />
                                                    {isNicheEdit ? (
                                                        <>
                                                            {/* NICHE: Root Domain, Type, [Insert After/Statement OR Replace With/Statement], Target URL, Anchor, Post URL, Note */}
                                                            <InfoRow label="Type" value={item.type} />
                                                            {item.type === 'insert' && (
                                                                <>
                                                                    <InfoRow label="Insert After" value={item.insert_after} />
                                                                    <InfoRow label="Insert Statement" value={item.statement} isBold />
                                                                </>
                                                            )}
                                                            {item.type === 'replace' && (
                                                                <>
                                                                    <InfoRow label="Replace With" value={item.insert_after} />
                                                                    <InfoRow label="Replace Statement" value={item.statement} isBold />
                                                                </>
                                                            )}
                                                            <InfoRow label="Url" value={item.target_url} isLink />
                                                            <InfoRow label="Anchor" value={item.anchor} />
                                                            <InfoRow label="POST Url" value={item.post_url} isLink />
                                                            <InfoRow label="Note" value={item.note || item.new_note} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* GP: Root Domain, Upload Doc File, Doc URLs, Target URL, Anchor Text, Post URL, Note */}
                                                            <InfoRow label="Upload Doc File" value={item.upload_doc_file} isLink />
                                                            <InfoRow label="Doc URLS" value={item.doc_urls} isLink />
                                                            <InfoRow label="Url" value={item.target_url} isLink />
                                                            <InfoRow label="Anchor" value={item.anchor} />
                                                            <InfoRow label="POST Url" value={item.post_url} isLink />
                                                            <InfoRow label="Note" value={item.note || item.new_note} />
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== STEP 5: MANAGER PUSHED TO BLOGGER ==================== */}
                {bloggerPushedProcess && bloggerPushedProcess.blogger_assignments?.length > 0 && (
                    <div className="premium-card overflow-hidden">
                        <StepTimestamp date={bloggerPushedProcess.created_at} />
                        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-emerald-500/10 p-5">
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">Manager Pushed to Blogger</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {bloggerPushedProcess.blogger_assignments.map((item) => (
                                <div key={item.id} className="premium-table-container">
                                    <table className="premium-table">
                                        <tbody>
                                            {/* Both Niche & GP: Root Domain, Blogger Email, Verified/Rejected Bar, Live URL */}
                                            <InfoRow label="Root Domain" value={item.website} isLink />
                                            <InfoRow label="Blogger Email" value={item.blogger_email} />
                                            {/* Manager Verified Green Bar */}
                                            {(item.verify || item.status === 8) && (
                                                <tr>
                                                    <td className="py-3 px-4 font-bold text-white text-sm" style={{ backgroundColor: '#22c55e' }}>
                                                        Manager Verified and Complete Order
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-white text-sm" style={{ backgroundColor: '#22c55e' }}>
                                                        {item.updated_at ? formatDate(item.updated_at) : '-'}
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Rejected Red Bar (11 = manager rejected, 12 = blogger rejected) */}
                                            {(item.status === 11 || item.status === 12) && (
                                                <tr>
                                                    <td className="py-3 px-4 font-bold text-white text-sm" style={{ backgroundColor: '#ef4444' }}>
                                                        {item.status === 12 ? 'Blogger Rejected' : 'Manager Rejected'}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-white text-sm" style={{ backgroundColor: '#ef4444' }}>
                                                        {item.reject_reason || '-'}
                                                    </td>
                                                </tr>
                                            )}
                                            <InfoRow label="Url" value={item.submit_url || item.post_url} isLink />
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Workflow Started */}
                {(!processes || processes.length === 0) && (
                    <div className="premium-card p-12 text-center border-dashed">
                        <div className="w-20 h-20 rounded-full bg-[var(--background-dark)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                            <Clock className="h-10 w-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Activity Yet</h3>
                        <p className="text-[var(--text-muted)]">No workflow processes have started for this order.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default OrderDetails;
