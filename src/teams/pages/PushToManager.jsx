import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamAPI } from '../../lib/api';
import { ArrowLeft, Search, Trash2, Send, AlertCircle, ChevronLeft, ChevronRight, Filter, X, Globe, BarChart2, Tag, DollarSign, CheckCircle, FileSearch, ExternalLink } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useAutoSave, AutoSaveIndicator } from '../../hooks/useAutoSave';

/**
 * PushToManager - WORKFLOW STEP 2
 * Team selects websites from inventory and submits to Manager for approval
 */
export const PushToManager = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [websites, setWebsites] = useState([]);
    const [selectedWebsites, setSelectedWebsites] = useState([]); // Array of {website, note, copyUrl}
    const [loading, setLoading] = useState(true);
    const [websitesLoading, setWebsitesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Auto-save global note
    const { value: globalNote, setValue: setGlobalNote, clearSaved: clearNoteSaved, isSaved: noteIsSaved } = useAutoSave(`push-to-manager-note-${id}`, '');

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 15;

    // Filter state
    const [filters, setFilters] = useState({
        domain: '',
        traffic: '',
        category: ''
    });
    const [activeFilters, setActiveFilters] = useState({
        domain: '',
        traffic: '',
        category: ''
    });

    // Fetch task details
    useEffect(() => {
        const fetchTask = async () => {
            try {
                setLoading(true);
                const taskData = await teamAPI.getTaskForPush(id);
                setTask(taskData.task);
            } catch (err) {
                setError(err.message || 'Failed to load task');
            } finally {
                setLoading(false);
            }
        };
        fetchTask();
    }, [id]);

    // Fetch websites with pagination and filters
    const fetchWebsites = useCallback(async () => {
        try {
            setWebsitesLoading(true);
            const websitesData = await teamAPI.getWebsites({
                page,
                limit: pageSize,
                domain: activeFilters.domain || undefined,
                traffic: activeFilters.traffic || undefined,
                category: activeFilters.category || undefined
            });
            const sampleSite = (websitesData.sites || websitesData.websites || [])[0];
            if (sampleSite) console.log('Website sample:', { id: sampleSite.id, website_status: sampleSite.website_status, site_status: sampleSite.site_status, category: sampleSite.category, niche: sampleSite.niche, website_niche: sampleSite.website_niche });
            setWebsites(websitesData.sites || websitesData.websites || []);
            setTotalPages(websitesData.pagination?.totalPages || 1);
            setTotal(websitesData.pagination?.total || 0);
        } catch (err) {
            console.error('Error fetching websites:', err);
        } finally {
            setWebsitesLoading(false);
        }
    }, [page, activeFilters]);

    useEffect(() => {
        fetchWebsites();
    }, [fetchWebsites]);

    // Apply filters and reset to page 1
    const handleApplyFilters = () => {
        setActiveFilters({ ...filters });
        setPage(1);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setFilters({ domain: '', traffic: '', category: '' });
        setActiveFilters({ domain: '', traffic: '', category: '' });
        setPage(1);
    };

    // Check if any filters are active
    const hasActiveFilters = activeFilters.domain || activeFilters.traffic || activeFilters.category;

    // Get required links count
    const requiredLinks = task?.no_of_links || 1;

    // Check if submit is allowed
    const canSubmit = selectedWebsites.length >= requiredLinks;

    // Filter websites based on search
    const filteredWebsites = useMemo(() => {
        if (!searchTerm) return websites;
        const term = searchTerm.toLowerCase();
        return websites.filter(w =>
            (w.root_domain || w.domain_url || '').toLowerCase().includes(term) ||
            (w.category || w.website_niche || '').toLowerCase().includes(term)
        );
    }, [websites, searchTerm]);

    // Check if website is selected
    const isSelected = (websiteId) => {
        return selectedWebsites.some(sw => sw.website.id === websiteId);
    };

    // Toggle website selection
    const handleToggleWebsite = (website) => {
        if (isSelected(website.id)) {
            setSelectedWebsites(selectedWebsites.filter(sw => sw.website.id !== website.id));
        } else {
            setSelectedWebsites([...selectedWebsites, { website, note: '', copyUrl: '', anchor: '', targetUrl: '' }]);
        }
    };

    // Which tab of the website selection is open: 'select' (inventory) or 'keyword' (post search)
    const [selectionMode, setSelectionMode] = useState('select');

    // Keyword tab: pick a post → its website is selected with the post URL filled in.
    // One pick per keyword: picking another post for the same keyword replaces the earlier pick.
    // Picking the same post again unselects it. Returns an error message when the pick isn't allowed.
    const handleSelectPost = (post, keyword) => {
        const sameKeyword = selectedWebsites.find(sw => sw.keyword === keyword);
        if (sameKeyword && sameKeyword.website.id === post.id && sameKeyword.copyUrl === post.post_url) {
            setSelectedWebsites(selectedWebsites.filter(sw => sw !== sameKeyword));
            return null;
        }
        const siteTaken = selectedWebsites.find(sw => sw.website.id === post.id && sw !== sameKeyword);
        if (siteTaken) {
            return siteTaken.keyword
                ? `${post.root_domain} is already selected for the keyword "${siteTaken.keyword}". Each site can be used once.`
                : `${post.root_domain} is already selected in the Select Websites tab. Each site can be used once.`;
        }
        // Replacing this keyword's pick keeps what the team already typed (note, anchor, target URL)
        const pick = {
            website: post, copyUrl: post.post_url, keyword,
            note: sameKeyword?.note || '', anchor: sameKeyword?.anchor || '', targetUrl: sameKeyword?.targetUrl || ''
        };
        setSelectedWebsites(sameKeyword
            ? selectedWebsites.map(sw => (sw === sameKeyword ? pick : sw)) // replace this keyword's earlier pick
            : [...selectedWebsites, pick]);
        return null;
    };

    // Update note for selected website
    const handleUpdateNote = (websiteId, note) => {
        setSelectedWebsites(selectedWebsites.map(sw =>
            sw.website.id === websiteId ? { ...sw, note } : sw
        ));
    };

    // "client.com/page" → "https://client.com/page" (people often type just the domain)
    const withScheme = (v) => {
        const t = String(v || '').trim();
        if (!t || /^https?:\/\//i.test(t) || /\s/.test(t) || !t.includes('.')) return t;
        return 'https://' + t.replace(/^\/+/, '');
    };

    // Update any per-site field (anchor, targetUrl)
    const handleUpdateField = (websiteId, field, value) => {
        setSelectedWebsites(selectedWebsites.map(sw =>
            sw.website.id === websiteId ? { ...sw, [field]: value } : sw
        ));
    };

    // Update copyUrl for selected website
    const handleUpdateCopyUrl = (websiteId, copyUrl) => {
        setSelectedWebsites(selectedWebsites.map(sw =>
            sw.website.id === websiteId ? { ...sw, copyUrl } : sw
        ));
    };

    // Remove website from selected list
    const handleRemoveWebsite = (websiteId) => {
        setSelectedWebsites(selectedWebsites.filter(sw => sw.website.id !== websiteId));
    };

    // Submit selected websites to Manager
    const handleSubmit = async () => {
        if (!canSubmit) {
            setError(`Please select at least ${requiredLinks} website(s)`);
            return;
        }

        // Anchor text + target URL are required for every site; the note is optional
        const isNicheEdit = task?.order_type?.toLowerCase().includes('niche');
        const missingCopyUrls = isNicheEdit && selectedWebsites.some(sw => !sw.copyUrl || sw.copyUrl.trim() === '');
        const siteName = (sw) => sw.website.root_domain || sw.website.domain_url;

        const missingAnchor = selectedWebsites.find(sw => !(sw.anchor || '').trim());
        if (missingAnchor) {
            setError(`Please fill in the Anchor Text for ${siteName(missingAnchor)}`);
            return;
        }
        const missingTarget = selectedWebsites.find(sw => !(sw.targetUrl || '').trim());
        if (missingTarget) {
            setError(`Please fill in the Target URL for ${siteName(missingTarget)}`);
            return;
        }
        const badTarget = selectedWebsites.find(sw => {
            const v = withScheme(sw.targetUrl);
            if (v.length > 255 || !/^https?:\/\//i.test(v)) return true;
            try { new URL(v); return false; } catch { return true; }
        });
        if (badTarget) {
            setError(`Target URL for ${siteName(badTarget)} must be a full link starting with http:// or https:// (max 255 characters)`);
            return;
        }

        if (missingCopyUrls) {
            setError('Please fill in Post URL for all selected websites (required for Niche Edit orders)');
            return;
        }

        // Niche Edit: validate each Post URL matches its selected blogger website domain
        if (isNicheEdit) {
            for (const sw of selectedWebsites) {
                const siteDomain = (sw.website.root_domain || sw.website.domain_url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
                const normalizedUrl = (sw.copyUrl || '').replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
                if (siteDomain && !normalizedUrl.startsWith(siteDomain)) {
                    setError(`Post URL "${sw.copyUrl}" does not match the selected website "${sw.website.root_domain || sw.website.domain_url}". URL must start with the site domain and can include additional paths.`);
                    return;
                }
            }
        }

        try {
            setSubmitting(true);
            setError('');

            const websiteIds = selectedWebsites.map(sw => sw.website.id);
            const websiteData = selectedWebsites.map(sw => ({
                id: sw.website.id,
                website_id: sw.website.id,
                note: sw.note || '',
                copyUrl: isNicheEdit ? (sw.copyUrl || '') : '', // post URL only applies to Niche Edit orders
                anchor: (sw.anchor || '').trim(),
                target_url: withScheme(sw.targetUrl)
            }));
            // Only what the team actually wrote in the general note (an empty editor can still hold "<p><br></p>")
            const noteText = String(globalNote || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            const notes = noteText ? globalNote : '';

            await teamAPI.submitWebsitesToManager(id, websiteIds, notes, websiteData);

            clearNoteSaved(); // Clear auto-saved global note
            setSuccess('Websites submitted to Manager successfully!');
            setTimeout(() => {
                navigate('/teams/order-notifications');
            }, 1500);
        } catch (err) {
            console.error('Submit ERROR:', err);
            setError(err.message || 'Failed to submit websites');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary-cyan)]"></div>
                    <div className="text-[var(--text-secondary)]">Loading order details...</div>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="premium-card p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <p className="text-red-400 text-lg mb-4">Order not found or you don't have access.</p>
                <button
                    onClick={() => navigate('/teams/order-notifications')}
                    className="premium-btn bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90"
                >
                    Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/teams/order-notifications')}
                    className="p-2 rounded-xl hover:bg-[var(--background-dark)] border border-transparent hover:border-[var(--border)] transition-all"
                >
                    <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Push to Manager</h1>
                    <p className="text-[var(--text-muted)]">Order {task.manual_order_id || `#${task.id}`} • Select <span className="text-[var(--primary-cyan)] font-bold">{requiredLinks}</span> website(s)</p>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="premium-card p-4 border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="premium-card p-4 border-green-500/20 bg-green-500/10 text-green-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* Order Details Card */}
            <div className="premium-card p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                    <Globe className="h-4 w-4 text-[var(--primary-cyan)]" />
                    Order Details
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Order ID</span>
                        <div className="font-mono text-[var(--primary-cyan)]">{task.manual_order_id || `#${task.id}`}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Client</span>
                        <div className="text-[var(--text-primary)]">{task.client_name || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Client Website</span>
                        <div className="text-[var(--text-primary)]">
                            {task.client_website ? (
                                <a href={task.client_website.startsWith('http') ? task.client_website : `https://${task.client_website}`} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-cyan)] hover:underline break-all">
                                    {task.client_website}
                                </a>
                            ) : 'N/A'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Type</span>
                        <div className="premium-badge inline-flex">{task.order_type || 'Guest Post'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Required Links</span>
                        <div className="text-[var(--primary-cyan)] font-bold text-lg">{requiredLinks}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Category</span>
                        <div className="text-[var(--text-primary)]">{task.category || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Package</span>
                        <div className="text-[var(--text-primary)]">{task.order_package || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Manager</span>
                        <div className="text-[var(--text-primary)]">{task.manager_name || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">FC</span>
                        <div className={task.fc ? 'text-green-400' : 'text-[var(--text-muted)]'}>{task.fc ? 'Yes' : 'No'}</div>
                    </div>
                </div>

                {/* Manager Instructions */}
                {task.notes && (
                    <div className="mt-6 pt-6 border-t border-[var(--border)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
                            Manager Instructions
                        </h3>
                        <div
                            className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm text-[var(--text-primary)]"
                            dangerouslySetInnerHTML={{ __html: task.notes }}
                        />
                    </div>
                )}
            </div>

            {/* Website Selection */}
            <div className="premium-card p-6">
                {/* Tabs: pick websites from the inventory, or search their posts by keyword */}
                <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-4">
                    {[
                        { key: 'select', label: 'Select Websites', icon: Search },
                        { key: 'keyword', label: 'Search Keyword', icon: FileSearch }
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setSelectionMode(t.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${selectionMode === t.key
                                ? 'bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--primary-cyan)]/30'
                                : 'text-[var(--text-secondary)] border border-transparent hover:bg-white/5'}`}
                        >
                            <t.icon className="h-4 w-4" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {selectionMode === 'keyword' ? (
                    <KeywordSearchPanel
                        taskId={id}
                        selectedWebsites={selectedWebsites}
                        onSelectPost={handleSelectPost}
                    />
                ) : (<>
                {/* Filter Section */}
                <div className="bg-[var(--background-dark)] rounded-xl p-5 mb-6 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-4 w-4 text-[var(--primary-cyan)]" />
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                            Filters {hasActiveFilters && <span className="font-normal text-[var(--primary-cyan)]">({total} results)</span>}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Domain Filter */}
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1.5 ml-1">Root Domain</label>
                            <input
                                type="text"
                                placeholder="e.g. example.com"
                                className="premium-input w-full"
                                value={filters.domain}
                                onChange={(e) => setFilters(f => ({ ...f, domain: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            />
                        </div>

                        {/* Traffic Filter */}
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1.5 ml-1">Min Traffic</label>
                            <input
                                type="number"
                                placeholder="e.g. 1000"
                                className="premium-input w-full"
                                value={filters.traffic}
                                onChange={(e) => setFilters(f => ({ ...f, traffic: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            />
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="text-xs text-[var(--text-muted)] block mb-1.5 ml-1">Category</label>
                            <input
                                type="text"
                                placeholder="e.g. Technology"
                                className="premium-input w-full"
                                value={filters.category}
                                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            />
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleApplyFilters}
                                disabled={websitesLoading}
                                className="premium-btn bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90 h-[42px] px-4"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearFilters}
                                    disabled={websitesLoading}
                                    className="premium-btn bg-transparent border border-[var(--border)] hover:bg-[var(--background-dark)] text-[var(--text-secondary)] h-[42px] px-4"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="flex gap-2 mt-4 flex-wrap">
                            {activeFilters.domain && (
                                <span className="premium-badge bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20 pl-2 pr-3 py-1 flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> {activeFilters.domain}
                                </span>
                            )}
                            {activeFilters.traffic && (
                                <span className="premium-badge bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20 pl-2 pr-3 py-1 flex items-center gap-1">
                                    <BarChart2 className="h-3 w-3" /> ≥{activeFilters.traffic}
                                </span>
                            )}
                            {activeFilters.category && (
                                <span className="premium-badge bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20 pl-2 pr-3 py-1 flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> {activeFilters.category}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Search Bar (for current page local filter) */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Quick filter in current page..."
                        className="premium-input w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Available Websites Table with Checkboxes */}
                <div className="premium-table-container max-h-[400px]">
                    <table className="premium-table">
                        <thead className="sticky top-0 z-10 bg-[var(--background-dark)] shadow-sm">
                            <tr>
                                <th className="w-10 text-center">
                                    <span className="sr-only">Select</span>
                                </th>
                                <th>Root Domain</th>
                                <th>Website Status</th>
                                <th>Category</th>
                                <th>{task?.order_type?.toLowerCase().includes('niche') ? (task?.fc ? 'Niche Price (FC)' : 'Niche Price') : (task?.fc ? 'GP Price (FC)' : 'GP Price')}</th>
                                <th>DR</th>
                                <th>RD</th>
                                <th>DA</th>
                                <th>Spam Score</th>
                                <th>Traffic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWebsites.map((website) => (
                                <tr
                                    key={website.id}
                                    className={`cursor-pointer transition-colors ${isSelected(website.id) ? 'bg-[var(--primary-cyan)]/5' : 'hover:bg-white/5'}`}
                                    onClick={() => handleToggleWebsite(website)}
                                >
                                    <td className="text-center px-2">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected(website.id) ? 'bg-[var(--primary-cyan)] border-[var(--primary-cyan)]' : 'border-[var(--text-muted)] hover:border-[var(--text-secondary)]'}`}>
                                            {isSelected(website.id) && <CheckCircle className="h-3.5 w-3.5 text-black" />}
                                        </div>
                                    </td>
                                    <td className={`font-medium ${isSelected(website.id) ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-primary)]'}`}>
                                        {website.root_domain || website.domain_url}
                                    </td>
                                    <td>
                                        {(() => {
                                            const status = website.website_status || '';
                                            let badgeClass = 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
                                            if (status === 'Approved' || status === 'Active') {
                                                badgeClass = 'bg-green-500/10 text-green-400 border border-green-500/20';
                                            } else if (status === 'Rejected') {
                                                badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
                                            } else if (status.toLowerCase().includes('acceptable') || status.toLowerCase().includes('accaptable') || status.toLowerCase().includes('acceptaable')) {
                                                badgeClass = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
                                            } else if (status.toLowerCase().includes('traffic') || status.toLowerCase().includes('decline')) {
                                                badgeClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                                            }
                                            return (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                                                    {status || '-'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="max-w-[150px] truncate" title={website.category || website.website_niche || ''}>
                                        {website.category || website.website_niche || '-'}
                                    </td>
                                    <td className="font-mono text-[var(--success)]">
                                        ${task?.order_type?.toLowerCase().includes('niche')
                                            ? (task?.fc
                                                ? (website.fc_ne || website.niche_price || website.niche_edit_price || 0)
                                                : (website.niche_price || website.niche_edit_price || 0))
                                            : (task?.fc
                                                ? (website.fc_gp || website.gp_price || 0)
                                                : (website.gp_price || 0))
                                        }
                                    </td>
                                    <td>{website.dr || '-'}</td>
                                    <td>{website.rd || '-'}</td>
                                    <td>{website.da || '-'}</td>
                                    <td>{website.spam_score || '-'}</td>
                                    <td>{website.traffic?.toLocaleString() || website.traffic_source?.toLocaleString() || '-'}</td>
                                </tr>
                            ))}
                            {filteredWebsites.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        No websites found matching your criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-sm text-[var(--text-muted)]">
                        Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total} websites
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || websitesLoading}
                            className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {[1, 2, 3, 4, 5].filter(p => p <= totalPages).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p
                                        ? 'bg-[var(--primary-cyan)] text-black'
                                        : 'hover:bg-[var(--background-dark)] text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                            {totalPages > 5 && <span className="text-[var(--text-muted)] px-1">...</span>}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || websitesLoading}
                            className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                </>)}
            </div>

            {/* Selected Websites Section */}
            <div className="premium-card p-6 border-[var(--primary-cyan)]/30 shadow-[0_0_20px_rgba(107,240,255,0.05)]">
                <h2 className="text-lg font-semibold mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[var(--primary-cyan)]" />
                        Selected Sites ({selectedWebsites.length})
                    </div>
                    {!canSubmit && (
                        <span className="text-sm bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                            Select at least {requiredLinks}
                        </span>
                    )}
                </h2>

                {selectedWebsites.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--background-dark)]/50">
                        <Globe className="h-8 w-8 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                        <p className="text-[var(--text-muted)]">No websites selected yet.</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Browse the table above and click rows to select.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedWebsites.map((item, index) => (
                            <div key={item.website.id} className="rounded-xl p-5 bg-[var(--background-dark)] border border-[var(--border)] relative group">
                                <button
                                    onClick={() => handleRemoveWebsite(item.website.id)}
                                    className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                    title="Remove"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Site Info */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary-cyan)]/10 flex items-center justify-center text-[var(--primary-cyan)] font-bold text-xs border border-[var(--primary-cyan)]/30">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-primary)] font-bold text-lg flex items-center gap-2 flex-wrap">
                                                    {item.website.root_domain || item.website.domain_url}
                                                    {item.keyword && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.3)' }}>
                                                            Keyword: {item.keyword}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                                                    <DollarSign className="h-3 w-3" />
                                                    {task?.order_type?.toLowerCase().includes('niche')
                                                        ? (task?.fc ? 'Niche Price (FC): ' : 'Niche Price: ')
                                                        : (task?.fc ? 'GP Price (FC): ' : 'GP Price: ')}
                                                    <span className="text-[var(--success)] font-mono">
                                                        ${task?.order_type?.toLowerCase().includes('niche')
                                                            ? (task?.fc
                                                                ? (item.website.fc_ne || item.website.niche_edit_price || item.website.niche_price || 0)
                                                                : (item.website.niche_edit_price || item.website.niche_price || 0))
                                                            : (task?.fc
                                                                ? (item.website.fc_gp || item.website.gp_price || 0)
                                                                : (item.website.gp_price || 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input Fields */}
                                    <div className="space-y-3">
                                        {/* Copy URL - Only for Niche Edit orders */}
                                        {task?.order_type?.toLowerCase().includes('niche') && (
                                            <div>
                                                <label className="text-xs text-[var(--text-muted)] block mb-1 font-semibold">Post URL <span className="text-red-400">*</span></label>
                                                <input
                                                    className="premium-input w-full py-2 text-sm"
                                                    placeholder="Enter existing post URL..."
                                                    value={item.copyUrl || ''}
                                                    onChange={(e) => handleUpdateCopyUrl(item.website.id, e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-[var(--text-muted)] block mb-1 font-semibold">Anchor Text <span className="text-red-400">*</span></label>
                                                <input
                                                    className="premium-input w-full py-2 text-sm"
                                                    placeholder="e.g. weed delivery"
                                                    value={item.anchor || ''}
                                                    onChange={(e) => handleUpdateField(item.website.id, 'anchor', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[var(--text-muted)] block mb-1 font-semibold">Target URL <span className="text-red-400">*</span></label>
                                                <input
                                                    className="premium-input w-full py-2 text-sm"
                                                    placeholder="https://client-site.com/page"
                                                    value={item.targetUrl || ''}
                                                    onChange={(e) => handleUpdateField(item.website.id, 'targetUrl', e.target.value)}
                                                    onBlur={(e) => handleUpdateField(item.website.id, 'targetUrl', withScheme(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-[var(--text-muted)] block mb-1 font-semibold">Note <span className="font-normal">(optional)</span></label>
                                            <textarea
                                                className="premium-input w-full py-2 text-sm min-h-[60px]"
                                                placeholder="Specific instructions for this site..."
                                                rows={2}
                                                value={item.note}
                                                onChange={(e) => handleUpdateNote(item.website.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Global Note */}
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                    <RichTextEditor
                        label="Global Note (Optional)"
                        value={globalNote}
                        onChange={setGlobalNote}
                        placeholder="Add a summary note for the manager..."
                    />
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !canSubmit}
                        className={`premium-btn px-8 py-3 text-base flex items-center gap-2 ${canSubmit
                            ? 'bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90 shadow-[0_0_20px_rgba(107,240,255,0.3)] hover:shadow-[0_0_30px_rgba(107,240,255,0.4)]'
                            : 'bg-[#2A2A2A] text-gray-500 border border-gray-700 cursor-not-allowed'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Submit to Manager ({selectedWebsites.length}/{requiredLinks})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div >
    );
};

/**
 * "Search Keyword" tab: budget + keyword → blog posts (from site sitemaps) of sites within budget.
 * The server picks the price by order type (FC → FC price) and skips sites with N/A / 0 price.
 */
const KeywordSearchPanel = ({ taskId, selectedWebsites, onSelectPost }) => {
    const [budget, setBudget] = useState('');
    const [keyword, setKeyword] = useState('');
    const [result, setResult] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20; // websites per page

    // Keyword score per post ({ [url]: score result }), filled in a few posts at a time after each search
    const [scores, setScores] = useState({});
    const [sortByScore, setSortByScore] = useState(false);
    const [pickError, setPickError] = useState('');
    const [verifyingUrl, setVerifyingUrl] = useState(null); // post being re-checked live before it's picked
    const searchSeq = useRef(0);

    const loadScores = async (posts, searchedKeyword, seq) => {
        const urls = posts.map(p => p.post_url);
        const chunks = [];
        for (let i = 0; i < urls.length; i += 5) chunks.push(urls.slice(i, i + 5));
        await Promise.all(chunks.map(async (chunk) => {
            try {
                const data = await teamAPI.keywordScores(taskId, searchedKeyword, chunk);
                if (seq !== searchSeq.current) return; // a newer search started
                setScores(prev => {
                    const next = { ...prev };
                    for (const s of data.scores || []) next[s.url] = s;
                    for (const u of chunk) if (!next[u]) next[u] = { url: u, status: 'error', score: null };
                    return next;
                });
            } catch {
                if (seq !== searchSeq.current) return;
                setScores(prev => {
                    const next = { ...prev };
                    for (const u of chunk) next[u] = { url: u, status: 'error', score: null };
                    return next;
                });
            }
        }));
    };

    const runSearch = async (targetPage = 1) => {
        if (!(parseFloat(budget) > 0)) { setSearchError('Please enter your budget first'); return; }
        if (!keyword.trim()) { setSearchError('Please enter a keyword'); return; }
        const seq = ++searchSeq.current;
        try {
            setSearching(true);
            setSearchError('');
            const data = await teamAPI.keywordSearch(taskId, { budget, keyword: keyword.trim(), page: targetPage, limit: pageSize });
            if (seq !== searchSeq.current) return;
            setResult(data);
            setPage(targetPage);
            setScores({});
            setSortByScore(false);
            setPickError('');
            loadScores((data.sites || []).flatMap(s => s.candidates), keyword.trim(), seq);
        } catch (err) {
            setSearchError(err.message || 'Search failed');
        } finally {
            setSearching(false);
        }
    };

    // Optional: re-order the current page by score (posts still being checked go last)
    // One row per website: once all its candidate posts are scored, show the best one
    // (highest score, then most mentions, then the link-match order from the server)
    // Posts whose article already links to the client website are never suggested
    const linksToClient = (c) => scores[c.post_url]?.links_to_client === true;
    const bestOf = (site) => {
        const checked = site.candidates.filter(c => scores[c.post_url]).length;
        const pending = checked < site.candidates.length;
        const usable = site.candidates.filter(c => !linksToClient(c));
        if (!pending && usable.length === 0) return null; // every candidate already links to the client → hide the site
        let best = usable[0] || site.candidates[0];
        if (!pending) {
            const okOnes = usable.filter(c => scores[c.post_url]?.status === 'ok');
            if (okOnes.length) {
                best = [...okOnes].sort((a, b) =>
                    (scores[b.post_url].score - scores[a.post_url].score) ||
                    ((scores[b.post_url].mentions || 0) - (scores[a.post_url].mentions || 0)))[0];
            }
        }
        return { ...site, ...best, _pending: pending, _checked: checked };
    };
    const rows = !result ? [] : result.sites.map(bestOf).filter(Boolean);
    const hiddenPosts = !result ? 0 : result.sites.reduce((n, s) => n + s.candidates.filter(linksToClient).length, 0);
    const hiddenSites = !result ? 0 : result.sites.length - rows.length;
    const scoreKey = (r) => (r._pending ? -1 : scores[r.post_url]?.score ?? -1); // still checking → last
    const shownPosts = !sortByScore ? rows : [...rows].sort((a, b) => scoreKey(b) - scoreKey(a));
    const scoresPending = rows.some(r => r._pending);

    const renderScore = (post) => {
        if (post._pending) {
            return (
                <span className="text-xs text-[var(--text-muted)] animate-pulse whitespace-nowrap">
                    Checking{post.candidates.length > 1 ? ` ${post._checked}/${post.candidates.length}` : ''}…
                </span>
            );
        }
        const s = scores[post.post_url];
        if (!s) return <span className="text-xs text-[var(--text-muted)] animate-pulse">Checking…</span>;
        if (s.status !== 'ok') {
            return (
                <span className="text-xs text-[var(--text-muted)]" title={`This site blocks automatic checks – open the post to check it yourself${result?.client_domain ? ` (including whether it already links to ${result.client_domain})` : ''}`}>
                    Can't check
                </span>
            );
        }
        const color = s.score >= 80 ? { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', bd: 'rgba(34,197,94,0.3)' }
            : s.score >= 50 ? { bg: 'rgba(234,179,8,0.12)', fg: '#ca8a04', bd: 'rgba(234,179,8,0.3)' }
                : s.score > 0 ? { bg: 'rgba(249,115,22,0.12)', fg: '#ea580c', bd: 'rgba(249,115,22,0.3)' }
                    : { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626', bd: 'rgba(239,68,68,0.3)' };
        const mark = (v) => (v >= 100 ? '✅' : v > 0 ? '🟡' : '❌');
        const tip = [
            `Score ${s.score}%`,
            `${mark(s.parts.url)} Permalink: ${s.parts.url}% of keyword words (30%)`,
            `${mark(s.parts.h1)} H1: ${s.parts.h1}% of keyword words (30%)`,
            `${mark(s.parts.content)} Content: ${s.parts.content}% (40%)`,
            `Mentions: H1 ${s.h1_mentions ?? 0}× · Article ${s.content_mentions ?? s.mentions}× = ${s.mentions}×`,
            ...((s.word_mentions || []).length > 1 ? s.word_mentions.map(w => `     "${w.word}" × ${w.count} in article`) : []),
            s.heading ? `H1: ${s.heading}` : ''
        ].filter(Boolean).join('\n');
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-help"
                style={{ backgroundColor: color.bg, color: color.fg, border: `1px solid ${color.bd}` }}
                title={tip}
            >
                {s.score}%<span style={{ opacity: 0.75, fontWeight: 500 }}>· {s.mentions}×</span>
            </span>
        );
    };

    const isPostSelected = (post) => selectedWebsites.some(sw => sw.website.id === post.id && sw.copyUrl === post.post_url && sw.keyword === searchedKeyword);

    // Picking a post: first re-read it live, in case it gained a client link since it was last read
    // (or was used in one of our orders for this client meanwhile). Unselecting needs no check.
    const handleRowClick = async (post) => {
        if (verifyingUrl) return;
        if (post._pending) {
            setPickError(`Still comparing ${post.root_domain}'s posts – please wait a moment.`);
            return;
        }
        if (!isPostSelected(post) && result?.client_domain) {
            setVerifyingUrl(post.post_url);
            setPickError('');
            try {
                const v = await teamAPI.verifyPost(taskId, post.post_url);
                if (v.links_to_client || v.used_before) {
                    // Hide this post; the site's next-best post takes its place
                    setScores(prev => ({ ...prev, [post.post_url]: { ...(prev[post.post_url] || {}), links_to_client: true } }));
                    setPickError(v.links_to_client
                        ? `This post now links to ${v.client_domain}, so it can't be used. Please pick another post.`
                        : `This post was already used for ${v.client_domain} in one of our orders. Please pick another post.`);
                    return;
                }
            } catch {
                // Couldn't re-check right now – let the pick go ahead with the earlier check
            } finally {
                setVerifyingUrl(null);
            }
        }
        setPickError(onSelectPost(post, searchedKeyword) || '');
    };
    const isSiteSelected = (post) => selectedWebsites.some(sw => sw.website.id === post.id);
    // The keyword these results are for, and the post already picked for it (one pick per keyword)
    const searchedKeyword = (result?.words || []).join(' ');
    const keywordPick = searchedKeyword ? selectedWebsites.find(sw => sw.keyword === searchedKeyword) : null;
    const totalPages = result?.pagination?.totalPages || 1;
    const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');

    return (
        <div>
            {/* Budget + keyword */}
            <div className="bg-[var(--background-dark)] rounded-xl p-5 mb-6 border border-[var(--border)]">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-4">
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1.5 ml-1">Budget ($) *</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="e.g. 15"
                            className="premium-input w-full"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runSearch(1)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1.5 ml-1">Keyword *</label>
                        <input
                            type="text"
                            placeholder='e.g. "weed online"'
                            className="premium-input w-full"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runSearch(1)}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => runSearch(1)}
                            disabled={searching}
                            className="premium-btn bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90 h-[42px] px-5"
                        >
                            <Search className={`h-4 w-4 ${searching ? 'animate-pulse' : ''}`} />
                            Search
                        </button>
                    </div>
                </div>
                {searchError && <p className="text-sm text-red-400 mt-3">{searchError}</p>}
                {result && !searchError && (
                    <p className="text-xs text-[var(--text-muted)] mt-3">
                        {result.order_type}{result.fc ? ' (FC)' : ''} order · using <span className="text-[var(--text-primary)] font-medium">{result.price_used}</span> ·{' '}
                        {result.sites_in_budget} site{result.sites_in_budget === 1 ? '' : 's'} within ${result.budget}
                        {' '}({result.sites_indexed} with posts indexed) ·{' '}
                        <span className="text-[var(--primary-cyan)] font-medium">{result.pagination.total} website{result.pagination.total === 1 ? '' : 's'} with matching posts</span>
                    </p>
                )}
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Posts left out because they were already used for this client in our earlier orders */}
                    {result.client_domain && result.used_before_hidden > 0 && (
                        <div className="mb-1 px-1 text-xs text-[var(--text-muted)]">
                            📋 <b>{result.used_before_hidden}</b> matching post{result.used_before_hidden === 1 ? '' : 's'} left out because {result.used_before_hidden === 1 ? 'it was' : 'they were'} already used for <b>{result.client_domain}</b> in our earlier orders.
                        </div>
                    )}
                    {/* Posts skipped because their article already links to the client website */}
                    {result.sites.length > 0 && (
                        <div className="mb-3 px-1 text-xs text-[var(--text-muted)]">
                            {!result.client_domain
                                ? 'This order has no client website, so posts are not checked for an existing client link.'
                                : hiddenPosts > 0
                                    ? <>🔗 <b>{hiddenPosts}</b> post{hiddenPosts === 1 ? '' : 's'} hidden because the article already links to <b>{result.client_domain}</b>{hiddenSites > 0 ? <> ({hiddenSites} website{hiddenSites === 1 ? '' : 's'} removed from this page)</> : null}.</>
                                    : scoresPending
                                        ? <>Checking posts for existing links to <b>{result.client_domain}</b>…</>
                                        : <>No post on this page links to <b>{result.client_domain}</b> yet.</>}
                        </div>
                    )}
                    {/* One pick per keyword */}
                    {result.sites.length > 0 && (
                        <div
                            className="mb-3 px-3 py-2 rounded-lg text-xs"
                            style={keywordPick
                                ? { backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--text-primary)' }
                                : { backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        >
                            {keywordPick
                                ? <>✓ Picked for "<b>{searchedKeyword}</b>": <b>{keywordPick.website.root_domain}</b> — click another post to replace it, or search a new keyword for the next site.</>
                                : <>Pick <b>one</b> post for "<b>{searchedKeyword}</b>". To add more sites, search another keyword.</>}
                        </div>
                    )}
                    {pickError && (
                        <div className="mb-3 px-3 py-2 rounded-lg text-xs text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            {pickError}
                        </div>
                    )}
                    {result.sites.length > 0 && (
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs text-[var(--text-muted)]">
                                {scoresPending
                                    ? 'Comparing up to 5 posts per website (permalink, H1 and content) to show each site’s best post…'
                                    : 'Score = keyword in Permalink (30%) + H1 (30%) + Content (40%). Hover a score for details.'}
                            </span>
                            <button
                                onClick={() => setSortByScore(v => !v)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${sortByScore
                                    ? 'bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/30'
                                    : 'text-[var(--text-secondary)] border-[var(--border)] hover:bg-white/5'}`}
                            >
                                {sortByScore ? '✓ Sorted by score' : 'Sort by score'}
                            </button>
                        </div>
                    )}
                    <div className="premium-table-container">
                        <table className="premium-table">
                            <thead className="sticky top-0 z-10 bg-[var(--background-dark)] shadow-sm">
                                <tr>
                                    <th className="w-10 text-center"><span className="sr-only">Select</span></th>
                                    <th>Post</th>
                                    <th>Score</th>
                                    <th>Website</th>
                                    <th>Price</th>
                                    <th>DR</th>
                                    <th>DA</th>
                                    <th>Traffic</th>
                                    <th>Post Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shownPosts.map((post) => {
                                    const selected = isPostSelected(post);
                                    return (
                                        <tr
                                            key={post.id}
                                            className={`cursor-pointer transition-colors ${selected ? 'bg-[var(--primary-cyan)]/5' : 'hover:bg-white/5'}`}
                                            onClick={() => handleRowClick(post)}
                                            title={selected ? 'Click to unselect' : keywordPick ? 'Click to pick this post instead (one post per keyword)' : isSiteSelected(post) ? 'This site is already selected' : 'Click to select this post'}
                                        >
                                            <td className="text-center px-2">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-[var(--primary-cyan)] border-[var(--primary-cyan)]' : 'border-[var(--text-muted)]'}`}>
                                                    {selected && <CheckCircle className="h-3.5 w-3.5 text-black" />}
                                                </div>
                                            </td>
                                            <td className="max-w-[420px]">
                                                <div className={`font-medium truncate ${selected ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-primary)]'}`} title={post.post_title}>
                                                    {post.post_title || post.post_url}
                                                </div>
                                                <a
                                                    href={post.post_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--primary-cyan)] truncate flex items-center gap-1"
                                                    title={post.post_url}
                                                >
                                                    <span className="truncate">{post.post_url}</span>
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>{verifyingUrl === post.post_url ? <span className="text-xs text-[var(--primary-cyan)] animate-pulse whitespace-nowrap">Verifying…</span> : renderScore(post)}</td>
                                            <td>
                                                <div className="font-medium text-[var(--text-primary)]">{post.root_domain}</div>
                                                {post.matching_posts > 1 && (
                                                    <div className="text-[11px] text-[var(--text-muted)]" title={`Best of the top ${post.candidates.length} matching posts on this site, by score`}>
                                                        {post._pending ? `comparing ${post.candidates.length} posts` : `best of ${post.matching_posts} matching posts`}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="font-mono text-[var(--success)]">${Number(post.budget_price)}</td>
                                            <td>{post.dr || '-'}</td>
                                            <td>{post.da || '-'}</td>
                                            <td>{post.traffic ? Number(post.traffic).toLocaleString() : '-'}</td>
                                            <td className="text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(post.post_date)}</td>
                                        </tr>
                                    );
                                })}
                                {shownPosts.length === 0 && !scoresPending && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                            No posts found for "{keyword}" on sites within ${result.budget}. Try another keyword or a higher budget.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                            <span className="text-sm text-[var(--text-muted)]">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => runSearch(page - 1)}
                                    disabled={page === 1 || searching}
                                    className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => runSearch(page + 1)}
                                    disabled={page >= totalPages || searching}
                                    className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!result && (
                <p className="text-sm text-[var(--text-muted)] text-center py-10">
                    Enter your budget and a keyword to find matching blog posts on sites within budget.
                </p>
            )}
        </div>
    );
};

export default PushToManager;
