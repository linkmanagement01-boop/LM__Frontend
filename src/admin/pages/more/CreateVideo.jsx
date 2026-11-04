import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAutoSaveForm, AutoSaveIndicator } from '../../../hooks/useAutoSave';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function CreateVideo() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Auto-save form state
    const { formData: form, setFormData: setForm, clearAllSaved, isSaved } = useAutoSaveForm('admin-create-video', {
        title: '',
        link: '',
        is_active: true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (createAnother = false) => {
        if (!form.title || !form.link) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/videos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Video created successfully!');
                if (createAnother) {
                    setForm({ title: '', link: '', is_active: true });
                } else {
                    navigate('/admin/more/videos');
                }
            } else {
                toast.error(data.message || 'Failed to create video');
            }
        } catch (error) {
            toast.error('Failed to create video');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Breadcrumb */}
            <div className="mb-2 text-sm text-[var(--text-muted)]">
                <Link to="/admin/more/videos" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Videos</Link>
                {' > '} Create
            </div>

            {/* Header */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                Create Video
            </h1>

            {/* Form Card */}
            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="mb-6 text-[var(--text-primary)] text-base font-medium">
                    Add New Video
                </h3>

                {/* Form Fields */}
                <div className="mb-5">
                    <label className="block mb-2 text-[var(--text-primary)] text-sm">
                        Title<span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text" name="title" value={form.title} onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                </div>

                <div className="mb-6">
                    <label className="block mb-2 text-[var(--text-primary)] text-sm">
                        Link<span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="link" value={form.link} onChange={handleChange} rows={3}
                        className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                </div>

                {/* Active Toggle */}
                <div className="mb-8">
                    <label className="flex items-center gap-3 cursor-pointer w-max">
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-brand' : 'bg-gray-600'}`}>
                            <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all ${form.is_active ? 'left-[22px]' : 'left-[2px]'}`} />
                        </div>
                        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="hidden" />
                        <span className="text-[var(--text-primary)] text-sm">
                            Active<span className="text-red-500">*</span>
                        </span>
                    </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        Create
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        className="px-5 py-2.5 bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg font-medium text-sm hover:bg-white/5 disabled:opacity-50 transition-colors"
                    >
                        Create & create another
                    </button>
                    <Link
                        to="/admin/more/videos"
                        className="px-5 py-2.5 bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg font-medium text-sm hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </Link>
                </div>
            </div>
        </div>
    );
}
