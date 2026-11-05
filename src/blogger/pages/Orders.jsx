import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, FileText } from 'lucide-react';
import { Pagination } from '../../components/Pagination.jsx';
import { RejectModal } from '../../components/RejectModal.jsx';
import { bloggerAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  StatusPills,
  OrderFilters,
  OrdersTable,
  TaskDetailModal,
  SubmitLinkModal,
  mapTaskStatus
} from '../components';

// Status options for filtering
const STATUS_OPTIONS = ['all', 'pending', 'waiting', 'rejected', 'completed'];

/**
 * Orders Page - Displays blogger's assigned tasks
 * Integrated with backend API for real data
 */
export function Orders() {
  // Navigation
  const navigate = useNavigate();

  // Toast notifications
  const { showSuccess, showError } = useToast();

  // State for data
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filtering
  // ?status=pending|waiting|rejected|completed opens that tab (dashboard cards link here)
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(() => (['pending', 'waiting', 'rejected', 'completed'].includes(searchParams.get('status')) ? searchParams.get('status') : 'all'));
  const [filters, setFilters] = useState({ date: '', orderId: '', domain: '' });

  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // State for modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await bloggerAPI.getTasks();
      setTasks(response.tasks || []);
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

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { all: tasks.length, pending: 0, waiting: 0, rejected: 0, completed: 0 };

    tasks.forEach(task => {
      const displayStatus = mapTaskStatus(task.current_status);
      if (counts[displayStatus] !== undefined) {
        counts[displayStatus]++;
      }
    });

    return counts;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by status
    if (status !== 'all') {
      result = result.filter(task => mapTaskStatus(task.current_status) === status);
    }

    // Filter by date
    if (filters.date) {
      result = result.filter(task =>
        new Date(task.created_at).toDateString() === new Date(filters.date).toDateString()
      );
    }

    // Filter by task ID
    if (filters.orderId) {
      result = result.filter(task =>
        String(task.id).includes(filters.orderId)
      );
    }

    // Filter by domain
    if (filters.domain) {
      result = result.filter(task =>
        (task.website_domain || '').toLowerCase().includes(filters.domain.toLowerCase())
      );
    }

    return result;
  }, [tasks, status, filters]);

  // Paginated data
  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, page, pageSize]);

  // Handlers
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ date: '', orderId: '', domain: '' });
    setStatus('all');
    setPage(1);
  };

  // Navigate to order details page on eye click
  const handleViewDetails = (task) => {
    navigate(`/blogger/orders/${task.id}`);
  };

  const handleOpenSubmitModal = (task) => {
    setSelectedTask(task);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitLink = async (taskId, liveUrl) => {
    try {
      setSubmitting(true);
      await bloggerAPI.submitLink(taskId, liveUrl);

      // Close modal and refresh tasks
      setIsSubmitModalOpen(false);
      setSelectedTask(null);
      await fetchTasks();

      // Show success notification
      showSuccess('Link submitted successfully!');
    } catch (err) {
      console.error('Error submitting link:', err);
      showError('Failed to submit link: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open reject modal
  const handleOpenRejectModal = (task) => {
    setSelectedTask(task);
    setIsRejectModalOpen(true);
  };

  // Handle task rejection
  const handleRejectTask = async (reason) => {
    if (!selectedTask) return;
    try {
      setRejecting(true);
      await bloggerAPI.rejectTask(selectedTask.id, reason);

      // Close modal and refresh tasks
      setIsRejectModalOpen(false);
      setSelectedTask(null);
      await fetchTasks();

      showSuccess('Task rejected successfully!');
    } catch (err) {
      console.error('Error rejecting task:', err);
      showError('Failed to reject task: ' + err.message);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Orders {'>'} List
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          My Tasks
        </h2>
        <button
          onClick={fetchTasks}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              color: '#FFFFFF'
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Status Pills */}
      <StatusPills
        statuses={STATUS_OPTIONS}
        activeStatus={status}
        counts={statusCounts}
        onStatusChange={handleStatusChange}
      />

      {/* Filters */}
      <OrderFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Results Summary */}
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing {paginatedTasks.length} of {filteredTasks.length} tasks
      </div>

      {/* Table */}
      <OrdersTable
        data={paginatedTasks}
        onViewDetails={handleViewDetails}
        onSubmitLink={handleOpenSubmitModal}
        onRejectTask={handleOpenRejectModal}
        loading={loading && tasks.length === 0}
      />

      {/* Pagination */}
      {filteredTasks.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredTasks.length}
          pageSizeOptions={[20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmitLink={handleOpenSubmitModal}
      />

      {/* Submit Link Modal */}
      <SubmitLinkModal
        task={selectedTask}
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleSubmitLink}
        submitting={submitting}
      />

      {/* Reject Task Modal */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedTask(null);
        }}
        onConfirm={handleRejectTask}
        title="Reject Task"
        description={`Are you sure you want to reject this task for ${selectedTask?.website_domain || 'this website'}? Please provide a reason.`}
        confirmText="Reject Task"
        loading={rejecting}
      />
    </div>
  );
}
