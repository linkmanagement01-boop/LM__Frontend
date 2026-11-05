import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ModernSidebar } from '../components/ModernSidebar';
import { LayoutGrid, CheckCircle2, Bell, XCircle, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { authAPI } from '../lib/api';

export function WriterLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const base = '/writer';
  const [permissions, setPermissions] = useState(null);

  // popups rendered into <body> (modals, hover cards) follow the violet theme too
  useEffect(() => {
    document.body.classList.add('theme-violet');
    return () => document.body.classList.remove('theme-violet');
  }, []);

  useEffect(() => {
    const fetchPermissions = async () => {
        try {
            const response = await authAPI.getMyPermissions();
            setPermissions(response.permissions);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            // Default to all enabled on error
            setPermissions({
                completed_orders: true,
                order_notifications: true,
                rejected_notifications: true,
                threads: true,
                profile: true
            });
        }
    };
    fetchPermissions();
  }, []);

  const getUserImage = () => {
    if (!user?.profile_image) return null;
    if (user.profile_image.startsWith('http')) return user.profile_image;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
    const cleanPath = user.profile_image.startsWith('/') ? user.profile_image.slice(1) : user.profile_image;
    return `${baseUrl}/${cleanPath}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = useMemo(() => [
    { icon: <LayoutGrid size={18} />, label: 'Dashboard', to: base, active: pathname === base || pathname === `${base}/`, permissionKey: null },
    { icon: <CheckCircle2 size={18} />, label: 'Completed Orders', to: `${base}/completed-orders`, active: pathname.startsWith(`${base}/completed-orders`), permissionKey: 'completed_orders' },
    { icon: <Bell size={18} />, label: 'Order Notifications', to: `${base}/notifications`, active: pathname.startsWith(`${base}/notifications`), permissionKey: 'order_notifications' },
    { icon: <XCircle size={18} />, label: 'Rejected Notifications', to: `${base}/rejected`, active: pathname.startsWith(`${base}/rejected`), permissionKey: 'rejected_notifications' },
    { icon: <MessageSquare size={18} />, label: 'Threads', to: `${base}/threads`, active: pathname.startsWith(`${base}/threads`), permissionKey: 'threads' },
    { icon: <User size={18} />, label: 'Profile', to: `${base}/profile`, active: pathname === `${base}/profile`, permissionKey: 'profile' },
  ], [pathname, base]);

  const navItems = useMemo(() => {
    if (!permissions) return allNavItems;
    return allNavItems.filter(item => {
        if (!item.permissionKey) return true;
        return permissions[item.permissionKey] !== false;
    });
  }, [allNavItems, permissions]);

  return (
    // theme-violet: the new brand colours, as in the admin, manager and team panels
    <div className="theme-violet h-screen overflow-hidden flex text-[var(--text-main)]">
      <ModernSidebar
        navItems={navItems}
        userName={user?.name || "Writer"}
        userRole={user?.role || "Writer"}
        userImage={getUserImage()}
        onLogout={handleLogout}
        profileLink="/writer/profile"
        changePasswordLink="/writer/change-password"
        logo="/brand/logo-mark.svg"
      />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
