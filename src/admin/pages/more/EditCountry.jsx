import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function EditCountry() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        bank: false,
        paypal: false,
        qr_code: false,
        upi_id: false
    });

    useEffect(() => {
        fetchCountry();
    }, [id]);

    const fetchCountry = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/countries/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.country) {
                const methods = data.country.payment_methods || '';
                setForm({
                    name: data.country.name || '',
                    bank: methods.includes('bank'),
                    paypal: methods.includes('paypal'),
                    qr_code: methods.includes('qr_code'),
                    upi_id: methods.includes('upi_id')
                });
            } else {
                toast.error('Country not found');
                navigate('/admin/more/countries');
            }
        } catch (error) {
            toast.error('Failed to fetch country');
            navigate('/admin/more/countries');
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
        if (!form.name) {
            toast.error('Please enter a country name');
            return;
        }

        const paymentMethods = [];
        if (form.bank) paymentMethods.push('bank');
        if (form.paypal) paymentMethods.push('paypal');
        if (form.qr_code) paymentMethods.push('qr_code');
        if (form.upi_id) paymentMethods.push('upi_id');

        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/countries/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: form.name,
                    payment_methods: paymentMethods.join(', ')
                })
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Country updated successfully!');
                navigate('/admin/more/countries');
            } else {
                toast.error(data.message || 'Failed to update country');
            }
        } catch (error) {
            toast.error('Failed to update country');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this country?')) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/countries/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Country deleted successfully!');
                navigate('/admin/more/countries');
            } else {
                toast.error(data.message || 'Failed to delete country');
            }
        } catch (error) {
            toast.error('Failed to delete country');
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
                <Link to="/admin/more/countries" style={{ color: 'var(--text-muted, #888)', textDecoration: 'none' }}>Countries Lists</Link>
                {' > '} Edit
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary, #fff)', margin: 0 }}>
                    Edit Countries List
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
                    Add New Country
                </h3>

                {/* Name Field */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary, #fff)', fontSize: '14px' }}>
                        Name
                    </label>
                    <input
                        type="text" name="name" value={form.name} onChange={handleChange}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '6px',
                            backgroundColor: 'var(--background, #0f0f1a)',
                            border: '1px solid var(--border, #2a2a4a)',
                            color: 'var(--text-primary, #fff)', fontSize: '14px'
                        }}
                    />
                </div>

                {/* Payment Methods */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '16px', color: 'var(--text-primary, #fff)', fontSize: '14px' }}>
                        Payment methods
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="bank" checked={form.bank} onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--text-primary, #fff)', fontSize: '14px' }}>Bank</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="paypal" checked={form.paypal} onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--text-primary, #fff)', fontSize: '14px' }}>Paypal ID</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="qr_code" checked={form.qr_code} onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--text-primary, #fff)', fontSize: '14px' }}>QR Code</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="upi_id" checked={form.upi_id} onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--text-primary, #fff)', fontSize: '14px' }}>UPI ID</span>
                        </label>
                    </div>
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
                        to="/admin/more/countries"
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
