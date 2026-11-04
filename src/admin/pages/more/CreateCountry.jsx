import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function CreateCountry() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        bank: false,
        paypal: false,
        qr_code: false,
        upi_id: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (createAnother = false) => {
        if (!form.name) {
            toast.error('Please enter a country name');
            return;
        }

        const paymentMethods = [];
        if (form.bank) paymentMethods.push('bank');
        if (form.paypal) paymentMethods.push('paypal');
        if (form.qr_code) paymentMethods.push('qr_code');
        if (form.upi_id) paymentMethods.push('upi_id');

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/countries`, {
                method: 'POST',
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
                toast.success('Country created successfully!');
                if (createAnother) {
                    setForm({ name: '', bank: false, paypal: false, qr_code: false, upi_id: false });
                } else {
                    navigate('/admin/more/countries');
                }
            } else {
                toast.error(data.message || 'Failed to create country');
            }
        } catch (error) {
            toast.error('Failed to create country');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Breadcrumb */}
            <div className="mb-2 text-sm text-[var(--text-muted)]">
                <Link to="/admin/more/countries" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Countries Lists</Link>
                {' > '} Create
            </div>

            {/* Header */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                Create Countries List
            </h1>

            {/* Form Card */}
            <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="mb-6 text-[var(--text-primary)] text-base font-medium">
                    Add New Country
                </h3>

                {/* Name Field */}
                <div className="mb-6">
                    <label className="block mb-2 text-[var(--text-primary)] text-sm">
                        Name
                    </label>
                    <input
                        type="text" name="name" value={form.name} onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-shadow"
                    />
                </div>

                {/* Payment Methods */}
                <div className="mb-8">
                    <label className="block mb-4 text-[var(--text-primary)] text-sm font-medium">
                        Payment methods
                    </label>

                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 cursor-pointer w-max">
                            <input type="checkbox" name="bank" checked={form.bank} onChange={handleChange}
                                className="w-4 h-4 rounded border-[var(--border)] text-brand focus:ring-brand" />
                            <span className="text-[var(--text-primary)] text-sm">Bank</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer w-max">
                            <input type="checkbox" name="paypal" checked={form.paypal} onChange={handleChange}
                                className="w-4 h-4 rounded border-[var(--border)] text-brand focus:ring-brand" />
                            <span className="text-[var(--text-primary)] text-sm">Paypal ID</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer w-max">
                            <input type="checkbox" name="qr_code" checked={form.qr_code} onChange={handleChange}
                                className="w-4 h-4 rounded border-[var(--border)] text-brand focus:ring-brand" />
                            <span className="text-[var(--text-primary)] text-sm">QR Code</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer w-max">
                            <input type="checkbox" name="upi_id" checked={form.upi_id} onChange={handleChange}
                                className="w-4 h-4 rounded border-[var(--border)] text-brand focus:ring-brand" />
                            <span className="text-[var(--text-primary)] text-sm">UPI ID</span>
                        </label>
                    </div>
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
                        to="/admin/more/countries"
                        className="px-5 py-2.5 bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg font-medium text-sm hover:bg-white/5 transition-colors block text-center"
                    >
                        Cancel
                    </Link>
                </div>
            </div>
        </div>
    );
}
