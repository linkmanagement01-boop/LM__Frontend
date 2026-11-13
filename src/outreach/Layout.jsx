import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, Radar } from 'lucide-react';
import { ModernSidebar } from '../components/ModernSidebar';
import { outreachTeamAPI } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

/** Outreach Team panel – Dashboard, Notifications, Outreach tasks (same look as the Team panel) */
export function OutreachLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user, token } = useAuth();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        document.body.classList.add('theme-violet');
        return () => document.body.classList.remove('theme-violet');
    }, []);
    useEffect(() => { if (!token) navigate('/login'); }, [token, navigate]);

    // unread notifications badge (refreshes every minute and when the Notifications page marks them read)
    useEffect(() => {
        const load = () => outreachTeamAPI.notifications().then(d => setUnread(d.unread || 0)).catch(() => {});
        load();
        const t = setInterval(load, 60000);
        window.addEventListener('outreach:unread-changed', load);
        return () => { clearInterval(t); window.removeEventListener('outreach:unread-changed', load); };
    }, []);

    const p = location.pathname;
    const navItems = useMemo(() => [
        { icon: <Home size={18} />, label: 'Dashboard', to: '/outreach', active: p === '/outreach' || p === '/outreach/' },
        {
            icon: <Bell size={18} />,
            label: (
                <span className="inline-flex items-center gap-2">Notifications
                    {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{unread}</span>}
                </span>
            ),
            to: '/outreach/notifications', active: p.startsWith('/outreach/notifications')
        },
        { icon: <Radar size={18} />, label: 'Outreach Tasks', to: '/outreach/tasks', active: p.startsWith('/outreach/tasks') }
    ], [p, unread]);

    return (
        <div className="theme-violet h-screen overflow-hidden flex text-[var(--text-main)]">
            <ModernSidebar
                navItems={navItems}
                userName={user?.name || 'Outreach Team'}
                userRole="Outreach Team"
                onLogout={() => { logout?.(); navigate('/login'); }}
                profileLink="/outreach/change-password"
                changePasswordLink="/outreach/change-password"
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
