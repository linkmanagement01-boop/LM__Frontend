import React from 'react';
import './index.css';
import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { CreateOrder } from './pages/orders/CreateOrder.jsx';
import { DirectWriterOrder } from './pages/orders/DirectWriterOrder.jsx';
import { DirectBloggerOrder } from './pages/orders/DirectBloggerOrder.jsx';
import { ViewOrders } from './pages/orders/ViewOrders.jsx';
import { OrderDetails } from './pages/orders/OrderDetails.jsx';
import { PendingBloggers } from './pages/pending/Bloggers.jsx';
import { BloggerSubmissionDetails } from './pages/pending/BloggerSubmissionDetails.jsx';
import { PendingTeams } from './pages/pending/Teams.jsx';
import { TeamSubmissionDetails } from './pages/pending/TeamSubmissionDetails.jsx';
import { PendingWriters } from './pages/pending/Writers.jsx';
import { WriterSubmissionDetails } from './pages/pending/WriterSubmissionDetails.jsx';
import { RejectedBloggers } from './pages/rejected/Bloggers.jsx';
import { RejectedWriters } from './pages/rejected/Writers.jsx';
import { Threads } from './pages/Threads.jsx';
import { ClientMessages } from './pages/ClientMessages.jsx';
import { Sites } from './pages/Sites.jsx';
import { LinkCompleted } from './pages/sites/LinkCompleted.jsx';
import { SiteSuggestions } from './pages/sites/SiteSuggestions.jsx';
import { Profile } from './pages/Profile.jsx';
import { ChangePassword } from './pages/ChangePassword.jsx';
import { ClientOrders } from './pages/orders/ClientOrders.jsx';
import { ClientOrderDetails } from './pages/orders/ClientOrderDetails.jsx';

export function ManagerRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />

      {/* Orders */}
      <Route path="orders" element={<ViewOrders />} />
      <Route path="orders/view" element={<ViewOrders />} />
      <Route path="orders/:id" element={<OrderDetails />} />
      <Route path="orders/create" element={<CreateOrder />} />
      <Route path="orders/create/direct-writer" element={<DirectWriterOrder />} />
      <Route path="orders/create/direct-blogger" element={<DirectBloggerOrder />} />

      {/* Pending Approval */}
      <Route path="pending/bloggers" element={<PendingBloggers />} />
      <Route path="pending/bloggers/:id" element={<BloggerSubmissionDetails />} />
      <Route path="pending/writers" element={<PendingWriters />} />
      <Route path="pending/writers/:id" element={<WriterSubmissionDetails />} />
      <Route path="pending/teams" element={<PendingTeams />} />
      <Route path="pending/teams/:id" element={<TeamSubmissionDetails />} />

      {/* Rejected Orders */}
      <Route path="rejected/bloggers" element={<RejectedBloggers />} />
      <Route path="rejected/writers" element={<RejectedWriters />} />

      {/* Threads & Sites */}
      <Route path="threads" element={<Threads />} />
      <Route path="client-messages" element={<ClientMessages />} />
      <Route path="sites" element={<Sites />} />
      <Route path="sites/suggestions" element={<SiteSuggestions />} />
      <Route path="sites/link-completed" element={<LinkCompleted />} />
      <Route path="sites/live-links" element={<LinkCompleted />} />

      {/* Client Orders */}
      <Route path="client-orders" element={<ClientOrders />} />
      <Route path="client-orders/:id" element={<ClientOrderDetails />} />

      {/* Profile */}
      <Route path="profile" element={<Profile />} />
      <Route path="change-password" element={<ChangePassword />} />
    </Routes>
  );
}