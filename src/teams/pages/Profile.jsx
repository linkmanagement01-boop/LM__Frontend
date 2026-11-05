import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, X, User } from 'lucide-react';
import { teamAPI } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';

/**
 * Profile Page for Team Panel
 * Features:
 * - Email (non-editable)
 * - Name (editable)
 * - Gender (dropdown)
 * - Mobile number
 * - Profile image upload with drag & drop
 * - Submit button
 */
export function Profile() {
    const { showSuccess, showError } = useToast();
    const { refreshUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        gender: '',
        mobile: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await teamAPI.getProfile();
            const profile = response;

            setFormData({
                email: profile.email || '',
                name: profile.name || '',
                gender: profile.gender || '',
                mobile: profile.mobile || profile.phone || ''
            });

            if (profile.profile_image) {
                const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
                const cleanPath = profile.profile_image.startsWith('/') ? profile.profile_image.slice(1) : profile.profile_image;
                setImagePreview(profile.profile_image.startsWith('http') ? profile.profile_image : `${baseUrl}/${cleanPath}`);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (file) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showError('Only JPEG, PNG, and WebP images are allowed');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showError('Image size must be less than 2MB');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleImageChange(file);
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showError('Name is required');
            return;
        }
        if (!formData.gender) {
            showError('Please select a gender');
            return;
        }
        if (!formData.mobile.trim()) {
            showError('Mobile number is required');
            return;
        }

        try {
            setSaving(true);

            // Upload image if new one selected
            if (imageFile) {
                await teamAPI.uploadProfileImage(imageFile);
            }

            // Update profile
            await teamAPI.updateProfile({
                name: formData.name.trim(),
                gender: formData.gender,
                mobile: formData.mobile.trim()
            });

            showSuccess('Profile updated successfully');

            // Refresh AuthContext to update sidebar without reload
            await refreshUser();
        } catch (error) {
            console.error('Error updating profile:', error);
            showError(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary-cyan)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Profile</h1>

            <div className="premium-card">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                    <h2 className="font-semibold text-[var(--text-primary)]">Update Profile</h2>
                    <p className="text-sm text-[var(--text-muted)]">Update your profile information</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email - Non-editable */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-[var(--text-secondary)] font-medium">Email</label>
                        <div className="col-span-2">
                            <input
                                type="email"
                                value={formData.email}
                                disabled
                                className="premium-input bg-[var(--background-dark)] opacity-70 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-[var(--text-secondary)] font-medium">
                            Name<span className="text-red-500">*</span>
                        </label>
                        <div className="col-span-2">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="premium-input"
                                placeholder="Enter your name"
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-[var(--text-secondary)] font-medium">
                            Gender<span className="text-red-500">*</span>
                        </label>
                        <div className="col-span-2">
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="premium-input"
                            >
                                <option value="">Select an option</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-[var(--text-secondary)] font-medium">
                            Mobile number<span className="text-red-500">*</span>
                        </label>
                        <div className="col-span-2">
                            <input
                                type="tel"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="premium-input"
                                placeholder="Enter your mobile number"
                            />
                        </div>
                    </div>

                    {/* Profile Image */}
                    <div className="grid grid-cols-3 gap-4">
                        <label className="text-[var(--text-secondary)] font-medium pt-2">Profile Image</label>
                        <div className="col-span-2">
                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img
                                        src={imagePreview}
                                        alt="Profile"
                                        onError={() => setImagePreview(null)} // saved file missing → show the upload box
                                        className="w-24 h-24 rounded-lg object-cover border-2 border-[var(--border)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
                                        ? 'border-[var(--primary-cyan)] bg-[var(--primary-cyan)]/5'
                                        : 'border-[var(--border)] hover:border-[var(--primary-cyan)]'
                                        }`}
                                >
                                    <p className="text-[var(--text-muted)]">
                                        Drag & Drop your files or{' '}
                                        <span className="text-[var(--primary-cyan)] font-medium">Browse</span>
                                    </p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleImageChange(e.target.files[0])}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white hover:text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
