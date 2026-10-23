import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { managerAPI } from '../../../lib/api';
import {
  ArrowLeft, Globe, Send, Save, AlertCircle, CheckCircle, Clock, Package, Link2, FileText, Users, Info,
  ExternalLink, XCircle, Store, PenLine, Upload, Mail, CalendarDays, DollarSign
} from 'lucide-react';
import { Badge } from './ClientOrders';

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'amber' },
  sent_to_writer: { label: 'With Writer', color: 'blue' },
  writer_approved: { label: 'Writer Approved', color: 'indigo' },
  blogger_approved: { label: 'Pushed to Blogger', color: 'purple' },
  manager_processing: { label: 'Processing', color: 'blue' },
  pushed_to_blogger: { label: 'Pushed to Blogger', color: 'purple' },
  completed: { label: 'Completed', color: 'emerald' },
  rejected: { label: 'Rejected & Refunded', color: 'red' }
};

// Blogger workflow per site (new_order_process_details.status)
const SITE_STATUS = {
  5: ['Sent to Blogger – awaiting submission', 'blue'],
  7: ['Pending your approval', 'amber'],
  8: ['Completed & credited', 'emerald'],
  11: ['Blogger submission rejected', 'red'],
  12: ['Blogger rejected the task', 'red']
};

// Same choices as the marketplace pop-up
const WORD_COUNTS = [500, 750, 1000];
const CATEGORIES = ['Business', 'Technology', 'Health', 'Finance', 'Marketing', 'Lifestyle', 'Travel', 'Education', 'Real Estate',
  'Home & Garden', 'Fashion & Beauty', 'Food & Drink', 'Sports', 'Entertainment', 'Automotive', 'Crypto', 'Legal', 'Other'];
const COUNTRIES = ['Worldwide', 'United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Spain', 'Italy',
  'Netherlands', 'United Arab Emirates', 'Singapore', 'South Africa', 'New Zealand', 'Other'];

const parseBrief = (b) => {
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b) || {}; } catch { return {}; } }
  return b;
};

function Field({ label, required, children, className = '', hint }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

// Text input with an "open" button for URLs
function UrlInput({ value, onChange, disabled, placeholder }) {
  const ok = /^https?:\/\//i.test(String(value || '').trim());
  return (
    <div className="flex gap-2">
      <input className="premium-input w-full" placeholder={placeholder} value={value || ''} onChange={onChange} disabled={disabled} />
      {ok && (
        <a href={value.trim()} target="_blank" rel="noreferrer" title="Open link"
          className="shrink-0 h-[42px] w-[42px] grid place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary-cyan)] hover:border-[var(--primary-cyan)]">
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, tone = 'gray', children, right }) {
  const tones = {
    gray: 'text-[var(--text-secondary)]', blue: 'text-blue-700', teal: 'text-teal-700', violet: 'text-violet-700', amber: 'text-amber-700'
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${tones[tone]}`}>{Icon && <Icon size={14} />}{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

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

  const loadOrder = async () => {
    const data = await managerAPI.getClientOrderDetails(id);
    setOrder(data.order);
    setDetails((data.details || []).map(d => ({ ...d, brief: parseBrief(d.brief) })));
    setManagerNotes(data.order?.manager_notes || '');
    return data;
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await loadOrder();
        // Writers list for delegated orders still in review
        if (!/guest/i.test(data.order.order_type || '') && data.order.status === 'pending_review') {
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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = (detailId, field, value) => {
    setDetails(prev => prev.map(d => d.id === detailId ? { ...d, [field]: value } : d));
  };
  const handleBriefChange = (detailId, key, value) => {
    setDetails(prev => prev.map(d => d.id === detailId ? { ...d, brief: { ...d.brief, [key]: value } } : d));
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
          note: d.note,
          // Marketplace Guest Post content source + writing brief (saved only while the order is in review)
          ...(d.content_by ? { content_by: d.content_by, brief: d.brief } : {})
        }))
      });
      await loadOrder();
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
      if (isWriterApproved) {
        result = await managerAPI.pushToBloggers(order.linked_new_order_id, sendEmail);
        setSuccess('Order successfully approved and pushed to bloggers!');
      } else {
        result = await managerAPI.pushClientOrderToBlogger(id, sendEmail);
        setSuccess(`Order pushed to bloggers! ${result.pushed_count} tasks created. Order ID: ${result.new_order_id}`);
      }
      await loadOrder();
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
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Failed to send order to writer');
    } finally {
      setDelegating(false);
    }
  };

  const handleReturnToWriter = async () => {
    const reason = prompt('Enter reason for returning to writer:');
    if (reason === null) return;
    if (!reason.trim()) { alert('Please provide a reason.'); return; }
    try {
      setSaving(true);
      setError('');
      await managerAPI.returnToWriter(order.linked_new_order_id, reason);
      setSuccess('Order returned to writer for revision');
      await loadOrder();
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
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Failed to approve blogger submission');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectBloggerSubmission = async (processDetailId) => {
    const reason = prompt('Enter rejection reason for blogger:');
    if (reason === null) return;
    if (!reason.trim()) { alert('Please provide a reason.'); return; }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await managerAPI.rejectBloggerSubmission(processDetailId, reason.trim());
      setSuccess('Blogger submission rejected and sent back.');
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Failed to reject blogger submission');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectClientOrder = async () => {
    const reason = prompt('Enter rejection reason (this will be shown to the client and their wallet will be refunded):');
    if (reason === null) return;
    if (!reason.trim()) { alert('Please provide a reason.'); return; }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await managerAPI.rejectClientOrder(id, reason.trim());
      setSuccess('Order rejected and client wallet refunded successfully!');
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Failed to reject client order');
    } finally {
      setSaving(false);
    }
  };

  const isGuestPost = order && (order.order_type || '').toLowerCase().includes('guest');
  const isNicheEdit = order && !isGuestPost;
  const isPending = order && order.status === 'pending_review';
  const isSentToWriter = order && order.status === 'sent_to_writer' && order.linked_process_status === 3;
  const isWriterApproved = order && order.status === 'sent_to_writer' && order.linked_process_status === 4;
  const isBloggerApproved = order && (
    order.status === 'pushed_to_blogger' ||
    order.status === 'completed' ||
    (order.status === 'sent_to_writer' && order.linked_process_status === 5)
  );

  // Guest Post → only "Push to Blogger". Niche Edit → "Send to Writer" or "Push to Blogger" directly.
  // After a writer approves a Niche Edit, the manager reviews and pushes it to the blogger.
  const canPush = isPending || isWriterApproved;
  const canEdit = canPush;
  // Content source + brief can change only before the order goes anywhere
  const canEditBrief = isPending;
  const canEditFields = canPush;

  // What the blogger still needs before a direct push (same checks as the server)
  const missingForPush = !order ? [] : details.flatMap(d => {
    const site = d.root_domain || `site #${d.site_id}`;
    const out = [];
    if (!String(d.anchor_text || '').trim() || !String(d.target_url || '').trim()) out.push(`anchor text / target URL for ${site}`);
    if (isGuestPost) {
      if (!String(d.doc_url || '').trim()) out.push(`article doc link for ${site}`);
      if (d.content_by === 'us' && !String(d.article_title || '').trim()) out.push(`article title for ${site}`);
    } else if (!String(d.post_url || '').trim()) out.push(`post URL for ${site}`);
    return out;
  });

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="premium-card p-8 animate-pulse">
            <div className="h-6 bg-[var(--surface-muted)] rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-[var(--surface-muted)] rounded w-1/2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="premium-card p-12 text-center">
          <p className="text-[var(--text-muted)]">{error || 'Order not found'}</p>
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
  const cfg = STATUS_CONFIG[getDisplayStatus(order)] || { label: order.status, color: 'gray' };
  const totalValue = Number(order.total_price) || details.reduce((s, d) => s + Number(d.price || 0), 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="premium-card p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <button onClick={() => navigate('/manager/client-orders')} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors" aria-label="Back to client orders">
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Order {order.order_number || `#${order.id}`}</h1>
                <Badge tone={cfg.color}>{cfg.label}</Badge>
                <Badge tone={isGuestPost ? 'blue' : 'teal'}>{isGuestPost ? <FileText size={12} /> : <Link2 size={12} />}{order.order_type}</Badge>
                {Number(order.fc) === 1 && <Badge tone="red" className="uppercase tracking-wide">FC prices</Badge>}
                {order.marketplace && <Badge tone="violet"><Store size={12} />{order.marketplace === 'whitelabel' ? 'White-label Marketplace' : `${order.marketplace} Marketplace`}</Badge>}
                <Badge tone={order.fill_details ? 'emerald' : 'amber'}>{order.fill_details ? 'Self-Filled' : 'Delegated'}</Badge>
              </div>
              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5"><Users size={14} /><b className="font-semibold text-[var(--text-secondary)]">{order.client_name_user || 'Client'}</b></span>
                {order.client_email && <span className="flex items-center gap-1.5"><Mail size={14} />{order.client_email}</span>}
                <span className="flex items-center gap-1.5"><CalendarDays size={14} />{new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            {totalValue > 0 && (
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Order value</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">${totalValue.toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-5">
            {[
              ['Type', order.order_type, isGuestPost ? FileText : Link2],
              ['Sites', details.length || order.no_of_links, Globe],
              // Package + category are picked only in the client panel's order form – hidden when empty (e.g. marketplace orders)
              order.order_package ? ['Package', order.order_package, Package] : null,
              order.category ? ['Category', order.category, Info] : null,
              // Marketplace Guest Posts: who writes the article
              (() => {
                const by = [...new Set(details.map(d => d.content_by).filter(Boolean))];
                if (!isGuestPost || !by.length) return null;
                return ['Content', by.length > 1 ? 'Mixed' : by[0] === 'us' ? 'We write' : "Client's article", PenLine];
              })(),
              Number(order.fc) === 1 ? ['FC', 'Yes – FC prices', Info] : null,
              ['Mode', order.fill_details ? 'Self-Filled' : 'Delegated', Users]
            ].filter(Boolean).map(([label, value, Icon]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Icon size={12} />{label}</p>
                <p className="font-semibold text-sm text-[var(--text-primary)] mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>

          {order.notes && !String(order.notes).startsWith('Marketplace order') && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Client notes</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          <div className="mt-4">
            <Field label="Manager Notes">
              <textarea className="premium-input w-full min-h-[72px]" rows={3} placeholder="Add your review notes..."
                value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} disabled={!canEditFields} />
            </Field>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="rounded-xl p-4 border border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-3">
            <CheckCircle className="h-5 w-5" /><span>{success}</span>
          </div>
        )}

        {/* Action banners */}
        {isSentToWriter && (
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Order is currently with a writer</p>
              <p className="text-xs text-blue-700 mt-0.5">Assigned writer: <strong>{order.assigned_writer_name || `ID #${order.assigned_writer_id}`}</strong></p>
            </div>
          </div>
        )}

        {isWriterApproved && (
          <div className="rounded-xl p-4 bg-indigo-50 border border-indigo-200 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-800">Writer approved – review and push to blogger</p>
                <p className="text-xs text-indigo-700 mt-0.5">Submitted by <strong>{order.assigned_writer_name}</strong>. Review the details below, save changes, and push to blogger.</p>
              </div>
            </div>
            <button onClick={handleReturnToWriter} disabled={saving}
              className="premium-btn border border-red-200 bg-white hover:bg-red-50 px-4 py-2 text-xs text-red-700 font-semibold">
              Return to Writer for Revision
            </button>
          </div>
        )}

        {/* Sites */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Site Details</h2>
            <span className="text-sm text-[var(--text-muted)]">({details.length} site{details.length === 1 ? '' : 's'})</span>
            {canEditFields && <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"><PenLine size={12} />All fields are editable – click Save Changes</span>}
          </div>

          <div className="space-y-5">
            {details.map((d, i) => {
              const brief = d.brief || {};
              const isMarketplaceGP = isGuestPost && !!d.content_by;
              const price = Number(d.price) || Number(isGuestPost ? d.gp_price : d.niche_edit_price) || 0;
              const siteStatus = SITE_STATUS[d.process_detail_status];
              return (
                <div key={d.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] overflow-hidden">
                  {/* Site header */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] grid place-items-center text-sm font-bold text-[var(--text-secondary)]">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Globe size={15} className="text-[var(--primary-cyan)]" />{d.root_domain || `Site #${d.site_id}`}
                      </h3>
                      <div className="text-xs text-[var(--text-muted)] flex gap-3 mt-1 flex-wrap items-center">
                        <span>DA <b className="text-[var(--text-secondary)]">{d.da || '-'}</b></span>
                        <span>DR <b className="text-[var(--text-secondary)]">{d.dr || '-'}</b></span>
                        <span>Traffic <b className="text-[var(--text-secondary)]">{d.traffic ? Number(d.traffic).toLocaleString() : '-'}</b></span>
                        {d.website_status && <span className={d.website_status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}>{d.website_status}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMarketplaceGP && (
                        <Badge tone={d.content_by === 'us' ? 'violet' : 'blue'}>
                          {d.content_by === 'us' ? <><PenLine size={12} />We write the content</> : <><Upload size={12} />Client's content</>}
                        </Badge>
                      )}
                      <Badge tone={d.fill_details ? 'emerald' : 'amber'}>{d.fill_details ? 'Self-Filled' : 'Delegated'}</Badge>
                      {price > 0 && <span className="text-base font-bold text-[var(--text-primary)] ml-1">${price.toFixed(2)}</span>}
                    </div>
                  </div>

                  <div className="p-5 grid gap-4">
                    {/* Link */}
                    <Section title="Link details" icon={Link2}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Anchor Text" required>
                          <input className="premium-input w-full" placeholder="Anchor text"
                            value={d.anchor_text || ''} onChange={(e) => handleFieldChange(d.id, 'anchor_text', e.target.value)} disabled={!canEditFields} />
                        </Field>
                        <Field label="Target URL" required>
                          <UrlInput value={d.target_url} placeholder="https://example.com/target" disabled={!canEditFields}
                            onChange={(e) => handleFieldChange(d.id, 'target_url', e.target.value)} />
                        </Field>
                      </div>
                    </Section>

                    {/* Content */}
                    {isGuestPost ? (
                      <Section title="Article content" icon={FileText} tone="blue"
                        right={isMarketplaceGP && (
                          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-0.5 text-xs font-semibold">
                            {[['client', 'Client provides'], ['us', 'We write']].map(([v, l]) => (
                              <button key={v} type="button" disabled={!canEditBrief}
                                onClick={() => handleFieldChange(d.id, 'content_by', v)}
                                className={`px-3 py-1.5 rounded-md transition-colors disabled:cursor-not-allowed ${d.content_by === v ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>{l}</button>
                            ))}
                          </div>
                        )}>
                        {isMarketplaceGP && d.content_by === 'us' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Word count" required hint={brief.writing_fee ? `Client paid $${brief.writing_fee} for writing` : undefined}>
                              <select className="premium-input w-full" value={brief.word_count || ''} disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'word_count', e.target.value)}>
                                <option value="">Select word count</option>
                                {[...new Set([...WORD_COUNTS, ...(brief.word_count ? [Number(brief.word_count)] : [])])].map(w => <option key={w} value={w}>{w} words</option>)}
                              </select>
                            </Field>
                            <Field label="Language">
                              <input className="premium-input w-full" value={brief.language || 'English'} disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'language', e.target.value)} />
                            </Field>
                            {/* Filled by our side once the article is written – the blogger gets both */}
                            <div className="md:col-span-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <p className="md:col-span-2 text-xs font-semibold text-violet-800 flex items-center gap-1.5"><PenLine size={13} />Written article – add before pushing to the blogger</p>
                              <Field label="Article doc link" required>
                                <UrlInput value={d.doc_url} placeholder="https://docs.google.com/document/d/..." disabled={!canEditFields}
                                  onChange={(e) => handleFieldChange(d.id, 'doc_url', e.target.value)} />
                              </Field>
                              <Field label="Article title" required hint={brief.title_suggestion ? `Client suggested: "${brief.title_suggestion}"` : undefined}>
                                <input className="premium-input w-full" placeholder="Final article title"
                                  value={d.article_title || ''} onChange={(e) => handleFieldChange(d.id, 'article_title', e.target.value)} disabled={!canEditFields} />
                              </Field>
                            </div>
                            <Field label="Category" required>
                              <select className="premium-input w-full" value={brief.category || ''} disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'category', e.target.value)}>
                                <option value="">Select category</option>
                                {[...new Set([...CATEGORIES, ...(brief.category ? [brief.category] : [])])].map(c => <option key={c}>{c}</option>)}
                              </select>
                            </Field>
                            <Field label="Target audience (country)" required>
                              <select className="premium-input w-full" value={brief.target_country || ''} disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'target_country', e.target.value)}>
                                <option value="">Select country</option>
                                {[...new Set([...COUNTRIES, ...(brief.target_country ? [brief.target_country] : [])])].map(c => <option key={c}>{c}</option>)}
                              </select>
                            </Field>
                            <Field label="Keywords" required hint="Separate with commas." className="md:col-span-2">
                              <input className="premium-input w-full" value={brief.keywords || ''} disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'keywords', e.target.value)} />
                            </Field>
                            <Field label="Reference link" className="md:col-span-2">
                              <UrlInput value={brief.reference_url} placeholder="https://example.com (optional)" disabled={!canEditBrief}
                                onChange={(e) => handleBriefChange(d.id, 'reference_url', e.target.value)} />
                            </Field>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label={isMarketplaceGP ? "Client's article (file or Google Doc)" : 'Doc URL'} className="md:col-span-2"
                              hint={isMarketplaceGP && d.doc_url ? 'Open the link to download or read the article.' : undefined}>
                              <UrlInput value={d.doc_url} placeholder="https://docs.google.com/..." disabled={!canEditFields}
                                onChange={(e) => handleFieldChange(d.id, 'doc_url', e.target.value)} />
                            </Field>
                            <Field label="Article title">
                              <input className="premium-input w-full" placeholder="Title"
                                value={d.article_title || ''} onChange={(e) => handleFieldChange(d.id, 'article_title', e.target.value)} disabled={!canEditFields} />
                            </Field>
                            {isMarketplaceGP && (
                              <Field label="Reference link">
                                <UrlInput value={brief.reference_url} placeholder="https://example.com (optional)" disabled={!canEditBrief}
                                  onChange={(e) => handleBriefChange(d.id, 'reference_url', e.target.value)} />
                              </Field>
                            )}
                          </div>
                        )}
                        {isMarketplaceGP && !canEditBrief && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-3">The content choice and brief can only be changed while the order is pending review.</p>
                        )}
                      </Section>
                    ) : (
                      <Section title="Niche edit placement" icon={Link2} tone="teal">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Post URL (existing article)" required className="md:col-span-2">
                            <UrlInput value={d.post_url} placeholder="https://blog.com/existing-post" disabled={!canEditFields}
                              onChange={(e) => handleFieldChange(d.id, 'post_url', e.target.value)} />
                          </Field>
                          <Field label="Insert After">
                            <textarea className="premium-input w-full min-h-[80px]" rows={3} placeholder="Existing text after which the link goes..."
                              value={d.insert_after || ''} onChange={(e) => handleFieldChange(d.id, 'insert_after', e.target.value)} disabled={!canEditFields} />
                          </Field>
                          <Field label="Insert Statement">
                            <textarea className="premium-input w-full min-h-[80px]" rows={3} placeholder="New sentence with the anchor..."
                              value={d.insert_statement || ''} onChange={(e) => handleFieldChange(d.id, 'insert_statement', e.target.value)} disabled={!canEditFields} />
                          </Field>
                        </div>
                      </Section>
                    )}

                    {/* Note */}
                    <Section title={d.content_by ? "Client's note" : 'Note'} icon={Info}>
                      <textarea className="premium-input w-full" rows={2} placeholder="Note..."
                        value={d.note || ''} onChange={(e) => handleFieldChange(d.id, 'note', e.target.value)} disabled={!canEditFields} />
                    </Section>

                    {/* Blogger workflow */}
                    {d.process_detail_status >= 5 && (
                      <Section title="Blogger workflow" icon={Send}
                        right={siteStatus && <Badge tone={siteStatus[1]} className={d.process_detail_status === 7 ? 'animate-pulse' : ''}>{siteStatus[0]}</Badge>}>
                        {d.submit_url ? (
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-[var(--text-muted)] mb-1">Submitted live link</p>
                              <a href={d.submit_url.startsWith('http') ? d.submit_url : `https://${d.submit_url}`} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-semibold text-[var(--primary-cyan)] hover:underline flex items-center gap-1.5 truncate" title={d.submit_url}>
                                <ExternalLink className="h-4 w-4 flex-shrink-0" /><span className="truncate">{d.submit_url}</span>
                              </a>
                            </div>
                            {d.process_detail_status === 7 && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveBloggerSubmission(d.process_detail_id)}
                                  className="premium-btn px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 font-semibold">
                                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button onClick={() => handleRejectBloggerSubmission(d.process_detail_id)}
                                  className="premium-btn px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1 font-semibold">
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5"><Clock size={14} />Waiting for the blogger to submit the live link.</p>
                        )}
                        {d.process_detail_status === 11 && d.process_detail_reject_reason && (
                          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            <strong>Rejection reason:</strong> {d.process_detail_reject_reason}
                          </div>
                        )}
                      </Section>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next step */}
        {canPush && (
          <div className="premium-card p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Next step</h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {isWriterApproved ? 'The writer has finished – review the text above, then push to the blogger.'
                    : isGuestPost ? 'Guest Posts go straight to the blogger with the article doc link and title.'
                      : 'Send this Niche Edit to a writer for the placement text, or push it directly to the blogger.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleRejectClientOrder} disabled={saving || pushing}
                  className="premium-btn border border-red-200 bg-white text-red-700 hover:bg-red-50 px-4 py-2 flex items-center gap-2 text-sm font-semibold">
                  <XCircle className="h-4 w-4" /> Reject & Refund
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="premium-btn border border-[var(--border)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-muted)] px-4 py-2 flex items-center gap-2 text-sm font-semibold">
                  {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </div>

            <div className={`grid gap-4 ${isNicheEdit && isPending ? 'md:grid-cols-2' : ''}`}>
              {/* Send to Writer – Niche Edit only, before anything else happened */}
              {isNicheEdit && isPending && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 flex flex-col">
                  <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><PenLine size={16} className="text-violet-600" />Send to Writer</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">The writer prepares the insert / replace text for each post, then it comes back to you.</p>
                  <div className="space-y-3 flex-1">
                    <Field label="Writer" required>
                      <select className="premium-input w-full" value={selectedWriter} onChange={(e) => setSelectedWriter(e.target.value)} disabled={delegating}>
                        <option value="">-- Choose Writer --</option>
                        {writers.map(w => <option key={w.id} value={w.id}>{w.username || w.name} ({w.email})</option>)}
                      </select>
                    </Field>
                    <Field label="Instructions for writer">
                      <textarea className="premium-input w-full min-h-[80px]" rows={3} placeholder="Anything the writer should know..."
                        value={writerInstructions} onChange={(e) => setWriterInstructions(e.target.value)} disabled={delegating} />
                    </Field>
                  </div>
                  <button onClick={handleSendToWriter} disabled={delegating || !selectedWriter}
                    className="premium-btn mt-4 w-full justify-center px-5 py-2.5 flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 font-semibold">
                    {delegating ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> Sending...</> : <><Send className="h-4 w-4" /> Send to Writer</>}
                  </button>
                </div>
              )}

              {/* Push to Blogger */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 flex flex-col">
                <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Send size={16} className="text-[var(--primary-cyan)]" />{isNicheEdit && isPending ? 'Push directly to Blogger' : 'Push to Blogger'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Creates the task for each site's owner (blogger) with everything above. Save your edits first.</p>
                {!isWriterApproved && missingForPush.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 mb-4">
                    <p className="font-semibold mb-1">Add before pushing:</p>
                    <ul className="list-disc pl-4 space-y-0.5">{missingForPush.slice(0, 6).map(m => <li key={m}>{m}</li>)}</ul>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
                  <input type="checkbox" className="sr-only" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${sendEmail ? 'bg-[var(--primary-cyan)]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? 'translate-x-4' : ''}`} />
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Send email to bloggers</span>
                </label>
                <div className="flex-1" />
                <button onClick={handlePushToBlogger} disabled={pushing || (!isWriterApproved && missingForPush.length > 0)}
                  className="premium-btn w-full justify-center px-5 py-2.5 flex items-center gap-2 bg-[var(--primary-cyan)] text-white hover:opacity-90 font-semibold shadow-sm disabled:opacity-50">
                  {pushing ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> Pushing...</> : <><Send className="h-4 w-4" /> Push to Blogger</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already pushed / completed */}
        {isBloggerApproved && (
          <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {order.status === 'completed' ? 'This client order has been fully completed!' : 'This order has been pushed to bloggers'}
              </p>
              {order.linked_new_order_id && <p className="text-xs text-emerald-700 mt-0.5">Linked Order ID: #{order.linked_new_order_id}</p>}
            </div>
          </div>
        )}
        {order.status === 'rejected' && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">This order was rejected and the client's wallet was refunded.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientOrderDetails;
