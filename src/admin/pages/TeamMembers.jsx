import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users2, Filter, RotateCcw, Shield, Key, X, ChevronDown, ChevronUp, UserPlus, LogIn, Wallet, ArrowDownCircle, PlusCircle } from 'lucide-react';
import { Pagination } from '../../components/Pagination.jsx';
import { adminAPI } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const TEAM_ROLES = ['Team', 'Manager', 'Writer', 'Accountant'];
const CREATE_ROLES = ['Manager', 'Writer', 'Blogger', 'Accountant'];
const CLIENT_ROLES = ['Client'];

export function TeamMembers() {
  const navigate = useNavigate();
  const { impersonateLogin } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('team');

  // Shared state
  const [users, setUsers] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ role: 'all', name: '', email: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Password Modal State
  const [passwordModal, setPasswordModal] = useState({ open: false, userId: null, userName: '' });
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ role: '', name: '', email: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Wallet Modal State
  const [walletModal, setWalletModal] = useState({ open: false, userId: null, userName: '', type: 'add', currentBalance: 0 });
  const [walletAmount, setWalletAmount] = useState('');
  const [walletRemarks, setWalletRemarks] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  // Fetch team members from API
  const fetchTeamUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamRes, managerRes, writerRes, accountantRes] = await Promise.all([
        adminAPI.getUsers({ role: 'Team', limit: 100 }),
        adminAPI.getUsers({ role: 'Manager', limit: 100 }),
        adminAPI.getUsers({ role: 'Writer', limit: 100 }),
        adminAPI.getUsers({ role: 'Accountant', limit: 100 })
      ]);

      const allTeamMembers = [
        ...(teamRes.users || []),
        ...(managerRes.users || []),
        ...(writerRes.users || []),
        ...(accountantRes.users || [])
      ];

      setUsers(allTeamMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch client members from API
  const fetchClientUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const clientRes = await adminAPI.getUsers({ role: 'Client', limit: 100 });
      setClientUsers(clientRes.users || []);
    } catch (err) {
      console.error('Error fetching client members:', err);
      setError(err.message || 'Failed to load client members');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamUsers();
    } else {
      fetchClientUsers();
    }
  }, [activeTab, fetchTeamUsers, fetchClientUsers]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter users based on tab
  const currentUsers = activeTab === 'team' ? users : clientUsers;
  const currentFilterRoles = activeTab === 'team' ? TEAM_ROLES : CLIENT_ROLES;

  const rows = useMemo(() => {
    let r = currentUsers;
    if (filters.role !== 'all') r = r.filter(m => m.role === filters.role);
    if (filters.name) r = r.filter(m => (m.name || '').toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.email) r = r.filter(m => (m.email || '').toLowerCase().includes(filters.email.toLowerCase()));
    return r;
  }, [currentUsers, filters]);

  const total = rows.length;
  const pageData = rows.slice((page - 1) * pageSize, page * pageSize);

  // Reset filters
  const resetFilters = () => {
    setFilters({ role: 'all', name: '', email: '' });
    setPage(1);
  };

  // Switch tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetFilters();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Action: Reset password to default
  const handleResetPassword = async (userId, userName) => {
    if (actionLoading) return;
    setActionLoading(userId);
    try {
      await adminAPI.resetUserPassword(userId);
      setSuccessMessage(`Password for ${userName} reset to 12345678`);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Change password (custom)
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setActionLoading(passwordModal.userId);
    try {
      await adminAPI.changeUserPassword(passwordModal.userId, newPassword);
      setSuccessMessage(`Password for ${passwordModal.userName} changed successfully`);
      setPasswordModal({ open: false, userId: null, userName: '' });
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Navigate to permissions page
  const handleOpenPermissions = (userId) => {
    navigate(`/admin/users/${userId}/permissions`);
  };

  // Action: Impersonate user
  const handleImpersonate = async (userId, userName) => {
    if (actionLoading) return;
    if (!window.confirm(`Are you sure you want to log in as ${userName || 'this user'}?`)) return;
    
    setActionLoading(`impersonate-${userId}`);
    try {
      const data = await adminAPI.impersonateUser(userId);
      impersonateLogin(data);
      
      const routeMap = {
        Admin: '/admin',
        Blogger: '/blogger',
        Manager: '/manager',
        Team: '/teams',
        Writer: '/writer',
        Accountant: '/accountant',
        Client: '/client'
      };
      
      // Wait a moment for context to persist, then forcibly navigate
      setTimeout(() => {
        window.location.href = routeMap[data.user.role] || '/';
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to impersonate user');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Toggle account status (Active/Blocked)
  const handleToggleStatus = async (userId, userName, currentStatus) => {
    if (actionLoading) return;
    setActionLoading(`status-${userId}`);
    const newStatus = currentStatus ? 0 : 1; // Toggle: 1 = Active, 0 = Blocked
    try {
      await adminAPI.updateUser(userId, { is_active: newStatus === 1 });
      setSuccessMessage(`${userName} is now ${newStatus === 1 ? 'Active' : 'Blocked'}`);
      // Update local state
      const updateFn = prev => prev.map(u =>
        u.id === userId ? { ...u, is_active: newStatus === 1, status: newStatus } : u
      );
      if (activeTab === 'team') {
        setUsers(updateFn);
      } else {
        setClientUsers(updateFn);
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Create new user
  const handleCreateUser = async (createAnother = false) => {
    const effectiveRole = activeTab === 'client' ? 'Client' : createForm.role;

    if (activeTab === 'team' && !createForm.role) {
      setError('Please select a role');
      return;
    }
    if (!createForm.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!createForm.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setCreateLoading(true);
    try {
      await adminAPI.createUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: effectiveRole
      });
      setSuccessMessage(`${activeTab === 'client' ? 'Client' : 'Team'} member ${createForm.name} created successfully!`);
      if (createAnother) {
        setCreateForm({ role: '', name: '', email: '', password: '' });
      } else {
        setShowCreateModal(false);
        setCreateForm({ role: '', name: '', email: '', password: '' });
      }
      if (activeTab === 'team') {
        fetchTeamUsers();
      } else {
        fetchClientUsers();
      }
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  // Action: Add money to wallet
  const handleWalletAction = async () => {
    if (!walletAmount || isNaN(walletAmount) || parseFloat(walletAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setWalletLoading(true);
    try {
      let result;
      if (walletModal.type === 'add') {
        result = await adminAPI.addManualWalletBalance(walletModal.userId, parseFloat(walletAmount), walletRemarks);
        setSuccessMessage(`$${walletAmount} added to ${walletModal.userName}'s wallet. New balance: $${result.new_balance}`);
      } else {
        result = await adminAPI.withdrawManualWalletBalance(walletModal.userId, parseFloat(walletAmount), walletRemarks);
        setSuccessMessage(`$${walletAmount} withdrawn from ${walletModal.userName}'s wallet. New balance: $${result.new_balance}`);
      }

      // Update local client user balance
      setClientUsers(prev => prev.map(u =>
        u.id === walletModal.userId ? { ...u, wallet_balance: result.new_balance } : u
      ));

      setWalletModal({ open: false, userId: null, userName: '', type: 'add', currentBalance: 0 });
      setWalletAmount('');
      setWalletRemarks('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Wallet operation failed');
    } finally {
      setWalletLoading(false);
    }
  };

  const refreshData = () => {
    if (activeTab === 'team') {
      fetchTeamUsers();
    } else {
      fetchClientUsers();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Users2 className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          {activeTab === 'team' ? 'Team Members' : 'Client Members'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="premium-btn text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 transition-all border-none font-semibold text-sm"
          >
            <UserPlus className="h-4.5 w-4.5" />
            {activeTab === 'team' ? 'Add Team Member' : 'Add Client'}
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 bg-[var(--background-dark)] border border-[var(--border)]">
        <button
          onClick={() => handleTabChange('team')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'team'
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-muted)]'
          }`}
        >
          <Users2 className="h-4 w-4" />
          <span>Team Members</span>
        </button>
        <button
          onClick={() => handleTabChange('client')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'client'
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-muted)]'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Client Members</span>
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <span className="text-green-400">✓</span>
          <p className="text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
        {/* Filter Header */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" style={{ color: 'var(--primary-cyan)' }} />
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Filters</span>
            {(filters.role !== 'all' || filters.name || filters.email) && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--primary-cyan)', color: '#ffffff' }}>
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{total} member(s)</span>
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        </button>

        {/* Filter Content */}
        {filtersExpanded && (
          <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {activeTab === 'team' && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Role</label>
                  <select
                    value={filters.role}
                    onChange={e => { setFilters({ ...filters, role: e.target.value }); setPage(1); }}
                    className="w-full rounded-xl px-3 py-2"
                    style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="all">All Roles</option>
                    {currentFilterRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  value={filters.name}
                  onChange={e => { setFilters({ ...filters, name: e.target.value }); setPage(1); }}
                  placeholder="Search name..."
                  className="w-full rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input
                  value={filters.email}
                  onChange={e => { setFilters({ ...filters, email: e.target.value }); setPage(1); }}
                  placeholder="Search email..."
                  className="w-full rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                  style={{ color: 'var(--error)' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && currentUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading {activeTab === 'team' ? 'team' : 'client'} members...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full min-w-[1100px]">
              <thead style={{ backgroundColor: 'var(--background-dark)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Name</th>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Email</th>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Role</th>
                  {activeTab === 'client' && (
                    <th className="text-center px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Wallet Balance</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Last Login</th>
                  <th className="text-center px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Login Counts</th>
                  <th className="text-left px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Account Status</th>
                  <th className="text-center px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map(m => (
                  <tr key={m.id}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{m.name || 'N/A'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs" style={{
                        backgroundColor: m.role === 'Client' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(107, 240, 255, 0.1)',
                        color: m.role === 'Client' ? '#a855f7' : 'var(--primary-cyan)'
                      }}>
                        {m.role}
                      </span>
                    </td>
                    {activeTab === 'client' && (
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold" style={{ color: '#22c55e' }}>
                          ${parseFloat(m.wallet_balance || 0).toFixed(2)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(m.last_login)}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-medium">{m.login_count || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Toggle Switch for Account Status */}
                      <button
                        onClick={() => handleToggleStatus(m.id, m.name, m.is_active)}
                        disabled={actionLoading === `status-${m.id}`}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        style={{
                          backgroundColor: m.is_active ? '#22c55e' : '#475569'
                        }}
                        title={m.is_active ? 'Click to block' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${m.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span
                        className="ml-2 text-xs"
                        style={{ color: m.is_active ? 'var(--success)' : 'var(--error)' }}
                      >
                        {m.is_active ? 'Active' : 'Blocked'}
                      </span>
                      {m.marketplace_paused && (
                        <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}
                          title="Marketplace account paused after 12 months without an order – reactivate it in Marketplace Clients">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Reset Password Icon */}
                        <button
                          onClick={() => handleResetPassword(m.id, m.name)}
                          disabled={actionLoading === m.id}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                          title="Reset password to 12345678"
                        >
                          <RotateCcw
                            className={`h-4 w-4 ${actionLoading === m.id ? 'animate-spin' : ''}`}
                            style={{ color: 'var(--primary-orange)' }}
                          />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Reset password to 12345678
                          </span>
                        </button>

                        {/* Permissions Icon */}
                        <button
                          onClick={() => handleOpenPermissions(m.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Manage permissions"
                        >
                          <Shield className="h-4 w-4" style={{ color: 'var(--primary-cyan)' }} />
                        </button>

                        {/* Change Password Icon */}
                        <button
                          onClick={() => setPasswordModal({ open: true, userId: m.id, userName: m.name })}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Change password"
                        >
                          <Key className="h-4 w-4" style={{ color: 'var(--success)' }} />
                        </button>

                        {/* Impersonate Icon */}
                        <button
                          onClick={() => handleImpersonate(m.id, m.name)}
                          disabled={actionLoading === `impersonate-${m.id}`}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                          title={`Log in as ${m.name || 'this user'}`}
                        >
                          <LogIn 
                            className={`h-4 w-4 ${actionLoading === `impersonate-${m.id}` ? 'animate-spin' : ''}`} 
                            style={{ color: '#c084fc' }} // Purple-400
                          />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Log in as {m.name || 'user'}
                          </span>
                        </button>

                        {/* Client-only: Add Money */}
                        {activeTab === 'client' && (
                          <>
                            <button
                              onClick={() => setWalletModal({ open: true, userId: m.id, userName: m.name, type: 'add', currentBalance: parseFloat(m.wallet_balance || 0) })}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                              title="Add money to wallet"
                            >
                              <PlusCircle className="h-4 w-4" style={{ color: '#22c55e' }} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Add money
                              </span>
                            </button>

                            <button
                              onClick={() => setWalletModal({ open: true, userId: m.id, userName: m.name, type: 'withdraw', currentBalance: parseFloat(m.wallet_balance || 0) })}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                              title="Withdraw from wallet"
                            >
                              <ArrowDownCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Withdraw money
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'client' ? 8 : 7} className="px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>No members found</td>
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
          pageSizeOptions={[20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Password Change Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Change Password
              </h3>
              <button
                onClick={() => { setPasswordModal({ open: false, userId: null, userName: '' }); setNewPassword(''); }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Set a new password for <strong>{passwordModal.userName}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="premium-input w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={actionLoading === passwordModal.userId}
                className="premium-btn premium-btn-primary"
              >
                {actionLoading === passwordModal.userId ? 'Saving...' : 'Submit'}
              </button>
              <button
                onClick={() => { setPasswordModal({ open: false, userId: null, userName: '' }); setNewPassword(''); }}
                className="premium-btn premium-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Users › Create</p>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {activeTab === 'client' ? 'Add Client Member' : 'Add Team Member'}
                </h3>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm({ role: '', name: '', email: '', password: '' }); }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Form Section */}
            <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--background-app)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                {activeTab === 'client' ? 'Client Member Details' : 'Team Member Details'}
              </p>

              <div className={`grid grid-cols-1 ${activeTab === 'team' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                {/* Role (only for Team tab) */}
                {activeTab === 'team' && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Role<span className="text-red-400">*</span></label>
                    <select
                      value={createForm.role}
                      onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                      className="premium-input w-full"
                    >
                      <option value="">Select an option</option>
                      {CREATE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Name<span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Enter name"
                    className="premium-input w-full"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Email<span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="Enter email"
                    className="premium-input w-full"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Password<span className="text-red-400">*</span></label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="premium-input w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCreateUser(false)}
                disabled={createLoading}
                className="premium-btn premium-btn-primary"
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => handleCreateUser(true)}
                disabled={createLoading}
                className="premium-btn premium-btn-secondary"
              >
                Create & create another
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm({ role: '', name: '', email: '', password: '' }); }}
                className="premium-btn premium-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {walletModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {walletModal.type === 'add' ? '💰 Add Money' : '💸 Withdraw Money'}
              </h3>
              <button
                onClick={() => { setWalletModal({ open: false, userId: null, userName: '', type: 'add', currentBalance: 0 }); setWalletAmount(''); setWalletRemarks(''); }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              {walletModal.type === 'add' ? 'Add balance to' : 'Withdraw balance from'} <strong>{walletModal.userName}</strong>'s wallet
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Current Balance: <span style={{ color: '#22c55e', fontWeight: 600 }}>${walletModal.currentBalance.toFixed(2)}</span>
            </p>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Amount ($)<span className="text-red-400">*</span></label>
              <input
                type="number"
                value={walletAmount}
                onChange={e => setWalletAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
                className="premium-input w-full"
                style={{
                  borderColor: walletModal.type === 'add' ? 'var(--color-success)' : 'var(--color-error)'
                }}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Remarks (optional)</label>
              <input
                type="text"
                value={walletRemarks}
                onChange={e => setWalletRemarks(e.target.value)}
                placeholder="e.g. Manual top-up, Adjustment..."
                className="premium-input w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleWalletAction}
                disabled={walletLoading}
                className="premium-btn text-white"
                style={{ backgroundColor: walletModal.type === 'add' ? 'var(--color-success)' : 'var(--color-error)' }}
              >
                {walletLoading ? 'Processing...' : (walletModal.type === 'add' ? 'Add Money' : 'Withdraw')}
              </button>
              <button
                onClick={() => { setWalletModal({ open: false, userId: null, userName: '', type: 'add', currentBalance: 0 }); setWalletAmount(''); setWalletRemarks(''); }}
                className="premium-btn premium-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
