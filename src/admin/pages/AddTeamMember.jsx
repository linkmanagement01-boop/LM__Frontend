import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users2, ChevronRight, X, UserPlus } from 'lucide-react';
import { adminAPI } from '../../lib/api';

const CREATE_ROLES = ['Manager', 'Writer', 'Blogger', 'Team', 'Outreach', 'Accountant'];
const ROLE_LABEL = { Outreach: 'Outreach Team' }; // what the dropdown shows

export function AddTeamMember() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ role: '', username: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Handle create user
    const handleCreate = async (createAnother = false) => {
        setError(null);

        if (!form.role) {
            setError('Please select a role');
            return;
        }
        if (!form.username.trim()) {
            setError('Name is required');
            return;
        }
        if (!form.email.trim()) {
            setError('Email is required');
            return;
        }
        if (!form.password || form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await adminAPI.createUser({
                username: form.username,
                email: form.email,
                password: form.password,
                role: form.role
            });

            setSuccess(`Team member "${form.username}" created successfully!`);

            if (createAnother) {
                setForm({ role: '', username: '', email: '', password: '' });
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setTimeout(() => navigate('/admin/team-members'), 1500);
            }
        } catch (err) {
            setError(err.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span
                    className="cursor-pointer hover:text-white transition-colors duration-200"
                    onClick={() => navigate('/admin/team-members')}
                >
                    Users
                </span>
                <ChevronRight className="h-4 w-4" />
                <span style={{ color: 'var(--text-primary)' }}>Create</span>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <UserPlus className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
                </div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Add Team Member
                </h1>
            </div>

            {/* Success Message */}
            {success && (
                <div
                    className="rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                >
                    <span className="text-green-400 text-lg">✓</span>
                    <p className="text-green-400 font-medium">{success}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div
                    className="rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                    <p className="text-red-400">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Form Card */}
            <div
                className="rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
                style={{
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
            >
                <div className="flex items-center gap-2 mb-6">
                    <Users2 className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Team Member Details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Role */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                            Role<span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <select
                            value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            className="w-full rounded-xl px-4 py-3 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <option value="">Select an option</option>
                            {CREATE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                        </select>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                            Name<span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            placeholder="Enter name"
                            className="w-full rounded-xl px-4 py-3 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none placeholder:text-gray-500"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                            Email<span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="Enter email"
                            className="w-full rounded-xl px-4 py-3 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none placeholder:text-gray-500"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                            Password<span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Min 6 characters"
                            className="w-full rounded-xl px-4 py-3 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 outline-none placeholder:text-gray-500"
                            style={{
                                backgroundColor: 'var(--background-dark)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => handleCreate(false)}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none shadow-lg hover:shadow-xl"
                    style={{
                        background: 'linear-gradient(135deg, var(--primary-orange) 0%, #ea580c 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)'
                    }}
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Creating...
                        </span>
                    ) : 'Create'}
                </button>

                <button
                    onClick={() => handleCreate(true)}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    style={{
                        backgroundColor: 'var(--background-dark)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)'
                    }}
                >
                    Create & create another
                </button>

                <button
                    onClick={() => navigate('/admin/team-members')}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        backgroundColor: 'var(--background-dark)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
