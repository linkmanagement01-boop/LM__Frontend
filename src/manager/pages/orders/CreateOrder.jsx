import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { managerAPI, adminAPI } from '../../../lib/api';
import { useNavigate } from 'react-router-dom';
import { RichTextEditor } from '../../../components/RichTextEditor';

// Dropdown options based on production deep dive analysis
const ORDER_TYPE_OPTIONS = ['New Order', 'Sub Order'];
const CONTENT_TYPE_OPTIONS = ['Guest Post', 'Niche Edit'];

// GP Package Options (based on Ahrefs Traffic - Image 1)
const GP_PACKAGE_OPTIONS = [
  'Basic Ahrefs Traffic 500 To 1000',
  'Silver Ahrefs Traffic 1000 To 3000',
  'Gold Ahrefs Traffic 3000 To 5000',
  'Platinum Ahrefs Traffic 5000 To 10000',
  'Enterprise Ahrefs Traffic 10000+'
];

// Niche Edit Package Options (based on Ahrefs Ref-Domain - Image 2)
const NICHE_PACKAGE_OPTIONS = [
  'Basic Ahrefs Ref-Domain Upto 400',
  'Standard Ahrefs Ref-Domain 400 to 1000',
  'Pro Min. Ahrefs Ref-Domain 1000+',
  'Elite Ahrefs Ref-Domain 3000+'
];

// Category Options - depends on FC selection
// FC = Yes: Only CBD and Casino
const FC_YES_CATEGORIES = ['CBD', 'Casino'];

// FC = No: Full list of categories (alphabetically organized)
const FC_NO_CATEGORIES = [
  // A
  'Adult Relationships and Sex',
  'Agriculture & Farming',
  'Animals and Pets',
  'Architecture and Design',
  'Arts',
  'Automobiles',
  'Aviation and Flight',
  // B
  'Banking and Financial',
  'Beauty and Cosmetics',
  'Books and Author',
  'Business and Entrepreneurship',
  // C
  'Career and Employment',
  'CBD Casino Betting and Gambling',
  'Computers and Electronics',
  'Construction and Repairs',
  'Cryptocurrency and Bitcoin',
  'Culture and Tradition',
  // D
  'Design and Web Development',
  'Digital Marketing SEO and Advertising',
  // E
  'E-commerce and Shopping',
  'Education',
  'Entertainment Music Movies and Recreation',
  'Environment',
  // F
  'Family and Parenting Child',
  'Fashion and Lifestyle',
  'Finance and Investing',
  'Food and Cuisine',
  // G
  'Gadgets',
  'Games',
  'Gardening',
  'General Blog',
  'Green Energy & Technology',
  // H
  'Hardware and Development',
  'Health and Fitness',
  'Home Appliance',
  'Home Improvement and Decor',
  'Humor',
  // I
  'Industry and Company',
  'Insurance & Investment',
  'Internet Data & Cyberlaw',
  // J
  'Job Career',
  // L
  'Legal and Law',
  'Leisure and Hobbies',
  'Literature',
  'Love and Dating Relationships',
  // M
  'Manufacturing Machinery and Equipment',
  'Marketing',
  'Medical',
  'Metallurgy',
  'Miscellaneous'
];

export const CreateOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Standard form state — no auto-save, fresh on every visit
  const [form, setForm] = useState({
    // Row 1
    orderType: 'New Order',      // New Order vs Sub Order
    assigned_team_id: '',        // Select Team dropdown
    manual_order_id: '',         // Order ID (manual entry)
    // Row 2
    client_name: '',             // Client name
    client_website: '',          // Client website
    no_of_links: 1,              // No of Links Ordered
    // Row 3
    contentType: 'Guest Post',   // Order Type (gp/niche/link insertion)
    fc: false,                   // FC (Foreign Currency) Yes/No
    order_package: '',           // Order package
    // Row 4
    category: '',                // Category
    // Row 5 (for Niche Edit only)
    post_url: '',                // Post URL (for Niche Edit orders)
    // Row 6
    notes: '',                   // Message (rich text)
    // Pricing (optional)
    niche_price: '',
    gp_price: '',
    tat_deadline: ''
  });

  // Fetch team members on mount
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoadingTeams(true);
        const data = await managerAPI.getTeamMembers();
        setTeamMembers(data.users || []);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setTeamMembers([]);
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeamMembers();
  }, []);

  const onChange = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: value });
    setError('');
  };

  const handleCreate = async (stayOnPage = false) => {
    // Validation
    if (!form.client_name) {
      setError('Client name is required');
      return;
    }
    if (!form.assigned_team_id) {
      setError('Please select a team member');
      return;
    }



    try {
      setLoading(true);
      setError('');

      const orderData = {
        client_name: form.client_name,
        order_type: form.contentType,
        no_of_links: parseInt(form.no_of_links) || 1,
        niche_price: parseFloat(form.niche_price) || 0,
        gp_price: parseFloat(form.gp_price) || 0,
        tat_deadline: form.tat_deadline || null,
        notes: form.notes,
        assigned_team_id: form.assigned_team_id ? parseInt(form.assigned_team_id) : null,
        // New Manager Panel fields
        manual_order_id: form.manual_order_id || null,
        client_website: form.client_website || null,
        fc: form.fc,
        order_package: form.order_package || null,
        category: form.category || null
      };

      await managerAPI.createOrder(orderData);

      setSuccess('Order created successfully!');

      if (stayOnPage) {
        // Reset form for new entry
        setForm({
          ...form,
          manual_order_id: '',
          client_name: '',
          client_website: '',
          no_of_links: 1,
          niche_price: '',
          gp_price: '',
          tat_deadline: '',
          notes: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Navigate away
        setTimeout(() => navigate('/manager/orders'), 1000);
      }
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({
      orderType: 'New Order',
      assigned_team_id: '',
      manual_order_id: '',
      client_name: '',
      client_website: '',
      no_of_links: 1,
      contentType: 'Guest Post',
      fc: false,
      order_package: '',
      category: '',
      notes: '',
      niche_price: '',
      gp_price: '',
      tat_deadline: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
          <span className="cursor-pointer hover:text-[var(--primary-cyan)] transition-colors" onClick={() => navigate('/manager/orders')}>View Orders</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">Create Order</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
              Create New Order
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Fill in the details below to create a new client order.</p>
          </div>
          <button className="premium-btn text-[var(--text-muted)] border border-[var(--border)] hover:bg-white/5" onClick={reset}>
            <span className="text-lg">↺</span> Reset Form
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            {success}
          </div>
        )}

        <div className="premium-card p-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-cyan)]/20 flex items-center justify-center text-[var(--primary-cyan)] font-bold text-sm">1</div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Order Details</h2>
          </div>

          {/* Row 1: Order Type, Select Team, Order ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="premium-label">Order Type <span className="text-red-400">*</span></label>
              <div className="relative">
                <select className="premium-input appearance-none w-full" value={form.orderType} onChange={onChange('orderType')}>
                  {ORDER_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">▼</div>
              </div>
            </div>
            <div>
              <label className="premium-label">Assign Team <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  className="premium-input appearance-none w-full"
                  value={form.assigned_team_id}
                  onChange={onChange('assigned_team_id')}
                  disabled={loadingTeams}
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">▼</div>
              </div>
            </div>
            <div>
              <label className="premium-label">Order Reference ID <span className="text-red-400">*</span></label>
              <input
                className="premium-input w-full"
                value={form.manual_order_id}
                onChange={onChange('manual_order_id')}
                placeholder="e.g. ORD-2024-001"
              />
            </div>
          </div>

          {/* Row 2: Client name, Client website, No of Links Ordered */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="premium-label">Client Name <span className="text-red-400">*</span></label>
              <input
                className="premium-input w-full"
                value={form.client_name}
                onChange={onChange('client_name')}
                placeholder="Enter client's full name"
              />
            </div>
            <div>
              <label className="premium-label">Client Website <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  className="premium-input pl-10 w-full"
                  value={form.client_website}
                  onChange={onChange('client_website')}
                  placeholder="domain.com"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">🌐</span>
              </div>
            </div>
            <div>
              <label className="premium-label">Number of Links <span className="text-red-400">*</span></label>
              <input
                type="number"
                min={1}
                className="premium-input w-full"
                value={form.no_of_links}
                onChange={onChange('no_of_links')}
              />
            </div>
          </div>

          {/* Row 3: Order Type (content), FC, Order package */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-[var(--border)]">
            <div>
              <label className="premium-label">Content Type <span className="text-red-400">*</span></label>
              <div className="flex bg-[var(--background-dark)] p-1 rounded-xl border border-[var(--border)]">
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setForm({ ...form, contentType: opt })}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${form.contentType === opt ? 'bg-[var(--card-background)] text-[var(--primary-cyan)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="premium-label">Foreign Currency (FC) <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-6 mt-3 px-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${form.fc ? 'border-[var(--primary-cyan)] bg-[var(--primary-cyan)]/20' : 'border-[var(--text-muted)]'}`}>
                    {form.fc && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-cyan)]" />}
                  </div>
                  <input type="radio" className="hidden" checked={form.fc} onChange={() => setForm({ ...form, fc: true })} />
                  <span className={`text-sm font-medium transition-colors ${form.fc ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>Yes</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${!form.fc ? 'border-[var(--primary-cyan)] bg-[var(--primary-cyan)]/20' : 'border-[var(--text-muted)]'}`}>
                    {!form.fc && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-cyan)]" />}
                  </div>
                  <input type="radio" className="hidden" checked={!form.fc} onChange={() => setForm({ ...form, fc: false })} />
                  <span className={`text-sm font-medium transition-colors ${!form.fc ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>No</span>
                </label>
              </div>
            </div>
            <div>
              <label className="premium-label">Package Level <span className="text-red-400">*</span></label>
              <div className="relative">
                <select className="premium-input appearance-none w-full" value={form.order_package} onChange={onChange('order_package')}>
                  <option value="">Select Package</option>
                  {(form.contentType === 'Guest Post' ? GP_PACKAGE_OPTIONS : NICHE_PACKAGE_OPTIONS).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">▼</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-cyan)]/20 flex items-center justify-center text-[var(--primary-cyan)] font-bold text-sm">2</div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Content Details</h2>
          </div>

          {/* Row 4: Category */}
          <div className="mb-6">
            <label className="premium-label">Target Category <span className="text-red-400">*</span></label>
            <div className="relative">
              <select className="premium-input appearance-none w-full" value={form.category} onChange={onChange('category')}>
                <option value="">Select Category</option>
                {(form.fc ? FC_YES_CATEGORIES : FC_NO_CATEGORIES).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">▼</div>
            </div>
          </div>



          {/* Row 6: Message (Rich Text) */}
          <div className="mb-8">
            <RichTextEditor
              label="Instructions & Notes"
              value={form.notes}
              onChange={(value) => setForm({ ...form, notes: value })}
              placeholder="Write detailed instructions for the team/writer..."
              required={true}
            />
          </div>

          {/* Buttons - Standard Workflow */}
          <div className="flex gap-4 pt-4">
            <button
              className="premium-btn premium-btn-accent flex-1 py-3 text-base shadow-lg shadow-[var(--primary-cyan)]/20"
              onClick={() => handleCreate(false)}
              disabled={loading}
            >
              {loading ? <span className="animate-spin">↻</span> : '📤'}
              {loading ? 'Creating Order...' : 'Push to Team'}
            </button>
            <button
              className="premium-btn border border-[var(--border)] hover:bg-white/5 text-[var(--text-primary)] flex-1 py-3"
              onClick={() => handleCreate(true)}
              disabled={loading}
            >
              Create & Add Another
            </button>
          </div>

          {/* Super Workflow - Direct Push Options */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 flex items-center gap-2">
              ⚡ Direct Push Options
              <span className="text-xs font-normal">(Skip intermediate steps)</span>
            </h3>
            <div className="flex gap-4">
              <button
                className="premium-btn flex-1 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all"
                onClick={() => navigate('/manager/orders/create/direct-writer')}
              >
                ✍️ Push to Writer
                <span className="text-xs opacity-70 ml-2">(Skip Team)</span>
              </button>
              <button
                className="premium-btn flex-1 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                onClick={() => navigate('/manager/orders/create/direct-blogger')}
              >
                📝 Push to Blogger
                <span className="text-xs opacity-70 ml-2">(Skip Team & Writer)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
