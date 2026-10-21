import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload, XCircle, CheckCircle, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { writerAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAutoSave, AutoSaveIndicator } from '../../hooks/useAutoSave';

// Marks a field that still holds the AI's suggested text
const AiTag = () => (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 align-middle">
        <Sparkles className="w-3 h-3" />AI
    </span>
);

export function OrderAddedDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [websiteSubmissions, setWebsiteSubmissions] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});

    // Auto-save global note for this task
    const { value: globalNote, setValue: setGlobalNote, clearSaved: clearNoteSaved, isSaved: noteIsSaved } =
        useAutoSave(`writer-order-note-${id}`, '');

    const fileInputRefs = useRef({});

    // Rejected website IDs and Reason
    const [rejectedWebsiteIds, setRejectedWebsiteIds] = useState([]);
    const [rejectionReason, setRejectionReason] = useState('');

    // Check if order is Niche Edit
    const isNicheEdit = task?.order_type?.toLowerCase().includes('niche');

    // Key for localStorage for website submissions
    const submissionsKey = `autosave_writer-submissions-${id}`;

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await writerAPI.getTask(id);
                const taskData = response.task;
                setTask(taskData);

                // New dynamic parsing: Task DB now automatically surfaces rejection reasons
                const rejectionContent = taskData.rejection_reason || taskData.message || taskData.notes || taskData.content_body || '';

                // Keep reason set for banner
                if (taskData.current_status === 'REJECTED' || taskData.current_status === 'WRITER_REJECTED' || (rejectionContent && rejectionContent.includes('[WRITER_REJECTED]'))) {
                    const messageContent = rejectionContent.replace('[WRITER_REJECTED]', '').trim();
                    if (messageContent.includes('|||')) {
                        const [reason] = messageContent.split('|||');
                        setRejectionReason(reason.trim());
                    } else {
                        setRejectionReason(messageContent);
                    }
                }

                // Try to load from local storage first
                let localSubmissions = {};
                const savedSubmissions = localStorage.getItem(submissionsKey);

                if (savedSubmissions) {
                    try {
                        const parsed = JSON.parse(savedSubmissions);
                        if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                            parsed.data.forEach(item => {
                                localSubmissions[item.id] = item;
                                if (item.website_id) localSubmissions[item.website_id] = item;
                            });
                        } else {
                            localStorage.removeItem(submissionsKey);
                        }
                    } catch (e) {
                        console.warn('Failed to restore submissions:', e);
                        localStorage.removeItem(submissionsKey);
                    }
                }

                if (taskData.selected_websites) {
                    console.log('Task Data Payload arrived:', taskData.selected_websites);
                    setWebsiteSubmissions(
                        taskData.selected_websites.map(sw => {
                            // Backend Task.js inherently marks row.status === 11 as is_rejected: true
                            console.log('Website Rejection Status Check:', sw.id, 'is_rejected:', sw.is_rejected);
                            const isRejected = sw.is_rejected === true || sw.is_rejected === 'true' || sw.is_rejected === 1 || sw.is_rejected;
                            const local = localSubmissions[sw.id] || localSubmissions[sw.website_id] || {};

                            return {
                                id: sw.id,
                                website_id: sw.website_id,
                                domain_url: sw.domain_url,
                                // ALWAYS force read-only fields from backend DB 
                                target_url: sw.target_url || '',
                                anchor_text: sw.anchor_text || '',
                                article_title: sw.article_title || '',
                                // Editable fields: fallback to local cache if present
                                post_url: local.post_url !== undefined ? local.post_url : (sw.copy_url || sw.post_url || ''),
                                content_link: local.content_link !== undefined ? local.content_link : (sw.content_link || ''),
                                writer_note: local.writer_note !== undefined ? local.writer_note : '', // Force empty for new GP orders
                                notes: sw.notes,
                                // Niche Edit specific fields
                                option_type: local.option_type !== undefined ? local.option_type : (sw.option_type || 'insert'),
                                replace_with: local.replace_with !== undefined ? local.replace_with : (sw.replace_with || ''),
                                replace_statement: local.replace_statement !== undefined ? local.replace_statement : (sw.replace_statement || ''),
                                insert_after: local.insert_after !== undefined ? local.insert_after : (sw.insert_after || ''),
                                insert_statement: local.insert_statement !== undefined ? local.insert_statement : (sw.insert_statement || ''),
                                // Used for border coloring
                                is_rejected: isRejected
                            };
                        })
                    );
                }
            } catch (err) {
                console.error('Failed to load task:', err);
                showError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, showError]);

    // Auto-save websiteSubmissions changes to localStorage
    useEffect(() => {
        if (websiteSubmissions.length > 0 && !loading) {
            const timeoutId = setTimeout(() => {
                localStorage.setItem(submissionsKey, JSON.stringify({
                    data: websiteSubmissions,
                    timestamp: Date.now()
                }));
            }, 400);
            return () => clearTimeout(timeoutId);
        }
    }, [websiteSubmissions, submissionsKey, loading]);

    const handleContentChange = (index, field, value) => {
        setWebsiteSubmissions(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // ===== AI suggestions for Niche Edit (fills empty fields only; the writer can edit everything) =====
    const [suggestions, setSuggestions] = useState({}); // detail id → { loading } | suggestion from the API
    const suggestStarted = useRef(false);

    // Put a suggestion into the site's fields – only where the writer hasn't typed anything (unless force)
    // On Regenerate, fields still holding the previous AI text are refreshed too; anything the writer typed is kept
    const applySuggestion = (detailId, s, previous = null) => {
        if (!s || s.status !== 'ok') return;
        const prevText = { replace_with: previous?.replace_text, replace_statement: previous?.replace_new, insert_after: previous?.insert_after, insert_statement: previous?.insert_new };
        setWebsiteSubmissions(prev => prev.map(site => {
            if (site.id !== detailId) return site;
            const fill = (field, value) => {
                const cur = String(site[field] || '').trim();
                return !cur || (prevText[field] && cur === String(prevText[field]).trim()) ? value : site[field];
            };
            return {
                ...site,
                replace_with: fill('replace_with', s.replace_text),
                replace_statement: fill('replace_statement', s.replace_new),
                insert_after: fill('insert_after', s.insert_after),
                insert_statement: fill('insert_statement', s.insert_new)
            };
        }));
    };

    const loadSuggestion = async (detailId, regenerate = false) => {
        const previous = suggestions[detailId];
        setSuggestions(prev => ({ ...prev, [detailId]: { ...(prev[detailId] || {}), loading: true } }));
        try {
            const { suggestion } = await writerAPI.getNicheSuggestion(id, detailId, regenerate);
            setSuggestions(prev => ({ ...prev, [detailId]: suggestion }));
            applySuggestion(detailId, suggestion, regenerate ? previous : null);
        } catch (err) {
            setSuggestions(prev => ({ ...prev, [detailId]: { status: 'failed', message: err.response?.data?.message || 'AI suggestion failed – please fill in manually.' } }));
        }
    };

    // Option A: run automatically once when a Niche Edit order opens (saved suggestions come back free)
    useEffect(() => {
        if (loading || !isNicheEdit || suggestStarted.current || websiteSubmissions.length === 0) return;
        suggestStarted.current = true;
        const ids = websiteSubmissions.map(s => s.id);
        let next = 0;
        const worker = async () => { while (next < ids.length) await loadSuggestion(ids[next++]); };
        Promise.all([worker(), worker(), worker()]); // 3 at a time
    }, [loading, isNicheEdit, websiteSubmissions]); // eslint-disable-line react-hooks/exhaustive-deps

    const regenerateSuggestion = (detailId) => {
        if (!window.confirm('Make a new AI suggestion for this site?\n\nFields you edited yourself are kept; the rest get the new suggestion. Costs about 1 cent.')) return;
        loadSuggestion(detailId, true);
    };

    const handleFileClick = (siteId) => {
        if (fileInputRefs.current[siteId]) {
            fileInputRefs.current[siteId].click();
        }
    };

    const handleFileChange = (siteId, event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFiles(prev => ({
                ...prev,
                [siteId]: file
            }));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (siteId, e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) {
            setUploadedFiles(prev => ({
                ...prev,
                [siteId]: file
            }));
        }
    };

    const handleSubmit = async () => {
        if (isNicheEdit) {
            // Global note is mandatory for Niche Edit only
            if (!globalNote || globalNote.trim() === '') {
                showError('Please fill in the Global Notes field');
                return;
            }

            // Validate Niche Edit fields
            const missingFields = websiteSubmissions.find(sub => {
                if (sub.option_type === 'replace') {
                    return !sub.replace_with?.trim() || !sub.replace_statement?.trim();
                } else {
                    return !sub.insert_after?.trim() || !sub.insert_statement?.trim();
                }
            });

            if (missingFields) {
                showError('Please fill in all required fields for each website');
                return;
            }
        } else {
            // GP flow validation - Note is mandatory per website
            const missingNote = websiteSubmissions.find((sub) => !sub.writer_note || sub.writer_note.trim() === '');
            if (missingNote) {
                showError(`Website "${missingNote.domain_url || 'Unknown'}": Please fill in the Note field`);
                return;
            }
        }

        try {
            setSubmitting(true);

            const payload = websiteSubmissions.map(sub => ({
                id: sub.id,
                content_link: sub.content_link || '',
                writer_note: sub.writer_note || '',
                // Niche Edit fields
                option_type: sub.option_type,
                replace_with: sub.replace_with || '',
                replace_statement: sub.replace_statement || '',
                insert_after: sub.insert_after || '',
                insert_statement: sub.insert_statement || '',
                global_note: globalNote
            }));

            // Build FormData to support file uploads
            const formData = new FormData();
            formData.append('website_submissions', JSON.stringify(payload));

            // Append uploaded files with fieldname pattern file_<detail_id>
            for (const sub of websiteSubmissions) {
                const file = uploadedFiles[sub.website_id] || uploadedFiles[sub.id];
                if (file) {
                    formData.append(`file_${sub.id}`, file);
                }
            }

            await writerAPI.submitContent(id, formData);

            showSuccess('Content submitted successfully!');
            navigate('/writer/completed-orders');
        } catch (err) {
            let errorMessage = 'Failed to submit content';
            if (err?.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err?.message && typeof err.message === 'string') {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            console.error('Submit error:', err);
            showError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
        </div>
    );

    if (!task) return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--background-dark)] rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)] font-medium">Order details not found.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/writer/notifications')}
                    className="p-2 rounded-xl bg-[var(--card-background)] border border-[var(--border)] hover:border-[var(--primary-cyan)] transition-colors group shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary-cyan)]" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {isNicheEdit ? 'Processing Niche Edit' : 'Processing Guest Post'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="premium-badge bg-[var(--primary-glow)] text-[var(--primary-cyan)]">
                            Order #{task.manual_order_id || task.id}
                        </span>
                        <span className="text-[var(--text-muted)] text-sm">•</span>
                        <span className="text-[var(--text-secondary)] text-sm">{task.client_name || 'Client'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left Column - Website Details */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Rejection Reason Banner */}
                    {rejectionReason && (
                        <div className="premium-card p-5 border-2 border-red-500/30 bg-red-500/10 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-red-400 mb-1">Manager's Rejection Reason</h3>
                                    <p className="text-[var(--text-primary)]">{rejectionReason}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {websiteSubmissions.length === 0 ? (
                        <div className="premium-card p-12 text-center">
                            <p className="text-[var(--text-muted)]">No website details available for this order.</p>
                        </div>
                    ) : (
                        websiteSubmissions.map((site, index) => {
                            const isRejected = site.is_rejected === true || site.is_rejected === 'true' || site.is_rejected === 1;

                            return (
                                <div key={site.id} className={`premium-card p-6 transition-all ${isRejected ? 'border-2 border-red-500 bg-red-500/5 shadow-lg shadow-red-500/10' : ''}`}>
                                    <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isRejected ? 'border-red-500/30' : 'border-[var(--border)]'}`}>
                                        <h2 className={`text-lg font-bold flex items-center gap-2 ${isRejected ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isRejected ? 'bg-red-500 text-white' : 'bg-[var(--primary-cyan)] text-white'}`}>
                                                {index + 1}
                                            </div>
                                            Website Details
                                            {isRejected && (
                                                <span className="ml-2 px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white uppercase tracking-wide animate-pulse">
                                                    ⚠ REJECTED - FIX REQUIRED
                                                </span>
                                            )}
                                        </h2>
                                        <div className="text-sm text-[var(--text-muted)] font-mono">
                                            ID: {site.id}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Read-only field: Root domain */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                            <label className="text-sm font-medium text-[var(--text-secondary)]">Root Domain</label>
                                            <div className="md:col-span-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={site.domain_url || ''}
                                                    className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Read-only field: Anchor */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                            <label className="text-sm font-medium text-[var(--text-secondary)]">Anchor Text</label>
                                            <div className="md:col-span-3">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={site.anchor_text || ''}
                                                    className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Read-only field: Post URL - Niche Edit only */}
                                        {isNicheEdit && (
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                <label className="text-sm font-medium text-[var(--text-secondary)]">Target Post URL</label>
                                                <div className="md:col-span-3">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={site.post_url || ''}
                                                        className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Read-only field: Title - GP only */}
                                        {!isNicheEdit && (
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                <label className="text-sm font-medium text-[var(--text-secondary)]">Article Title</label>
                                                <div className="md:col-span-3">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={site.article_title || ''}
                                                        className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Read-only field: URL */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                            <label className="text-sm font-medium text-[var(--text-secondary)]">Target URL</label>
                                            <div className="md:col-span-3">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={site.target_url || ''}
                                                        className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed pl-10"
                                                    />
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-[var(--border)] my-6" />

                                        {/* ===== NICHE EDIT SPECIFIC FIELDS ===== */}
                                        {isNicheEdit && (
                                            <>
                                                {/* AI suggestion status */}
                                                {(() => {
                                                    const s = suggestions[site.id];
                                                    if (!s) return null;
                                                    const ok = s.status === 'ok';
                                                    return (
                                                        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${s.loading ? 'border-violet-200 bg-violet-50 text-violet-700'
                                                            : ok ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                                            {s.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : ok ? <Sparkles className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                                            <span className="flex-1 min-w-[200px]">
                                                                {s.loading ? 'AI is reading the post and writing suggestions…'
                                                                    : ok ? 'AI suggestions filled in for both action types – check and edit them before submitting.'
                                                                        : (s.message || 'No suggestion – please fill in manually.')}
                                                                {ok && s.message && <span className="block mt-1 text-amber-700 font-medium">⚠ {s.message}</span>}
                                                            </span>
                                                            {!s.loading && s.status !== 'limit' && (
                                                                <button type="button" onClick={() => regenerateSuggestion(site.id)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70">
                                                                    <RefreshCw className="w-3.5 h-3.5" />{ok ? 'Regenerate' : 'Try again'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Options Dropdown */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                                                        Action Type<span className="text-[var(--error)]">*</span>
                                                    </label>
                                                    <div className="md:col-span-3">
                                                        <select
                                                            value={site.option_type}
                                                            onChange={(e) => handleContentChange(index, 'option_type', e.target.value)}
                                                            className="premium-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-4 bg-[length:12px_12px]"
                                                        >
                                                            <option value="replace">Replace Existing Text</option>
                                                            <option value="insert">Insert New Text</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Replace Fields */}
                                                {site.option_type === 'replace' && (
                                                    <div className="space-y-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                                        <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide">🔄 Replace Mode</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-sm font-semibold text-[var(--text-main)] mb-2 block">
                                                                    Text to Replace <span className="text-[var(--error)]">*</span> {suggestions[site.id]?.status === 'ok' && site.replace_with && site.replace_with === suggestions[site.id].replace_text && <AiTag />}
                                                                </label>
                                                                <textarea
                                                                    value={site.replace_with}
                                                                    onChange={(e) => handleContentChange(index, 'replace_with', e.target.value)}
                                                                    placeholder="Paste the exact text to find and replace..."
                                                                    rows={6}
                                                                    className="premium-input w-full font-mono text-sm"
                                                                    style={{ minHeight: '140px' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-semibold text-[var(--text-main)] mb-2 block">
                                                                    New Content <span className="text-[var(--error)]">*</span> {suggestions[site.id]?.status === 'ok' && site.replace_statement && site.replace_statement === suggestions[site.id].replace_new && <AiTag />}
                                                                </label>
                                                                <textarea
                                                                    value={site.replace_statement}
                                                                    onChange={(e) => handleContentChange(index, 'replace_statement', e.target.value)}
                                                                    placeholder="New text with anchor link to replace the above..."
                                                                    rows={6}
                                                                    className="premium-input w-full font-mono text-sm"
                                                                    style={{ minHeight: '140px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Insert Fields */}
                                                {site.option_type === 'insert' && (
                                                    <div className="space-y-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                                        <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">➕ Insert Mode</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-sm font-semibold text-[var(--text-main)] mb-2 block">
                                                                    Insert After <span className="text-[var(--error)]">*</span> {suggestions[site.id]?.status === 'ok' && site.insert_after && site.insert_after === suggestions[site.id].insert_after && <AiTag />}
                                                                </label>
                                                                <textarea
                                                                    value={site.insert_after}
                                                                    onChange={(e) => handleContentChange(index, 'insert_after', e.target.value)}
                                                                    placeholder="Paste the existing text after which you want to insert new content..."
                                                                    rows={6}
                                                                    className="premium-input w-full font-mono text-sm"
                                                                    style={{ minHeight: '140px' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-semibold text-[var(--text-main)] mb-2 block">
                                                                    New Statement <span className="text-[var(--error)]">*</span> {suggestions[site.id]?.status === 'ok' && site.insert_statement && site.insert_statement === suggestions[site.id].insert_new && <AiTag />}
                                                                </label>
                                                                <textarea
                                                                    value={site.insert_statement}
                                                                    onChange={(e) => handleContentChange(index, 'insert_statement', e.target.value)}
                                                                    placeholder="The new sentence or paragraph to insert with anchor link..."
                                                                    rows={6}
                                                                    className="premium-input w-full font-mono text-sm"
                                                                    style={{ minHeight: '140px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* ===== GUEST POST SPECIFIC FIELDS ===== */}
                                        {!isNicheEdit && (
                                            <>
                                                {/* Upload Document */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                                    <label className="text-sm font-medium text-[var(--text-secondary)] pt-3">Content File</label>
                                                    <div className="md:col-span-3">
                                                        <input
                                                            type="file"
                                                            ref={(el) => fileInputRefs.current[site.id] = el}
                                                            onChange={(e) => handleFileChange(site.id, e)}
                                                            className="hidden"
                                                            accept=".doc,.docx,.pdf,.txt,.rtf,image/*,.png,.jpg,.jpeg,.gif,.webp"
                                                        />
                                                        <div
                                                            onClick={() => handleFileClick(site.id)}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(site.id, e)}
                                                            className="rounded-xl p-8 text-center cursor-pointer transition-all border-2 border-dashed border-[var(--border)] hover:border-[var(--primary-cyan)] hover:bg-[var(--primary-glow)] group"
                                                        >
                                                            {uploadedFiles[site.id] ? (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-12 h-12 rounded-full bg-[var(--primary-glow)] flex items-center justify-center mb-3">
                                                                        <CheckCircle className="h-6 w-6 text-[var(--primary-cyan)]" />
                                                                    </div>
                                                                    <p className="font-medium text-[var(--text-primary)]">{uploadedFiles[site.id].name}</p>
                                                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                        ({(uploadedFiles[site.id].size / 1024).toFixed(1)} KB)
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-12 h-12 rounded-full bg-[var(--input-background)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                                        <Upload className="h-6 w-6 text-[var(--text-muted)] group-hover:text-[var(--primary-cyan)]" />
                                                                    </div>
                                                                    <p className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                                                                        Click to upload or drag and drop
                                                                    </p>
                                                                    <p className="text-xs text-[var(--text-muted)] mt-2">DOC, DOCX, PDF, Images</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Doc URLs */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Google Doc URL</label>
                                                    <div className="md:col-span-3">
                                                        <input
                                                            type="url"
                                                            value={site.content_link}
                                                            onChange={(e) => handleContentChange(index, 'content_link', e.target.value)}
                                                            placeholder="https://docs.google.com/..."
                                                            className="premium-input"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Note - Mandatory for GP */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                                    <label className="text-sm font-medium text-[var(--text-secondary)] pt-3">
                                                        Writer Note<span className="text-[var(--error)]">*</span>
                                                    </label>
                                                    <div className="md:col-span-3">
                                                        <textarea
                                                            value={site.writer_note}
                                                            onChange={(e) => handleContentChange(index, 'writer_note', e.target.value)}
                                                            placeholder="Important notes for the manager..."
                                                            rows={3}
                                                            className="premium-input"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Global Notes - Only for Niche Edit */}
                    {isNicheEdit && (
                        <div className="premium-card p-6 border-l-4 border-[var(--primary-cyan)]">
                            <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">
                                Global Notes<span className="text-[var(--error)]">*</span>
                            </h2>
                            <textarea
                                value={globalNote}
                                onChange={(e) => setGlobalNote(e.target.value)}
                                placeholder="Any general instructions or comments for this entire order..."
                                rows={4}
                                className="premium-input"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="premium-btn premium-btn-primary px-8 py-3 text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            {submitting ? (
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Send className="h-5 w-5 mr-2" />
                            )}
                            {submitting ? 'Submitting...' : 'Submit to Manager'}
                        </button>
                    </div>
                </div>

                {/* Right Column - Order Info Sidebar */}
                <div className="space-y-6">
                    <div className="premium-card p-6 sticky top-6">
                        <h3 className="text-lg font-bold mb-6 pb-4 border-b border-[var(--border)] text-[var(--text-primary)]">
                            Order Overview
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Status</label>
                                <span className="premium-badge bg-blue-500/10 text-blue-500">Processing</span>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Order Type</label>
                                <p className="font-medium text-[var(--text-primary)]">{task.order_type || 'Guest Post'}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Date Assigned</label>
                                <p className="font-medium text-[var(--text-primary)]">
                                    {new Date(task.updated_at || task.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Assigned By</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[var(--primary-cyan)] text-white flex items-center justify-center text-xs font-bold">
                                        {(task.manager_name || 'M')[0]}
                                    </div>
                                    <p className="font-medium text-[var(--text-primary)]">{task.manager_name || 'Manager'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderAddedDetails;
