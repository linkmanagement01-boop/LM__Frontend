import React, { useMemo, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, CheckCircle, XCircle, Database, MessageSquare, LogOut, User, Search, ListTodo, AlertTriangle } from 'lucide-react';
import { ModernSidebar } from '../../../components/ModernSidebar';
import { teamAPI } from '../../../lib/api';
import { useAuth } from '../../../auth/AuthContext';

export const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState(null);

    // popups rendered into <body> (hover cards, modals) follow the violet theme too
    useEffect(() => {
        document.body.classList.add('theme-violet');
        return () => document.body.classList.remove('theme-violet');
    }, []);
    const { logout, user } = useAuth ? useAuth() : {
        logout: () => {
            sessionStorage.clear();
            localStorage.clear();
        },
        user: null
    };

    const getUserImage = () => {
        if (!user?.profile_image) return null;
        if (user.profile_image.startsWith('http')) return user.profile_image;
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
        const cleanPath = user.profile_image.startsWith('/') ? user.profile_image.slice(1) : user.profile_image;
        return `${baseUrl}/${cleanPath}`;
    };

    const handleLogout = () => {
        if (logout) logout();
        navigate('/login');
    };

    // Fetch permissions on mount
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await teamAPI.getMyPermissions();
                setPermissions(response.permissions);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                // Default to all enabled on error
                setPermissions({
                    order_added_notification: true,
                    completed_orders: true,
                    rejected_links: true,
                    view_threads: true,
                    create_new_thread: true,
                    profile: true
                });
            }
        };
        fetchPermissions();
    }, []);

    const allNavItems = useMemo(() => [
        {
            icon: <Home size={18} />,
            label: 'Dashboard',
            to: '/teams',
            active: location.pathname === '/teams' || location.pathname === '/teams/',
            permissionKey: null // Always visible
        },
        {
            icon: <Bell size={18} />,
            label: 'Order Notifications',
            to: '/teams/order-notifications',
            active: location.pathname.startsWith('/teams/order-notifications'),
            permissionKey: 'order_added_notification'
        },
        {
            icon: <CheckCircle size={18} />,
            label: 'Completed Orders',
            to: '/teams/completed-orders',
            active: location.pathname.startsWith('/teams/completed-orders'),
            permissionKey: 'completed_orders'
        },
        {
            icon: <XCircle size={18} />,
            label: 'Rejected Links',
            to: '/teams/rejected-links',
            active: location.pathname === '/teams/rejected-links',
            permissionKey: 'rejected_links'
        },
        {
            icon: <Database size={18} />,
            label: 'New Sites',
            to: '/teams/new-sites',
            active: location.pathname === '/teams/new-sites',
            permissionKey: null // Always visible (no permission control)
        },
        {
            icon: <MessageSquare size={18} />,
            label: 'Threads',
            to: '/teams/threads',
            active: location.pathname === '/teams/threads',
            permissionKey: 'view_threads'
        },
        {
            icon: <User size={18} />,
            label: 'Profile',
            to: '/teams/profile',
            active: location.pathname === '/teams/profile',
            permissionKey: null // Always visible
        }
    ], [location.pathname]);

    // Filter nav items based on permissions
    const navItems = useMemo(() => {
        if (!permissions) return allNavItems; // Show all while loading

        return allNavItems.filter(item => {
            // If no permission key, always show
            if (!item.permissionKey) return true;
            // Check if permission is enabled
            return permissions[item.permissionKey] !== false;
        });
    }, [allNavItems, permissions]);

    return (
        // theme-violet: the new brand colours, as in the admin and manager panels
        <div className="theme-violet h-screen overflow-hidden flex text-[var(--text-main)]">
            <ModernSidebar
                navItems={navItems}
                userName={user?.name || "Team Member"}
                userRole={user?.role || "Team"}
                userImage={getUserImage()}
                onLogout={handleLogout}
                profileLink="/teams/profile"
                changePasswordLink="/teams/change-password"
                logo="/brand/logo-mark.svg"
            />
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar relative z-0">
                    {children || <Outlet context={{ permissions }} />}
                </main>
            </div>
        </div>
    );
};
