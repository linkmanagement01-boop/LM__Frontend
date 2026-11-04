import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Edit, CheckCircle, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function Careers() {
    const [careers, setCareers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchCareers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/careers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCareers(data.careers || []);
            }
        } catch (error) {
            console.error('Failed to fetch careers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCareers();
    }, []);

    const filteredCareers = careers.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.skills?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: '24px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted, #888)' }}>
                Careers {'>'} List
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary, #fff)', margin: 0 }}>
                    Careers
                </h1>
                <Link to="/admin/more/careers/create" className="premium-btn premium-btn-accent no-underline">
                    New career
                </Link>
            </div>

            {/* Card */}
            <div style={{
                backgroundColor: 'var(--card-background, #1a1a2e)',
                border: '1px solid var(--border, #2a2a4a)',
                borderRadius: '12px', overflow: 'hidden'
            }}>
                {/* Search */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #2a2a4a)', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #666)' }} />
                        <input
                            type="text" placeholder="Search"
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="premium-input pl-9"
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
                        Loading...
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--background, #0f0f1a)' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Title</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Experience</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Qualification</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Skills</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCareers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
                                        No careers found
                                    </td>
                                </tr>
                            ) : (
                                filteredCareers.map(career => (
                                    <tr key={career.id} style={{ borderBottom: '1px solid var(--border, #2a2a4a)' }}>
                                        <td style={{ padding: '16px 20px', color: 'var(--text-primary, #fff)' }}>{career.title}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary, #aaa)' }}>{career.experience}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary, #aaa)' }}>{career.qualification}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary, #aaa)' }}>{career.skills}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {career.is_active ? (
                                                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                                            ) : (
                                                <XCircle size={20} style={{ color: '#ef4444' }} />
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <Link to={`/admin/more/careers/edit/${career.id}`} style={{ color: 'var(--color-primary)' }}>
                                                <Edit size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
