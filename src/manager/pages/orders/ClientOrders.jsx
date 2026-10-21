import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { motion } from 'framer-motion';
import { managerAPI } from '../../../lib/api';
import { Users, Clock, Send, CheckCircle, Package, ChevronRight, Eye, RefreshCw, ShoppingBag } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'amber', icon: <Clock size={14} /> },
  sent_to_writer: { label: 'Sent to Writer', color: 'blue', icon: <Package size={14} /> },
  writer_approved: { label: 'Writer Approved', color: 'indigo', icon: <CheckCircle size={14} /> },
  blogger_approved: { label: 'Pushed to Blogger', color: 'purple', icon: <Send size={14} /> },
  blogger_submitted: { label: 'Blogger Submitted', color: 'amber', icon: <Clock size={14} /> },
  manager_processing: { label: 'Processing', color: 'blue', icon: <Package size={14} /> },
  pushed_to_blogger: { label: 'Pushed to Blogger', color: 'purple', icon: <Send size={14} /> },
  completed: { label: 'Completed', color: 'emerald', icon: <CheckCircle size={14} /> },
};

export const ClientOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const data = await managerAPI.getClientOrders(params);
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load client orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const getDisplayStatus = (order) => {
    if (order.status === 'completed' || (order.completed_blogger_submissions_count && order.site_count && parseInt(order.completed_blogger_submissions_count) === parseInt(order.site_count))) {
      return 'completed';
    }
    if (order.status === 'sent_to_writer') {
      if (order.linked_process_status === 4) return 'writer_approved';
      if (order.linked_process_status === 5) {
        if (order.pending_blogger_submissions_count && parseInt(order.pending_blogger_submissions_count) > 0) {
          return 'blogger_submitted';
        }
        return 'blogger_approved';
      }
      return 'sent_to_writer';
    }
    if (order.status === 'pushed_to_blogger') {
      if (order.pending_blogger_submissions_count && parseInt(order.pending_blogger_submissions_count) > 0) {
        return 'blogger_submitted';
      }
      return 'pushed_to_blogger';
    }
    return order.status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    const cfg = STATUS_CONFIG[displayStatus] || { label: displayStatus, color: 'gray', icon: null };
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 shadow-sm shadow-${cfg.color}-500/5`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Client Orders
            </h1>
            <p className="text-[var(--text-muted)]">Review and process orders submitted by clients</p>
          </div>
          <button onClick={fetchOrders} className="premium-btn border border-[var(--border)] hover:bg-[var(--background-dark)] px-4 py-2 flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['', 'pending_review', 'sent_to_writer', 'writer_approved', 'blogger_approved'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === status
                  ? 'bg-[var(--primary-cyan)] text-white'
                  : 'bg-[var(--background-dark)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--primary-cyan)]/30'
              }`}
            >
              {status ? STATUS_CONFIG[status]?.label || status : 'All Orders'}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {loading ? (
            [1, 2, 3].map(i => (
              <motion.div key={i} variants={itemVariants} className="premium-card p-6 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 bg-[var(--background-dark)] rounded w-1/3"></div>
                  <div className="h-4 bg-[var(--background-dark)] rounded w-1/6"></div>
                </div>
              </motion.div>
            ))
          ) : orders.length === 0 ? (
            <motion.div variants={itemVariants} className="premium-card p-12 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 mx-auto bg-[var(--primary-cyan)]/10 rounded-full flex items-center justify-center mb-6 text-[var(--primary-cyan)]"
                >
                  <ShoppingBag size={32} />
                </motion.div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No client orders</h3>
                <p className="text-[var(--text-muted)] text-lg max-w-md mx-auto">Client orders will appear here when clients submit them</p>
              </div>
            </motion.div>
          ) : (
            orders.map(order => (
              <motion.div
                key={order.id}
                variants={itemVariants}
                onClick={() => navigate(`/manager/client-orders/${order.id}`)}
                className="premium-card p-5 cursor-pointer hover:border-[var(--primary-cyan)]/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-14 px-1 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center text-[var(--primary-cyan)] font-bold font-mono text-[9px] text-center break-all leading-tight shadow-inner">
                      {order.order_number || `#${order.id}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="font-bold text-[var(--text-primary)] text-lg">{order.order_type}</h3>
                        {getStatusBadge(order)}
                        {order.marketplace && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.30)' }}
                            title="Placed by a client on the marketplace">
                            {order.marketplace === 'whitelabel' ? 'White-label Marketplace' : `${order.marketplace} Marketplace`}
                          </span>
                        )}
                        {order.fill_details ? (
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold tracking-wider">Self-Filled</span>
                        ) : (
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider">Delegated</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] flex-wrap">
                        <span className="font-medium text-[var(--text-secondary)] bg-[var(--background-dark)] px-2 py-0.5 rounded-md border border-[var(--border)]">{order.client_name_user || 'Unknown Client'}</span>
                        <span>•</span>
                        <span className="font-medium text-[var(--text-secondary)] bg-[var(--background-dark)] px-2 py-0.5 rounded-md border border-[var(--border)]">{order.site_count || order.no_of_links} Sites</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {order.order_package && <><span>•</span><span className="text-[var(--primary-cyan)] font-medium">{order.order_package}</span></>}
                        {order.assigned_writer_name && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--primary-cyan)] font-medium flex items-center gap-1.5">
                              <Users size={14} />
                              {order.assigned_writer_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {order.status === 'pending_review' && (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold animate-pulse border border-amber-500/20">
                        Action Required
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-full bg-[var(--background-dark)] flex items-center justify-center group-hover:bg-[var(--primary-cyan)]/10 group-hover:text-[var(--primary-cyan)] transition-colors">
                      <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary-cyan)] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div variants={itemVariants} className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button 
                key={i} 
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  page === i + 1 
                    ? 'bg-[var(--primary-cyan)] text-white shadow-cyan-500/25 border-[var(--primary-cyan)]' 
                    : 'bg-[var(--background-dark)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--primary-cyan)]/30 hover:text-[var(--primary-cyan)]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default ClientOrders;
