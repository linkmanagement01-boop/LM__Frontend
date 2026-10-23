import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { managerAPI } from '../../../lib/api';
import { Users, Clock, Send, CheckCircle, Package, ChevronRight, ChevronLeft, RefreshCw, ShoppingBag, FileText, Link2, Store, Globe } from 'lucide-react';

// Full class names (Tailwind can't see classes built from variables), readable on the light theme
const TONES = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-slate-50 text-slate-700 border-slate-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200'
};

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'amber', icon: <Clock size={13} /> },
  sent_to_writer: { label: 'With Writer', color: 'blue', icon: <Package size={13} /> },
  writer_approved: { label: 'Writer Approved', color: 'indigo', icon: <CheckCircle size={13} /> },
  blogger_approved: { label: 'Pushed to Blogger', color: 'purple', icon: <Send size={13} /> },
  blogger_submitted: { label: 'Blogger Submitted', color: 'amber', icon: <Clock size={13} /> },
  manager_processing: { label: 'Processing', color: 'blue', icon: <Package size={13} /> },
  pushed_to_blogger: { label: 'Pushed to Blogger', color: 'purple', icon: <Send size={13} /> },
  completed: { label: 'Completed', color: 'emerald', icon: <CheckCircle size={13} /> },
  rejected: { label: 'Rejected & Refunded', color: 'red', icon: null }
};

const FILTERS = ['', 'pending_review', 'sent_to_writer', 'writer_approved', 'blogger_approved'];

export const Badge = ({ tone = 'gray', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${TONES[tone] || TONES.gray} ${className}`}>{children}</span>
);

export const ClientOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const data = await managerAPI.getClientOrders(params);
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load client orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDisplayStatus = (order) => {
    if (order.status === 'completed' || (order.completed_blogger_submissions_count && order.site_count && parseInt(order.completed_blogger_submissions_count) === parseInt(order.site_count))) {
      return 'completed';
    }
    if (order.status === 'sent_to_writer') {
      if (order.linked_process_status === 4) return 'writer_approved';
      if (order.linked_process_status === 5) {
        if (order.pending_blogger_submissions_count && parseInt(order.pending_blogger_submissions_count) > 0) return 'blogger_submitted';
        return 'blogger_approved';
      }
      return 'sent_to_writer';
    }
    if (order.status === 'pushed_to_blogger') {
      if (order.pending_blogger_submissions_count && parseInt(order.pending_blogger_submissions_count) > 0) return 'blogger_submitted';
      return 'pushed_to_blogger';
    }
    return order.status;
  };

  const StatusBadge = ({ order }) => {
    const s = getDisplayStatus(order);
    const cfg = STATUS_CONFIG[s] || { label: String(s || '').replace(/_/g, ' '), color: 'gray', icon: null };
    return <Badge tone={cfg.color}>{cfg.icon}{cfg.label}</Badge>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Orders</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Review and process orders submitted by clients{!loading && ` · ${total} order${total === 1 ? '' : 's'}`}</p>
          </div>
          <button onClick={fetchOrders} className="premium-btn border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] px-4 py-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${statusFilter === status
                ? 'bg-[var(--primary-cyan)] text-white border-[var(--primary-cyan)] shadow-sm'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary-cyan)] hover:text-[var(--primary-cyan)]'}`}
            >
              {status ? STATUS_CONFIG[status]?.label || status : 'All Orders'}
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="premium-card p-5 animate-pulse">
                <div className="flex gap-4"><div className="h-12 w-12 rounded-xl bg-[var(--surface-muted)]" /><div className="flex-1 space-y-2"><div className="h-4 bg-[var(--surface-muted)] rounded w-1/3" /><div className="h-3 bg-[var(--surface-muted)] rounded w-1/2" /></div></div>
              </div>
            ))
          ) : orders.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-[var(--surface-muted)] rounded-full flex items-center justify-center mb-4 text-[var(--text-muted)]">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No client orders</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">{statusFilter ? 'No orders with this status.' : 'Client orders will appear here when clients submit them.'}</p>
            </div>
          ) : (
            orders.map(order => {
              const isGP = /guest/i.test(order.order_type || '');
              const domains = (order.domains || []).filter(Boolean);
              const siteCount = parseInt(order.site_count || order.no_of_links || 0);
              const more = siteCount - domains.length;
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/manager/client-orders/${order.id}`)}
                  className={`premium-card p-5 cursor-pointer transition-all hover:shadow-md hover:border-[var(--primary-cyan)] group border-l-4 ${order.status === 'pending_review' ? 'border-l-amber-400' : 'border-l-transparent'}`}
                >
                  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                    {/* Type icon */}
                    <div className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 border ${isGP ? TONES.blue : TONES.teal}`}>
                      {isGP ? <FileText size={20} /> : <Link2 size={20} />}
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--text-primary)]">{order.order_number || `#${order.id}`}</span>
                        <Badge tone={isGP ? 'blue' : 'teal'}>{order.order_type}</Badge>
                        {Number(order.fc) === 1 && <Badge tone="red" className="uppercase tracking-wide">FC prices</Badge>}
                        <StatusBadge order={order} />
                        {order.marketplace && (
                          <Badge tone="violet"><Store size={12} />{order.marketplace === 'whitelabel' ? 'White-label Marketplace' : `${order.marketplace} Marketplace`}</Badge>
                        )}
                        <Badge tone={order.fill_details ? 'emerald' : 'amber'}>{order.fill_details ? 'Self-Filled' : 'Delegated'}</Badge>
                      </div>
                      <div className="flex items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)] flex-wrap mt-2">
                        <span className="font-medium text-[var(--text-secondary)]">{order.client_name_user || 'Unknown Client'}</span>
                        <span>·</span>
                        <span>{siteCount} site{siteCount === 1 ? '' : 's'}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={13} />{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {order.order_package && <><span>·</span><span>{order.order_package}</span></>}
                        {order.assigned_writer_name && <><span>·</span><span className="flex items-center gap-1 text-[var(--text-secondary)]"><Users size={13} />{order.assigned_writer_name}</span></>}
                      </div>
                      {domains.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {domains.map((d, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)]"><Globe size={11} />{d}</span>
                          ))}
                          {more > 0 && <span className="text-xs text-[var(--text-muted)]">+{more} more</span>}
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-4 ml-auto">
                      {order.status === 'pending_review' && <Badge tone="amber">Action Required</Badge>}
                      {Number(order.total_price) > 0 && (
                        <div className="text-right">
                          <p className="text-base font-bold text-[var(--text-primary)]">${Number(order.total_price).toFixed(2)}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">order value</p>
                        </div>
                      )}
                      <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-cyan)] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2 text-sm text-[var(--text-secondary)]">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span>Page <b className="text-[var(--text-primary)]">{page}</b> of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientOrders;
