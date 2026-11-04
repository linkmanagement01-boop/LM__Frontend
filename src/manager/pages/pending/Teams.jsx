import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, Trash2, Eye, Search, Filter } from 'lucide-react';
import { Pagination } from '../../../components/Pagination.jsx';
import { managerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Layout } from '../../components/layout/Layout';

export function PendingTeams() {
  const { showSuccess, showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [processing, setProcessing] = useState(null);

  // Fetch tasks pending approval from teams (using dedicated API)
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getPendingFromTeams();
      setTasks(response.orders || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);



  // Handle rejection
  const handleReject = async (taskId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setProcessing(taskId);
      await managerAPI.rejectTeamSubmission(taskId, reason);
      showSuccess('Team submission rejected, sent back to team');
      fetchTasks();
    } catch (err) {
      showError('Failed to reject: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Filter tasks
  const rows = useMemo(() => {
    let r = tasks;
    const q = filters.search.toLowerCase();
    if (q) {
      r = r.filter(t =>
        `${t.id}`.includes(q) ||
        (t.website_domain || '').toLowerCase().includes(q) ||
        (t.created_by_name || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [tasks, filters]);

  const total = rows.length;
  const pageData = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Layout>
      <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-[var(--text-secondary)]">Pending Approval {'>'} Teams</div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <Users className="h-8 w-8 text-[var(--primary-cyan)]" />
              Pending From Teams
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Review and approve website selections from teams</p>
          </div>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="premium-btn premium-btn-primary"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
            <p>{error}</p>
            <button onClick={fetchTasks} className="text-sm font-medium hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="premium-card p-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                placeholder="Search by ID, domain, creator..."
                value={filters.search}
                onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }}
                className="premium-input w-full pl-10"
              />
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">{total} pending approvals</span>
              {filters.search && (
                <button
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => setFilters({ search: '' })}
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
            <RefreshCw className="h-10 w-10 animate-spin mb-4 text-[var(--primary-cyan)]" />
            <p>Loading pending approvals...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="premium-table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Team Member</th>
                  <th>Client</th>
                  <th>Website Details</th>
                  <th className="text-center">Links</th>
                  <th className="text-center">Type</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[var(--text-muted)]">
                      No pending team approvals found
                    </td>
                  </tr>
                ) : (
                  pageData.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <span className="font-semibold text-[var(--text-primary)]">{task.manual_order_id || `#${task.id}`}</span>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{task.team_name || 'N/A'}</div>
                          <div className="text-xs text-[var(--text-muted)]">{task.team_email}</div>
                        </div>
                      </td>
                      <td>
                        <div className="text-[var(--text-secondary)]">{task.client_name || 'N/A'}</div>
                      </td>
                      <td>
                        <a
                          href={task.client_website || task.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-cyan)] transition-colors group"
                        >
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${task.client_website || task.website_url}&sz=32`}
                            className="w-4 h-4 rounded-sm opacity-80"
                            alt=""
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          {task.client_website || task.website_url || 'N/A'}
                        </a>
                      </td>
                      <td className="text-center">
                        <span className="premium-metric-pill bg-[var(--background-dark)] border-[var(--border)]">
                          {task.no_of_links || 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="premium-badge bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          {task.order_type || 'gp'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/manager/pending/teams/${task.id}`}
                            className="premium-btn p-2 min-w-0"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handleReject(task.id)}
                            disabled={processing === task.id}
                            className="premium-btn p-2 min-w-0 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            title="Reject"
                          >
                            {processing === task.id ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-6">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              pageSizeOptions={[20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PendingTeams;
