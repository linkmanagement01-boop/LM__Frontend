import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OutreachLayout } from './Layout.jsx';
import { OutreachDashboard } from './pages/Dashboard.jsx';
import { OutreachNotifications } from './pages/Notifications.jsx';
import { OutreachTasks } from './pages/Tasks.jsx';
import { ChangePassword } from '../teams/components/pages/ChangePassword.jsx';

/** Outreach Team panel – /outreach/* */
export function OutreachApp() {
    return (
        <Routes>
            <Route element={<OutreachLayout />}>
                <Route index element={<OutreachDashboard />} />
                <Route path="notifications" element={<OutreachNotifications />} />
                <Route path="tasks" element={<OutreachTasks />} />
                <Route path="change-password" element={<ChangePassword />} />
            </Route>
        </Routes>
    );
}

export default OutreachApp;
