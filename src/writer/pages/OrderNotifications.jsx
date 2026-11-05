import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowRight, Trash2, X } from 'lucide-react';
import { Pagination } from '../../components/Pagination.jsx';
import { writerAPI } from '../../lib/api';

/**
 * OrderNotifications - Writer's Order Added Notifications
 * Matches project dark theme styling
 */
export function OrderNotifications() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({ open: false, taskId: null, taskName: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await writerAPI.getTasks();
      const activeTasks = (response.tasks || []).filter(t =>
        t.current_status === 'ASSIGNED_TO_WRITER' ||
        t.current_status === 'WRITING_IN_PROGRESS'
      );
      setTasks(activeTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter(t =>
      `${t.id}`.includes(term) ||
      t.client_name?.toLowerCase().includes(term) ||
      t.order_type?.toLowerCase().includes(term) ||
      t.manager_name?.toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);

  const total = filteredTasks.length;
  const pageData = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  const handleViewDetails = (taskId) => {
    navigate(`/writer/order-added-notifications/detail/${taskId}`);
  };

  const openRejectModal = (task) => {
    setRejectModal({ open: true, taskId: task.id, taskName: task.manual_order_id || `#${task.id}` });
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, taskId: null, taskName: '' });
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setRejecting(true);
      await writerAPI.rejectTask(rejectModal.taskId, rejectReason.trim());
      closeRejectModal();
      fetchTasks(); // Refresh list
    } catch (err) {
      console.error('Rejection failed:', err);
      setError(err?.response?.data?.message || 'Failed to reject order');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Order Added Notifications</h2>
          <p className="text-[var(--text-secondary)] mt-1">Manage and process new orders assigned to you.</p>
        </div>
        <button
          onClick={fetchTasks}
          disabled={loading}
          className="premium-btn premium-btn-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="premium-card p-4 flex items-center justify-between border-l-4 border-[var(--error)]">
          <p className="text-[var(--error)] font-medium">{error}</p>
          <button
            onClick={() => { setError(null); fetchTasks(); }}
            className="text-sm font-semibold underline text-[var(--text-primary)] hover:text-[var(--primary-cyan)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="premium-card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <input
              placeholder="Search by ID, client, manager..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="premium-input w-full pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
          <div className="px-4 py-2 bg-[var(--background-dark)] rounded-lg text-sm text-[var(--text-secondary)] font-medium border border-[var(--border)]">
            {total} orders found
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[var(--border)] border-t-[var(--primary-cyan)]"></div>
          <p className="mt-4 text-[var(--text-muted)] font-medium">Loading orders...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="premium-table-container">
          <table className="premium-table table-compact">
            <thead>
              <tr>
                <th style={{ minWidth: '170px' }}>Order ID</th>
                <th>Type</th>
                <th>Manager</th>
                <th>Client</th>
                <th>Links</th>
                <th style={{ minWidth: '220px' }}>Insert Statement</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((task) => (
                <tr key={task.id} className="group">
                  {/* order id with the date it was pushed under it */}
                  <td className="font-medium">
                    <div className="text-[var(--primary-cyan)] break-all">{task.manual_order_id || `#${task.id}`}</div>
                    <div className="text-xs text-[var(--text-muted)] whitespace-nowrap mt-0.5">
                      {new Date(task.updated_at || task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td>
                    <span className="premium-badge whitespace-nowrap" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#6D28D9' }}>
                      {task.order_type || 'Guest Post'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-6 h-6 shrink-0 rounded-full bg-[var(--background-dark)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] border border-[var(--border)]">
                        {(task.manager_name || 'M')[0]}
                      </div>
                      {task.manager_name || 'Manager'}
                    </div>
                  </td>
                  <td>{task.client_name || 'N/A'}</td>
                  <td>
                    <span className="premium-metric-pill bg-[var(--background-dark)] text-[var(--text-secondary)]">
                      {task.no_of_links || 1}
                    </span>
                  </td>
                  <td style={{ maxWidth: '360px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {/* long statements: three lines here, full text on hover and on the order page */}
                    <div className="text-sm line-clamp-3" style={{ color: 'var(--text-primary)' }} title={task.statement || ''}>
                      {task.statement || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openRejectModal(task)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        title="Reject Order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewDetails(task.id)}
                        className="premium-btn premium-btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                      >
                        Process <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    No pending orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Rejection Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="premium-card p-6 w-full max-w-md mx-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Reject Order {rejectModal.taskName}
              </h3>
              <button onClick={closeRejectModal} className="p-1 rounded hover:bg-white/10">
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Please provide a reason for rejecting this order. The manager will see this reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="premium-input w-full mb-4 resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeRejectModal}
                className="premium-btn premium-btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejecting}
                className="premium-btn text-sm px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderNotifications;
