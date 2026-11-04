import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { managerAPI } from '../../../lib/api';
import { ArrowLeft, Search, Trash2, Send, AlertCircle, ChevronLeft, ChevronRight, Filter, X, Globe, CheckCircle, DollarSign, Link2, FileText, Users } from 'lucide-react';
import { RichTextEditor } from '../../../components/RichTextEditor';

// Dropdown options
const ORDER_TYPE_OPTIONS = ['New Order', 'Sub Order'];
const CONTENT_TYPE_OPTIONS = ['Guest Post', 'Niche Edit'];
const GP_PACKAGE_OPTIONS = [
    'Basic Ahrefs Traffic 500 To 1000', 'Silver Ahrefs Traffic 1000 To 3000',
    'Gold Ahrefs Traffic 3000 To 5000', 'Platinum Ahrefs Traffic 5000 To 10000',
    'Enterprise Ahrefs Traffic 10000+'
];
const NICHE_PACKAGE_OPTIONS = [
    'Basic Ahrefs Ref-Domain Upto 400', 'Standard Ahrefs Ref-Domain 400 to 1000',
    'Pro Min. Ahrefs Ref-Domain 1000+', 'Elite Ahrefs Ref-Domain 3000+'
];
const FC_NO_CATEGORIES = [
    'Adult Relationships and Sex', 'Agriculture & Farming', 'Animals and Pets', 'Business and Entrepreneurship',
    'Digital Marketing SEO and Advertising', 'Education', 'Entertainment Music Movies and Recreation',
    'Fashion and Lifestyle', 'Finance and Investing', 'Health and Fitness', 'Technology', 'Travel', 'General Blog'
];

/**
 * DirectWriterOrder - SUPER WORKFLOW (Skip Team)
 * Manager creates order + selects websites + fills Team fields + Manager Approval → Push to Writer
 * 
 * PHASES:
 * Step 1: Order Details (Manager)
 * Step 2: Select Websites + Team Fields (Team Task - Manager does it)
 * Step 3: Manager Approval - Add Target URL, Anchor, Title per site + Select Writer
 */
export const DirectWriterOrder = () => {
    const navigate = useNavigate();

    // Order form state
    const [form, setForm] = useState({
        order_type_toggle: 'New Order',
        manual_order_id: '',
        client_name: '',
        client_website: '',
        contentType: 'Guest Post',
        fc: false,
        order_package: '',
        category: '',
        notes: ''
    });

    const isSubOrder = form.order_type_toggle === 'Sub Order';

    // Website selection state
    const [websites, setWebsites] = useState([]);
    const [selectedWebsites, setSelectedWebsites] = useState([]);
    const [websitesLoading, setWebsitesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 15;

    // Filters
    const [filters, setFilters] = useState({ domain: '', traffic: '', category: '' });
    const [activeFilters, setActiveFilters] = useState({ domain: '', traffic: '', category: '' });

    // Writers
    const [writers, setWriters] = useState([]);
    const [selectedWriterId, setSelectedWriterId] = useState('');
    const [writerInstructions, setWriterInstructions] = useState('');

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check if Guest Post or Niche Edit order
    const isGuestPost = form.contentType?.toLowerCase().includes('guest') || form.contentType?.toLowerCase() === 'gp';
    const isNicheEdit = form.contentType?.toLowerCase().includes('niche');

    // No of links = no of selected websites (since we skip team)
    const noOfLinks = selectedWebsites.length;

    // Fetch writers on mount
    useEffect(() => {
        const fetchWriters = async () => {
            try {
                const data = await managerAPI.getWriters();
                setWriters(data.users || []);
            } catch (err) {
                console.error('Error fetching writers:', err);
            }
        };
        fetchWriters();
    }, []);

    // Fetch websites
    const fetchWebsites = useCallback(async () => {
        try {
            setWebsitesLoading(true);
            const params = { page, limit: pageSize, filter_website_status: 'Approved' };
            if (activeFilters.domain) params.search_domain = activeFilters.domain;
            if (activeFilters.traffic) {
                params.filter_traffic_val = activeFilters.traffic;
                params.filter_traffic_op = '>'; 
            }
            if (activeFilters.category) params.search_category = activeFilters.category;

            const data = await managerAPI.getWebsites(params);
            setWebsites(data.sites || data.websites || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
        } catch (err) {
            console.error('Error fetching websites:', err);
        } finally {
            setWebsitesLoading(false);
        }
    }, [page, activeFilters]);

    useEffect(() => { fetchWebsites(); }, [fetchWebsites]);

    const handleApplyFilters = () => { setActiveFilters({ ...filters }); setPage(1); };
    const handleClearFilters = () => {
        setFilters({ domain: '', traffic: '', category: '' });
        setActiveFilters({ domain: '', traffic: '', category: '' });
        setPage(1);
    };

    const hasActiveFilters = activeFilters.domain || activeFilters.traffic || activeFilters.category;
    const canSubmit = selectedWebsites.length > 0 && form.client_name && selectedWriterId;

    // Filter websites based on search
    const filteredWebsites = useMemo(() => {
        if (!searchTerm) return websites;
        const term = searchTerm.toLowerCase();
        return websites.filter(w =>
            (w.root_domain || w.domain_url || '').toLowerCase().includes(term) ||
            (w.category || '').toLowerCase().includes(term)
        );
    }, [websites, searchTerm]);

    const isSelected = (websiteId) => selectedWebsites.some(sw => sw.website.id === websiteId);

    const handleToggleWebsite = (website) => {
        if (isSelected(website.id)) {
            setSelectedWebsites(selectedWebsites.filter(sw => sw.website.id !== website.id));
        } else {
            setSelectedWebsites([...selectedWebsites, {
                website,
                // Team Fields
                team_note: '',
                copy_url: '', // Post URL for Niche Edit (Team fills this)
                // Manager Approval fields
                target_url: '',
                anchor_text: '',
                article_title: '',
                upfront_payment: false,
                paypal_id: ''
            }]);
        }
    };

    const handleUpdateField = (websiteId, field, value) => {
        setSelectedWebsites(selectedWebsites.map(sw =>
            sw.website.id === websiteId ? { ...sw, [field]: value } : sw
        ));
    };

    const handleRemoveWebsite = (websiteId) => {
        setSelectedWebsites(selectedWebsites.filter(sw => sw.website.id !== websiteId));
    };

    const onChange = (k) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [k]: value });
        setError('');
    };

    // Submit: Create Order + Push to Writer
    const handleSubmit = async () => {
        if (!canSubmit) {
            setError('Please fill client name, select at least 1 website, and choose a writer');
            return;
        }

        // Validate required fields
        const missingFields = selectedWebsites.some(sw => {
            if (!sw.target_url || !sw.anchor_text) return true;
            if (isGuestPost && !sw.article_title) return true;
            if (sw.upfront_payment && !sw.paypal_id) return true;
            return false;
        });

        if (missingFields) {
            if (isGuestPost) {
                setError('Please fill Target URL, Anchor Text, and Article Title for all websites.');
            } else {
                setError('Please fill Target URL and Anchor Text for all websites.');
            }
            return;
        }

        try {
            setLoading(true);
            setError('');

            const orderData = {
                client_name: form.client_name,
                order_type: form.contentType,
                no_of_links: noOfLinks,
                notes: form.notes,
                manual_order_id: form.manual_order_id || null,
                client_website: form.client_website || null,
                fc: form.fc,
                order_package: form.order_package || null,
                category: form.category || null
            };

            // Include all Team + Manager Approval fields
            const websitesData = selectedWebsites.map(sw => ({
                id: sw.website.id,
                note: sw.team_note || '',
                copyUrl: sw.copy_url || '',
                post_url: sw.copy_url || '', // For Niche Edit
                target_url: sw.target_url,
                anchor_text: sw.anchor_text,
                article_title: sw.article_title || '',
                upfront_payment: sw.upfront_payment,
                paypal_id: sw.paypal_id || ''
            }));

            await managerAPI.createOrderChain(orderData, 'writer', websitesData, { instructions: writerInstructions }, selectedWriterId);

            setSuccess('Order created and pushed to Writer successfully!');
            setTimeout(() => navigate('/manager/orders'), 1500);
        } catch (err) {
            setError(err.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/manager/orders/create')}
                        className="p-2 rounded-xl hover:bg-[var(--background-dark)] border border-transparent hover:border-[var(--border)] transition-all">
                        <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">
                            Direct Push to Writer
                        </h1>
                        <p className="text-[var(--text-muted)]">Create order → Select websites → Fill details → Assign Writer (Bypass Team)</p>
                    </div>
                </div>

                {/* Error/Success */}
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

                {/* STEP 1: Order Details */}
                <div className="premium-card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                        <div className="w-6 h-6 rounded-full bg-[var(--primary-cyan)]/20 flex items-center justify-center text-[var(--primary-cyan)] text-xs font-bold">1</div>
                        Order Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="premium-label">Order Type</label>
                            <select className="premium-input w-full" value={form.order_type_toggle} onChange={onChange('order_type_toggle')}>
                                {ORDER_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="premium-label">Client Name <span className="text-red-400">*</span></label>
                            <input className="premium-input w-full" value={form.client_name} onChange={onChange('client_name')} placeholder="Enter client's name" />
                        </div>
                        <div>
                            <label className="premium-label">Content Type</label>
                            <select className="premium-input w-full" value={form.contentType} onChange={onChange('contentType')}>
                                {CONTENT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="premium-label">Package Level</label>
                            <select className="premium-input w-full" value={form.order_package} onChange={onChange('order_package')}>
                                <option value="">Select Package</option>
                                {(isGuestPost ? GP_PACKAGE_OPTIONS : NICHE_PACKAGE_OPTIONS).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="premium-label">Category</label>
                            <select className="premium-input w-full" value={form.category} onChange={onChange('category')}>
                                <option value="">Select Category</option>
                                {FC_NO_CATEGORIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="premium-label">{isSubOrder ? 'Existing Order ID' : 'Order Reference ID'} {isSubOrder && <span className="text-red-400">*</span>}</label>
                            <input className="premium-input w-full" value={form.manual_order_id} onChange={onChange('manual_order_id')} placeholder={isSubOrder ? 'Enter existing order ID' : 'Optional'} />
                        </div>
                        <div>
                            <label className="premium-label">No. of Links (Auto)</label>
                            <div className="premium-input bg-[var(--background-dark)] text-[var(--primary-cyan)] font-bold flex items-center w-full">
                                {noOfLinks} {noOfLinks === 1 ? 'website' : 'websites'} selected
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 2: Website Selection */}
                <div className="premium-card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                        <div className="w-6 h-6 rounded-full bg-[var(--primary-cyan)]/20 flex items-center justify-center text-[var(--primary-cyan)] text-xs font-bold">2</div>
                        Select Websites <span className="text-[var(--text-muted)] font-normal ml-2">(Team Task - You're doing it)</span>
                    </h2>

                    {/* Filters */}
                    <div className="bg-[var(--background-dark)] rounded-xl p-5 mb-6 border border-[var(--border)]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Root Domain</label>
                                <input type="text" placeholder="e.g. example.com" className="premium-input w-full" value={filters.domain}
                                    onChange={(e) => setFilters(f => ({ ...f, domain: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()} />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Min Traffic</label>
                                <input type="number" placeholder="e.g. 1000" className="premium-input w-full" value={filters.traffic}
                                    onChange={(e) => setFilters(f => ({ ...f, traffic: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()} />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Category</label>
                                <input type="text" placeholder="e.g. Technology" className="premium-input w-full" value={filters.category}
                                    onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()} />
                            </div>
                            <div className="flex items-end gap-2">
                                <button onClick={handleApplyFilters} className="premium-btn bg-[var(--primary-cyan)] text-black h-[42px] px-4">
                                    <Search className="h-4 w-4" />
                                </button>
                                {hasActiveFilters && (
                                    <button onClick={handleClearFilters} className="premium-btn bg-transparent border border-[var(--border)] h-[42px] px-4">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Filter */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input type="text" placeholder="Quick filter..." className="premium-input w-full pl-10"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* Website Table */}
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
                                    <th>{isNicheEdit ? (form.fc ? 'Niche Price (FC)' : 'Niche Price') : (form.fc ? 'GP Price (FC)' : 'GP Price')}</th>
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
                                            ${isNicheEdit
                                                ? (form.fc
                                                    ? (website.fc_ne || website.niche_price || website.niche_edit_price || 0)
                                                    : (website.niche_price || website.niche_edit_price || 0))
                                                : (form.fc
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
                                        <td colSpan={10} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                            No websites found matching your criteria
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-[var(--text-muted)]">Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total} websites ({selectedWebsites.length} selected)</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                            <span className="px-3 text-sm">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-[var(--background-dark)] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>

                {/* STEP 3: Complete Details per Website (Team + Manager) */}
                {selectedWebsites.length > 0 && (
                    <div className="premium-card p-6 border-blue-500/30">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">3</div>
                            Complete Details per Website <span className="text-[var(--text-muted)] font-normal ml-2">({selectedWebsites.length} sites)</span>
                        </h2>

                        <div className="space-y-6">
                            {selectedWebsites.map((item, index) => (
                                <div key={item.website.id} className="rounded-xl p-5 bg-[var(--background-dark)] border-2 border-[var(--primary-cyan)]/30 relative group">
                                    <button onClick={() => handleRemoveWebsite(item.website.id)}
                                        className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4" />
                                    </button>

                                    {/* Website Header */}
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border)]">
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary-cyan)]/10 flex items-center justify-center text-[var(--primary-cyan)] font-bold">{index + 1}</div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--primary-cyan)]">{item.website.root_domain || item.website.domain_url}</h3>
                                            <div className="text-xs text-[var(--text-muted)] flex gap-4">
                                                <span>DR: {item.website.dr || '-'}</span>
                                                <span>Traffic: {item.website.traffic?.toLocaleString() || '-'}</span>
                                                <span className="text-[var(--success)]">${isGuestPost ? (item.website.gp_price || 0) : (item.website.niche_price || 0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TEAM SECTION */}
                                    <div className="mb-4">
                                        <h4 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Team Fields
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
                                            <div>
                                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                    Team Note (Optional)
                                                </label>
                                                <textarea className="premium-input w-full min-h-[60px]" rows={2} placeholder="Note from team..."
                                                    value={item.team_note || ''} onChange={(e) => handleUpdateField(item.website.id, 'team_note', e.target.value)} />
                                            </div>
                                            {isNicheEdit && (
                                                <div>
                                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider flex items-center gap-1">
                                                        <Link2 className="h-3 w-3" /> Post URL (Team Copy URL)
                                                    </label>
                                                    <input className="premium-input w-full" placeholder="https://blog.com/existing-post"
                                                        value={item.copy_url || ''} onChange={(e) => handleUpdateField(item.website.id, 'copy_url', e.target.value)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* MANAGER APPROVAL SECTION */}
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            Manager Approval
                                        </h4>
                                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                        Target URL <span className="text-red-400">*</span>
                                                    </label>
                                                    <input className="premium-input w-full" placeholder="https://example.com/target-page"
                                                        value={item.target_url || ''} onChange={(e) => handleUpdateField(item.website.id, 'target_url', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                        Anchor Text <span className="text-red-400">*</span>
                                                    </label>
                                                    <input className="premium-input w-full" placeholder="Anchor text for backlink"
                                                        value={item.anchor_text || ''} onChange={(e) => handleUpdateField(item.website.id, 'anchor_text', e.target.value)} />
                                                </div>

                                                {/* Article Title - Only for Guest Post */}
                                                {isGuestPost && (
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                            Article Title <span className="text-red-400">*</span>
                                                        </label>
                                                        <input className="premium-input w-full" placeholder="Article title"
                                                            value={item.article_title || ''} onChange={(e) => handleUpdateField(item.website.id, 'article_title', e.target.value)} />
                                                    </div>
                                                )}

                                                {/* Upfront Payment Toggle */}
                                                <div className="md:col-span-2 flex items-center gap-4 py-2 border-t border-[var(--border)] mt-2 pt-4">
                                                    <label className="text-sm font-medium text-[var(--text-primary)]">Upfront Payment</label>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => handleUpdateField(item.website.id, 'upfront_payment', true)}
                                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${item.upfront_payment ? 'bg-green-500 text-white' : 'bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                                                            Yes
                                                        </button>
                                                        <button type="button" onClick={() => handleUpdateField(item.website.id, 'upfront_payment', false)}
                                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!item.upfront_payment ? 'bg-red-500 text-white' : 'bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
                                                            No
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* PayPal ID - Only when upfront is Yes */}
                                                {item.upfront_payment && (
                                                    <div className="md:col-span-2 animate-fade-in">
                                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                                                            PayPal ID <span className="text-red-400">*</span>
                                                        </label>
                                                        <input className="premium-input w-full" placeholder="Enter PayPal ID for upfront payment"
                                                            value={item.paypal_id || ''} onChange={(e) => handleUpdateField(item.website.id, 'paypal_id', e.target.value)} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 4: Assign Writer */}
                <div className="premium-card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">4</div>
                        Assign Writer <span className="text-red-400">*</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="premium-label">Select Writer <span className="text-red-400">*</span></label>
                            <select className="premium-input w-full" value={selectedWriterId} onChange={(e) => setSelectedWriterId(e.target.value)}>
                                <option value="">Choose a writer...</option>
                                {writers.map(writer => (
                                    <option key={writer.id} value={writer.id}>{writer.username || writer.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="premium-label">Content Instructions (Optional)</label>
                            <textarea className="premium-input min-h-[80px] w-full" rows={3} placeholder="Instructions for the writer..."
                                value={writerInstructions} onChange={(e) => setWriterInstructions(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button onClick={() => navigate('/manager/orders/create')}
                        className="premium-btn border border-[var(--border)] hover:bg-white/5 px-6 py-3">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading || !canSubmit}
                        className={`premium-btn px-8 py-3 flex items-center gap-2 ${canSubmit
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90 shadow-lg'
                            : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'}`}>
                        {loading ? (
                            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> Creating...</>
                        ) : (
                            <><Send className="h-4 w-4" /> Create & Push to Writer</>
                        )}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default DirectWriterOrder;
