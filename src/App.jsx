import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ChangePasswordRedirect } from './components/ChangePasswordRedirect.jsx';
import { ManagerRoutes } from './manager/App.jsx';
import { App as TeamsApp } from './teams/App.jsx';
import { AdminLayout } from './admin/Layout.jsx';
import { Dashboard as AdminDashboard } from './admin/pages/Dashboard.jsx';
import { ReportingLayout as AdminReportingLayout } from './admin/pages/reports/ReportingLayout.jsx';
import { AdminOrders } from './admin/pages/orders/AdminOrders.jsx';
import { AdminOrderDetails } from './admin/pages/orders/AdminOrderDetails.jsx';
import { PriceCharts as AdminPriceCharts } from './admin/pages/PriceCharts.jsx';
import { MarketplacePricing as AdminMarketplacePricing } from './admin/pages/MarketplacePricing.jsx';
import { Bloggers as AdminBloggers } from './admin/pages/Bloggers.jsx';
import { BloggerPerformance as AdminBloggerPerformance } from './admin/pages/BloggerPerformance.jsx';
import { TeamMembers as AdminTeamMembers } from './admin/pages/TeamMembers.jsx';
import { UserPermissions as AdminUserPermissions } from './admin/pages/UserPermissions.jsx';
import { AddTeamMember } from './admin/pages/AddTeamMember.jsx';
import { ChangePassword as AdminChangePassword } from './admin/pages/ChangePassword.jsx';
import { ChangePassword as WriterChangePassword } from './writer/pages/ChangePassword.jsx';

// Admin Sites pages
import { LinkCompleted } from './admin/pages/sites/LinkCompleted.jsx';
import { AddExcel } from './admin/pages/sites/AddExcel.jsx';
import { CreateAccountFromSites } from './admin/pages/sites/CreateAccountFromSites.jsx';
import { DeletedSites } from './admin/pages/sites/DeletedSites.jsx';
import { PendingBulk } from './admin/pages/sites/PendingBulk.jsx';
import { SitesList } from './admin/pages/sites/SitesList.jsx';
import { EditSite } from './admin/pages/sites/EditSite.jsx';
// Admin Wallet pages
import { BloggersWallet } from './admin/pages/wallet/BloggersWallet.jsx';
import { PaymentHistory } from './admin/pages/wallet/PaymentHistory.jsx';
import { WithdrawalRequests } from './admin/pages/wallet/WithdrawalRequests.jsx';
import { WithdrawalRequestDetail } from './admin/pages/wallet/WithdrawalRequestDetail.jsx';
import { AdminInvoiceDetail } from './admin/pages/wallet/AdminInvoiceDetail.jsx';
// Admin More Links pages
import { Careers } from './admin/pages/more/Careers.jsx';
import { CreateCareer } from './admin/pages/more/CreateCareer.jsx';
import { EditCareer } from './admin/pages/more/EditCareer.jsx';
import { CountriesLists } from './admin/pages/more/CountriesLists.jsx';
import { CreateCountry } from './admin/pages/more/CreateCountry.jsx';
import { EditCountry } from './admin/pages/more/EditCountry.jsx';
import { FAQs } from './admin/pages/more/FAQs.jsx';
import { CreateFAQ } from './admin/pages/more/CreateFAQ.jsx';
import { EditFAQ } from './admin/pages/more/EditFAQ.jsx';
import { Videos } from './admin/pages/more/Videos.jsx';
import { CreateVideo } from './admin/pages/more/CreateVideo.jsx';
import { EditVideo } from './admin/pages/more/EditVideo.jsx';
import { BloggerLayout } from './blogger/Layout.jsx';
import { Dashboard as BloggerDashboard } from './blogger/pages/Dashboard.jsx';
import { Orders as BloggerOrders } from './blogger/pages/Orders.jsx';
import { OrderDetails as BloggerOrderDetails } from './blogger/pages/OrderDetails.jsx';
import { Wallet as BloggerWallet } from './blogger/pages/Wallet.jsx';
import { Threads as BloggerThreads } from './blogger/pages/Threads.jsx';
import { FillPaymentDetails } from './blogger/pages/payments/FillPaymentDetails.jsx';
import { RequestWithdrawal } from './blogger/pages/payments/RequestWithdrawal.jsx';
import { InvoiceList } from './blogger/pages/payments/InvoiceList.jsx';
import { InvoiceDetail } from './blogger/pages/payments/InvoiceDetail.jsx';
import { SingleSite } from './blogger/pages/sites/SingleSite.jsx';
import { MySites as BloggerMySites } from './blogger/pages/MySites.jsx';
import { ViewAllSites } from './blogger/pages/sites/ViewAllSites.jsx';
import { BulkSites } from './blogger/pages/BulkSites.jsx';
import { Profile as BloggerProfile } from './blogger/pages/Profile.jsx';
import { UpdateProfile as BloggerUpdateProfile } from './blogger/pages/UpdateProfile.jsx';
import { ChangePassword as BloggerChangePassword } from './blogger/pages/ChangePassword.jsx';
import { Guides as BloggerGuides } from './blogger/pages/Guides.jsx';
import { WriterLayout } from './writer/Layout.jsx';
import { Dashboard as WriterDashboard } from './writer/pages/Dashboard.jsx';
import { CompletedOrders as WriterCompleted } from './writer/pages/CompletedOrders.jsx';
import { CompletedOrderDetail as WriterCompletedDetail } from './writer/pages/CompletedOrderDetail.jsx';
import { OrderNotifications as WriterOrderNotifications } from './writer/pages/OrderNotifications.jsx';
import { OrderAddedDetails as WriterOrderAddedDetails } from './writer/pages/OrderAddedDetails.jsx';
import { RejectedNotifications as WriterRejectedNotifications } from './writer/pages/RejectedNotifications.jsx';
import { RejectedOrderDetails as WriterRejectedOrderDetails } from './writer/pages/RejectedOrderDetails.jsx';
import { Threads as WriterThreads } from './writer/pages/Threads.jsx';
import { Profile as WriterProfile } from './writer/pages/Profile.jsx';
import { AccountantLayout } from './accountant/Layout.jsx';
import { ClientLayout } from './client/Layout.jsx';
import { Dashboard as ClientDashboard } from './client/pages/Dashboard.jsx';
import { TopUp as ClientTopUp } from './client/pages/TopUp.jsx';
import { ViewSites as ClientViewSites } from './client/pages/ViewSites.jsx';
import { CreateOrder as ClientCreateOrder } from './client/pages/CreateOrder.jsx';
import { ViewOrders as ClientViewOrders } from './client/pages/ViewOrders.jsx';
import { OrderDetails as ClientOrderDetails } from './client/pages/OrderDetails.jsx';
import { LinkCompleted as ClientLinkCompleted } from './client/pages/LinkCompleted.jsx';
import { Transactions as ClientTransactions } from './client/pages/Transactions.jsx';

import { RequireAuth } from './auth/AuthContext.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/change-password" element={<ChangePasswordRedirect />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reporting/*" element={<AdminReportingLayout />} />
          <Route path="bloggers" element={<AdminBloggers />} />
          <Route path="bloggers/:id/performance" element={<AdminBloggerPerformance />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetails />} />
          <Route path="price-charts" element={<AdminPriceCharts />} />
          <Route path="marketplace-pricing" element={<AdminMarketplacePricing />} />
          <Route path="team-members" element={<AdminTeamMembers />} />
          <Route path="team-members/add" element={<AddTeamMember />} />
          <Route path="users/:id/permissions" element={<AdminUserPermissions />} />
          <Route path="change-password" element={<AdminChangePassword />} />

          {/* Sites routes */}
          <Route path="sites/add-excel" element={<AddExcel />} />
          <Route path="sites/upload" element={<AddExcel />} />
          <Route path="sites/create-account" element={<CreateAccountFromSites />} />
          <Route path="sites/deleted" element={<DeletedSites />} />
          <Route path="sites/pending-bulk" element={<PendingBulk />} />
          <Route path="sites/link-completed" element={<LinkCompleted />} />
          <Route path="sites" element={<SitesList />} />
          <Route path="sites/edit/:id" element={<EditSite />} />

          {/* Wallet routes */}
          <Route path="wallet/bloggers" element={<BloggersWallet />} />
          <Route path="wallet/payment-history" element={<PaymentHistory />} />
          <Route path="wallet/invoices/:id" element={<AdminInvoiceDetail />} />
          <Route path="wallet/withdrawal-requests" element={<WithdrawalRequests />} />
          <Route path="wallet/withdrawal-requests/:id" element={<WithdrawalRequestDetail />} />

          {/* More Links routes */}
          <Route path="more/careers" element={<Careers />} />
          <Route path="more/careers/create" element={<CreateCareer />} />
          <Route path="more/careers/edit/:id" element={<EditCareer />} />
          <Route path="more/countries" element={<CountriesLists />} />
          <Route path="more/countries/create" element={<CreateCountry />} />
          <Route path="more/countries/edit/:id" element={<EditCountry />} />
          <Route path="more/faqs" element={<FAQs />} />
          <Route path="more/faqs/create" element={<CreateFAQ />} />
          <Route path="more/faqs/edit/:id" element={<EditFAQ />} />
          <Route path="more/videos" element={<Videos />} />
          <Route path="more/videos/create" element={<CreateVideo />} />
          <Route path="more/videos/edit/:id" element={<EditVideo />} />
        </Route>

        {/* Blogger Routes */}
        <Route path="/blogger" element={<BloggerLayout />}>
          <Route index element={<BloggerDashboard />} />
          <Route path="orders" element={<BloggerOrders />} />
          <Route path="orders/:id" element={<BloggerOrderDetails />} />
          <Route path="threads" element={<BloggerThreads />} />
          <Route path="guides" element={<BloggerGuides />} />
          {/* Payments */}
          <Route path="payments/fill-details" element={<FillPaymentDetails />} />
          <Route path="payments/invoices" element={<InvoiceList />} />
          <Route path="payments/invoices/:id" element={<InvoiceDetail />} />
          <Route path="payments/wallet" element={<BloggerWallet />} />
          <Route path="request-withdrawal" element={<RequestWithdrawal />} />
          {/* Sites */}
          <Route path="sites/single" element={<SingleSite />} />
          <Route path="sites/all" element={<ViewAllSites />} />
          {/* Bulk Sites */}
          <Route path="bulk-sites" element={<BulkSites />} />
          {/* Profile */}
          <Route path="profile" element={<BloggerProfile />} />
          <Route path="update-profile" element={<BloggerUpdateProfile />} />
          <Route path="change-password" element={<BloggerChangePassword />} />
        </Route>

        {/* Writer Routes */}
        <Route path="/writer" element={<WriterLayout />}>
          <Route index element={<WriterDashboard />} />
          <Route path="completed-orders" element={<WriterCompleted />} />
          <Route path="completed-orders/:id/detail" element={<WriterCompletedDetail />} />
          <Route path="notifications" element={<WriterOrderNotifications />} />
          <Route path="order-added-notifications/detail/:id" element={<WriterOrderAddedDetails />} />
          <Route path="rejected" element={<WriterRejectedNotifications />} />
          <Route path="rejected/:id" element={<WriterRejectedOrderDetails />} />
          <Route path="threads" element={<WriterThreads />} />
          <Route path="profile" element={<WriterProfile />} />
          <Route path="change-password" element={<WriterChangePassword />} />
        </Route>

        {/* Accountant Routes */}
        <Route path="/accountant" element={<AccountantLayout />}>
          <Route index element={<Navigate to="wallet/bloggers" replace />} />
          <Route path="wallet/bloggers" element={<BloggersWallet />} />
          <Route path="wallet/payment-history" element={<PaymentHistory />} />
          <Route path="wallet/invoices/:id" element={<AdminInvoiceDetail />} />
          <Route path="wallet/withdrawal-requests" element={<WithdrawalRequests />} />
          <Route path="wallet/withdrawal-requests/:id" element={<WithdrawalRequestDetail />} />
        </Route>

        {/* Client Routes */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="topup" element={<ClientTopUp />} />
          <Route path="transactions" element={<ClientTransactions />} />
          <Route path="sites" element={<ClientViewSites />} />
          <Route path="sites/link-completed" element={<ClientLinkCompleted />} />
          <Route path="orders/create" element={<ClientCreateOrder />} />
          <Route path="orders" element={<ClientViewOrders />} />
          <Route path="orders/:id" element={<ClientOrderDetails />} />
        </Route>

        {/* Dynamic Routes */}
        <Route path="/manager/*" element={<ManagerRoutes />} />
        <Route path="/teams/*" element={<TeamsApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
