import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Globe, FileText, Send, CheckCircle, AlertCircle, Trash2, DollarSign } from 'lucide-react';
import { managerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Layout } from '../../components/layout/Layout';
import { useAutoSave, AutoSaveIndicator } from '../../../hooks/useAutoSave';

// Team notes are rich text: keep the formatting, drop anything that could run code
const safeHtml = (html) => {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, link, meta').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(a => {
            const name = a.name.toLowerCase();
            if (name.startsWith('on') || (['href', 'src', 'xlink:href'].includes(name) && /^\s*(javascript|data|vbscript):/i.test(a.value))) el.removeAttribute(a.name);
        });
    });
    return doc.body.innerHTML;
};

export function TeamSubmissionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [task, setTask] = useState(null);
    const [writers, setWriters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Auto-save selectedWriter
    const { value: selectedWriter, setValue: setSelectedWriter, clearSaved: clearWriterSaved } =
        useAutoSave(`team-submission-writer-${id}`, '');

    // Auto-save instructions for this task
    const { value: instructions, setValue: setInstructions, clearSaved: clearInstructionsSaved, isSaved } =
        useAutoSave(`team-submission-instructions-${id}`, '');

    const [websiteDetails, setWebsiteDetails] = useState([]);
    const [selectedWebsiteIds, setSelectedWebsiteIds] = useState(new Set());
    const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

    // Key for localStorage for website details
    const websiteDetailsKey = `autosave_team-submission-websites-${id}`;

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [taskResponse, writersResponse] = await Promise.all([
                    managerAPI.getTask(id),
                    managerAPI.getWriters()
                ]);

                setTask(taskResponse.task);
                if (writersResponse.users) {
                    setWriters(writersResponse.users);
                }

                // Try to restore from localStorage first
                let localDetails = {};
                const savedDetails = localStorage.getItem(websiteDetailsKey);
                if (savedDetails) {
                    try {
                        const parsed = JSON.parse(savedDetails);
                        if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                            parsed.data.forEach(item => {
                                localDetails[item.id] = item;
                            });
                        } else {
                            localStorage.removeItem(websiteDetailsKey);
                        }
                    } catch (e) {
                        console.warn('Failed to restore website details:', e);
                        localStorage.removeItem(websiteDetailsKey);
                    }
                }

                // Initialize website details state from API + local storage merge
                if (taskResponse.task && taskResponse.task.selected_websites) {
                    setWebsiteDetails(
                        taskResponse.task.selected_websites.map(sw => {
                            const local = localDetails[sw.id] || {};
                            return {
                                id: sw.id,
                                website_id: sw.website_id,
                                domain_url: sw.domain_url,
                                gp_price: sw.gp_price,
                                niche_price: sw.niche_price,
                                dr: sw.dr,
                                da: sw.da,
                                traffic: sw.traffic,
                                notes: sw.notes,
                                copy_url: sw.copy_url || '',
                                // Manager inputs - favor local draft if exists, else DB
                                target_url: local.target_url !== undefined ? local.target_url : (sw.target_url || ''),
                                anchor_text: local.anchor_text !== undefined ? local.anchor_text : (sw.anchor_text || ''),
                                article_title: local.article_title !== undefined ? local.article_title : (sw.article_title || ''),
                                upfront_payment: local.upfront_payment !== undefined ? local.upfront_payment : (sw.upfront_payment || false),
                                paypal_id: local.paypal_id !== undefined ? local.paypal_id : (sw.paypal_id || '')
                            };
                        })
                    );
                }
            } catch (err) {
                console.error('Failed to load data:', err);
                showError('Failed to load details');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, showError]);

    // Auto-save websiteDetails changes to localStorage
    useEffect(() => {
        if (websiteDetails.length > 0 && !loading) {
            const timeoutId = setTimeout(() => {
                localStorage.setItem(websiteDetailsKey, JSON.stringify({
                    data: websiteDetails,
                    timestamp: Date.now()
                }));
            }, 400);
            return () => clearTimeout(timeoutId);
        }
    }, [websiteDetails, websiteDetailsKey, loading]);

    // Auto-select first N websites when data loads
    useEffect(() => {
        if (task && websiteDetails.length > 0 && !hasInitializedSelection) {
            const maxSelections = parseInt(task.no_of_links, 10) || 1;
            const initialIds = websiteDetails.slice(0, maxSelections).map(w => w.id);
            setSelectedWebsiteIds(new Set(initialIds));
            setHasInitializedSelection(true);
        }
    }, [task, websiteDetails, hasInitializedSelection]);

    const handleWebsiteDetailChange = (index, field, value) => {
        setWebsiteDetails(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Toggle website selection
    const toggleWebsiteSelection = (websiteId) => {
        const maxSelections = parseInt(task?.no_of_links, 10) || 1;
        setSelectedWebsiteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(websiteId)) {
                newSet.delete(websiteId);
            } else {
                if (newSet.size >= maxSelections) {
                    showError(`You can only select ${maxSelections} website(s) for this order.`);
                    return prev;
                }
                newSet.add(websiteId);
            }
            return newSet;
        });
    };

    const handleSubmit = async () => {
        if (!selectedWriter) {
            showError('Please select a writer');
            return;
        }

        const maxSelections = parseInt(task?.no_of_links, 10) || 1;

        // Validate selection count
        if (selectedWebsiteIds.size !== maxSelections) {
            showError(`You must select exactly ${maxSelections} website(s) for this order.`);
            return;
        }

        // Filter to only selected websites
        const selectedDetails = websiteDetails.filter(detail => selectedWebsiteIds.has(detail.id));

        // Validate selected website details based on order type
        const isGuestPost = task?.order_type?.toLowerCase().includes('guest') || task?.order_type?.toLowerCase() === 'gp';

        const missingFields = selectedDetails.some(detail => {
            // URL and Anchor are always required
            if (!detail.target_url || !detail.anchor_text) return true;
            // Title is only required for Guest Post
            if (isGuestPost && !detail.article_title) return true;
            // PayPal ID is required if upfront payment is enabled
            if (detail.upfront_payment && !detail.paypal_id) return true;
            return false;
        });

        if (missingFields) {
            if (isGuestPost) {
                showError('Please fill in URL, Anchor, and Title for all selected websites.');
            } else {
                showError('Please fill in URL and Anchor for all selected websites.');
            }
            return;
        }

        try {
            setSubmitting(true);
            // Only send selected websites to the backend
            await managerAPI.assignToWriter(id, selectedWriter, instructions, selectedDetails);
            showSuccess('Task successfully assigned to writer');
            navigate('/manager/pending/teams');
        } catch (err) {
            showError(err.message || 'Failed to assign task');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <Layout>
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-8 w-8 border-2 border-[var(--primary-cyan)] border-t-transparent rounded-full animate-spin" />
            </div>
        </Layout>
    );

    if (!task) return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-screen text-center">
                <p className="text-[var(--text-muted)] mb-4">Task with ID {id} not found</p>
                <button
                    onClick={() => navigate('/manager/pending/teams')}
                    className="premium-btn premium-btn-primary"
                >
                    Back to List
                </button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/manager/pending/teams')}
                        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Pending Approval - Team Submission
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-1">Order #{task.id} • {task.client_name}</p>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Order Info & Websites */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Order Details Card */}
                        <div className="premium-card p-6">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                                <FileText className="h-5 w-5 text-[var(--primary-cyan)]" />
                                Order Requirements
                            </h2>

                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <label className="block text-[var(--text-muted)] mb-1 uppercase text-xs tracking-wider">Client Name</label>
                                    <div className="text-[var(--text-primary)] font-medium">{task.client_name}</div>
                                </div>
                                <div>
                                    <label className="block text-[var(--text-muted)] mb-1 uppercase text-xs tracking-wider">Order Type</label>
                                    <div className="text-[var(--text-primary)] font-medium">{task.order_type}</div>
                                </div>
                                <div>
                                    <label className="block text-[var(--text-muted)] mb-1 uppercase text-xs tracking-wider">Target Links</label>
                                    <div className="text-[var(--text-primary)] font-medium">{task.no_of_links}</div>
                                </div>
                                <div>
                                    <label className="block text-[var(--text-muted)] mb-1 uppercase text-xs tracking-wider">Team Member</label>
                                    <div className="text-[var(--text-primary)] font-medium">{task.team_name}</div>
                                </div>
                            </div>

                            {/* General note the team member wrote when pushing to the manager (only if they wrote one) */}
                            {String(task.team_note || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() && (
                                <div className="mt-5 pt-5 border-t border-[var(--border)]">
                                    <label className="block text-[var(--text-muted)] mb-2 uppercase text-xs tracking-wider">Team Note</label>
                                    <div
                                        className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm text-[var(--text-primary)]"
                                        dangerouslySetInnerHTML={{ __html: safeHtml(task.team_note) }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Selected Websites - Multiple */}
                        <div className="premium-card p-6">
                            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-4">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-green-400" />
                                    Team Selected Websites ({websiteDetails.length})
                                </h2>
                                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedWebsiteIds.size === (parseInt(task?.no_of_links, 10) || 1)
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    }`}>
                                    Selected: {selectedWebsiteIds.size} / {parseInt(task?.no_of_links, 10) || 1}
                                </div>
                            </div>

                            {websiteDetails.length > 0 ? (
                                <div className="space-y-6">
                                    {websiteDetails.map((detail, index) => {
                                        const isGuestPost = task?.order_type?.toLowerCase().includes('guest') || task?.order_type?.toLowerCase() === 'gp';
                                        const isNicheEdit = task?.order_type?.toLowerCase().includes('niche');
                                        const isSelected = selectedWebsiteIds.has(detail.id);

                                        return (
                                            <div
                                                key={detail.id}
                                                className={`rounded-xl p-5 border-2 transition-all duration-300 relative overflow-hidden ${isSelected
                                                    ? 'bg-[var(--card-background)] border-[var(--primary-cyan)] shadow-lg shadow-[var(--primary-cyan)]/10'
                                                    : 'bg-[var(--background-dark)] border-[var(--border)] opacity-70 hover:opacity-100 hover:border-[var(--text-muted)]'
                                                    }`}
                                            >
                                                {/* Selection Checkbox/Toggle */}
                                                <div className="absolute top-0 right-0 p-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleWebsiteSelection(detail.id)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isSelected
                                                            ? 'bg-[var(--primary-cyan)] text-black shadow-md'
                                                            : 'bg-[var(--background-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
                                                            }`}
                                                    >
                                                        {isSelected ? (
                                                            <>
                                                                <CheckCircle size={14} />
                                                                Selected
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-3.5 h-3.5 rounded-full border border-current"></div>
                                                                Select
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Website Header */}
                                                <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-[var(--border)]">
                                                    <div className="pr-24"> {/* Padding for absolute button */}
                                                        <h3 className={`text-xl font-bold mb-2 transition-colors ${isSelected ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-muted)]'}`}>
                                                            {detail.domain_url}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                                                            <span>DR: <span className="text-[var(--text-primary)]">{detail.dr || '-'}</span></span>
                                                            <span>DA: <span className="text-[var(--text-primary)]">{detail.da || '-'}</span></span>
                                                            <span>Traffic: <span className="text-[var(--text-primary)]">{detail.traffic || '-'}</span></span>
                                                        </div>
                                                    </div>         {/* Post URL - Only for Niche Edit orders */}
                                                    {isNicheEdit && detail.copy_url && (
                                                        <div className="mt-2 text-xs">
                                                            <span className="text-purple-400 font-medium">Post URL: </span>
                                                            <span className="text-[var(--text-primary)] break-all">{detail.copy_url}</span>
                                                        </div>
                                                    )}

                                                    {/* Notes from Team */}
                                                    {detail.notes && (
                                                        <div className="mt-2 text-xs">
                                                            <span className="text-[var(--primary-cyan)] font-medium">Notes: </span>
                                                            <span className="text-[var(--text-primary)]">{detail.notes}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-[var(--text-muted)]">{isNicheEdit ? 'Niche Price' : 'GP Price'}</span>
                                                    <span className="text-xl font-bold text-emerald-400">${isNicheEdit ? (detail.niche_price || '0.00') : (detail.gp_price || '0.00')}</span>
                                                </div>


                                                {/* Editable Fields */}
                                                <div className={`space-y-4 ${!isSelected ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    {/* URL - For both order types */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                            Target URL <span className="text-red-400">*</span>
                                                        </label>
                                                        <input
                                                            value={detail.target_url}
                                                            onChange={(e) => handleWebsiteDetailChange(index, 'target_url', e.target.value)}
                                                            placeholder="https://example.com/target-page"
                                                            className="premium-input w-full"
                                                            disabled={!isSelected}
                                                        />
                                                    </div>

                                                    {/* Anchor - For both order types */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                            Anchor Text <span className="text-red-400">*</span>
                                                        </label>
                                                        <input
                                                            value={detail.anchor_text}
                                                            onChange={(e) => handleWebsiteDetailChange(index, 'anchor_text', e.target.value)}
                                                            placeholder="Anchor text for backlink"
                                                            className="premium-input w-full"
                                                            disabled={!isSelected}
                                                        />
                                                    </div>

                                                    {/* Title - Only for Guest Post orders */}
                                                    {isGuestPost && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                                Article Title <span className="text-red-400">*</span>
                                                            </label>
                                                            <input
                                                                value={detail.article_title}
                                                                onChange={(e) => handleWebsiteDetailChange(index, 'article_title', e.target.value)}
                                                                placeholder="Article title"
                                                                className="premium-input w-full"
                                                                disabled={!isSelected}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Upfront Toggle */}
                                                    <div className="flex items-center gap-4 py-2 border-t border-[var(--border)] mt-4 pt-4">
                                                        <label className="text-sm font-medium text-[var(--text-primary)]">Upfront Payment</label>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleWebsiteDetailChange(index, 'upfront_payment', true)}
                                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${detail.upfront_payment
                                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                                    : 'bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                                                    }`}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleWebsiteDetailChange(index, 'upfront_payment', false)}
                                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!detail.upfront_payment
                                                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                                                    : 'bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                                                    }`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* PayPal ID - Only when upfront is Yes */}
                                                    {detail.upfront_payment && (
                                                        <div className="animate-fade-in">
                                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                                PayPal ID <span className="text-red-400">*</span>
                                                            </label>
                                                            <input
                                                                value={detail.paypal_id || ''}
                                                                onChange={(e) => handleWebsiteDetailChange(index, 'paypal_id', e.target.value)}
                                                                placeholder="Enter PayPal ID for upfront payment"
                                                                className="premium-input w-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200">
                                    No websites selected. This shouldn't happen in this workflow stage.
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column - Action Box */}
                    <div className="space-y-6">
                        <div className="premium-card p-6 sticky top-6">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                                <CheckCircle className="h-5 w-5 text-[var(--primary-cyan)]" />
                                Approve & Assign
                            </h2>

                            <div className="space-y-6">
                                {/* Select Writer */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                                        Select Writer <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                        <select
                                            value={selectedWriter}
                                            onChange={(e) => setSelectedWriter(e.target.value)}
                                            className="premium-input w-full pl-10"
                                        >
                                            <option value="">Choose a writer...</option>
                                            {writers.map(writer => (
                                                <option key={writer.id} value={writer.id}>
                                                    {writer.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                                        Content Instructions <span className="text-xs text-[var(--text-muted)] normal-case">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder="Instructions for the writer..."
                                        rows={4}
                                        className="premium-input w-full min-h-[120px]"
                                    />
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !selectedWriter}
                                    className="premium-btn premium-btn-primary w-full py-3 h-auto text-base justify-center"
                                >
                                    {submitting ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Assign to Writer
                                        </>
                                    )}
                                </button>

                                <div className="text-xs text-center text-[var(--text-muted)] mt-2">
                                    Submitting will move status to <strong className="text-[var(--text-primary)]">ASSIGNED_TO_WRITER</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div >
        </Layout >
    );
}

export default TeamSubmissionDetails;
