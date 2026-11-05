import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, FileText, Eye, Download } from 'lucide-react';
import { bloggerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export function InvoiceList() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [sortDir, setSortDir] = useState('desc');
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bloggerAPI.getInvoices({ page, limit: pageSize });
      setInvoices(response.invoices || []);
      setPagination(response.pagination || { total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Sort invoices by amount
  const sortedInvoices = [...invoices].sort((a, b) =>
    sortDir === 'asc' ? (a.amount || 0) - (b.amount || 0) : (b.amount || 0) - (a.amount || 0)
  );

  // Calculate showing range
  const showingFrom = pagination.total > 0 ? (page - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(page * pageSize, pagination.total);

  // Format status
  const getStatusBadge = (status) => {
    if (status === 1 || status === '1') {
      return { text: 'Completed', color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.1)' };
    }
    if (status === 0 || status === '0') {
      return { text: 'Pending', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    return { text: 'Processing', color: 'var(--text-muted)', bg: 'var(--background-dark)' };
  };

  // Handle PDF download
  const handleDownload = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      const blob = await bloggerAPI.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      showError('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          Invoice List
        </h2>
        <button
          onClick={fetchInvoices}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p className="text-red-400">{error}</p>
          <button onClick={fetchInvoices} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', color: '#FFFFFF' }}>
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Showing X to Y of Z */}
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing {showingFrom} to {showingTo} of {pagination.total} results
      </div>

      {/* Loading State */}
      {loading && invoices.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading invoices...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="premium-card overflow-hidden p-0" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--background-secondary)' }}>
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Order Id</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Invoice No</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Payment Method</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--primary-cyan)] transition-colors" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                    Amount {sortDir === 'asc' ? '▲' : '▼'}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Datetime</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
              {sortedInvoices.map((inv) => {
                const statusBadge = getStatusBadge(inv.status);
                return (
                  <tr key={inv.id} className="hover:bg-[var(--card-hover)] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--primary-cyan)' }}>
                      {inv.order_id || `#${inv.id}`}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {inv.invoice_number && inv.invoice_number !== '-' ? inv.invoice_number : `LM-${inv.id}`}
                    </td>

                    {/* Payment Method Column */}
                    <td className="px-4 py-3.5 text-sm">
                      {(inv.payment_method === 'paypal' || inv.payment_method === 'paypal_id') ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-600 mb-1 border border-violet-500/20">
                            Paypal ID
                          </span>
                          <div className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-secondary)' }} title={inv.paypal_email || ''}>
                            {inv.paypal_email || 'N/A'}
                          </div>
                        </div>
                      ) : (inv.payment_method === 'bank_transfer' || inv.payment_method === 'bank') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500 mb-1 border border-green-500/20">
                            Bank Details
                          </span>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Bank Type:</span> {inv.bank_details?.bank_type || 'N/A'}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Acc No:</span> {inv.bank_details?.account_number || 'N/A'}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Beneficiary:</span> {inv.bank_details?.beneficiary_name || 'N/A'}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>IFSC:</span> {inv.bank_details?.ifsc_code || 'N/A'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{inv.payment_method || 'N/A'}</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      ${inv.amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {inv.paid_date ? (
                        <span className="text-green-500 font-medium">
                          {new Date(inv.paid_date).toLocaleString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: 'numeric'
                          })}
                        </span>
                      ) : inv.created_at ? (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {new Date(inv.created_at).toLocaleString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: 'numeric'
                          })}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.color}30` }}
                      >
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/blogger/payments/invoices/${inv.id}`)}
                        className="p-2 rounded-lg hover:bg-[var(--primary-cyan)]/10 transition-colors inline-block group"
                        title="View Invoice"
                      >
                        <FileText className="h-5 w-5 text-violet-500 group-hover:text-violet-700 transition-colors" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
