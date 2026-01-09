import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, Plus, Banknote, AlertTriangle, FileCheck, Key, Download, Filter, Eye, ArrowUp, ArrowDown, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PayoutRequestDialog } from "@/components/PayoutRequestDialog";
import { FailedPaymentsDialog } from "@/components/FailedPaymentsDialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  orgName
}: {
  orgName?: string;
}) => {
  const {
    state
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  return <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
      <SidebarTrigger />
      <div className="flex-1 flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">
          {isCollapsed ? orgName || "Dashboard" : "Dashboard"}
        </h1>
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
    }
  }, [organization, chartPeriod]);
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

    // Fetch subscription transactions
    const {
      data: planIds
    } = await supabase.from("subscription_plans").select("id").eq("org_id", organization.id);
    const planIdList = planIds?.map(p => p.id) || [];
    let subscriptionTransactions: any[] = [];
    if (planIdList.length > 0) {
      const {
        data: subscribers
      } = await supabase.from("subscribers").select("id").in("plan_id", planIdList);
      const subscriberIds = subscribers?.map(s => s.id) || [];
      if (subscriberIds.length > 0) {
        const {
          data: txns
        } = await supabase.from("transactions").select("amount, paid_at").in("subscriber_id", subscriberIds).eq("status", "success").gte("paid_at", startDate.toISOString()).order("paid_at", {
          ascending: true
        });
        subscriptionTransactions = txns || [];
      }
    }

    // Fetch one-time payment transactions
    const {
      data: otpIds
    } = await supabase.from("one_time_payments").select("id").eq("org_id", organization.id);
    const otpIdList = otpIds?.map(p => p.id) || [];
    let oneTimeTransactions: any[] = [];
    if (otpIdList.length > 0) {
      const {
        data: otpTxns
      } = await supabase.from("one_time_payment_transactions").select("amount, paid_at").in("payment_id", otpIdList).gte("paid_at", startDate.toISOString()).order("paid_at", {
        ascending: true
      });
      oneTimeTransactions = otpTxns || [];
    }

    // Combine and group by date
    const allTransactions = [...subscriptionTransactions.map(t => ({
      amount: Number(t.amount),
      paid_at: t.paid_at
    })), ...oneTimeTransactions.map(t => ({
      amount: Number(t.amount),
      paid_at: t.paid_at
    }))];
    const grouped: Record<string, number> = {};
    allTransactions.forEach(txn => {
      const date = new Date(txn.paid_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      grouped[date] = (grouped[date] || 0) + txn.amount;
    });

    // Fill in missing dates
    const result: Array<{
      date: string;
      value: number;
    }> = [];
    const current = new Date(startDate);
    while (current <= now) {
      const dateKey = current.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
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
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email);
      let orgData = null;
      const {
        data: ownedOrg
      } = await supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle();
      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const {
          data: membership
        } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          const {
            data: staffOrg
          } = await supabase.from("organizations").select("*").eq("id", membership.org_id).maybeSingle();
          orgData = staffOrg;
        }
      }
      if (!orgData) {
        console.error("No organization found for user");
        toast.error("No organization found");
        navigate("/auth");
        return;
      }
      setOrganization(orgData);

      // Fetch plans with subscriber counts
      const {
        data: plansData,
        error: plansError
      } = await supabase.from("subscription_plans").select("*").eq("org_id", orgData.id).eq("is_active", true);
      if (plansError) {
        console.error("Error fetching plans:", plansError);
      } else {
        const plansWithCounts = await Promise.all(plansData.map(async plan => {
          const {
            count
          } = await supabase.from("subscribers").select("*", {
            count: "exact",
            head: true
          }).eq("plan_id", plan.id).eq("status", "active");
          return {
            ...plan,
            subscriber_count: count || 0
          };
        }));
        setPlans(plansWithCounts);

        // Calculate revenue by plan
        const revenueData: RevenueByPlan[] = [];
        let totalRevenueAmount = 0;
        for (let i = 0; i < plansWithCounts.length; i++) {
          const plan = plansWithCounts[i];

          // Get subscribers for this plan
          const {
            data: subs
          } = await supabase.from("subscribers").select("id").eq("plan_id", plan.id);
          const subIds = subs?.map(s => s.id) || [];
          let planRevenue = 0;
          if (subIds.length > 0) {
            const {
              data: txns
            } = await supabase.from("transactions").select("amount").in("subscriber_id", subIds).eq("status", "success");
            planRevenue = txns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
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

        // Add one-time payments revenue
        const {
          data: otpPayments
        } = await supabase.from("one_time_payments").select("id").eq("org_id", orgData.id);
        const otpIds = otpPayments?.map(p => p.id) || [];
        if (otpIds.length > 0) {
          const {
            data: otpTxns
          } = await supabase.from("one_time_payment_transactions").select("amount").in("payment_id", otpIds);
          const otpRevenue = otpTxns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          if (otpRevenue > 0) {
            revenueData.push({
              name: 'One-Time Payments',
              value: otpRevenue,
              color: CHART_COLORS[revenueData.length % CHART_COLORS.length]
            });
            totalRevenueAmount += otpRevenue;
          }
        }
        setRevenueByPlan(revenueData);

        // Calculate total and active subscribers
        const totalActiveSubscribers = plansWithCounts.reduce((sum, p) => sum + (p.subscriber_count || 0), 0);

        // Get total subscribers count (including inactive)
        const planIds = plansWithCounts.map(p => p.id);
        let totalSubsCount = 0;
        if (planIds.length > 0) {
          const {
            count
          } = await supabase.from("subscribers").select("*", {
            count: "exact",
            head: true
          }).in("plan_id", planIds);
          totalSubsCount = count || 0;
        }

        // Fetch live data from Paystack analytics
        const {
          data: analyticsData,
          error: analyticsError
        } = await supabase.functions.invoke("fetch-paystack-analytics");
        let abandonedCount = 0;
        let failedCount = 0;
        let paystackTotalRevenue = totalRevenueAmount;
        let paystackActiveSubscribers = totalActiveSubscribers;
        if (!analyticsError && analyticsData) {
          console.log("Paystack analytics data:", analyticsData);

          // Use Paystack data for overview section
          paystackTotalRevenue = analyticsData.totalRevenue || totalRevenueAmount;
          paystackActiveSubscribers = analyticsData.activeSubscribers || totalActiveSubscribers;

          // Failed payments breakdown
          const failedData = analyticsData.failedPaymentsData || [];
          abandonedCount = failedData.find((d: any) => d.name === 'Abandoned Checkout')?.value || 0;
          failedCount = failedData.find((d: any) => d.name === 'Failed Payments')?.value || 0;
          setFailedPaymentsData(failedData);

          // Revenue by plan from Paystack
          const paystackChartData = analyticsData.chartData || [];
          if (paystackChartData.length > 0) {
            const revenueData: RevenueByPlan[] = paystackChartData.map((item: any, index: number) => ({
              name: item.plan,
              value: item.revenue,
              color: CHART_COLORS[index % CHART_COLORS.length]
            }));
            setRevenueByPlan(revenueData);
          }

          // Revenue trend for time series chart
          const revenueTrend = analyticsData.revenueTrend || [];
          if (revenueTrend.length > 0) {
            setTimeSeriesData(revenueTrend.map((item: any) => ({
              date: item.month,
              value: item.revenue
            })));
          }
        }
        setStats({
          totalRevenue: paystackTotalRevenue,
          recurringRevenue: analyticsData?.recurringRevenue || 0,
          activeSubscribers: paystackActiveSubscribers,
          totalSubscribers: totalSubsCount,
          totalFailedPayments: abandonedCount + failedCount,
          abandonedCheckouts: abandonedCount,
          failedPayments: failedCount
        });

        // Fetch recent transactions
        await fetchRecentTransactions(orgData.id, plansWithCounts);
      }

      // Fetch balance and payouts
      if (orgData) {
        const {
          data: payoutData
        } = await supabase.from("payout_requests").select("amount, status").eq("org_id", orgData.id);
        if (payoutData) {
          const pending = payoutData.filter(p => p.status === "pending" || p.status === "approved").reduce((sum, p) => sum + p.amount, 0);
          const paidOut = payoutData.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
          setPendingPayouts(pending);
          setTotalPaidOut(paidOut);
        }
        const {
          data: licenseData
        } = await supabase.from("licenses").select("*").eq("org_id", orgData.id).eq("status", "active").order("expires_at", {
          ascending: false
        }).limit(1).maybeSingle();
        setCurrentLicense(licenseData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };
  const fetchRecentTransactions = async (orgId: string, plansWithCounts: SubscriptionPlan[]) => {
    const transactions: RecentTransaction[] = [];
    
    // Calculate 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const cutoffDate = fortyEightHoursAgo.toISOString();

    // Fetch subscription transactions from last 48 hours
    const planIds = plansWithCounts.map(p => p.id);
    if (planIds.length > 0) {
      const {
        data: subscribers
      } = await supabase.from("subscribers").select("id, customer_name, plan_id").in("plan_id", planIds);
      const subscriberMap = new Map(subscribers?.map(s => [s.id, s]) || []);
      const planMap = new Map(plansWithCounts.map(p => [p.id, p.name]));
      const subscriberIds = subscribers?.map(s => s.id) || [];
      if (subscriberIds.length > 0) {
        const {
          data: txns
        } = await supabase.from("transactions").select("*").in("subscriber_id", subscriberIds).gte("paid_at", cutoffDate).order("paid_at", {
          ascending: false
        }).limit(20);
        txns?.forEach(txn => {
          const sub = subscriberMap.get(txn.subscriber_id);
          transactions.push({
            id: txn.id,
            reference: txn.paystack_reference?.substring(0, 10) || 'N/A',
            payer_name: sub?.customer_name || 'Unknown',
            plan_name: planMap.get(sub?.plan_id || '') || 'Unknown Plan',
            amount: Number(txn.amount),
            status: txn.status,
            paid_at: txn.paid_at || txn.created_at,
            type: 'subscription'
          });
        });
      }
    }

    // Fetch one-time payment transactions from last 48 hours
    const {
      data: otpPayments
    } = await supabase.from("one_time_payments").select("id, name").eq("org_id", orgId);
    const otpIds = otpPayments?.map(p => p.id) || [];
    const otpMap = new Map(otpPayments?.map(p => [p.id, p.name]) || []);
    if (otpIds.length > 0) {
      const {
        data: otpTxns
      } = await supabase.from("one_time_payment_transactions").select("*").in("payment_id", otpIds).gte("paid_at", cutoffDate).order("paid_at", {
        ascending: false
      }).limit(20);
      otpTxns?.forEach(txn => {
        transactions.push({
          id: txn.id,
          reference: txn.paystack_reference?.substring(0, 10) || 'N/A',
          payer_name: txn.payer_name,
          plan_name: otpMap.get(txn.payment_id) || 'One-Time Payment',
          amount: Number(txn.amount),
          status: 'success',
          paid_at: txn.paid_at,
          type: 'one-time'
        });
      });
    }

    // Sort by date and take top 10
    transactions.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    setRecentTransactions(transactions.slice(0, 10));
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
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Export window: last 12 months (including current month)
      const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Fetch transaction data from Paystack via backend function
      const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
        "fetch-paystack-analytics",
        {
          body: {
            orgId: organization.id,
            action: "export_transactions",
          },
        }
      );

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
        [key: string]: { month: string; revenue: number; transactions: number };
      } = {};

      // Initialize months for the last 12 months window
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue[key] = {
          month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          revenue: 0,
          transactions: 0,
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
      const summaryData = Object.values(monthlyRevenue).map((m) => ({
        Month: m.month,
        "Total Revenue (₦)": m.revenue,
        "Number of Transactions": m.transactions,
      }));

      // Add totals row
      const totalRevenue = Object.values(monthlyRevenue).reduce((sum, m) => sum + m.revenue, 0);
      const totalTransactions = Object.values(monthlyRevenue).reduce(
        (sum, m) => sum + m.transactions,
        0
      );
      summaryData.push({
        Month: "TOTAL",
        "Total Revenue (₦)": totalRevenue,
        "Number of Transactions": totalTransactions,
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
          Status: txn.status || "success",
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
          Status: "",
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
      toast.error("Failed to export revenue report");
    } finally {
      setExportingRevenue(false);
    }
  };
  const totalRevenueByPlan = revenueByPlan.reduce((sum, item) => sum + item.value, 0);
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];
  if (loading) {
    return <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>;
  }
  return <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <DashboardHeader orgName={organization?.org_name} />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-6">
              
              {/* Top Stats Row - 4 Cards */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {/* Total Revenue (MTD) */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-accent hover:text-accent/80 text-xs gap-1"
                          onClick={handleExportRevenue}
                          disabled={exportingRevenue}
                        >
                          {exportingRevenue ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        ₦{stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : '0'}
                      </p>
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <ArrowUp className="h-3 w-3" />
                        <span>Live data</span>
                      </div>
                    </div>
                    <CircularProgress percentage={75} color="hsl(142, 76%, 36%)" />
                  </div>
                </Card>

                {/* Active Subscribers */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Active Subscribers</span>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-accent hover:text-accent/80 text-xs" onClick={() => navigate("/dashboard/subscribers")}>
                          View All
                        </Button>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        {stats.activeSubscribers.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">of {stats.totalSubscribers.toLocaleString()} total</span>
                        <Dialog open={editTotalDialog} onOpenChange={setEditTotalDialog}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                              <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[350px]">
                            <DialogHeader>
                              <DialogTitle>Edit Total Subscribers</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="total">Total Subscribers Count</Label>
                                <Input id="total" type="number" placeholder="Enter total subscribers" value={newTotalSubscribers} onChange={e => setNewTotalSubscribers(e.target.value)} />
                              </div>
                              <Button onClick={handleUpdateTotalSubscribers} className="w-full">
                                Update
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <CircularProgress percentage={stats.totalSubscribers > 0 ? Math.round(stats.activeSubscribers / stats.totalSubscribers * 100) : 0} color="hsl(35, 92%, 50%)" />
                  </div>
                </Card>

                {/* Failed Payments */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Failed Payments</span>
                        <FailedPaymentsDialog>
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-destructive hover:text-destructive/80 text-xs">
                            ​Manage
                          </Button>
                        </FailedPaymentsDialog>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        {stats.totalFailedPayments}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          Abandoned: {stats.abandonedCheckouts}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          Failed: {stats.failedPayments}
                        </span>
                      </div>
                    </div>
                    <MiniPieChart data={failedPaymentsPieData} />
                  </div>
                </Card>

                {/* Upcoming Payouts */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Upcoming Payouts</span>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-accent hover:text-accent/80 text-xs" onClick={() => setShowPayoutDialog(true)}>
                        Manage
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pending</span>
                        <span className="font-semibold">₦{pendingPayouts.toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Paid Out</span>
                        <span className="font-semibold">₦{totalPaidOut.toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Complete</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
                {/* Collections Over Time - Takes 2/3 */}
                <Card className="lg:col-span-2 p-6 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground">Collections Over Time</h3>
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      {(['7D', '30D', '90D'] as const).map(period => <Button key={period} variant={chartPeriod === period ? "default" : "ghost"} size="sm" className={`px-3 py-1 text-xs ${chartPeriod === period ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setChartPeriod(period)}>
                          {period}
                        </Button>)}
                    </div>
                  </div>
                  <div className="h-64">
                    {timeSeriesData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{
                        fontSize: 10
                      }} interval="preserveStartEnd" />
                          <YAxis stroke="hsl(var(--muted-foreground))" tick={{
                        fontSize: 12
                      }} tickFormatter={value => value > 0 ? `₦${(value / 1000).toFixed(0)}K` : '₦0'} />
                          <Tooltip contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']} />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer> : <div className="flex items-center justify-center h-full text-muted-foreground">
                        No transaction data available for this period
                      </div>}
                  </div>
                </Card>

                {/* Revenue Distribution by Plan - Takes 1/3 */}
                <Card 
                  className="p-6 glass-card border-0 shadow-[var(--shadow-medium)] cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setShowRevenueDetailsDialog(true)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Revenue by Plan</h3>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-accent hover:text-accent/80 text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative h-40 w-40 mb-4">
                      {revenueByPlan.length > 0 ? <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={revenueByPlan} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                {revenueByPlan.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold">₦{totalRevenueByPlan > 1000000 ? `${(totalRevenueByPlan / 1000000).toFixed(1)}M` : `${(totalRevenueByPlan / 1000).toFixed(0)}K`}</span>
                          </div>
                        </> : <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
                          No revenue data yet
                        </div>}
                    </div>
                    <div className="space-y-2 w-full max-h-32 overflow-y-auto">
                      {revenueByPlan.map((item, index) => <div key={index} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{
                          backgroundColor: item.color
                        }} />
                            <span className="text-sm text-muted-foreground truncate">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">₦{item.value.toLocaleString()}</span>
                        </div>)}
                    </div>
                  </div>
                </Card>
                
                {/* Revenue Details Dialog */}
                <Dialog open={showRevenueDetailsDialog} onOpenChange={setShowRevenueDetailsDialog}>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Revenue by Plan - Detailed Breakdown</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      {/* Summary */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="text-2xl font-bold">₦{totalRevenueByPlan.toLocaleString()}</span>
                      </div>
                      
                      {/* Larger Chart */}
                      <div className="h-64 w-full">
                        {revenueByPlan.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={revenueByPlan} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={100} 
                                paddingAngle={2} 
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {revenueByPlan.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px"
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No revenue data available
                          </div>
                        )}
                      </div>
                      
                      {/* Detailed Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenueByPlan.map((item, index) => (
                              <tr key={index} className="border-t border-border/50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-3 w-3 rounded-full shrink-0" 
                                      style={{ backgroundColor: item.color }} 
                                    />
                                    <span className="text-sm font-medium">{item.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-sm font-medium">
                                  ₦{item.value.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                                  {totalRevenueByPlan > 0 ? ((item.value / totalRevenueByPlan) * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50">
                            <tr className="border-t">
                              <td className="py-3 px-4 text-sm font-bold">Total</td>
                              <td className="py-3 px-4 text-right text-sm font-bold">
                                ₦{totalRevenueByPlan.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-sm font-bold">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Recent Transactions Table */}
              <Card className="p-6 glass-card border-0 shadow-[var(--shadow-medium)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Recent Transactions</h3>
                    <p className="text-xs text-muted-foreground">Last 48 hours</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">REF</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PAYER</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PLAN</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AMOUNT</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">TYPE</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.length > 0 ? recentTransactions.map(txn => <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-4 px-4 text-sm font-mono">{txn.reference}</td>
                            <td className="py-4 px-4 text-sm">{txn.payer_name}</td>
                            <td className="py-4 px-4 text-sm">{txn.plan_name}</td>
                            <td className="py-4 px-4 text-sm font-medium">₦{txn.amount.toLocaleString()}</td>
                            <td className="py-4 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full ${txn.type === 'subscription' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {txn.type === 'subscription' ? 'Subscription' : 'One-Time'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full ${txn.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {txn.status === 'success' ? 'Success' : 'Failed'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              {new Date(txn.paid_at).toLocaleDateString()}
                            </td>
                          </tr>) : <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            No recent transactions
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          </main>
        </SidebarInset>
      </div>
      
      <SubscriberManagementDialog open={showSubscriberDialog} onOpenChange={setShowSubscriberDialog} orgId={organization?.id || ""} onSubscriberRemoved={fetchDashboardData} />
      
      <PayoutRequestDialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog} orgId={organization?.id || ""} availableBalance={availableBalance} onRequestSubmitted={fetchDashboardData} />
    </SidebarProvider>;
};
export default Dashboard;