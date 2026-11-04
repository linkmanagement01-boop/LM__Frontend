import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function CountriesLists() {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState([]);
    const [perPage, setPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchCountries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/countries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCountries(data.countries || []);
            }
        } catch (error) {
            console.error('Failed to fetch countries:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelected(paginatedCountries.map(c => c.id));
        } else {
            setSelected([]);
        }
    };

    const handleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} selected countries?`)) return;

        try {
            const token = localStorage.getItem('authToken');
            for (const id of selected) {
                await fetch(`${API_BASE_URL}/admin/countries/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            toast.success(`Deleted ${selected.length} countries`);
            setSelected([]);
            fetchCountries();
        } catch (error) {
            toast.error('Failed to delete countries');
        }
    };

    // Pagination
    const totalPages = perPage === 'all' ? 1 : Math.ceil(countries.length / perPage);
    const paginatedCountries = perPage === 'all'
        ? countries
        : countries.slice((currentPage - 1) * perPage, currentPage * perPage);

    const formatPaymentMethods = (methods) => {
        if (!methods) return '';
        if (Array.isArray(methods)) return methods.join(', ');
        return methods;
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted, #888)' }}>
                Countries Lists {'>'} List
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary, #fff)', margin: 0 }}>
                    Countries Lists
                </h1>
                <Link to="/admin/more/countries/create" style={{
                    padding: '10px 20px', backgroundColor: 'var(--color-primary)',
                    color: '#fff', borderRadius: '6px', fontWeight: '600',
                    textDecoration: 'none', fontSize: '14px'
                }}>
                    New Countries List
                </Link>
            </div>

            {/* Card */}
            <div style={{
                backgroundColor: 'var(--card-background, #1a1a2e)',
                border: '1px solid var(--border, #2a2a4a)',
                borderRadius: '12px', overflow: 'hidden'
            }}>
                {/* Controls */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #2a2a4a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selected.length > 0 && (
                            <button onClick={handleDeleteSelected} style={{
                                padding: '8px 16px', backgroundColor: '#ef4444',
                                color: '#fff', border: 'none', borderRadius: '6px',
                                cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <Trash2 size={14} /> Delete Selected ({selected.length})
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-secondary, #aaa)', fontSize: '13px' }}>Per page:</span>
                        <select
                            value={perPage}
                            onChange={(e) => { setPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
                            style={{
                                padding: '6px 12px', borderRadius: '6px',
                                backgroundColor: 'var(--background, #0f0f1a)',
                                border: '1px solid var(--border, #2a2a4a)',
                                color: 'var(--text-primary, #fff)', fontSize: '13px'
                            }}
                        >
                            <option value={20}>20</option>
                            <option value={40}>40</option>
                            <option value="all">All</option>
                        </select>
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
                                <th style={{ padding: '14px 20px', textAlign: 'left', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selected.length === paginatedCountries.length && paginatedCountries.length > 0}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Name</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Payment methods</th>
                                <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500', width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCountries.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
                                        No countries found
                                    </td>
                                </tr>
                            ) : (
                                paginatedCountries.map(country => (
                                    <tr key={country.id} style={{ borderBottom: '1px solid var(--border, #2a2a4a)' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(country.id)}
                                                onChange={() => handleSelect(country.id)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-primary, #fff)' }}>
                                            {country.name}
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary, #aaa)' }}>
                                            {formatPaymentMethods(country.payment_methods)}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <Link to={`/admin/more/countries/edit/${country.id}`} style={{ color: 'var(--color-primary)' }}>
                                                <Edit size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {perPage !== 'all' && totalPages > 1 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border, #2a2a4a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary, #aaa)', fontSize: '13px' }}>
                            Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, countries.length)} of {countries.length}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '6px 12px', borderRadius: '6px',
                                    backgroundColor: 'var(--background, #0f0f1a)',
                                    border: '1px solid var(--border, #2a2a4a)',
                                    color: 'var(--text-primary, #fff)', cursor: 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1
                                }}
                            >
                                Previous
                            </button>
                            <span style={{ padding: '6px 12px', color: 'var(--text-secondary, #aaa)' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '6px 12px', borderRadius: '6px',
                                    backgroundColor: 'var(--background, #0f0f1a)',
                                    border: '1px solid var(--border, #2a2a4a)',
                                    color: 'var(--text-primary, #fff)', cursor: 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
