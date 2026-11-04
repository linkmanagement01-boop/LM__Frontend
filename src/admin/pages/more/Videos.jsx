import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Edit, CheckCircle, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function Videos() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/admin/videos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setVideos(data.videos || []);
            }
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const filteredVideos = videos.filter(v =>
        v.title?.toLowerCase().includes(search.toLowerCase()) ||
        v.link?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: '24px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted, #888)' }}>
                Videos {'>'} List
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary, #fff)', margin: 0 }}>
                    Videos
                </h1>
                <Link to="/admin/more/videos/create" style={{
                    padding: '10px 20px', backgroundColor: 'var(--color-primary)',
                    color: '#fff', borderRadius: '6px', fontWeight: '600',
                    textDecoration: 'none', fontSize: '14px'
                }}>
                    New video
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
                            style={{
                                padding: '8px 12px 8px 36px', borderRadius: '6px',
                                backgroundColor: 'var(--background, #0f0f1a)',
                                border: '1px solid var(--border, #2a2a4a)',
                                color: 'var(--text-primary, #fff)', fontSize: '14px', width: '200px'
                            }}
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
                                <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Link</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '13px', fontWeight: '500' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVideos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
                                        No videos found
                                    </td>
                                </tr>
                            ) : (
                                filteredVideos.map(video => (
                                    <tr key={video.id} style={{ borderBottom: '1px solid var(--border, #2a2a4a)' }}>
                                        <td style={{ padding: '16px 20px', color: 'var(--text-primary, #fff)' }}>
                                            {video.title}
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary, #aaa)' }}>
                                            <a href={video.link} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--primary-cyan, #3ED9EB)', textDecoration: 'none' }}>
                                                {video.link?.length > 60 ? video.link.substring(0, 60) + '...' : video.link}
                                            </a>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {video.is_active || video.active ? (
                                                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                                            ) : (
                                                <XCircle size={20} style={{ color: '#ef4444' }} />
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <Link to={`/admin/more/videos/edit/${video.id}`} style={{ color: 'var(--color-primary)' }}>
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
