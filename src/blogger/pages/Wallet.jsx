import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Wallet as WalletIcon, ArrowDownToLine, Search, Calendar, Filter } from 'lucide-react';
import { Pagination } from '../../components/Pagination.jsx';
import { bloggerAPI } from '../../lib/api';
import { TransactionsTable } from '../components';

/**
 * Wallet Page - Displays blogger's wallet, transactions, and withdrawal functionality
 * Integrated with backend API for real data
 */
export function Wallet() {
  // State for data
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });

  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch wallet data (includes wallet_history with root_domain)
      const walletResponse = await bloggerAPI.getWallet();

      // Extract wallet data - API returns { wallet: {...}, wallet_history: [...] }
      setWallet(walletResponse.wallet || walletResponse);
      // Use wallet_history directly from API (has root_domain, credit_debit, date)
      setWithdrawals(walletResponse.wallet_history || []);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Use wallet_history directly (already has: id, amount, root_domain, type, credit_debit, date)
  const allTransactions = useMemo(() => {
    return withdrawals.sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
  }, [withdrawals]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    // Filter by search (search ID, root_domain, or type)
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(tx =>
        String(tx.id).toLowerCase().includes(search) ||
        (tx.root_domain || '').toLowerCase().includes(search) ||
        (tx.type || '').toLowerCase().includes(search)
      );
    }

    // Filter by date range
    if (filters.startDate) {
      result = result.filter(tx => new Date(tx.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      result = result.filter(tx => new Date(tx.date) <= new Date(filters.endDate));
    }

    return result;
  }, [allTransactions, filters]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Reset filters
  const handleResetFilters = () => {
    setFilters({ search: '', startDate: '', endDate: '' });
    setPage(1);
  };

  // Use current_balance (unapproved credits) as the main balance display
  const currentBalance = parseFloat(wallet?.current_balance || 0);

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <WalletIcon className="h-8 w-8" />
            </div>
            Wallet
          </h1>
          <p className="text-[var(--text-muted)] mt-2 ml-1">Track your earnings and withdrawal history.</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={fetchWalletData}
            disabled={loading}
            className="p-2.5 rounded-xl hover:bg-[var(--card-background)] border border-transparent hover:border-[var(--border)] transition-all shadow-sm hover:shadow text-[var(--text-muted)]"
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/blogger/request-withdrawal"
            className="premium-btn premium-btn-accent shadow-lg shadow-violet-500/20"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Request Withdrawal
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 flex items-center justify-between animate-slideUp">
          <div className="flex items-center gap-3 text-[var(--error)]">
            <div className="h-2 w-2 rounded-full bg-[var(--error)] animate-pulse"></div>
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={fetchWalletData}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--error)]/10 hover:bg-[var(--error)]/20 text-[var(--error)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Balance Card - Featured */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 premium-card p-6 bg-gradient-to-br from-[var(--card-background)] to-[var(--surface-muted)] border-[var(--color-primary)]/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <WalletIcon size={80} />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Available Balance</h3>
          <div className="text-4xl font-bold text-[var(--text-main)] mb-1 flex items-baseline">
            <span className="text-xl mr-1 text-[var(--text-muted)]">$</span>
            {currentBalance.toFixed(2)}
          </div>
          <div className="text-xs text-[var(--color-primary)] font-medium bg-[var(--color-primary)]/5 inline-block px-2 py-1 rounded-md border border-[var(--color-primary)]/10">
            Ready for Payout
          </div>
        </div>

        {/* Could add more stats cards here like "Total Earned", "Pending Withdrawals" if data available */}
      </div>

      {/* Filters Section */}
      <div className="premium-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold flex items-center gap-2 text-[var(--text-main)]">
            <Filter className="h-4 w-4 text-[var(--color-primary)]" />
            Filter Transactions
          </div>
          {(filters.search || filters.startDate || filters.endDate) && (
             <button
              className="text-xs font-bold uppercase tracking-wider text-[var(--error)] hover:bg-[var(--error)]/10 px-2 py-1 rounded transition-colors"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              <Search className="h-3 w-3 inline mr-1 mb-0.5" /> Search
            </label>
            <input
              type="text"
              placeholder="Order ID..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="premium-input"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              <Calendar className="h-3 w-3 inline mr-1 mb-0.5" /> From
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPage(1);
              }}
              className="premium-input"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              <Calendar className="h-3 w-3 inline mr-1 mb-0.5" /> To
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPage(1);
              }}
              className="premium-input"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-sm font-medium text-[var(--text-muted)]">
          Found <span className="text-[var(--text-main)] font-bold">{filteredTransactions.length}</span> transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionsTable
        transactions={paginatedTransactions}
        loading={loading && allTransactions.length === 0}
      />

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredTransactions.length}
            pageSizeOptions={[20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
