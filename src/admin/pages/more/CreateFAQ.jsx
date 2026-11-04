import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAutoSaveForm, AutoSaveIndicator } from '../../../hooks/useAutoSave';
import { FaqFields, plainText, btnPrimary, btnGhost } from './FaqShared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const EMPTY = { question: '', answer: '', is_active: true, category: 'advertiser', sort_order: 0 };

export function CreateFAQ() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Auto-save form state
    const { formData: form, setFormData: setForm, clearAllSaved, isSaved } = useAutoSaveForm('admin-create-faq', EMPTY);

    const handleSubmit = async (createAnother = false) => {
        if (!form.question.trim() || !plainText(form.answer)) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/faqs`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('FAQ created successfully!');
                clearAllSaved?.();
                if (createAnother) {
                    // stay on the same tab for the next question
                    setForm({ ...EMPTY, category: form.category, sort_order: Number(form.sort_order || 0) + 1 });
                } else {
                    navigate('/admin/more/faqs');
                }
            } else {
                toast.error(data.message || 'Failed to create FAQ');
            }
        } catch (error) {
            toast.error('Failed to create FAQ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-2 text-sm text-slate-500">
                <Link to="/admin/more/faqs" className="text-slate-500 hover:text-violet-700">FAQs</Link> / Create
            </div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900">New FAQ</h1>
                <AutoSaveIndicator isSaved={isSaved} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <FaqFields form={form} setForm={setForm} />
                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={() => handleSubmit(false)} disabled={loading} className={btnPrimary}>{loading ? 'Saving…' : 'Create'}</button>
                    <button onClick={() => handleSubmit(true)} disabled={loading} className={btnGhost}>Create & add another</button>
                    <Link to="/admin/more/faqs" className={btnGhost}>Cancel</Link>
                </div>
            </div>
        </div>
    );
}
