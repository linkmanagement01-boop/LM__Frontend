import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bloggerAPI } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

// Category options - Complete list
const CATEGORY_OPTIONS = [
  'Adult Relationships and Sex',
  'Agriculture & Farming',
  'Animals and Pets',
  'Architecture and Design',
  'Arts',
  'Automobiles',
  'Aviation and Flight',
  'Banking and Financial',
  'Beauty and Cosmetics',
  'Books and Author',
  'Business and Entrepreneurship',
  'Career and Employment',
  'CBD Casino Betting and Gambling',
  'Computers and Electronics',
  'Construction and Repairs',
  'Cryptocurrency and Bitcoin',
  'Culture and Tradition',
  'Design and Web Development',
  'Digital Marketing SEO and Advertising',
  'E-commerce and Shopping',
  'Education',
  'Entertainment Music Movies and Recreation',
  'Environment',
  'Family and Parenting Child',
  'Fashion and Lifestyle',
  'Finance and Investing',
  'Food and Cuisine',
  'Gadgets',
  'Games',
  'Gardening',
  'General Blog',
  'Green Energy & Technology',
  'Hardware and Development',
  'Health and Fitness',
  'Home Appliance',
  'Home Improvement and Decor',
  'Humor',
  'Industry and Company',
  'Insurance & Investment',
  'Internet Data & Cyberlaw',
  'Job Career',
  'Legal and Law',
  'Leisure and Hobbies',
  'Literature',
  'Love and Dating Relationships',
  'Manufacturing Machinery and Equipment',
  'Marketing',
  'Medical',
  'Metallurgy',
  'Miscellaneous'
];

// Traffic source country options
const COUNTRY_OPTIONS = [
  { value: 'UK', label: 'United Kingdom' },
  { value: 'USA', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'India', label: 'India' },
  { value: 'Dubai', label: 'Dubai (UAE)' },
  { value: 'NewZealand', label: 'New Zealand' },
  { value: 'Austria', label: 'Austria' }
];

/**
 * Root domain must be just the domain – "abc.com", "my-blog.co.uk".
 * Returns what's wrong (shown under the field), or '' when it's fine. Same rule as the server.
 */
export const domainProblem = (raw) => {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/:\/\//.test(v) || /^https?:/i.test(v)) return 'Remove http:// or https:// – enter only the domain, e.g. abc.com';
  if (/^www\./i.test(v)) return 'Remove "www." – enter only the domain, e.g. abc.com';
  if (/[/?#]/.test(v)) return 'Remove everything after the domain (/page, ?…) – enter only the domain, e.g. abc.com';
  if (/\s/.test(v)) return 'The domain can\'t contain spaces';
  if (v !== v.toLowerCase()) return 'Use lowercase letters only, e.g. abc.com';
  if (!/^([a-z0-9](-*[a-z0-9])*)(\.[a-z0-9](-*[a-z0-9])*)*\.[a-z]{2,}$/.test(v)) return 'This doesn\'t look like a domain – enter it like abc.com';
  return '';
};

export function SingleSite() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    root_domain: '',
    category: '',
    traffic_source: '',
    spam_score: '',
    sample_url: '',
    total_time: '',
    marked_sponsor: '',
    accept_grey: '',
    da: '',
    dr: '',
    traffic: '',
    rd: '',
    gp_price: '',
    niche_price: '',
    fc_gp: '',
    fc_ne: ''
  });

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation - required fields
    const requiredFields = ['root_domain', 'category', 'traffic_source', 'da', 'dr', 'gp_price', 'niche_price'];
    const emptyFields = requiredFields.filter(field => !form[field]);
    if (emptyFields.length > 0) {
      showError('Please fill all required fields: ' + emptyFields.join(', '));
      return;
    }
    const badDomain = domainProblem(form.root_domain);
    if (badDomain) {
      showError(badDomain);
      return;
    }

    try {
      setLoading(true);

      // Map form fields to backend API format
      const payload = {
        root_domain: form.root_domain.trim(),
        niche: form.category,
        traffic_source: form.traffic_source,
        spam_score: parseInt(form.spam_score) || 0,
        sample_url: form.sample_url,
        total_time: form.total_time,
        marked_sponsor: form.marked_sponsor === 'Yes' ? 1 : 0,
        accept_grey: form.accept_grey === 'Yes' ? 1 : 0,
        da: parseInt(form.da) || 0,
        dr: parseInt(form.dr) || 0,
        traffic: parseInt(form.traffic) || 0,
        rd: parseInt(form.rd) || 0,
        gp_price: parseFloat(form.gp_price) || 0,
        niche_price: parseFloat(form.niche_price) || 0,
        fc_gp: parseFloat(form.fc_gp) || 0,
        fc_ne: parseFloat(form.fc_ne) || 0
      };

      await bloggerAPI.addSite(payload);
      showSuccess('Site added successfully!');
      navigate('/blogger/sites/all');
    } catch (err) {
      console.error('Error adding site:', err);
      showError(err?.response?.data?.message || 'Failed to add site');
    } finally {
      setLoading(false);
    }
  };

  // Label with required asterisk
  const Label = ({ children, required = true }) => (
    <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
      {children} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Add Single Site</h2>
      <form onSubmit={onSubmit} className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
        {/* Domain Information */}
        <div>
          <div className="mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Domain Information</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Root domain</Label>
              <input value={form.root_domain} onChange={onChange('root_domain')} required placeholder="example.com" aria-invalid={!!domainProblem(form.root_domain)}
                className="w-full rounded-xl px-3 py-2"
                style={{ backgroundColor: 'var(--background-dark)', border: `1px solid ${domainProblem(form.root_domain) ? '#EF4444' : 'var(--border)'}`, color: 'var(--text-primary)' }} />
              {domainProblem(form.root_domain)
                ? <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{domainProblem(form.root_domain)}</p>
                : <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Only the domain, e.g. abc.com – no http://, https://, www. or /page</p>}
            </div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={onChange('category')} required className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Traffic source (Country)</Label>
              <select value={form.traffic_source} onChange={onChange('traffic_source')} required className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map(country => (
                  <option key={country.value} value={country.value}>{country.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label required={false}>Spam score</Label>
              <input value={form.spam_score} onChange={onChange('spam_score')} type="number" placeholder="Enter spam score" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <Label required={false}>Sample url</Label>
              <input value={form.sample_url} onChange={onChange('sample_url')} type="url" placeholder="https://example.com/sample-post" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label required={false}>Total time (TAT)</Label>
              <select value={form.total_time} onChange={onChange('total_time')} className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="">Select an option</option>
                <option value="1-3">1-3 Days</option>
                <option value="3-7">3-7 Days</option>
                <option value="7+">7+ Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Link Information */}
        <div>
          <div className="mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Link Information</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label required={false}>Marked sponsor</Label>
              <select value={form.marked_sponsor} onChange={onChange('marked_sponsor')} className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="">Select an option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <Label required={false}>Accept grey niche</Label>
              <select value={form.accept_grey} onChange={onChange('accept_grey')} className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="">Select an option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEO Metrics */}
        <div>
          <div className="mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>SEO Metrics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>DA</Label>
              <input value={form.da} onChange={onChange('da')} required type="number" placeholder="Enter DA" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label>DR</Label>
              <input value={form.dr} onChange={onChange('dr')} required type="number" placeholder="Enter DR" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label required={false}>Traffic</Label>
              <input value={form.traffic} onChange={onChange('traffic')} type="number" placeholder="Monthly traffic" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label required={false}>RD</Label>
              <input value={form.rd} onChange={onChange('rd')} type="number" placeholder="Referring domains" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label>GP Price (USD)</Label>
              <input value={form.gp_price} onChange={onChange('gp_price')} required type="number" step="0.01" placeholder="Enter GP price" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label>Niche Edit Price (USD)</Label>
              <input value={form.niche_price} onChange={onChange('niche_price')} required type="number" step="0.01" placeholder="Enter Niche price" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label required={false}>FC GP</Label>
              <input value={form.fc_gp} onChange={onChange('fc_gp')} type="number" step="0.01" placeholder="Enter FC GP" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <Label required={false}>FC NE</Label>
              <input value={form.fc_ne} onChange={onChange('fc_ne')} type="number" step="0.01" placeholder="Enter FC NE" className="w-full rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="premium-btn premium-btn-accent"
          >
            {loading ? 'Submitting...' : 'Submit Site'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/blogger/sites/all')}
            className="premium-btn premium-btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
