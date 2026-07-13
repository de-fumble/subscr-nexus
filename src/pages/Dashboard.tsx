import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Users, Download, Filter, Eye, EyeOff, Edit2, Loader2, ChevronRight, AlertTriangle, ArrowUpRight, RotateCcw, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { PayoutRequestDialog } from "@/components/PayoutRequestDialog";
import { RefundRequestDialog } from "@/components/RefundRequestDialog";
import { FailedPaymentsDialog } from "@/components/FailedPaymentsDialog";
import { TransactionFilterDialog } from "@/components/TransactionFilterDialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardSplash } from "@/components/DashboardSplash";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { SetupProgressCard } from "@/components/SetupProgressCard";
import { NotificationIcon } from "@/components/NotificationIcon";
import { FloatingSupport } from "@/components/FloatingSupport";
import { FounderInsight } from "@/components/FounderInsight";
import { KYCApprovalModal } from "@/components/KYCApprovalModal";
import logoSvg from "@/assets/logo.svg";
import { getDashboardDataSource } from "@/lib/dataSource";

const APPLE_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";
interface Organization {
  id: string;
  org_name: string;
  email: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  logo_url?: string | null;
  kyc_verified?: boolean;
  kyc_submitted_at?: string | null;
  paystack_secret_key?: string | null;
  paystack_public_key?: string | null;
  recurra_handling_request?: boolean | null;
  recurra_keys_managed?: boolean | null;
}
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  subscriber_count?: number;
}
interface RecentTransaction {
  id: string;
  reference: string;
  payer_name: string;
  plan_name: string;
  amount: number;
  status: string;
  paid_at: string;
  type: 'subscription' | 'one-time';
}
interface RevenueByPlan {
  name: string;
  value: number;
  color: string;
}
const DashboardHeader = ({
  orgName,
  orgId
}: {
  orgName?: string;
  orgId?: string;
}) => {
  const {
    state
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  return <header className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center gap-2 sm:gap-3 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
    <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
    <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
      <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
        {isCollapsed ? orgName || "Dashboard" : "Dashboard"}
      </h1>
    </div>
    <div className="flex items-center gap-3 pr-1 sm:pr-0">
      {orgId && <div className="shrink-0 relative z-50 flex items-center"><NotificationIcon orgId={orgId} /></div>}
      <div className="md:hidden shrink-0 flex items-center justify-center">
        <img
          src={logoSvg}
          alt="Recurra Logo"
          className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-full shadow-sm border border-border/50"
        />
      </div>
    </div>
  </header>;
};

// Circular progress indicator component
const CircularProgress = ({
  percentage,
  color
}: {
  percentage: number;
  color: string;
}) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - percentage / 100 * circumference;
  return <svg width="60" height="60" viewBox="0 0 60 60" className="transform -rotate-90">
    <circle cx="30" cy="30" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
    <circle cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500" />
  </svg>;
};

// Mini pie chart for failed payments breakdown
const MiniPieChart = ({
  data
}: {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;
  return <div className="relative h-14 w-14">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={15} outerRadius={25} paddingAngle={2} dataKey="value">
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </div>;
};
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    canRequestPayout,
    canCreatePlans,
    canAccessSettings,
    canRequestLicense,
    role
  } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  // true only on first-ever login per user account
  const [showSplash, setShowSplash] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    recurringRevenue: 0,
    activeSubscribers: 0,
    totalSubscribers: 0,
    totalFailedPayments: 0,
    abandonedCheckouts: 0,
    failedPayments: 0
  });
  const [chartData, setChartData] = useState<Array<{
    plan: string;
    revenue: number;
  }>>([]);
  const [failedPaymentsData, setFailedPaymentsData] = useState<Array<{
    name: string;
    value: number;
  }>>([]);
  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [currentLicense, setCurrentLicense] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D' | '90D'>('7D');
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{
    date: string;
    value: number;
  }>>([]);
  const [editTotalDialog, setEditTotalDialog] = useState(false);
  const [newTotalSubscribers, setNewTotalSubscribers] = useState("");
  const [exportingRevenue, setExportingRevenue] = useState(false);
  const [showRevenueDetailsDialog, setShowRevenueDetailsDialog] = useState(false);
  const [showTransactionFilterDialog, setShowTransactionFilterDialog] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [kycApprovalNotification, setKycApprovalNotification] = useState<string | null>(null);
  const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(330, 81%, 60%)'];
  const failedPaymentsPieData = [{
    name: 'Abandoned',
    value: stats.abandonedCheckouts,
    color: 'hsl(45, 93%, 47%)'
  }, {
    name: 'Failed',
    value: stats.failedPayments,
    color: 'hsl(0, 84%, 60%)'
  }];
  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('dashboard-subscribers').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subscribers'
    }, () => {
      fetchDashboardData();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (organization) {
      fetchTimeSeriesData();
      checkKYCApproval();
    }
  }, [organization, chartPeriod]);

  const checkKYCApproval = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", organization.id)
        .eq("type", "kyc_approval")
        .eq("is_read", false)
        .maybeSingle();

      if (!error && data) {
        console.log("Found KYC approval notification:", data.id);
        setKycApprovalNotification(data.id);
      } else if (error) {
        console.error("Error checking KYC approval notification:", error);
      } else {
        console.log("No unread KYC approval notification found for org:", organization.id);
      }
    } catch (err) {
      console.error("Error checking KYC approval notification:", err);
    }
  };
  const fetchTimeSeriesData = async () => {
    if (!organization) return;
    const now = new Date();
    let startDate = new Date();
    if (chartPeriod === '7D') {
      startDate.setDate(now.getDate() - 7);
    } else if (chartPeriod === '30D') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate.setDate(now.getDate() - 90);
    }

    const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
      body: {
        action: "export_transactions",
        orgId: organization.id,
        dataSource: getDashboardDataSource(),
      },
    });
    if (error) return;

    const allTransactions = (Array.isArray((data as any)?.transactions) ? (data as any).transactions : [])
      .map((t: any) => ({ amount: Number(t.amount) || 0, paid_at: t.paid_at || t.created_at }))
      .filter((t: any) => t.paid_at && new Date(t.paid_at) >= startDate);

    const grouped: Record<string, number> = {};
    allTransactions.forEach(txn => {
      const date = new Date(txn.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + txn.amount;
    });

    // Fill in missing dates
    const result: Array<{ date: string; value: number; }> = [];
    const current = new Date(startDate);

    while (current <= now) {
      const dateKey = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({
        date: dateKey,
        value: grouped[dateKey] || 0
      });
      current.setDate(current.getDate() + 1);
    }

    setTimeSeriesData(result);
  };
  const fetchDashboardData = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email);

      // Determine whether to show the premium splash (first-ever login per account)
      const splashKey = `recurra_splash_shown_${user.id}`;
      if (!localStorage.getItem(splashKey)) {
        setShowSplash(true);
        localStorage.setItem(splashKey, "1");
      }

      let orgData = null;
      const {
        data: ownedOrg,
        error: ownedOrgError
      } = await supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle();

      if (ownedOrgError) {
        console.error("Error fetching owned org:", ownedOrgError);
      }

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const {
          data: membership
        } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          const {
            data: staffOrg,
            error: staffOrgError
          } = await supabase.from("organizations").select("*").eq("id", membership.org_id).maybeSingle();
          if (staffOrgError) {
            console.error("Error fetching staff org:", staffOrgError);
          }
          orgData = staffOrg;
        }
      }
      if (!orgData) {
        // Before erroring out, check if this user is a superadmin —
        // they don't have an org and should go to /superadmin, not /auth.
        const [{ data: roleData }, { data: deptData }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "superadmin")
            .maybeSingle(),
          supabase
            .from("superadmin_role_assignments")
            .select("department")
            .eq("user_id", user.id)
            .limit(1),
        ]);

        if (roleData || (deptData && deptData.length > 0)) {
          navigate("/superadmin", { replace: true });
          return;
        }

        console.error("No organization found for user");
        toast.error("No organization found. Please contact support.");
        navigate("/auth");
        return;
      }

      const hasPaymentProvider = !!orgData.paystack_secret_key || !!orgData.recurra_keys_managed;
      let hasPlans = false;

      const { count: planCount } = await supabase
        .from("subscription_plans")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgData.id)
        .eq("is_active", true);

      if (planCount && planCount > 0) {
        hasPlans = true;
      }

      // Redirect to setup only if neither payment method is configured AND
      // no plans exist. recurra_handling_request=true counts as configured.
      // The sessionStorage flag prevents re-entrance loops during the same session.
      if (!hasPaymentProvider && !hasPlans && sessionStorage.getItem("setup_redirect_done") !== "true") {
        sessionStorage.setItem("setup_redirect_done", "true");
        navigate("/dashboard/setup", { replace: true });
        return;
      }

      setOrganization(orgData);

      // PARALLEL FETCH PHASE 1: Fetch Plans, Subscribers, Overviews, and Wallet Info simultaneously
      const [
        { data: plansData },
        { data: subscribersData },
        { data: otpPaymentsData },
        { data: payoutData },
        { data: licenseData },
      ] = await Promise.all([
        supabase.from("subscription_plans").select("id, name, price, interval").eq("org_id", orgData.id).eq("is_active", true),
        supabase.from("subscribers").select("id, status, plan_id, subscription_plans!inner(org_id)").eq("subscription_plans.org_id", orgData.id),
        supabase.from("one_time_payments").select("id").eq("org_id", orgData.id),
        supabase.from("payout_requests").select("amount, status").eq("org_id", orgData.id),
        supabase.from("licenses").select("*").eq("org_id", orgData.id).eq("status", "active").order("expires_at", { ascending: false }).limit(1).maybeSingle()
      ]);

      const plans = plansData || [];
      const subscribers = subscribersData || [];
      const otpPayments = otpPaymentsData || [];

      // Process Subscriber Counts Locally (0 ms)
      const totalSubsCount = subscribers.length;
      let totalActiveSubscribers = 0;

      const plansWithCounts = plans.map(plan => {
        const count = subscribers.filter(s => s.plan_id === plan.id && s.status === 'active').length;
        totalActiveSubscribers += count;
        return { ...plan, subscriber_count: count };
      });
      setPlans(plansWithCounts);

      // Extract IDs for next Parallel Fetch Phase
      const activeSubscriberIds = subscribers.filter(s => s.status === 'active').map(s => s.id);
      const otpPaymentIds = otpPayments.map(p => p.id);

      // PARALLEL FETCH PHASE 2: Transactions
      // If we have subscribers or standard payments, fetch their transactions simultaneously
      const [
        { data: subscriptionTxns },
        { data: otpTxns }
      ] = await Promise.all([
        activeSubscriberIds.length > 0
          ? supabase.from("transactions").select("amount, subscriber_id").in("subscriber_id", activeSubscriberIds).eq("status", "success")
          : Promise.resolve({ data: [] }),
        otpPaymentIds.length > 0
          ? supabase.from("one_time_payment_transactions").select("amount").in("payment_id", otpPaymentIds)
          : Promise.resolve({ data: [] })
      ]);

      // Calculate Revenue Locally (0 ms)
      const revenueData: RevenueByPlan[] = [];
      let totalRevenueAmount = 0;

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const planSubIds = subscribers.filter(s => s.plan_id === plan.id && s.status === 'active').map(s => s.id);

        let planRevenue = 0;
        if (subscriptionTxns && subscriptionTxns.length > 0) {
          const planTxns = subscriptionTxns.filter(t => planSubIds.includes(t.subscriber_id));
          planRevenue = planTxns.reduce((sum, t) => sum + Number(t.amount) / 100, 0);
        }

        if (planRevenue > 0) {
          revenueData.push({
            name: plan.name,
            value: planRevenue,
            color: CHART_COLORS[i % CHART_COLORS.length]
          });
          totalRevenueAmount += planRevenue;
        }
      }

      // Add Standard Payments Revenue
      const otpRevenue = otpTxns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      if (otpRevenue > 0) {
        revenueData.push({
          name: 'Standard Payments',
          value: otpRevenue,
          color: CHART_COLORS[revenueData.length % CHART_COLORS.length]
        });
        totalRevenueAmount += otpRevenue;
      }
      setRevenueByPlan(revenueData);

      // Set Payouts & Balance Info Locally
      if (payoutData) {
        const pending = payoutData.filter(p => p.status === "pending" || p.status === "approved").reduce((sum, p) => sum + p.amount, 0);
        const paidOut = payoutData.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
        setPendingPayouts(pending);
        setTotalPaidOut(paidOut);
      }
      setCurrentLicense(licenseData);

      // Set local fast state — but keep splash visible until Paystack analytics resolves
      setStats(prev => ({
        ...prev,
        totalRevenue: totalRevenueAmount,
        activeSubscribers: totalActiveSubscribers,
        totalSubscribers: totalSubsCount,
      }));

      const dataSource = getDashboardDataSource();

      // Await analytics so the splash stays up until revenue is final
      await fetchPaystackAnalyticsQuietly(orgData.id, totalRevenueAmount, totalActiveSubscribers, totalSubsCount, dataSource);

      // Fetch Recent Transactions quietly (non-blocking, does not affect splash)
      fetchRecentTransactions(orgData.id, dataSource);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard");
      setLoading(false);
    } finally {
      // Guarantee splash always closes, even if fetchPaystackAnalyticsQuietly throws
      setLoading(false);
    }
  };

  const fetchPaystackAnalyticsQuietly = async (
    orgId: string,
    baseRevenue: number,
    baseActiveSubs: number,
    baseTotalSubs: number,
    dataSource: "local" | "paystack"
  ) => {
    try {
      // Keep revenue card aligned with the same merged transaction feed used elsewhere.
      // Run export_transactions and list_refunds in parallel so refunds are always deducted.
      const [
        { data: exportData, error: exportError },
        { data: refundData, error: refundError },
      ] = await Promise.all([
        supabase.functions.invoke("fetch-paystack-analytics", {
          body: { action: "export_transactions", orgId, dataSource },
        }),
        supabase.functions.invoke("fetch-paystack-analytics", {
          body: { action: "list_refunds", orgId },
        }),
      ]);

      const exportRows = !exportError && Array.isArray((exportData as any)?.transactions)
        ? (exportData as any).transactions
        : [];

      // Gross revenue from all successful transactions
      const grossExportRevenue = exportRows.reduce((sum: number, txn: any) => sum + (Number(txn.amount) || 0), 0);

      // Total amount refunded (processed refunds only — don't deduct pending/failed ones twice)
      const totalRefunded = !refundError && refundData?.summary
        ? (refundData.summary.total as number) || 0
        : 0;

      // Net revenue = gross minus refunds
      const exportTotalRevenue = Math.max(0, grossExportRevenue - totalRefunded);
      const exportRevenueByPlanMap = exportRows.reduce((acc: Record<string, number>, txn: any) => {
        const name = String(txn.plan_name || "Other");
        acc[name] = (acc[name] || 0) + (Number(txn.amount) || 0);
        return acc;
      }, {});

      // Deduct refunds from their respective plans
      if (!refundError && refundData?.refunds) {
        refundData.refunds.forEach((r: any) => {
          if (!["failed", "declined"].includes(r.status)) {
            // Find the exact transaction to guarantee plan name matches
            const matchingTxn = exportRows.find((t: any) => t.reference === r.reference);
            const name = String(matchingTxn?.plan_name || r.plan_name || "Other");
            if (exportRevenueByPlanMap[name] !== undefined) {
              exportRevenueByPlanMap[name] = Math.max(0, exportRevenueByPlanMap[name] - r.refund_amount);
            }
          }
        });
      }

      const exportRevenueByPlan = Object.entries(exportRevenueByPlanMap).map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));

      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: { orgId, dataSource },
      });

      if (!analyticsError && analyticsData) {
        console.log("Paystack analytics load complete — updating overview stats.");
        const failedData = analyticsData.failedPaymentsData || [];
        const abandonedCount = failedData.find((d: any) => d.name === 'Abandoned Checkout')?.value || 0;
        const failedCount = failedData.find((d: any) => d.name === 'Failed Payments')?.value || 0;

        setFailedPaymentsData(failedData);

        if (exportRevenueByPlan.length > 0) {
          setRevenueByPlan(exportRevenueByPlan);
        } else {
          const paystackChartData = analyticsData.chartData || [];
          if (paystackChartData.length > 0) {
            const revenueData: RevenueByPlan[] = paystackChartData.map((item: any, index: number) => ({
              name: item.plan,
              value: item.revenue,
              color: CHART_COLORS[index % CHART_COLORS.length]
            }));
            setRevenueByPlan(revenueData);
          }
        }

        const revenueTrend = analyticsData.revenueTrend || [];
        if (revenueTrend.length > 0) {
          setTimeSeriesData(revenueTrend.map((item: any) => ({
            date: item.month,
            value: item.revenue
          })));
        }

        // Stats are now final — splash will close immediately after this
        setStats({
          totalRevenue: exportTotalRevenue || analyticsData.totalRevenue || baseRevenue,
          recurringRevenue: analyticsData.recurringRevenue || 0,
          activeSubscribers: analyticsData.activeSubscribers || baseActiveSubs,
          totalSubscribers: baseTotalSubs,
          totalFailedPayments: abandonedCount + failedCount,
          abandonedCheckouts: abandonedCount,
          failedPayments: failedCount
        });
      }
    } catch (e) {
      console.error("Paystack analytics fetch failed — showing with local data:", e);
    } finally {
      // Always release the splash regardless of success or failure
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async (orgId: string, dataSource: "local" | "paystack") => {
    try {
      // Calculate 48 hours ago
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      // Use backend function (Paystack + local DB merged) so this is truly "live" per org
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          action: "export_transactions",
          orgId,
          dataSource,
        },
      });

      if (error) throw error;

      const raw = (data as any)?.transactions as any[] | undefined;
      const rows = Array.isArray(raw) ? raw : [];

      const mapped: RecentTransaction[] = rows
        .map((txn, index) => {
          const paidAt = txn.paid_at || txn.created_at;
          const dt = paidAt ? new Date(paidAt) : null;

          // Only last 48 hours
          if (!dt || dt < fortyEightHoursAgo) return null;

          const rawType = String(txn.type || "").toLowerCase();
          const type: RecentTransaction["type"] = rawType.includes("one") ? "one-time" : "subscription";

          return {
            id: String(txn.reference || txn.id || index),
            reference: String(txn.reference || "N/A").substring(0, 10),
            payer_name: txn.customer_name || "Unknown",
            plan_name: txn.plan_name || (type === "one-time" ? "One-Time Payment" : "Unknown Plan"),
            amount: Number(txn.amount) || 0,
            status: txn.status || "success",
            paid_at: paidAt || new Date().toISOString(),
            type,
          };
        })
        .filter(Boolean) as RecentTransaction[];

      // Sort by date and take top 10
      mapped.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
      setRecentTransactions(mapped.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      setRecentTransactions([]);
    }
  };
  const handleUpdateTotalSubscribers = async () => {
    const total = parseInt(newTotalSubscribers);
    if (isNaN(total) || total < 0) {
      toast.error("Please enter a valid number");
      return;
    }
    setStats(prev => ({
      ...prev,
      totalSubscribers: total
    }));
    setEditTotalDialog(false);
    setNewTotalSubscribers("");
    toast.success("Total subscribers updated");
  };
  const handleExportRevenue = async () => {
    if (!organization) {
      toast.error("Organization not found");
      return;
    }
    setExportingRevenue(true);
    try {
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      // Export window: last 12 months (including current month)
      const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Fetch transaction data from Paystack via backend function
      const {
        data: paystackData,
        error: paystackError
      } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          orgId: organization.id,
          action: "export_transactions"
        }
      });
      if (paystackError) {
        console.error("Paystack error:", paystackError);
        throw paystackError;
      }
      const allTransactions = paystackData?.transactions || [];
      console.log("Fetched transactions for export:", allTransactions.length);

      // Keep only transactions in the last 12 months window
      const windowTransactions = allTransactions.filter((txn: any) => {
        const txnDate = new Date(txn.paid_at || txn.created_at);
        return txnDate >= windowStart && txnDate < windowEnd;
      });

      // Group by month for summary
      const monthlyRevenue: {
        [key: string]: {
          month: string;
          revenue: number;
          transactions: number;
        };
      } = {};

      // Initialize months for the last 12 months window
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue[key] = {
          month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          revenue: 0,
          transactions: 0
        };
      }

      // Aggregate transactions by month
      windowTransactions.forEach((txn: any) => {
        const txnDate = new Date(txn.paid_at || txn.created_at);
        const key = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyRevenue[key]) {
          monthlyRevenue[key].revenue += Number(txn.amount);
          monthlyRevenue[key].transactions += 1;
        }
      });

      // Create Excel workbook
      const wb = XLSX.utils.book_new();

      // Monthly Summary sheet
      const summaryData = Object.values(monthlyRevenue).map(m => ({
        Month: m.month,
        "Total Revenue (₦)": m.revenue,
        "Number of Transactions": m.transactions
      }));

      // Add totals row
      const totalRevenue = Object.values(monthlyRevenue).reduce((sum, m) => sum + m.revenue, 0);
      const totalTransactions = Object.values(monthlyRevenue).reduce((sum, m) => sum + m.transactions, 0);
      summaryData.push({
        Month: "TOTAL",
        "Total Revenue (₦)": totalRevenue,
        "Number of Transactions": totalTransactions
      });
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Monthly Summary");

      // Detailed Transactions sheet
      const detailedData = windowTransactions.map((txn: any) => {
        const dt = new Date(txn.paid_at || txn.created_at);
        return {
          Date: dt.toLocaleDateString(),
          Time: dt.toLocaleTimeString(),
          "Customer Name": txn.customer_name || "Unknown",
          Email: txn.email || "Unknown",
          Type: txn.type || "Subscription",
          "Plan/Payment Name": txn.plan_name || "Unknown",
          "Amount (₦)": Number(txn.amount),
          Reference: txn.reference || "N/A",
          Status: txn.status || "success"
        };
      });
      if (detailedData.length === 0) {
        detailedData.push({
          Date: "No transactions found",
          Time: "",
          "Customer Name": "",
          Email: "",
          Type: "",
          "Plan/Payment Name": "",
          "Amount (₦)": "",
          Reference: "",
          Status: ""
        });
      }
      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, detailedSheet, "All Transactions");

      // Generate and download file
      const startLabel = `${monthNames[windowStart.getMonth()]}_${windowStart.getFullYear()}`;
      const endLabel = `${monthNames[now.getMonth()]}_${now.getFullYear()}`;
      const fileName = `${organization.org_name}_Revenue_Report_${startLabel}-to-${endLabel}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Revenue report exported successfully");
    } catch (error) {
      console.error("Error exporting revenue:", error);
    } finally {
      setExportingRevenue(false);
    }
  };
  if (loading) {
    return (
      <SidebarInset>
        <DashboardHeader orgName={organization?.org_name} orgId={organization?.id} />
        {showSplash ? <DashboardSplash /> : <DashboardSkeleton />}
      </SidebarInset>
    );
  }
  const totalRevenueByPlan = revenueByPlan.reduce((sum, item) => sum + item.value, 0);
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];
  const axisStyle = { fontSize: 11, fill: "rgba(0,0,0,0.28)", fontFamily: APPLE_FONT };
  const tooltipStyle = {
    backgroundColor: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    fontFamily: APPLE_FONT,
    padding: "6px 12px",
  };

  return (
    <SidebarInset className="flex-1">
      <DashboardHeader orgName={organization?.org_name} orgId={organization?.id} />
      <main className="flex-1 overflow-auto" style={{ fontFamily: APPLE_FONT }}>
        <div
          className="min-h-screen bg-[#f5f5f7] dark:bg-[#000]"
          style={{ fontFamily: APPLE_FONT }}
        >
          <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

            {/* ── Page Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white">
                  {organization?.org_name}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-black/40 dark:text-white/40 hover:text-black/60 hover:bg-black/5 dark:hover:bg-white/6 transition-all"
                  onClick={() => toast.info("Guided tour coming soon!")}
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Tour
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-black/40 dark:text-white/40 hover:text-black/60 hover:bg-black/5 dark:hover:bg-white/6 transition-all"
                  onClick={() => toast.info("No new updates")}
                >
                  <Sparkles className="w-3.5 h-3.5" /> What's New
                </button>
                <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
                <button
                  onClick={() => setHideValues(!hideValues)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12px] font-medium transition-all hover:opacity-75 active:scale-95"
                >
                  {hideValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {hideValues ? "Show" : "Hide"}
                </button>
              </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────── */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 px-1 mb-2">At a Glance</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Revenue */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-7 h-7 rounded-[8px] bg-black/5 dark:bg-white/8 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                    </div>
                    <button
                      onClick={handleExportRevenue}
                      disabled={exportingRevenue}
                      className="flex items-center gap-1 text-[11px] text-black/30 dark:text-white/30 hover:text-black/50 transition-colors disabled:opacity-40"
                    >
                      {exportingRevenue ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums mb-1.5">
                    {hideValues ? "₦•••" : `₦${stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : "0"}`}
                  </p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1">Revenue</p>
                  <p className="text-[11px] text-black/25 dark:text-white/25 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    Live
                  </p>
                </div>

                {/* Active Subscribers */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] group cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-px" onClick={() => navigate("/dashboard/subscribers")}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-7 h-7 rounded-[8px] bg-black/5 dark:bg-white/8 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums mb-1.5">
                    {hideValues ? "•••" : stats.activeSubscribers.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1">Active Subscriptions</p>
                  <div className="flex items-center gap-1 text-[11px] text-black/25 dark:text-white/25">
                    <span>of {hideValues ? "•••" : stats.totalSubscribers.toLocaleString()} total</span>
                    <Dialog open={editTotalDialog} onOpenChange={setEditTotalDialog}>
                      <DialogTrigger asChild>
                        <button onClick={(e) => e.stopPropagation()} className="ml-0.5 hover:text-black/50 transition-colors">
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[350px]">
                        <DialogHeader><DialogTitle>Edit Total Subscribers</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="total">Total Subscribers Count</Label>
                            <Input id="total" type="number" placeholder="Enter total subscribers" value={newTotalSubscribers} onChange={e => setNewTotalSubscribers(e.target.value)} />
                          </div>
                          <Button onClick={handleUpdateTotalSubscribers} className="w-full">Update</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Payment Issues */}
                <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] group cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-px" onClick={() => navigate("/dashboard/failed-payments")}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center ${stats.totalFailedPayments > 0 ? "bg-red-50 dark:bg-red-500/12" : "bg-black/5 dark:bg-white/8"}`}>
                      <AlertTriangle className={`w-3.5 h-3.5 ${stats.totalFailedPayments > 0 ? "text-red-400" : "text-black/30 dark:text-white/30"}`} />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className={`text-[22px] font-semibold tracking-[-0.02em] leading-none tabular-nums mb-1.5 ${stats.totalFailedPayments > 0 ? "text-red-500" : "text-black dark:text-white"}`}>
                    {hideValues ? "•••" : stats.totalFailedPayments}
                  </p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1">Payment Issues</p>
                  <div className="space-y-0.5 divide-y divide-black/4 dark:divide-white/4">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[10px] text-black/30 dark:text-white/30">Abandoned</span>
                      <span className={`text-[10px] font-semibold tabular-nums ${stats.abandonedCheckouts > 0 ? "text-amber-500" : "text-black/25"}`}>{hideValues ? "••" : stats.abandonedCheckouts}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[10px] text-black/30 dark:text-white/30">Failed</span>
                      <span className={`text-[10px] font-semibold tabular-nums ${stats.failedPayments > 0 ? "text-red-500" : "text-black/25"}`}>{hideValues ? "••" : stats.failedPayments}</span>
                    </div>
                  </div>
                </div>

                {/* File a Refund */}
                <div
                  className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] group cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-px"
                  style={{ fontFamily: APPLE_FONT }}
                  onClick={() => setShowRefundDialog(true)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-7 h-7 rounded-[8px] bg-blue-50 dark:bg-blue-500/12 flex items-center justify-center">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums mb-1.5">
                    Refunds
                  </p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1">File a Refund</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-black/25 dark:text-white/25">Tap to request</span>
                    <span className="text-blue-300 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Charts Row ──────────────────────────────────── */}
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">

              {/* Collections Over Time */}
              <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-black dark:text-white">Collections Over Time</p>
                    <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">Revenue collected per day</p>
                  </div>
                  <div className="flex items-center bg-black/5 dark:bg-white/6 rounded-full p-0.5 gap-0.5">
                    {(["7D", "30D", "90D"] as const).map(period => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                          chartPeriod === period
                            ? "bg-white dark:bg-white/12 text-black dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                            : "text-black/40 dark:text-white/40 hover:text-black/60"
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-2 pb-3">
                  <div className="h-44">
                    {timeSeriesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} interval="preserveStartEnd" dy={6} />
                          <YAxis axisLine={false} tickLine={false} tick={axisStyle} width={48} tickFormatter={v => v > 0 ? `₦${(v / 1000).toFixed(0)}K` : "₦0"} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₦${v.toLocaleString()}`, "Revenue"]} cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 }} />
                          <Line type="monotone" dataKey="value" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: "rgba(0,0,0,0.6)" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[12px] text-black/25 dark:text-white/25">
                        No transaction data for this period
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Revenue by Plan */}
              <div
                className="bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)]"
                onClick={() => setShowRevenueDetailsDialog(true)}
              >
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-black dark:text-white">Revenue by Plan</p>
                  <ChevronRight className="w-3.5 h-3.5 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="px-5 pb-4">
                  {(() => {
                    const topPlans = [...revenueByPlan].sort((a, b) => b.value - a.value).slice(0, 3);
                    const othersValue = revenueByPlan.sort((a, b) => b.value - a.value).slice(3).reduce((s, i) => s + i.value, 0);
                    const display = othersValue > 0
                      ? [...topPlans, { name: `+${revenueByPlan.length - 3} more`, value: othersValue, color: CHART_COLORS[topPlans.length % CHART_COLORS.length] }]
                      : topPlans;

                    return (
                      <>
                        <div className="relative h-32 w-32 mx-auto mb-4">
                          {display.length > 0 ? (
                            <>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={display} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2} dataKey="value">
                                    {display.map((entry, i) => (
                                      <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[11px] font-semibold text-black dark:text-white">
                                  ₦{totalRevenueByPlan >= 1_000_000 ? `${(totalRevenueByPlan / 1_000_000).toFixed(1)}M` : `${(totalRevenueByPlan / 1000).toFixed(0)}K`}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[12px] text-black/25">No data</div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {display.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="text-[11px] text-black/50 dark:text-white/50 truncate">{item.name}</span>
                              </div>
                              <span className="text-[11px] font-medium text-black dark:text-white tabular-nums">₦{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Revenue Details Dialog - unchanged structure */}
              <Dialog open={showRevenueDetailsDialog} onOpenChange={setShowRevenueDetailsDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Revenue by Plan — Detailed Breakdown</DialogTitle></DialogHeader>
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between p-4 bg-black/3 dark:bg-white/4 rounded-xl">
                      <span className="text-[13px] text-black/50 dark:text-white/50">Total Revenue</span>
                      <span className="text-[22px] font-semibold text-black dark:text-white tabular-nums">₦{totalRevenueByPlan.toLocaleString()}</span>
                    </div>
                    <div className="h-56 w-full">
                      {revenueByPlan.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={revenueByPlan} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                              {revenueByPlan.map((entry, i) => <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, "Revenue"]} contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-black/25">No revenue data</div>
                      )}
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35">Plan</th>
                          <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35">Revenue</th>
                          <th className="text-right py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/4 dark:divide-white/4">
                        {revenueByPlan.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2.5 px-3 text-[13px] text-black dark:text-white">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-[13px] font-medium tabular-nums text-black dark:text-white">₦{item.value.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-[12px] text-black/40 dark:text-white/40">{totalRevenueByPlan > 0 ? (item.value / totalRevenueByPlan * 100).toFixed(1) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* ── Recent Transactions ─────────────────────────── */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35">Recent Transactions</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-black/25 dark:text-white/25">Last 48 hours</p>
                  <button
                    onClick={() => setShowTransactionFilterDialog(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60 transition-colors"
                  >
                    <Filter className="w-3 h-3" /> Filter
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden">
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-black/4 dark:divide-white/4">
                  {recentTransactions.length > 0 ? recentTransactions.map(txn => (
                    <div key={txn.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-black dark:text-white truncate max-w-[55%]">{txn.payer_name}</span>
                        <span className="text-[13px] font-semibold text-black dark:text-white tabular-nums">₦{txn.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-black/35 dark:text-white/35 truncate">{txn.plan_name}</span>
                        <span className={`text-[10px] font-medium ${txn.status === "success" ? "text-black/40 dark:text-white/40" : "text-red-500"}`}>
                          {txn.status === "success" ? "Success" : "Failed"}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-[12px] text-black/25">No recent transactions</div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[580px]">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        {["Ref", "Payer", "Plan", "Amount", "Type", "Status", "Date"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/4 dark:divide-white/4">
                      {recentTransactions.length > 0 ? recentTransactions.map(txn => (
                        <tr key={txn.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-[12px] font-mono text-black/40 dark:text-white/40">{txn.reference}</td>
                          <td className="py-3 px-4 text-[13px] text-black dark:text-white">{txn.payer_name}</td>
                          <td className="py-3 px-4 text-[12px] text-black/50 dark:text-white/50 max-w-[160px] truncate">{txn.plan_name}</td>
                          <td className="py-3 px-4 text-[13px] font-semibold text-black dark:text-white tabular-nums">₦{txn.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-[11px] text-black/40 dark:text-white/40">{txn.type === "subscription" ? "Sub" : "One-Time"}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[11px] font-medium ${txn.status === "success" ? "text-black/40 dark:text-white/40" : "text-red-500"}`}>
                              {txn.status === "success" ? "Success" : "Failed"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[12px] text-black/35 dark:text-white/35">{new Date(txn.paid_at).toLocaleDateString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} className="py-10 text-center text-[12px] text-black/25">No recent transactions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <FloatingSupport />
          </div>
        </div>
      </main>

      <SubscriberManagementDialog open={showSubscriberDialog} onOpenChange={setShowSubscriberDialog} orgId={organization?.id || ""} onSubscriberRemoved={fetchDashboardData} />
      <PayoutRequestDialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog} orgId={organization?.id || ""} availableBalance={availableBalance} onRequestSubmitted={fetchDashboardData} />
      <RefundRequestDialog open={showRefundDialog} onOpenChange={setShowRefundDialog} userEmail={userEmail || ""} orgId={organization?.id || ""} />
      <TransactionFilterDialog open={showTransactionFilterDialog} onOpenChange={setShowTransactionFilterDialog} orgId={organization?.id || ""} orgName={organization?.org_name || "Organization"} />
      {kycApprovalNotification && (
        <KYCApprovalModal notificationId={kycApprovalNotification} onClose={() => setKycApprovalNotification(null)} />
      )}
    </SidebarInset>
  );
};
export default Dashboard;
