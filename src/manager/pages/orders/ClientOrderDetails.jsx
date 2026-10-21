import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { managerAPI } from '../../../lib/api';
import { ArrowLeft, Globe, Send, Save, AlertCircle, CheckCircle, Edit, Clock, Package, Link2, FileText, Users, Info, ExternalLink, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'amber' },
  sent_to_writer: { label: 'Sent to Writer', color: 'blue' },
  writer_approved: { label: 'Writer Approved', color: 'indigo' },
  blogger_approved: { label: 'Blogger Approved', color: 'purple' },
  manager_processing: { label: 'Processing', color: 'blue' },
  pushed_to_blogger: { label: 'Pushed to Blogger', color: 'purple' },
  completed: { label: 'Completed', color: 'emerald' },
};

export const ClientOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  // Writer assignment state
  const [writers, setWriters] = useState([]);
  const [selectedWriter, setSelectedWriter] = useState('');
  const [writerInstructions, setWriterInstructions] = useState('');
  const [delegating, setDelegating] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await managerAPI.getClientOrderDetails(id);
        setOrder(data.order);
        setDetails(data.details || []);
        setManagerNotes(data.order?.manager_notes || '');

        // Fetch writers if the order is delegated and pending review
        if (!data.order.fill_details && data.order.status === 'pending_review') {
          const writersData = await managerAPI.getWriters();
          setWriters(writersData.users || []);
        }
      } catch (err) {
        console.error('Failed to load:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleFieldChange = (detailId, field, value) => {
    setDetails(details.map(d => d.id === detailId ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await managerAPI.updateClientOrder(id, {
        manager_notes: managerNotes,
        details: details.map(d => ({
          id: d.id,
          target_url: d.target_url,
          anchor_text: d.anchor_text,
          article_title: d.article_title,
          doc_url: d.doc_url,
          post_url: d.post_url,
          insert_after: d.insert_after,
          insert_statement: d.insert_statement,
          note: d.note
        }))
      });
      setSuccess('Changes saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToBlogger = async () => {
    if (!confirm('Push this order to bloggers? This will create standard order processes and assign tasks to site owners.')) return;

    try {
      setPushing(true);
      setError('');
      
      let result;
      if (isDelegated && isWriterApproved) {
        result = await managerAPI.pushToBloggers(order.linked_new_order_id, sendEmail);
        setSuccess('Order successfully approved and pushed to bloggers!');
      } else {
        result = await managerAPI.pushClientOrderToBlogger(id, sendEmail);
        setSuccess(`Order pushed to bloggers! ${result.pushed_count} tasks created. Order ID: ${result.new_order_id}`);
      }

      // Refresh order
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to push to blogger');
    } finally {
      setPushing(false);
    }
  };

  const handleSendToWriter = async () => {
    if (!selectedWriter) {
      setError('Please select a writer');
      return;
    }

    try {
      setDelegating(true);
      setError('');
      await managerAPI.sendClientOrderToWriter(id, selectedWriter, writerInstructions);
      setSuccess('Client order successfully delegated to writer!');
      
      // Refresh order
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to send order to writer');
    } finally {
      setDelegating(false);
    }
  };

  const handleReturnToWriter = async () => {
    const reason = prompt('Enter reason for returning to writer:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Please provide a reason.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await managerAPI.returnToWriter(order.linked_new_order_id, reason);
      setSuccess('Order returned to writer for revision');
      
      // Refresh order
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to return to writer');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveBloggerSubmission = async (processDetailId) => {
    if (!window.confirm('Are you sure you want to approve this live link and credit the blogger?')) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await managerAPI.finalizeFromBlogger(processDetailId);
      setSuccess('Blogger submission approved and credited!');
      
      // Refresh order data
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to approve blogger submission');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectBloggerSubmission = async (processDetailId) => {
    const reason = prompt('Enter rejection reason for blogger:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Please provide a reason.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await managerAPI.rejectBloggerSubmission(processDetailId, reason.trim());
      setSuccess('Blogger submission rejected and sent back.');
      
      // Refresh order data
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to reject blogger submission');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectClientOrder = async () => {
    const reason = prompt('Enter rejection reason (this will be shown to the client and their wallet will be refunded):');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Please provide a reason.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await managerAPI.rejectClientOrder(id, reason.trim());
      setSuccess('Order rejected and client wallet refunded successfully!');
      
      // Refresh order data
      const data = await managerAPI.getClientOrderDetails(id);
      setOrder(data.order);
      setDetails(data.details || []);
    } catch (err) {
      setError(err.message || 'Failed to reject client order');
    } finally {
      setSaving(false);
    }
  };

  const isGuestPost = order && (order.order_type || '').toLowerCase().includes('guest');
  const isDelegated = order && !order.fill_details;
  const isWriterApproved = order && order.status === 'sent_to_writer' && order.linked_process_status === 4;
  const isSentToWriter = order && order.status === 'sent_to_writer' && order.linked_process_status === 3;
  const isBloggerApproved = order && (
    order.status === 'pushed_to_blogger' || 
    order.status === 'completed' || 
    (order.status === 'sent_to_writer' && order.linked_process_status === 5)
  );

  const canEdit = order && (
    (!isDelegated && order.status !== 'pushed_to_blogger' && order.status !== 'completed') ||
    (isDelegated && isWriterApproved)
  );

  const canPush = canEdit;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="premium-card p-8 animate-pulse">
            <div className="h-6 bg-[var(--background-dark)] rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-[var(--background-dark)] rounded w-1/2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="premium-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Order not found</p>
        </div>
      </Layout>
    );
  }

  const getDisplayStatus = (o) => {
    if (o.status === 'sent_to_writer') {
      if (o.linked_process_status === 4) return 'writer_approved';
      if (o.linked_process_status === 5) return 'blogger_approved';
      return 'sent_to_writer';
    }
    if (o.status === 'pushed_to_blogger') return 'blogger_approved';
    return o.status;
  };

  const displayStatus = getDisplayStatus(order);
  const cfg = STATUS_CONFIG[displayStatus] || { label: displayStatus, color: 'gray' };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/manager/client-orders')} className="p-2 rounded-xl hover:bg-[var(--background-dark)] border border-transparent hover:border-[var(--border)] transition-all">
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Client Order {order.order_number || `#${order.id}`}
              </h1>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20`}>
                {cfg.label}
              </span>
              {order.fill_details ? (
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold tracking-wider">Self-Filled</span>
              ) : (
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider">Delegated</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              From: <span className="font-medium text-[var(--text-secondary)]">{order.client_name_user}</span> • {order.client_email} • {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="premium-card p-4 border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="premium-card p-4 border-green-500/20 bg-green-500/10 text-green-400 flex items-center gap-3">
            <CheckCircle className="h-5 w-5" /><span>{success}</span>
          </div>
        )}

        {/* Action Banners */}
        {isDelegated && isSentToWriter && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-400">Order is currently with a writer</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Assigned Writer: <strong className="text-[var(--text-secondary)]">{order.assigned_writer_name || `ID #${order.assigned_writer_id}`}</strong>
              </p>
            </div>
          </div>
        )}

        {isDelegated && isWriterApproved && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-400">Writer Approved - Review and push to blogger</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Submitted by: <strong className="text-[var(--text-secondary)]">{order.assigned_writer_name}</strong>. Review details below, save changes, and push to blogger.
                </p>
              </div>
            </div>
            <button
              onClick={handleReturnToWriter}
              disabled={saving}
              className="premium-btn border border-red-500/30 hover:bg-red-500/10 px-4 py-2 text-xs text-red-400 font-medium"
            >
              Return to Writer for Revision
            </button>
          </div>
        )}

        {/* Order Summary */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Order Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-[var(--background-dark)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Type</p>
              <p className="font-semibold text-[var(--text-primary)]">{order.order_type}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--background-dark)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Sites</p>
              <p className="font-semibold text-[var(--text-primary)]">{order.no_of_links}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--background-dark)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Package</p>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{order.order_package || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--background-dark)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
              <p className="font-semibold text-[var(--text-primary)] text-sm">{order.category || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--background-dark)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Mode</p>
              <p className="font-semibold text-[var(--text-primary)]">{order.fill_details ? 'Self-Filled' : 'Delegated'}</p>
            </div>
          </div>

          {order.notes && (
            <div className="p-3 rounded-lg bg-[var(--background-dark)] border border-[var(--border)] mb-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Client Notes</p>
              <p className="text-sm text-[var(--text-primary)]">{order.notes}</p>
            </div>
          )}

          {/* Manager Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Manager Notes</label>
            <textarea
              className="premium-input w-full min-h-[80px]"
              rows={3}
              placeholder="Add your review notes..."
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              disabled={!canPush}
            />
          </div>
        </div>

        {/* Site Details - Editable */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <Edit size={18} className="text-purple-400" />
            Site Details
            <span className="text-[var(--text-muted)] font-normal text-sm">({details.length} sites)</span>
            {canPush && <span className="text-xs text-amber-400 ml-auto">Fields are editable</span>}
          </h2>

          <div className="space-y-6">
            {details.map((d, i) => (
              <div key={d.id} className="rounded-xl p-5 bg-[var(--background-dark)] border border-purple-500/20 relative">
                {/* Site Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 flex items-center justify-center text-purple-400 font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-purple-400 flex items-center gap-2">
                      <Globe size={14} /> {d.root_domain || `Site #${d.site_id}`}
                    </h3>
                    <div className="text-xs text-[var(--text-muted)] flex gap-3 mt-0.5 flex-wrap items-center">
                      <span>DA: {d.da || '-'}</span>
                      <span>DR: {d.dr || '-'}</span>
                      <span>Traffic: {d.traffic?.toLocaleString() || '-'}</span>
                      <span className="text-emerald-400">
                        ${isGuestPost ? (d.gp_price || 0) : (d.niche_edit_price || 0)}
                      </span>
                      <span className={`text-xs px-1.5 py-0 rounded ${d.website_status === 'Approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {d.website_status || '-'}
                      </span>
                      {d.fill_details ? (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold tracking-wider">Self-Filled</span>
                      ) : (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider">Delegated</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Marketplace: who provides the content + the client's writing brief */}
                {(d.content_by || d.brief) && (
                  <div className="mb-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                      {d.content_by === 'us' ? 'Content: write it for the client' : d.content_by === 'client' ? 'Content: provided by the client' : 'Client details'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[var(--text-secondary)]">
                      {d.content_by === 'client' && d.doc_url && (
                        <p className="md:col-span-2">Content file / doc: <a href={d.doc_url} target="_blank" rel="noreferrer" className="text-purple-400 underline break-all">{d.doc_url}</a></p>
                      )}
                      {d.brief?.word_count && <p>Word count: <b className="text-[var(--text-primary)]">{d.brief.word_count}</b> ({d.brief.language || 'English'})</p>}
                      {d.brief?.category && <p>Category: <b className="text-[var(--text-primary)]">{d.brief.category}</b></p>}
                      {d.brief?.keywords && <p>Keywords: <b className="text-[var(--text-primary)]">{d.brief.keywords}</b></p>}
                      {d.brief?.target_country && <p>Target audience: <b className="text-[var(--text-primary)]">{d.brief.target_country}</b></p>}
                      {d.brief?.title_suggestion && <p className="md:col-span-2">Title suggestion: <b className="text-[var(--text-primary)]">{d.brief.title_suggestion}</b></p>}
                      {d.brief?.reference_url && (
                        <p className="md:col-span-2">Reference: <a href={d.brief.reference_url} target="_blank" rel="noreferrer" className="text-purple-400 underline break-all">{d.brief.reference_url}</a></p>
                      )}
                    </div>
                  </div>
                )}

                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                      Target URL <span className="text-red-400">*</span>
                    </label>
                    <input className="premium-input w-full" placeholder="https://example.com/target"
                      value={d.target_url || ''} onChange={(e) => handleFieldChange(d.id, 'target_url', e.target.value)}
                      disabled={!canPush} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                      Anchor Text <span className="text-red-400">*</span>
                    </label>
                    <input className="premium-input w-full" placeholder="Anchor text"
                      value={d.anchor_text || ''} onChange={(e) => handleFieldChange(d.id, 'anchor_text', e.target.value)}
                      disabled={!canPush} />
                  </div>

                  {/* Show detailed inputs for all orders so managers can always fill them */}
                  {isGuestPost ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Article Title</label>
                        <input className="premium-input w-full" placeholder="Title"
                          value={d.article_title || ''} onChange={(e) => handleFieldChange(d.id, 'article_title', e.target.value)}
                          disabled={!canPush} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                          <Link2 className="h-3 w-3 inline mr-1" /> Doc URL
                        </label>
                        <input className="premium-input w-full" placeholder="https://docs.google.com/..."
                          value={d.doc_url || ''} onChange={(e) => handleFieldChange(d.id, 'doc_url', e.target.value)}
                          disabled={!canPush} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Post URL</label>
                        <input className="premium-input w-full" placeholder="https://blog.com/existing-post"
                          value={d.post_url || ''} onChange={(e) => handleFieldChange(d.id, 'post_url', e.target.value)}
                          disabled={!canPush} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Insert After</label>
                        <input className="premium-input w-full" placeholder="Text to insert after..."
                          value={d.insert_after || ''} onChange={(e) => handleFieldChange(d.id, 'insert_after', e.target.value)}
                          disabled={!canPush} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Insert Statement</label>
                        <textarea className="premium-input w-full min-h-[80px]" rows={3} placeholder="Statement..."
                          value={d.insert_statement || ''} onChange={(e) => handleFieldChange(d.id, 'insert_statement', e.target.value)}
                          disabled={!canPush} />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Note</label>
                    <textarea className="premium-input w-full" rows={2} placeholder="Note..."
                      value={d.note || ''} onChange={(e) => handleFieldChange(d.id, 'note', e.target.value)}
                      disabled={!canPush} />
                  </div>

                  {d.process_detail_status && d.process_detail_status >= 5 && (
                    <div className="md:col-span-2 border-t border-[var(--border)] pt-4 mt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                          Blogger Workflow Status
                        </span>
                        {d.process_detail_status === 5 && (
                          <span className="premium-badge bg-blue-500/10 text-blue-400 border-blue-500/20">
                            Sent to Blogger (Awaiting Submission)
                          </span>
                        )}
                        {d.process_detail_status === 7 && (
                          <span className="premium-badge bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                            Pending Manager Approval
                          </span>
                        )}
                        {d.process_detail_status === 8 && (
                          <span className="premium-badge bg-green-500/10 text-green-400 border-green-500/20">
                            Completed & Credited
                          </span>
                        )}
                        {d.process_detail_status === 11 && (
                          <span className="premium-badge bg-red-500/10 text-red-400 border-red-500/20">
                            Blogger Submission Rejected
                          </span>
                        )}
                        {d.process_detail_status === 12 && (
                          <span className="premium-badge bg-red-500/10 text-red-400 border-red-500/20">
                            Blogger Rejected Task
                          </span>
                        )}
                      </div>

                      {d.submit_url && (
                        <div className="p-3 rounded-lg bg-[var(--background-dark)] border border-[var(--border)] flex items-center justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider mb-1">Submitted Live Link:</span>
                            <a
                              href={d.submit_url.startsWith('http') ? d.submit_url : `https://${d.submit_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-[var(--primary-cyan)] hover:underline flex items-center gap-1.5 truncate"
                              title={d.submit_url}
                            >
                              <ExternalLink className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{d.submit_url}</span>
                            </a>
                          </div>
                          
                          {d.process_detail_status === 7 && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveBloggerSubmission(d.process_detail_id)}
                                className="premium-btn px-3 py-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 flex items-center gap-1 font-semibold"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectBloggerSubmission(d.process_detail_id)}
                                className="premium-btn px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1 font-semibold"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {d.process_detail_status === 11 && d.process_detail_reject_reason && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-red-400">
                          <strong>Rejection Reason:</strong> {d.process_detail_reject_reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delegation to Writer UI */}
        {isDelegated && order.status === 'pending_review' && (
          <div className="premium-card p-6 border-purple-500/20 bg-purple-500/5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
              <Users size={18} className="text-purple-400" />
              Delegate Order to Writer
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                  Select Writer <span className="text-red-400">*</span>
                </label>
                <select
                  className="premium-input w-full"
                  value={selectedWriter}
                  onChange={(e) => setSelectedWriter(e.target.value)}
                  disabled={delegating}
                >
                  <option value="">-- Choose Writer --</option>
                  {writers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.username} ({w.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                  Instructions for Writer
                </label>
                <textarea
                  className="premium-input w-full min-h-[100px]"
                  rows={3}
                  placeholder="Enter detailed instructions for the writer..."
                  value={writerInstructions}
                  onChange={(e) => setWriterInstructions(e.target.value)}
                  disabled={delegating}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSendToWriter}
                  disabled={delegating || !selectedWriter}
                  className="premium-btn px-8 py-3 flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/30"
                >
                  {delegating ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/30 border-t-white"></div> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send to Writer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {canPush && (
          <>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
              <Info className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-purple-100/80">
                <strong>Push to Blogger:</strong> This will create a standard order and assign each site to its owner (blogger). You can edit any missing details before pushing.
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-[var(--border)] pt-6">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--border)] hover:border-purple-500/30 transition-colors">
                <div className="relative">
                  <input type="checkbox" className="hidden" checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)} />
                  <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${sendEmail ? 'bg-purple-500/20 border border-purple-500' : 'bg-[var(--background-dark)] border border-[var(--border)]'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full shadow transition-transform ${sendEmail ? 'transform translate-x-4 bg-purple-500' : 'bg-[var(--text-muted)]'}`}></div>
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Send Email to Bloggers</span>
              </label>

              <div className="flex gap-3">
                <button onClick={handleRejectClientOrder} disabled={saving || pushing}
                  className="premium-btn border border-red-500/30 text-red-400 hover:bg-red-500/10 px-6 py-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> Reject & Refund
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="premium-btn border border-[var(--border)] hover:bg-[var(--background-dark)] px-6 py-3 flex items-center gap-2">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400/30 border-t-purple-400"></div> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Changes</>
                  )}
                </button>
                <button onClick={handlePushToBlogger} disabled={pushing}
                  className="premium-btn px-8 py-3 flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/30">
                  {pushing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/30 border-t-white"></div> Pushing...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Push to Blogger</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Already pushed/completed info */}
        {isBloggerApproved && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {order.status === 'completed' ? 'This client order has been fully completed!' : 'This order has been pushed to bloggers'}
              </p>
              {order.linked_new_order_id && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Linked Order ID: #{order.linked_new_order_id}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientOrderDetails;
