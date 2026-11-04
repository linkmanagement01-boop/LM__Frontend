import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { FaqFields, plainText, btnPrimary, btnGhost } from './FaqShared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function EditFAQ() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({ question: '', answer: '', is_active: true, category: 'advertiser', sort_order: 0 });

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${API_BASE_URL}/admin/faqs/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json();
                if (response.ok && data.faq) {
                    setForm({
                        // older questions were saved as rich text – edit them as plain text
                        question: plainText(data.faq.question),
                        answer: data.faq.answer || '',
                        is_active: data.faq.is_active ?? true,
                        category: data.faq.category || 'advertiser',
                        sort_order: data.faq.sort_order ?? 0
                    });
                } else {
                    toast.error('FAQ not found');
                    navigate('/admin/more/faqs');
                }
            } catch (error) {
                toast.error('Failed to fetch FAQ');
                navigate('/admin/more/faqs');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async () => {
        if (!form.question.trim() || !plainText(form.answer)) {
            toast.error('Please fill all required fields');
            return;
        }
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/faqs/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('FAQ updated successfully!');
                navigate('/admin/more/faqs');
            } else {
                toast.error(data.message || 'Failed to update FAQ');
            }
        } catch (error) {
            toast.error('Failed to update FAQ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this FAQ?')) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/faqs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (response.ok) {
                toast.success('FAQ deleted successfully!');
                navigate('/admin/more/faqs');
            } else {
                toast.error(data.message || 'Failed to delete FAQ');
            }
        } catch (error) {
            toast.error('Failed to delete FAQ');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <div className="py-16 text-center text-slate-500">Loading…</div>;

    return (
        <div className="max-w-3xl">
            <div className="mb-2 text-sm text-slate-500">
                <Link to="/admin/more/faqs" className="text-slate-500 hover:text-violet-700">FAQs</Link> / Edit
            </div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Edit FAQ</h1>
                <button onClick={handleDelete} disabled={deleting}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors">
                    <Trash2 className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <FaqFields form={form} setForm={setForm} />
                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={handleSubmit} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save changes'}</button>
                    <Link to="/admin/more/faqs" className={btnGhost}>Cancel</Link>
                </div>
            </div>
        </div>
    );
}
