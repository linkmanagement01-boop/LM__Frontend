import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Users, Lock, BarChart2, SlidersHorizontal, X, LogIn, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.jsx';
import { adminAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';

export function Bloggers() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { impersonateLogin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    walletMin: '',
    walletMax: ''
  });

  // Debounce timer ref
  const debounceTimer = useRef(null);

  // Fetch users from API with pagination
  const fetchUsers = useCallback(async (currentPage = page, currentPageSize = pageSize, currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      // Build params for server-side pagination
      const params = {
        page: currentPage,
        limit: currentPageSize,
      };

      // Add filters if they have values
      if (currentFilters.name) params.name = currentFilters.name;
      if (currentFilters.email) params.email = currentFilters.email;
      if (currentFilters.walletMin) params.walletMin = currentFilters.walletMin;
      if (currentFilters.walletMax) params.walletMax = currentFilters.walletMax;

      const response = await adminAPI.getBloggerStats(params);
      setUsers(response.users || []);
      setTotal(response.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching bloggers:', err);
      setError(err.message || 'Failed to load bloggers');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  // Initial fetch
  useEffect(() => {
    fetchUsers(page, pageSize, filters);
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced filter fetch
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for filter changes
    debounceTimer.current = setTimeout(() => {
      setPage(1); // Reset to first page when filters change
      fetchUsers(1, pageSize, filters);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Reset Password
  const handleResetPassword = async (userId, name) => {
    if (window.confirm(`Are you sure you want to reset password for ${name} to '12345678'?`)) {
      try {
        await adminAPI.resetUserPassword(userId);
        showSuccess('Password reset successfully');
      } catch (err) {
        showError(err.message || 'Failed to reset password');
      }
    }
  };

  // Toggle account status (Active/Inactive). The server refuses to deactivate a blogger
  // who still has orders in progress or money in their wallet, and tells us why.
  const [statusLoading, setStatusLoading] = useState(null);
  const handleToggleStatus = async (userId, userName, isActive) => {
    if (statusLoading) return;
    const makeActive = !isActive;
    if (!makeActive && !window.confirm(`Make ${userName || 'this blogger'} inactive?\n\nTheir sites, orders and payments will be hidden from every page and they won't be able to log in. Making them active again brings everything back.`)) {
      return;
    }
    setStatusLoading(userId);
    try {
      await adminAPI.updateUser(userId, { is_active: makeActive });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_active: makeActive ? 1 : 0 } : u)));
      showSuccess(`${userName || 'Blogger'} is now ${makeActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      window.alert(err.message || 'Failed to update status');
    } finally {
      setStatusLoading(null);
    }
  };

  // Permanently delete a blogger. The icon only shows for bloggers with no work history,
  // and the server checks again in case something changed since the page loaded.
  const [deletingId, setDeletingId] = useState(null);
  const handleDelete = async (userId, userName, email) => {
    if (deletingId) return;
    if (!window.confirm(`Are you sure you want to permanently delete blogger ${userName || ''} (${email})?\n\nTheir account and websites will be removed. This cannot be undone.`)) {
      return;
    }
    setDeletingId(userId);
    try {
      await adminAPI.deleteBlogger(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTotal(prev => Math.max(0, prev - 1));
      showSuccess(`${userName || 'Blogger'} has been deleted`);
    } catch (err) {
      window.alert(err.message || 'Failed to delete blogger');
      fetchUsers(page, pageSize, filters); // refresh, in case the blogger is no longer deletable
    } finally {
      setDeletingId(null);
    }
  };

  // Why a blogger can't be deleted – loaded on first hover of the grey icon, then cached
  const [deleteReasons, setDeleteReasons] = useState({}); // { [userId]: string[] | 'loading' }
  // Tooltip is fixed to the screen so the table's scroll box can't cut it off
  const [reasonTip, setReasonTip] = useState(null); // { id, right, top, bottom }
  const loadDeleteReasons = async (userId) => {
    if (deleteReasons[userId]) return;
    setDeleteReasons(prev => ({ ...prev, [userId]: 'loading' }));
    try {
      const data = await adminAPI.getBloggerDeleteBlockers(userId);
      setDeleteReasons(prev => ({ ...prev, [userId]: data.blockers?.length ? data.blockers : ['This blogger can now be deleted – refresh the page.'] }));
    } catch (err) {
      setDeleteReasons(prev => ({ ...prev, [userId]: undefined }));
    }
  };

  // Navigate to Performance
  const handlePerformance = (userId) => {
    navigate(`/admin/bloggers/${userId}/performance`);
  };

  // Handle Impersonate
  const handleImpersonate = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to log in as ${userName || 'this user'}?`)) {
      try {
        const data = await adminAPI.impersonateUser(userId);
        impersonateLogin(data);
        showSuccess(`Successfully logged in as ${userName}`);
        
        const routeMap = {
          Admin: '/admin',
          Blogger: '/blogger',
          Manager: '/manager',
          Team: '/teams',
          Writer: '/writer',
          Accountant: '/accountant'
        };
        
        setTimeout(() => {
          window.location.href = routeMap[data.user.role] || '/';
        }, 100);
      } catch (err) {
        showError(err.message || 'Failed to impersonate user');
      }
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ name: '', email: '', walletMin: '', walletMax: '' });
  };

  // Check if any filter is active
  const hasActiveFilters = filters.name || filters.email || filters.walletMin || filters.walletMax;

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Users className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          Bloggers List
        </h2>
        <div className="flex items-center gap-3">
          {/* Animated Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2.5 rounded-xl transition-all duration-300 group ${showFilters
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/20'
              : 'hover:bg-white/10'
              }`}
            title="Toggle Filters"
            style={{ border: showFilters ? '1px solid rgba(107, 240, 255, 0.3)' : '1px solid transparent' }}
          >
            <SlidersHorizontal
              className={`h-5 w-5 transition-all duration-300 ${showFilters
                ? 'rotate-180 text-cyan-400'
                : 'group-hover:rotate-45 group-hover:scale-110'
                }`}
              style={{ color: showFilters ? 'var(--primary-cyan)' : 'var(--text-muted)' }}
            />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => fetchUsers(page, pageSize, filters)}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div
          className="card p-5 rounded-2xl animate-in slide-in-from-top-4 duration-300"
          style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <SlidersHorizontal size={16} style={{ color: 'var(--primary-cyan)' }} />
              Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                <X size={12} />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Name Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                value={filters.name}
                onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                placeholder="Search by name..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30"
                style={{
                  backgroundColor: 'var(--background-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>

            {/* Email Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={e => setFilters(f => ({ ...f, email: e.target.value }))}
                placeholder="Search by email..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30"
                style={{
                  backgroundColor: 'var(--background-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>

            {/* Wallet Min Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Wallet Min</label>
              <input
                type="number"
                value={filters.walletMin}
                onChange={e => setFilters(f => ({ ...f, walletMin: e.target.value }))}
                placeholder="Min balance..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30"
                style={{
                  backgroundColor: 'var(--background-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>

            {/* Wallet Max Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Wallet Max</label>
              <input
                type="number"
                value={filters.walletMax}
                onChange={e => setFilters(f => ({ ...f, walletMax: e.target.value }))}
                placeholder="Max balance..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30"
                style={{
                  backgroundColor: 'var(--background-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
              {filters.name && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)', color: 'var(--primary-cyan)' }}>
                  Name: {filters.name}
                </span>
              )}
              {filters.email && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)', color: 'var(--primary-cyan)' }}>
                  Email: {filters.email}
                </span>
              )}
              {filters.walletMin && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
                  Min: {filters.walletMin}
                </span>
              )}
              {filters.walletMax && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                  Max: {filters.walletMax}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-red-400">{error}</p>
          <button onClick={() => fetchUsers(page, pageSize, filters)} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6BF0FF 0%, #3ED9EB 100%)', color: 'var(--text-main)' }}>
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Results Count Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{users.length}</span> of <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}</span> bloggers
          {hasActiveFilters && (
            <span style={{ color: 'var(--primary-cyan)' }}> (filtered)</span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading bloggers...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background-dark)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Account Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Orders</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pending Orders</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Completed Orders</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Wallet</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Last Login</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Login Counts</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: 'var(--card-background)' }}>
                {users.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-secondary)' }}>{b.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Toggle Switch for Account Status */}
                      <button
                        onClick={() => handleToggleStatus(b.id, b.name, !!b.is_active)}
                        disabled={statusLoading === b.id}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 align-middle"
                        style={{
                          backgroundColor: b.is_active ? '#22c55e' : '#475569',
                          opacity: statusLoading === b.id ? 0.6 : 1
                        }}
                        title={b.is_active ? 'Click to make inactive' : 'Click to make active'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${b.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span
                        className="ml-2 text-xs align-middle"
                        style={{ color: b.is_active ? 'var(--success)' : 'var(--error)' }}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center" style={{ color: 'var(--text-primary)' }}>{b.total_orders || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium decoration-slice underline decoration-wavy decoration-red-500/50" style={{ color: 'var(--text-primary)' }}>{b.pending_orders || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium decoration-slice underline decoration-wavy decoration-green-500/50" style={{ color: 'var(--text-primary)' }}>{b.completed_orders || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" style={{ color: 'var(--success)' }}>
                      {(b.wallet_balance || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-muted)' }}>
                      {b.last_login ? new Date(b.last_login).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                      {b.login_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(b.id, b.name)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                          title="Reset Password (12345678)"
                        >
                          <Lock className="h-4 w-4 text-orange-400 group-hover:text-orange-300" />
                        </button>
                        <button
                          onClick={() => handlePerformance(b.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                          title="View Performance"
                        >
                          <BarChart2 className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
                        </button>
                        <button
                          onClick={() => handleImpersonate(b.id, b.name)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                          title={`Log in as ${b.name || 'this user'}`}
                        >
                          <LogIn className="h-4 w-4 text-purple-400 group-hover:text-purple-300" />
                        </button>
                        {/* Delete: only shown for bloggers who never did any work (e.g. spam signups) */}
                        {b.can_delete ? (
                          <button
                            onClick={() => handleDelete(b.id, b.name, b.email)}
                            disabled={deletingId === b.id}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors group"
                            title={`Delete ${b.name || 'this blogger'}`}
                          >
                            <Trash2 className={`h-4 w-4 text-red-400 group-hover:text-red-300 ${deletingId === b.id ? 'animate-pulse' : ''}`} />
                          </button>
                        ) : (
                          /* Grey, not clickable: hover shows why this blogger can't be deleted */
                          <span
                            className="p-2 rounded-lg cursor-not-allowed inline-flex"
                            onMouseEnter={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setReasonTip({ id: b.id, right: r.right, top: r.top, bottom: r.bottom });
                              loadDeleteReasons(b.id);
                            }}
                            onMouseLeave={() => setReasonTip(null)}
                            aria-label="Delete not available"
                          >
                            <Trash2 className="h-4 w-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                      No bloggers found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[20, 50, 100]}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Why-can't-delete tooltip (above the grey icon, or below it near the top of the screen) */}
      {reasonTip && (
        <div
          className="w-72 px-3 py-2 text-xs leading-relaxed rounded-lg shadow-lg pointer-events-none"
          style={{
            backgroundColor: '#1e293b',
            color: '#ffffff',
            border: '1px solid #334155',
            position: 'fixed',
            zIndex: 1000,
            left: Math.max(8, reasonTip.right - 288),
            ...(reasonTip.top > 180
              ? { top: reasonTip.top - 8, transform: 'translateY(-100%)' }
              : { top: reasonTip.bottom + 8 })
          }}
        >
          <span className="block font-semibold mb-1" style={{ color: '#fca5a5' }}>Can't delete this blogger</span>
          {deleteReasons[reasonTip.id] === 'loading' || !deleteReasons[reasonTip.id]
            ? <span className="block" style={{ color: '#ffffff' }}>Checking…</span>
            : deleteReasons[reasonTip.id].map((r, i) => <span key={i} className="block" style={{ color: '#ffffff' }}>• {r}</span>)}
          <span className="block mt-1" style={{ color: '#cbd5e1' }}>Use the Active/Inactive switch to hide them instead.</span>
        </div>
      )}
    </div>
  );
}
