import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, XCircle, AlertTriangle, Send, Edit } from 'lucide-react';
import { Pagination } from '../../components/Pagination.jsx';
import { writerAPI } from '../../lib/api';

/**
 * RejectedNotifications - Writer's rejected tasks
 * Integrated with backend API
 */
export function RejectedNotifications() {
  const navigate = useNavigate();

  // State for data
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await writerAPI.getTasks();
      // Filter for rejected tasks only (REJECTED or WRITER_REJECTED)
      const rejectedTasks = (response.tasks || []).filter(t =>
        t.current_status === 'REJECTED' || t.current_status === 'WRITER_REJECTED'
      );
      setTasks(rejectedTasks);
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

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return tasks.slice(startIndex, startIndex + pageSize);
  }, [tasks, page, pageSize]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Tasks {'>'} Rejected
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <XCircle className="h-6 w-6 text-[var(--error)]" />
            Rejected Notifications
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Review tasks that were rejected by the manager.
          </p>
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

      {/* Error State */}
      {error && (
        <div className="premium-card p-4 flex items-center justify-between border-l-4 border-[var(--error)]">
          <p className="text-[var(--error)] font-medium">{error}</p>
          <button
            onClick={fetchTasks}
            className="text-sm font-semibold underline text-[var(--text-primary)] hover:text-[var(--primary-cyan)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[var(--border)] border-t-[var(--primary-cyan)]"></div>
          <p className="mt-4 text-[var(--text-muted)] font-medium">Loading rejected tasks...</p>
        </div>
      )}

      {/* Task Cards */}
      {!loading && (
        <div className="space-y-3">
          {paginatedTasks.map((task) => (
            // one compact row per task: what / why on the left, the action on the right
            <div
              key={task.id}
              className="premium-card p-5 border-l-4 border-l-[var(--error)]"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-5 w-5 text-[var(--error)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                      {task.website_domain || 'Task Rejected'}
                    </h3>
                    <span className="premium-badge" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#6D28D9' }}>
                      TASK-{task.id}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(task.updated_at || task.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-start gap-1.5 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-[var(--error)] flex-shrink-0" />
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--error)]">Reason: </span>
                      {task.rejection_reason || 'No reason given'}
                    </p>
                  </div>
                </div>
                {/* Action button - navigate to task to revise and resubmit */}
                <button
                  onClick={() => navigate(`/writer/order-added-notifications/detail/${task.id}`)}
                  className="premium-btn premium-btn-primary flex items-center gap-2 shrink-0 self-start md:self-center"
                >
                  <Edit className="h-4 w-4" />
                  Revise & Submit
                </button>
              </div>
            </div>
          ))}

          {paginatedTasks.length === 0 && (
            <div className="premium-card p-12 text-center">
              <div className="w-16 h-16 bg-[var(--background-dark)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                <XCircle className="h-8 w-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">No Rejected Tasks</h3>
              <p className="text-[var(--text-muted)] mt-1">Great job! You have no rejected tasks.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {tasks.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={tasks.length}
          pageSizeOptions={[20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}
    </div>
  );
}
