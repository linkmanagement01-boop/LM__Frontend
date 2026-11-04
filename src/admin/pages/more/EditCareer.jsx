import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RichTextEditor } from '../../../components/RichTextEditor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function EditCareer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        experience: '',
        qualification: '',
        skills: '',
        is_active: true
    });

    useEffect(() => {
        fetchCareer();
    }, [id]);

    const fetchCareer = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/careers/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.career) {
                setForm({
                    title: data.career.title || '',
                    experience: data.career.experience || '',
                    qualification: data.career.qualification || '',
                    skills: data.career.skills || '',
                    is_active: data.career.is_active ?? data.career.active ?? true
                });
            } else {
                toast.error('Career not found');
                navigate('/admin/more/careers');
            }
        } catch (error) {
            toast.error('Failed to fetch career');
            navigate('/admin/more/careers');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async () => {
        if (!form.title || !form.experience || !form.qualification || !form.skills) {
            toast.error('Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/careers/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Career updated successfully!');
                navigate('/admin/more/careers');
            } else {
                toast.error(data.message || 'Failed to update career');
            }
        } catch (error) {
            toast.error('Failed to update career');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this career?')) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/careers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Career deleted successfully!');
                navigate('/admin/more/careers');
            } else {
                toast.error(data.message || 'Failed to delete career');
            }
        } catch (error) {
            toast.error('Failed to delete career');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
                Loading...
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted, #888)' }}>
                <Link to="/admin/more/careers" style={{ color: 'var(--text-muted, #888)', textDecoration: 'none' }}>Careers</Link>
                {' > '} Edit
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary, #fff)', margin: 0 }}>
                    Edit Career
                </h1>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                        padding: '10px 20px', backgroundColor: '#ef4444',
                        color: '#fff', border: 'none', borderRadius: '6px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                    }}
                >
                    {deleting ? 'Deleting...' : 'Delete'}
                </button>
            </div>

            {/* Form Card */}
            <div style={{
                backgroundColor: 'var(--card-background, #1a1a2e)',
                border: '1px solid var(--border, #2a2a4a)',
                borderRadius: '12px', padding: '24px'
            }}>
                <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary, #fff)', fontSize: '16px', fontWeight: '500' }}>
                    Add New Career Post
                </h3>

                {/* Form Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary, #fff)', fontSize: '14px' }}>
                            Title<span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text" name="title" value={form.title} onChange={handleChange}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '6px',
                                backgroundColor: 'var(--background, #0f0f1a)',
                                border: '1px solid var(--border, #2a2a4a)',
                                color: 'var(--text-primary, #fff)', fontSize: '14px'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary, #fff)', fontSize: '14px' }}>
                            Experience<span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text" name="experience" value={form.experience} onChange={handleChange}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '6px',
                                backgroundColor: 'var(--background, #0f0f1a)',
                                border: '1px solid var(--border, #2a2a4a)',
                                color: 'var(--text-primary, #fff)', fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <RichTextEditor
                        label="Qualification"
                        value={form.qualification}
                        onChange={(value) => setForm({ ...form, qualification: value })}
                        placeholder="Enter the required qualifications..."
                        required={true}
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <RichTextEditor
                        label="Skills"
                        value={form.skills}
                        onChange={(value) => setForm({ ...form, skills: value })}
                        placeholder="Enter the required skills..."
                        required={true}
                    />
                </div>

                {/* Active Toggle */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <div style={{
                            width: '44px', height: '24px', borderRadius: '12px',
                            backgroundColor: form.is_active ? 'var(--color-primary)' : '#444',
                            position: 'relative', transition: 'background-color 0.2s'
                        }}>
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
                                position: 'absolute', top: '2px',
                                left: form.is_active ? '22px' : '2px',
                                transition: 'left 0.2s'
                            }} />
                        </div>
                        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} style={{ display: 'none' }} />
                        <span style={{ color: 'var(--text-primary, #fff)', fontSize: '14px' }}>
                            Active<span style={{ color: '#ef4444' }}>*</span>
                        </span>
                    </label>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{
                            padding: '10px 20px', backgroundColor: '#3b82f6',
                            color: '#fff', border: 'none', borderRadius: '6px',
                            fontWeight: '500', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <Link
                        to="/admin/more/careers"
                        style={{
                            padding: '10px 20px', backgroundColor: 'var(--background, #0f0f1a)',
                            color: 'var(--text-primary, #fff)', border: '1px solid var(--border, #2a2a4a)',
                            borderRadius: '6px', fontWeight: '500', textDecoration: 'none', fontSize: '14px'
                        }}
                    >
                        Cancel
                    </Link>
                </div>
            </div>
        </div>
    );
}
