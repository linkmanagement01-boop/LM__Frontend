import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Lock, Save, RefreshCw, Mail, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../context/ToastContext';

export function Settings() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const [profile, setProfile] = useState({ name: '', email: '' });
    const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({ name: user.username || user.name || '', email: user.email || '' });
        }
    }, [user]);

    const onSaveProfile = async (e) => {
        e.preventDefault();
        if (!profile.name || !profile.email) { showError('Name and email are required'); return; }
        try {
            setSavingProfile(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showSuccess('Profile updated successfully!');
        } catch (err) {
            showError('Failed to update profile: ' + err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const onChangePassword = async (e) => {
        e.preventDefault();
        if (!passwords.current || !passwords.newPassword || !passwords.confirm) { showError('All password fields are required'); return; }
        if (passwords.newPassword !== passwords.confirm) { showError('New passwords do not match'); return; }
        if (passwords.newPassword.length < 6) { showError('Password must be at least 6 characters'); return; }
        try {
            setChangingPassword(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showSuccess('Password changed successfully!');
            setPasswords({ current: '', newPassword: '', confirm: '' });
        } catch (err) {
            showError('Failed to change password: ' + err.message);
        } finally {
            setChangingPassword(false);
        }
    };

    const UserAvatar = ({ name }) => {
        const initial = name ? name.charAt(0).toUpperCase() : 'T';
        return (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-white/10">
                {initial}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-[var(--primary-cyan)]/10 border border-[var(--primary-cyan)]/20">
                    <SettingsIcon className="h-6 w-6 text-[var(--primary-cyan)]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Account Settings</h1>
                    <p className="text-[var(--text-muted)]">Manage your profile and security preferences</p>
                </div>
            </div>

            {/* User Profile Card */}
            <div className="premium-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <UserAvatar name={user?.username || user?.name} />
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{user?.username || user?.name || 'Team Member'}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-[var(--text-muted)] mb-3">
                        <Mail className="h-4 w-4" />
                        <span>{user?.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <span className="premium-badge bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border-[var(--primary-cyan)]/20 px-3 py-1 text-sm font-medium flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            {user?.role || 'Team Account'}
                        </span>
                        <span className="premium-badge bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1 text-sm font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Information */}
                <div className="premium-card p-6 md:p-8 h-full">
                    <div className="flex items-center gap-3 mb-6 border-b border-[var(--border)] pb-4">
                        <User className="h-5 w-5 text-[var(--primary-cyan)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Profile Information</h3>
                    </div>

                    <form onSubmit={onSaveProfile} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="premium-label block mb-2">Display Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                    <input
                                        className="premium-input w-full pl-10"
                                        placeholder="Your name"
                                        value={profile.name}
                                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="premium-label block mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                    <input
                                        className="premium-input w-full pl-10 cursor-not-allowed opacity-70"
                                        type="email"
                                        readOnly
                                        placeholder="your@email.com"
                                        value={profile.email}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">Email cannot be changed directly.</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={savingProfile}
                                className="premium-btn w-full md:w-auto bg-[var(--primary-cyan)] text-black hover:bg-[var(--primary-cyan)]/90 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            >
                                {savingProfile ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Profile
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Change Password */}
                <div className="premium-card p-6 md:p-8 h-full">
                    <div className="flex items-center gap-3 mb-6 border-b border-[var(--border)] pb-4">
                        <Lock className="h-5 w-5 text-[var(--primary-cyan)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security</h3>
                    </div>

                    <form onSubmit={onChangePassword} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="premium-label block mb-2">Current Password</label>
                                <input
                                    className="premium-input w-full"
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwords.current}
                                    onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="premium-label block mb-2">New Password</label>
                                <input
                                    className="premium-input w-full"
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwords.newPassword}
                                    onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="premium-label block mb-2">Confirm New Password</label>
                                <input
                                    className="premium-input w-full"
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="premium-btn w-full md:w-auto border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--background-dark)]"
                            >
                                {changingPassword ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4" />
                                        Update Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Settings;
