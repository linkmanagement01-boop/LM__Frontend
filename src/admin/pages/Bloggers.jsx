import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Users, Lock, BarChart2, SlidersHorizontal, X, LogIn, Trash2, Sparkles, Ban, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.jsx';
import { adminAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';

// Filters: name / email / wallet + clean-up filters to find junk accounts
const EMPTY_FILTERS = {
  name: '', email: '', walletMin: '', walletMax: '',
  no_sites: false, older_than_days: '', no_orders: false, no_login_days: '', never_logged_in: false, account_status: ''
};
/** Filters → query params (only the ones that are set) – same params for the list and "select all matching" */
const filterParams = (f) => {
  const p = {};
  if (f.name) p.name = f.name;
  if (f.email) p.email = f.email;
  if (f.walletMin) p.walletMin = f.walletMin;
  if (f.walletMax) p.walletMax = f.walletMax;
  if (f.no_sites) p.no_sites = '1';
  if (f.older_than_days) p.older_than_days = f.older_than_days;
  if (f.no_orders) p.no_orders = '1';
  if (f.no_login_days) p.no_login_days = f.no_login_days;
  if (f.never_logged_in) p.never_logged_in = '1';
  if (f.account_status) p.account_status = f.account_status;
  return p;
};

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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Bulk selection (ids across pages) + the running bulk job
  const [selected, setSelected] = useState(() => new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [bulk, setBulk] = useState(null); // { kind: 'delete'|'deactivate', step: 'confirm'|'running'|'done', done, total, deleted, skipped: [] }

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

      // Add filters if they have values (incl. the clean-up filters)
      Object.assign(params, filterParams(currentFilters));

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
      setSelected(new Set()); // a selection belongs to the filters it was made with
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
    setFilters(EMPTY_FILTERS);
  };

  // Check if any filter is active
  const hasActiveFilters = Object.keys(filterParams(filters)).length > 0;

  // ── Bulk selection & actions ──
  const toggleOne = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pageIds = users.map(u => Number(u.id));
  const pageAllSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const togglePage = () => setSelected(s => { const n = new Set(s); pageIds.forEach(id => (pageAllSelected ? n.delete(id) : n.add(id))); return n; });
  const selectAllMatching = async () => {
    try {
      setSelectingAll(true);
      const d = await adminAPI.getBloggerIds(filterParams(filters));
      setSelected(new Set(d.ids));
      showSuccess(`${d.total.toLocaleString()} bloggers selected`);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Could not select all');
    } finally {
      setSelectingAll(false);
    }
  };
  const runBulk = async (kind) => {
    const ids = [...selected];
    const BATCH = kind === 'delete' ? 100 : 5000;
    const job = { kind, step: 'running', done: 0, total: ids.length, deleted: 0, skipped: [] };
    setBulk({ ...job });
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const part = ids.slice(i, i + BATCH);
        if (kind === 'delete') {
          const d = await adminAPI.bulkDeleteBloggers(part);
          job.deleted += d.deleted || 0;
          job.skipped.push(...(d.skipped || []));
        } else {
          const d = await adminAPI.bulkBloggerStatus(part, 0);
          job.deleted += d.updated || 0;
        }
        job.done = Math.min(ids.length, i + BATCH);
        setBulk({ ...job });
      }
      job.step = 'done';
    } catch (err) {
      job.step = 'done';
      job.error = err.response?.data?.message || err.message || 'Stopped with an error';
    }
    setBulk({ ...job });
    setSelected(new Set());
    fetchUsers(1, pageSize, filters);
    setPage(1);
  };

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
        className={`overflow-hidden transition-all duration-500 ease-in-out ${showFilters ? 'max-h-[1100px] opacity-100' : 'max-h-0 opacity-0'
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

          {/* Clean-up filters: find junk accounts */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Clean-up filters – find junk accounts</h4>
              <button type="button"
                onClick={() => setFilters(f => ({ ...f, no_sites: true, no_orders: true, older_than_days: '30' }))}
                className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 font-semibold"
                style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary-cyan)', border: '1px solid rgba(124, 58, 237, 0.25)' }}
                title="No sites, no orders, account older than 30 days">
                <Sparkles size={13} /> Junk accounts preset
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['no_sites', 'No sites added', 'None added by them and none uploaded under their email'],
                ['no_orders', 'No orders ever', 'Never got a single order line'],
                ['never_logged_in', 'Never logged in', 'No login recorded'],
              ].map(([k, label, hint]) => (
                <label key={k} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer" style={{ backgroundColor: 'var(--background-dark)', border: `1px solid ${filters[k] ? 'var(--primary-cyan)' : 'var(--border)'}` }}>
                  <input type="checkbox" checked={!!filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[var(--primary-cyan)]" />
                  <span><span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span><span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</span></span>
                </label>
              ))}
              {[
                ['older_than_days', 'Account older than', [['', 'Any age'], ['30', '1 month'], ['60', '2 months'], ['90', '3 months'], ['180', '6 months'], ['365', '1 year']]],
                ['no_login_days', 'Not logged in for', [['', 'Any'], ['30', '1 month'], ['60', '2 months'], ['90', '3 months'], ['180', '6 months']]],
                ['account_status', 'Account status', [['', 'Active & inactive'], ['active', 'Active only'], ['inactive', 'Inactive only']]],
              ].map(([k, label, opts]) => (
                <div key={k} className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <select value={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: 'var(--background-dark)', color: 'var(--text-primary)', border: `1px solid ${filters[k] ? 'var(--primary-cyan)' : 'var(--border)'}` }}>
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-2.5" style={{ color: 'var(--text-muted)' }}>
              Login dates were only recorded recently, so most old accounts show no login – use "Not logged in" / "Never logged in" together with "No sites" and "No orders", not on their own.
            </p>
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
              {[
                filters.no_sites && 'No sites',
                filters.no_orders && 'No orders',
                filters.never_logged_in && 'Never logged in',
                filters.older_than_days && `Older than ${filters.older_than_days} days`,
                filters.no_login_days && `No login for ${filters.no_login_days} days`,
                filters.account_status && (filters.account_status === 'active' ? 'Active only' : 'Inactive only')
              ].filter(Boolean).map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary-cyan)' }}>{t}</span>
              ))}
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

      {/* Results Count Bar + bulk selection */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{users.length}</span> of <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}</span> bloggers
          {hasActiveFilters && (
            <span style={{ color: 'var(--primary-cyan)' }}> (filtered)</span>
          )}
          {total > 0 && selected.size < total && (
            <button onClick={selectAllMatching} disabled={selectingAll} className="ml-3 text-sm font-semibold hover:underline disabled:opacity-60" style={{ color: 'var(--primary-cyan)' }}>
              {selectingAll ? 'Selecting…' : `Select all ${total.toLocaleString()} matching`}
            </button>
          )}
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.size.toLocaleString()} selected</span>
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold hover:underline" style={{ color: 'var(--text-muted)' }}>Clear</button>
            <button onClick={() => setBulk({ kind: 'deactivate', step: 'confirm' })} className="text-sm px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Ban size={14} /> Deactivate
            </button>
            <button onClick={() => setBulk({ kind: 'delete', step: 'confirm', typed: '' })} className="text-sm px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-700">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Bulk action pop-up: confirm → progress → result */}
      {bulk && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onMouseDown={() => bulk.step !== 'running' && setBulk(null)}>
          <div onMouseDown={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
            {bulk.step === 'confirm' && (
              <>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  {bulk.kind === 'delete' ? <><AlertTriangle className="h-5 w-5 text-red-500" /> Delete {selected.size.toLocaleString()} bloggers?</> : <><Ban className="h-5 w-5" /> Deactivate {selected.size.toLocaleString()} bloggers?</>}
                </h3>
                {bulk.kind === 'delete' ? (
                  <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p>This <b>permanently deletes</b> these accounts – it can't be undone.</p>
                    <p>Every blogger is checked first: anyone with orders, wallet money, payouts or sites used in orders is <b>skipped</b> and listed, never deleted.</p>
                    <label className="block pt-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Type DELETE to confirm</label>
                    <input autoFocus value={bulk.typed || ''} onChange={e => setBulk(b => ({ ...b, typed: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: 'var(--background-dark)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>They won't be able to log in and their sites stay hidden. You can switch any of them back on later.</p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setBulk(null)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                  <button disabled={bulk.kind === 'delete' && bulk.typed !== 'DELETE'} onClick={() => runBulk(bulk.kind)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 ${bulk.kind === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}>
                    {bulk.kind === 'delete' ? 'Delete permanently' : 'Deactivate'}
                  </button>
                </div>
              </>
            )}
            {bulk.step === 'running' && (
              <>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Loader2 className="h-5 w-5 animate-spin" /> {bulk.kind === 'delete' ? 'Deleting…' : 'Deactivating…'}</h3>
                <div className="mt-4 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--background-dark)' }}>
                  <div className="h-full bg-[var(--primary-cyan)] transition-all" style={{ width: `${bulk.total ? Math.round((bulk.done / bulk.total) * 100) : 0}%` }} />
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {bulk.done.toLocaleString()} of {bulk.total.toLocaleString()} checked · {bulk.deleted.toLocaleString()} {bulk.kind === 'delete' ? 'deleted' : 'deactivated'}{bulk.kind === 'delete' ? ` · ${bulk.skipped.length} skipped` : ''}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Keep this tab open until it finishes.</p>
              </>
            )}
            {bulk.step === 'done' && (
              <>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{bulk.error ? 'Stopped' : 'Done'}</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <b>{bulk.deleted.toLocaleString()}</b> blogger{bulk.deleted === 1 ? '' : 's'} {bulk.kind === 'delete' ? 'deleted' : 'deactivated'}
                  {bulk.kind === 'delete' && <> · <b>{bulk.skipped.length}</b> skipped</>} (of {bulk.done.toLocaleString()} checked).
                </p>
                {bulk.error && <p className="mt-2 text-sm text-red-500">{bulk.error} – the rest were not touched; you can run it again.</p>}
                {bulk.skipped.length > 0 && (
                  <div className="mt-3 max-h-56 overflow-y-auto rounded-lg text-xs" style={{ border: '1px solid var(--border)' }}>
                    {bulk.skipped.slice(0, 100).map(s => (
                      <div key={s.id} className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <b style={{ color: 'var(--text-primary)' }}>{s.name || 'Blogger'}</b> <span style={{ color: 'var(--text-muted)' }}>{s.email}</span>
                        <div style={{ color: 'var(--text-secondary)' }}>{s.reason}</div>
                      </div>
                    ))}
                    {bulk.skipped.length > 100 && <div className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>…and {bulk.skipped.length - 100} more</div>}
                  </div>
                )}
                <div className="mt-5 flex justify-end">
                  <button onClick={() => setBulk(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--primary-cyan)]">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                  <th className="pl-6 pr-2 py-4 w-8">
                    <input type="checkbox" checked={pageAllSelected} onChange={togglePage} title="Select this page" className="h-4 w-4 accent-[var(--primary-cyan)] cursor-pointer" />
                  </th>
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
                  <tr key={b.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--border)', backgroundColor: selected.has(Number(b.id)) ? 'rgba(124, 58, 237, 0.06)' : undefined }}>
                    <td className="pl-6 pr-2 py-4">
                      <input type="checkbox" checked={selected.has(Number(b.id))} onChange={() => toggleOne(Number(b.id))} className="h-4 w-4 accent-[var(--primary-cyan)] cursor-pointer" />
                    </td>
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
                    <td colSpan={11} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
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
