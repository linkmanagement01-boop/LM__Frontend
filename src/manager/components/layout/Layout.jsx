import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ModernSidebar } from '../../../components/ModernSidebar'; // Adjust path as needed, likely ../../../components/ModernSidebar
import { Home, Package, Clock, AlertTriangle, MessageSquare, Globe, User, Users, MessagesSquare, Radar } from 'lucide-react';
import { supportAPI } from '../../../lib/api';
import { useTrafficSuggestionCount } from '../../../components/TrafficSuggestions';

const MARKETPLACE_ON = import.meta.env.VITE_MARKETPLACE_ENABLED === 'true';
import { useAuth } from '../../../auth/AuthContext.jsx'; // Adjust path if needed
import { authAPI } from '../../../lib/api';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState(null);

  // popups rendered into <body> (hover cards, batch progress) follow the violet theme too
  useEffect(() => {
    document.body.classList.add('theme-violet');
    return () => document.body.classList.remove('theme-violet');
  }, []);
  
  // Assuming useAuth is available or fallback to local storage logic
  const { logout, user } = useAuth ? useAuth() : {
    logout: () => {
      sessionStorage.clear();
      localStorage.clear();
    },
    user: null
  };

  useEffect(() => {
    const fetchPermissions = async () => {
        try {
            const response = await authAPI.getMyPermissions();
            setPermissions(response.permissions);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            // Default to all enabled on error
            setPermissions({
                orders: true,
                pending_approval: true,
                rejected_orders: true,
                threads: true,
                sites: true,
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
    if (logout) logout();
    navigate('/login');
  };

  // Client chats waiting for a reply (marketplace support inbox)
  const [supportUnread, setSupportUnread] = useState(0);
  useEffect(() => {
    if (!MARKETPLACE_ON) return undefined;
    const load = () => supportAPI.unread().then(d => setSupportUnread(d.unread || 0)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    window.addEventListener('support:unread-changed', load);
    return () => { clearInterval(t); window.removeEventListener('support:unread-changed', load); };
  }, []);

  const suggestionCount = useTrafficSuggestionCount('manager');

  const allNavItems = useMemo(() => [
    {
      icon: <Home size={18} />,
      label: 'Dashboard',
      to: '/manager',
      active: location.pathname === '/manager' || location.pathname === '/manager/',
      permissionKey: null
    },
    {
      icon: <Package size={18} />,
      label: 'Orders',
      to: '/manager/orders/view',
      active: location.pathname.startsWith('/manager/orders') || location.pathname.startsWith('/manager/client-orders'),
      hasDropdown: true,
      permissionKey: 'orders',
      dropdownItems: [
        { label: 'Create New Order', to: '/manager/orders/create' },
        { label: 'View Orders', to: '/manager/orders/view' },
        { label: 'Client Orders', to: '/manager/client-orders' }
      ]
    },
    {
      icon: <Clock size={18} />,
      label: 'Pending Approval',
      hasDropdown: true,
      active: location.pathname.startsWith('/manager/pending'),
      permissionKey: 'pending_approval',
      dropdownItems: [
        { label: 'Bloggers', to: '/manager/pending/bloggers' },
        { label: 'Writers', to: '/manager/pending/writers' },
        { label: 'Teams', to: '/manager/pending/teams' }
      ]
    },
    {
      icon: <AlertTriangle size={18} />,
      label: 'Rejected Orders',
      to: '/manager/rejected/bloggers',
      active: location.pathname.startsWith('/manager/rejected'),
      hasDropdown: true,
      permissionKey: 'rejected_orders',
      dropdownItems: [
        { label: 'Bloggers', to: '/manager/rejected/bloggers' },
        { label: 'Writers', to: '/manager/rejected/writers' }
      ]
    },
    ...(MARKETPLACE_ON ? [{
      icon: <MessagesSquare size={18} />,
      label: (
        <span className="inline-flex items-center gap-2">
          Client Messages
          {supportUnread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{supportUnread}</span>}
        </span>
      ),
      to: '/manager/client-messages',
      active: location.pathname === '/manager/client-messages',
      permissionKey: null
    }, {
      // sites marketplace clients asked us to get, with their budget
      icon: <Radar size={18} />,
      label: 'Outreach Requests',
      to: '/manager/outreach-requests',
      active: location.pathname === '/manager/outreach-requests',
      permissionKey: null
    }] : []),
    {
      icon: <MessageSquare size={18} />,
      label: 'Threads',
      to: '/manager/threads',
      active: location.pathname === '/manager/threads',
      permissionKey: 'threads'
    },
    {
      icon: <Globe size={18} />,
      label: 'Sites',
      to: '#',
      active: location.pathname.startsWith('/manager/sites'),
      hasDropdown: true,
      permissionKey: 'sites',
      dropdownItems: [
        { label: 'View Sites', to: '/manager/sites' },
        { label: 'Suggestions', to: '/manager/sites/suggestions', badge: suggestionCount },
        { label: 'Link Completed', to: '/manager/sites/link-completed' }
      ]
    },
    {
      icon: <User size={18} />,
      label: 'Profile',
      to: '/manager/profile',
      active: location.pathname === '/manager/profile' || location.pathname === '/manager/profile/',
      permissionKey: 'profile'
    }
  ], [location.pathname, supportUnread, suggestionCount]);

  const navItems = useMemo(() => {
    if (!permissions) return allNavItems;
    return allNavItems.filter(item => {
        if (!item.permissionKey) return true;
        return permissions[item.permissionKey] !== false;
    });
  }, [allNavItems, permissions]);

  return (
    // theme-violet: the new brand colours, as in the admin panel
    <div className="theme-violet h-screen overflow-hidden flex">
      <ModernSidebar
        navItems={navItems}
        userName={user?.name || "Manager User"}
        userRole={user?.role || "Manager"}
        userImage={getUserImage()}
        onLogout={handleLogout}
        profileLink="/manager/profile"
        changePasswordLink="/manager/change-password"
        overlay={/^\/manager\/sites\/?$/.test(location.pathname)}
        logo="/brand/logo-mark.svg"
      />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};