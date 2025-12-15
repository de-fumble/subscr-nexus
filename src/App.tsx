import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SuspendedAccount from "./pages/SuspendedAccount";
import SuperAdminAppeals from "./pages/SuperAdminAppeals";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import CreatePlan from "./pages/CreatePlan";
import Plans from "./pages/Plans";
import Subscribe from "./pages/Subscribe";
import SubscriptionCallback from "./pages/SubscriptionCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import DashboardProfile from "./pages/DashboardProfile";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardSubscribers from "./pages/DashboardSubscribers";
import DashboardLogs from "./pages/DashboardLogs";
import DashboardStaff from "./pages/DashboardStaff";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminOrganization from "./pages/SuperAdminOrganization";
import SuperAdminPayouts from "./pages/SuperAdminPayouts";
import SuperAdminDeletions from "./pages/SuperAdminDeletions";
import SuperAdminDefaulters from "./pages/SuperAdminDefaulters";
import SuperAdminLogs from "./pages/SuperAdminLogs";
import SuperAdminNameChanges from "./pages/SuperAdminNameChanges";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/suspended" element={<SuspendedAccount />} />
          <Route path="/subscribe/:planId" element={<Subscribe />} />
          <Route path="/subscription-callback" element={<SubscriptionCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
          <Route path="/plans/create" element={<ProtectedRoute><CreatePlan /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><DashboardAnalytics /></ProtectedRoute>} />
          <Route path="/dashboard/subscribers" element={<ProtectedRoute><DashboardSubscribers /></ProtectedRoute>} />
          <Route path="/dashboard/logs" element={<ProtectedRoute><DashboardLogs /></ProtectedRoute>} />
          <Route path="/dashboard/staff" element={<ProtectedRoute><DashboardStaff /></ProtectedRoute>} />
          {/* Super Admin Routes */}
          <Route path="/superadmin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/organization/:orgId" element={<ProtectedRoute><SuperAdminOrganization /></ProtectedRoute>} />
          <Route path="/superadmin/payouts" element={<ProtectedRoute><SuperAdminPayouts /></ProtectedRoute>} />
          <Route path="/superadmin/deletions" element={<ProtectedRoute><SuperAdminDeletions /></ProtectedRoute>} />
          <Route path="/superadmin/defaulters" element={<ProtectedRoute><SuperAdminDefaulters /></ProtectedRoute>} />
          <Route path="/superadmin/appeals" element={<ProtectedRoute><SuperAdminAppeals /></ProtectedRoute>} />
          <Route path="/superadmin/logs" element={<ProtectedRoute><SuperAdminLogs /></ProtectedRoute>} />
          <Route path="/superadmin/name-changes" element={<ProtectedRoute><SuperAdminNameChanges /></ProtectedRoute>} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
