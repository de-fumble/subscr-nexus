import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import SuspendedAccount from "./pages/SuspendedAccount";
import SuperAdminAppeals from "./pages/SuperAdminAppeals";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import CreatePlan from "./pages/CreatePlan";
import Plans from "./pages/Plans";
import Subscribe from "./pages/Subscribe";
import SubscriptionCallback from "./pages/SubscriptionCallback";
import OneTimePayments from "./pages/OneTimePayments";
import CreateOneTimePayment from "./pages/CreateOneTimePayment";
import Pay from "./pages/Pay";
import PaymentCallback from "./pages/PaymentCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import DashboardProfile from "./pages/DashboardProfile";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardSubscribers from "./pages/DashboardSubscribers";
import DashboardLogs from "./pages/DashboardLogs";
import DashboardStaff from "./pages/DashboardStaff";
import DashboardVerify from "./pages/DashboardVerify";
import DashboardFailedPayments from "./pages/DashboardFailedPayments";
import DashboardRetryQueue from "./pages/DashboardRetryQueue";
import DashboardInvoices from "./pages/DashboardInvoices";
import DashboardBillingProfiles from "./pages/DashboardBillingProfiles";
import BillingProfileDetail from "./pages/BillingProfileDetail";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminProfile from "./pages/SuperAdminProfile";
import SuperAdminOrganization from "./pages/SuperAdminOrganization";
import SuperAdminOrganizations from "./pages/SuperAdminOrganizations";
import SuperAdminPayouts from "./pages/SuperAdminPayouts";
import SuperAdminDeletions from "./pages/SuperAdminDeletions";
import SuperAdminDefaulters from "./pages/SuperAdminDefaulters";
import SuperAdminLogs from "./pages/SuperAdminLogs";
import SuperAdminNameChanges from "./pages/SuperAdminNameChanges";
import SuperAdminLicenses from "./pages/SuperAdminLicenses";
import SuperAdminKYC from "./pages/SuperAdminKYC";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
// Footer Pages
import About from "./pages/About";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import HelpCenter from "./pages/HelpCenter";
import Community from "./pages/Community";
import Status from "./pages/Status";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import CookiePolicy from "./pages/CookiePolicy";
import GDPR from "./pages/GDPR";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyOTP from "./pages/VerifyOTP";
import PlansHub from "./pages/PlansHub";
import FindOrganizations from "./pages/FindOrganizations";
import UserVerifyTransaction from "./pages/UserVerifyTransaction";
import UserSettings from "./pages/UserSettings";

import DashboardSetup from "./pages/DashboardSetup";
import { MobileBottomNav } from "./components/MobileBottomNav";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
          <Toaster />
          <Sonner />
          <Analytics />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/find-organizations" element={<FindOrganizations />} />
            <Route path="/verify-transaction" element={<UserVerifyTransaction />} />
            <Route path="/user-settings" element={<UserSettings />} />
            <Route path="/suspended" element={<SuspendedAccount />} />
            <Route path="/subscribe/:planId" element={<Subscribe />} />
            <Route path="/subscription-callback" element={<SubscriptionCallback />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/setup" element={<ProtectedRoute><DashboardSetup /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/plans/create" element={<ProtectedRoute><CreatePlan /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><OneTimePayments /></ProtectedRoute>} />
            <Route path="/payments/create" element={<ProtectedRoute><CreateOneTimePayment /></ProtectedRoute>} />
            <Route path="/pay/:paymentId" element={<Pay />} />
            <Route path="/payment/callback" element={<PaymentCallback />} />
            <Route path="/plans-hub/:orgId" element={<PlansHub />} />
            <Route path="/plans/create" element={<ProtectedRoute><CreatePlan /></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute><DashboardAnalytics /></ProtectedRoute>} />
            <Route path="/dashboard/subscribers" element={<ProtectedRoute><DashboardSubscribers /></ProtectedRoute>} />
            <Route path="/dashboard/logs" element={<ProtectedRoute><DashboardLogs /></ProtectedRoute>} />
            <Route path="/dashboard/staff" element={<ProtectedRoute><DashboardStaff /></ProtectedRoute>} />
            <Route path="/dashboard/verify" element={<ProtectedRoute><DashboardVerify /></ProtectedRoute>} />
            <Route path="/dashboard/failed-payments" element={<ProtectedRoute><DashboardFailedPayments /></ProtectedRoute>} />
            <Route path="/dashboard/retry-queue" element={<ProtectedRoute><DashboardRetryQueue /></ProtectedRoute>} />
            <Route path="/dashboard/invoices" element={<ProtectedRoute><DashboardInvoices /></ProtectedRoute>} />
            <Route path="/dashboard/billing-profiles" element={<ProtectedRoute><DashboardBillingProfiles /></ProtectedRoute>} />
            <Route path="/dashboard/billing-profiles/:profileId" element={<ProtectedRoute><BillingProfileDetail /></ProtectedRoute>} />
            <Route element={<SuperAdminLayout />}>
              <Route path="/superadmin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/superadmin/profile" element={<ProtectedRoute><SuperAdminProfile /></ProtectedRoute>} />
              <Route path="/superadmin/organization/:orgId" element={<ProtectedRoute><SuperAdminOrganization /></ProtectedRoute>} />
              <Route path="/superadmin/organizations" element={<ProtectedRoute><SuperAdminOrganizations /></ProtectedRoute>} />
              <Route path="/superadmin/payouts" element={<ProtectedRoute><SuperAdminPayouts /></ProtectedRoute>} />
              <Route path="/superadmin/deletions" element={<ProtectedRoute><SuperAdminDeletions /></ProtectedRoute>} />
              <Route path="/superadmin/defaulters" element={<ProtectedRoute><SuperAdminDefaulters /></ProtectedRoute>} />
              <Route path="/superadmin/appeals" element={<ProtectedRoute><SuperAdminAppeals /></ProtectedRoute>} />
              <Route path="/superadmin/logs" element={<ProtectedRoute><SuperAdminLogs /></ProtectedRoute>} />
              <Route path="/superadmin/name-changes" element={<ProtectedRoute><SuperAdminNameChanges /></ProtectedRoute>} />
              <Route path="/superadmin/licenses" element={<ProtectedRoute><SuperAdminLicenses /></ProtectedRoute>} />
              <Route path="/superadmin/kyc" element={<ProtectedRoute><SuperAdminKYC /></ProtectedRoute>} />
            </Route>
            {/* Footer Pages */}
            <Route path="/about" element={<About />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/press" element={<Press />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/community" element={<Community />} />
            <Route path="/status" element={<Status />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/gdpr" element={<GDPR />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
