import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Upload, X } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';

/**
 * UpdateProfile - Edit blogger's profile information
 * Features:
 * - Edit name, country, whatsapp, skype, address
 * - India-specific fields (Aadhar, PAN, GST) shown conditionally
 * - Profile image upload with preview
 * - Validation for required fields
 */
export function UpdateProfile() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const { refreshUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [countries, setCountries] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        country_id: '',
        whatsapp: '',
        skype: '',
        address: '',
        aadhar_number: '',
        pancard_number: '',
        gst_number: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch profile and countries in parallel
            const [profileRes, countriesRes] = await Promise.all([
                api.get('/blogger/profile'),
                api.get('/blogger/countries')
            ]);

            const profile = profileRes.data;
            setFormData({
                name: profile.name || '',
                country_id: profile.country_id || '',
                whatsapp: profile.whatsapp || '',
                skype: profile.skype || '',
                address: profile.address || '',
                aadhar_number: profile.aadhar_number || '',
                pancard_number: profile.pancard_number || '',
                gst_number: profile.gst_number || ''
            });

            if (profile.profile_image) {
                let imageUrl;
                if (profile.profile_image.startsWith('http')) {
                    imageUrl = profile.profile_image;
                } else {
                    // Strip /api from the base URL for static file paths
                    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
                    const cleanPath = profile.profile_image.startsWith('/') ? profile.profile_image.slice(1) : profile.profile_image;
                    imageUrl = `${baseUrl}/${cleanPath}`;
                }
                setImagePreview(imageUrl);
            }

            setCountries(countriesRes.data.countries || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedCountryName = () => {
        // Convert both to strings for reliable comparison (handles type mismatches between string/number)
        const selectedId = String(formData.country_id);
        const country = countries.find(c => String(c.id) === selectedId);
        return country?.name?.toLowerCase() || '';
    };

    const isIndia = getSelectedCountryName() === 'india';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showError('Only JPEG, PNG, and WebP images are allowed');
                return;
            }
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                showError('Image size must be less than 2MB');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const uploadImage = async () => {
        if (!imageFile) return true;

        try {
            setUploadingImage(true);
            const formDataImg = new FormData();
            formDataImg.append('profile_image', imageFile);

            await api.post('/blogger/profile/image', formDataImg, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            return true;
        } catch (error) {
            console.error('Error uploading image:', error);
            showError('Failed to upload profile image');
            return false;
        } finally {
            setUploadingImage(false);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name || formData.name.trim().length < 2) {
            newErrors.name = 'Name is required and must be at least 2 characters';
        }
        if (!formData.country_id) {
            newErrors.country_id = 'Country is required';
        }
        if (!formData.whatsapp || formData.whatsapp.trim().length === 0) {
            newErrors.whatsapp = 'WhatsApp number is required';
        }
        if (!formData.skype || formData.skype.trim().length === 0) {
            newErrors.skype = 'Skype ID is required';
        }
        if (!formData.address || formData.address.trim().length === 0) {
            newErrors.address = 'Address is required';
        }
        if (isIndia && (!formData.pancard_number || formData.pancard_number.trim().length === 0)) {
            newErrors.pancard_number = 'PAN Card Number is required for Indian users';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);

            // Upload image first if there's a new one
            const imageUploaded = await uploadImage();
            if (!imageUploaded) return;

            // Update profile
            await api.put('/blogger/profile', {
                name: formData.name.trim(),
                country_id: parseInt(formData.country_id),
                whatsapp: formData.whatsapp.trim(),
                skype: formData.skype.trim(),
                address: formData.address.trim(),
                aadhar_number: formData.aadhar_number.trim(),
                pancard_number: formData.pancard_number.trim(),
                gst_number: formData.gst_number.trim()
            });

            showSuccess('Profile updated successfully');

            // Refresh AuthContext to update sidebar without reload
            await refreshUser();

            navigate('/blogger/profile');
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
        <div className="animate-fadeIn max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/blogger/profile')}
                    className="p-2.5 rounded-xl hover:bg-[var(--card-background)] border border-transparent hover:border-[var(--border)] transition-all text-[var(--text-secondary)]"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Update Profile
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="premium-card">
                    <div className="px-6 py-4 border-b border-[var(--border)] font-medium text-[var(--text-secondary)] uppercase tracking-wider text-xs">
                        Basic Information
                    </div>
                    <div className="p-6 space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`premium-input ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                                placeholder="Enter your name"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                Country <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="country_id"
                                value={formData.country_id}
                                onChange={handleChange}
                                className={`premium-input ${errors.country_id ? 'border-red-500 focus:border-red-500' : ''}`}
                            >
                                <option value="">Select Country</option>
                                {countries.map(country => (
                                    <option key={country.id} value={country.id}>{country.name}</option>
                                ))}
                            </select>
                            {errors.country_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.country_id}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* WhatsApp */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                    WhatsApp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleChange}
                                    className={`premium-input ${errors.whatsapp ? 'border-red-500 focus:border-red-500' : ''}`}
                                    placeholder="Enter your WhatsApp number"
                                />
                                {errors.whatsapp && <p className="text-red-500 text-xs mt-1 font-medium">{errors.whatsapp}</p>}
                            </div>

                            {/* Skype */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                    Skype <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="skype"
                                    value={formData.skype}
                                    onChange={handleChange}
                                    className={`premium-input ${errors.skype ? 'border-red-500 focus:border-red-500' : ''}`}
                                    placeholder="Enter your Skype ID"
                                />
                                {errors.skype && <p className="text-red-500 text-xs mt-1 font-medium">{errors.skype}</p>}
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows={3}
                                className={`premium-input ${errors.address ? 'border-red-500 focus:border-red-500' : ''}`}
                                placeholder="Enter your address"
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1 font-medium">{errors.address}</p>}
                        </div>
                    </div>
                </div>

                {/* For Indian Users */}
                {isIndia && (
                    <div className="premium-card">
                        <div className="px-6 py-4 border-b border-[var(--border)] font-medium text-[var(--text-secondary)] uppercase tracking-wider text-xs">
                            For Indian Users
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Aadhar Number */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                    Aadhar Number <span className="text-[var(--text-muted)] font-normal text-[0.65rem] lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    name="aadhar_number"
                                    value={formData.aadhar_number}
                                    onChange={handleChange}
                                    className="premium-input"
                                    placeholder="Enter your Aadhar number"
                                />
                            </div>

                            {/* PAN Card Number */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                    PAN Card Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="pancard_number"
                                    value={formData.pancard_number}
                                    onChange={handleChange}
                                    className={`premium-input ${errors.pancard_number ? 'border-red-500 focus:border-red-500' : ''}`}
                                    placeholder="Enter your PAN card number"
                                />
                                {errors.pancard_number && <p className="text-red-500 text-xs mt-1 font-medium">{errors.pancard_number}</p>}
                            </div>

                            {/* GST Number */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                                    GST Number <span className="text-[var(--text-muted)] font-normal text-[0.65rem] lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    name="gst_number"
                                    value={formData.gst_number}
                                    onChange={handleChange}
                                    className="premium-input"
                                    placeholder="Enter your GST number"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Image */}
                <div className="premium-card">
                    <div className="px-6 py-4 border-b border-[var(--border)] font-medium text-[var(--text-secondary)] uppercase tracking-wider text-xs">
                        Profile Image
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Image Preview */}
                            <div className="relative group">
                                {imagePreview ? (
                                    <>
                                        <img
                                            src={imagePreview}
                                            alt="Profile Preview"
                                            onError={() => setImagePreview(null)} // saved file missing → no broken picture
                                            className="w-24 h-24 rounded-full object-cover border-4 border-[var(--background-dark)] shadow-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center bg-[var(--error)] text-white shadow-md hover:scale-110 transition-transform"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[var(--background-dark)] border-2 border-dashed border-[var(--border)]">
                                        <User className="h-10 w-10 text-[var(--text-muted)]" />
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <div className="text-center sm:text-left">
                                <label
                                    className="premium-btn premium-btn-outline cursor-pointer inline-flex"
                                >
                                    <Upload className="h-4 w-4" />
                                    Choose Image
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs mt-2 text-[var(--text-muted)]">
                                    JPEG, PNG, or WebP. Max 2MB.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving || uploadingImage}
                        className="premium-btn premium-btn-accent"
                    >
                        {saving || uploadingImage ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
