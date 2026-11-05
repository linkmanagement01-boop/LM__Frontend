import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Edit, Key, Wallet, Calendar, Mail, Phone, MapPin, Globe, CreditCard, FileText, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Profile - Display blogger's profile information
 * Features:
 * - Show profile image, name, role, balance
 * - Basic information (email, country, whatsapp, skype)
 * - For Indian users: Aadhar, PAN, GST
 * - Links to Edit Profile and Change Password
 */
export function Profile() {
    const [imgFailed, setImgFailed] = useState(false);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/blogger/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            showError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        // Strip /api from the base URL for static file paths
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
        // Remove leading slash from imagePath if present to avoid double slashes
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${baseUrl}/${cleanPath}`;
    };

    const isIndia = profile?.country_name?.toLowerCase() === 'india';

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Profile Image */}
            <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Profile Image */}
                    <div className="relative">
                        {profile?.profile_image && !imgFailed ? (
                            <img
                                src={getImageUrl(profile.profile_image)}
                                alt={profile.name}
                                onError={() => setImgFailed(true)} // saved file missing → show the placeholder
                                className="w-24 h-24 rounded-full object-cover"
                                style={{ border: '3px solid var(--primary-cyan)' }}
                            />
                        ) : (
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '3px solid var(--primary-cyan)' }}
                            >
                                <User className="h-12 w-12" />
                            </div>
                        )}
                        <div
                            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: profile?.status === 'Active' ? '#22C55E' : '#EF4444' }}
                        >
                            <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                    </div>

                    {/* Name and Role */}
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {profile?.name || 'Unknown'}
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {profile?.role === 'vendor' ? 'Blogger' : profile?.role}
                        </p>
                        <div className="flex items-center gap-4 mt-2 justify-center md:justify-start">
                            <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--primary-cyan)' }}>
                                <Wallet className="h-4 w-4" />
                                Balance: ${profile?.balance?.toFixed(2) || '0.00'}
                            </span>
                            <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                    backgroundColor: profile?.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: profile?.status === 'Active' ? '#22C55E' : '#EF4444'
                                }}
                            >
                                {profile?.status || 'Unknown'}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <Link
                            to="/blogger/update-profile"
                            className="premium-btn premium-btn-accent w-full justify-center"
                        >
                            <Edit className="h-4 w-4" />
                            Edit Profile
                        </Link>
                        <Link
                            to="/blogger/change-password"
                            className="premium-btn premium-btn-outline w-full justify-center"
                        >
                            <Key className="h-4 w-4" />
                            Change Password
                        </Link>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div
                className="rounded-2xl"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                <div
                    className="px-6 py-4 border-b font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                    Basic Information
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <Mail className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Email Address</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.email || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <Calendar className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Joined On</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(profile?.joined_date)}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <Globe className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Country</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.country_name || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <Phone className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>WhatsApp</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.whatsapp || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <User className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Skype</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.skype || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 240, 255, 0.1)' }}>
                            <MapPin className="h-5 w-5" style={{ color: 'var(--primary-cyan)' }} />
                        </div>
                        <div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Address</div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.address || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* For Indian Users */}
            {isIndia && (
                <div
                    className="rounded-2xl"
                    style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                >
                    <div
                        className="px-6 py-4 border-b font-medium"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                        For Indian Users
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <CreditCard className="h-5 w-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div>
                                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Aadhar Number</div>
                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.aadhar_number || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <FileText className="h-5 w-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div>
                                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>PAN Card Number</div>
                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.pancard_number || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <FileText className="h-5 w-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div>
                                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>GST Number</div>
                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.gst_number || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
