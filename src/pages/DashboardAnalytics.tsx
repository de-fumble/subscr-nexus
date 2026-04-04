import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, ArrowDownRight, Activity, CalendarDays, BarChart3, Maximize2, HelpCircle } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useOrgRole } from "@/hooks/useOrgRole";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { EphemeralAIDialog } from "@/components/EphemeralAIDialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AnalyticsPageSkeleton } from "@/components/DashboardSkeleton";
import { FloatingSupport } from "@/components/FloatingSupport";
import { format, subMonths, isSameMonth } from "date-fns";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--primary))", "hsl(var(--secondary))"];

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

function ExplainPopover({ title, description, formula }: { title: string; description: string; formula?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border/40 hover:border-primary/40 bg-transparent hover:bg-primary/5 cursor-pointer">
          <HelpCircle className="h-2.5 w-2.5" />
          Explain
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 glass-card border-border/50 p-4" side="top" align="start">
        <p className="font-semibold text-sm mb-1.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {formula && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Formula</p>
            <code className="block text-xs bg-muted/50 rounded-lg px-3 py-2 font-mono text-primary">{formula}</code>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    currentMonthRevenue: 0,
    mrr: 0,
    revenueGrowth: 0,
    activeSubscribers: 0,
    subscriberGrowth: 0,
    averageRevenue: 0,
    churnRate: 0
  });

  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number; }>>([]);
  const [planDistribution, setPlanDistribution] = useState<Array<{ name: string; value: number; }>>([]);
  const [subscriberTrend, setSubscriberTrend] = useState<Array<{ month: string; subscribers: number; }>>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email);

      let orgId = null;
      const { data: ownedOrg } = await supabase.from("organizations").select("id, org_name, email, logo_url").eq("user_id", user.id).maybeSingle();
      if (ownedOrg) {
        orgId = ownedOrg.id;
        setOrganization(ownedOrg);
      } else {
        const { data: membership } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase.from("organizations").select("id, org_name, email, logo_url").eq("id", membership.org_id).maybeSingle();
          if (memberOrg) setOrganization(memberOrg);
        }
      }
      if (!orgId) return;

      // 1. Fetch Plans
      const { data: plans } = await supabase.from("subscription_plans").select("*").eq("org_id", orgId);

      // 2. Fetch Subscribers
      const { data: subscribers } = await supabase
        .from("subscribers")
        .select("id, status, email, amount, plan_id, created_at, subscription_plans!inner(org_id)")
        .eq("subscription_plans.org_id", orgId);

      const subscriberIds = subscribers?.map(s => s.id) || [];

      // 3. Fetch Transactions
      const { data: subTxns } = subscriberIds.length > 0
        ? await supabase.from("transactions").select("*").in("subscriber_id", subscriberIds)
        : { data: [] };

      // 4. Fetch OTPs
      const { data: directOtp } = await supabase
        .from("one_time_payments")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_paid", true);

      // 5. Fetch OTP txns
      const { data: otpTxns } = await supabase
        .from("one_time_payment_transactions")
        .select("*, one_time_payments!inner(org_id)")
        .eq("one_time_payments.org_id", orgId);

      let totalRev = 0;
      let mrrTotal = 0;
      const allTransactions: { date: Date, amount: number }[] = [];

      // --- Subscription transactions (amounts in Kobo → divide by 100) ---
      subscribers?.forEach(sub => {
        const plan = plans?.find(p => p.id === sub.plan_id);
        const subAmountFallback = plan ? Number(plan.price) : 0;
        // sub.amount is in Kobo from Paystack webhook
        const subAmount = sub.amount ? (Number(sub.amount) / 100) : subAmountFallback;

        if (sub.status === 'active') {
          mrrTotal += subAmount;
        }

        const txns = subTxns?.filter(tx => tx.subscriber_id === sub.id) || [];

        // Process all real recorded transactions for this subscriber
        txns.forEach(tx => {
          if (tx.status === "success" || tx.status === "Successful") {
            const amount = Number(tx.amount) / 100; // Kobo → Naira
            const txDate = new Date(tx.paid_at || tx.created_at);
            totalRev += amount;
            allTransactions.push({ date: txDate, amount });
          }
        });

        // Synthetic initial payment ONLY when subscriber has ZERO recorded transactions.
        // This handles webhook race conditions exclusively — never inflates existing data.
        if (txns.length === 0 && subAmount > 0) {
          const planCreatedAtDate = new Date(sub.created_at);
          totalRev += subAmount;
          allTransactions.push({ date: planCreatedAtDate, amount: subAmount });
        }
      });

      // --- OTP transaction records (amounts already in Naira — no conversion needed) ---
      // NOTE: one_time_payment_transactions has no status field — every row = confirmed payment
      const countedOtpPaymentIds = new Set<string>();
      otpTxns?.forEach(tx => {
        const amount = Number(tx.amount); // already Naira
        totalRev += amount;
        allTransactions.push({ date: new Date(tx.paid_at || tx.created_at), amount });
        if (tx.payment_id) countedOtpPaymentIds.add(tx.payment_id);
      });

      // --- Direct OTP records — only count ones with no corresponding transaction record ---
      directOtp?.forEach(otp => {
        if (!countedOtpPaymentIds.has(otp.id)) {
          const amount = Number(otp.amount); // already Naira
          totalRev += amount;
          allTransactions.push({ date: new Date(otp.paid_at || otp.created_at), amount });
        }
      });

      // Buckets
      const now = new Date();
      const nowYear = now.getFullYear();
      const nowMonth = now.getMonth(); // 0-indexed

      let currentMonthRev = 0;
      let lastMonthRev = 0;

      const last12Months = Array.from({ length: 12 }).map((_, i) => format(subMonths(now, 11 - i), 'MMM yyyy'));
      const monthlyRevenueMap: Record<string, number> = {};
      last12Months.forEach(m => monthlyRevenueMap[m] = 0);

      allTransactions.forEach(tx => {
        const monthKey = format(tx.date, 'MMM yyyy');
        if (monthlyRevenueMap[monthKey] !== undefined) {
          monthlyRevenueMap[monthKey] += tx.amount;
        }

        const txYear = tx.date.getFullYear();
        const txMonth = tx.date.getMonth(); // 0-indexed

        if (txYear === nowYear && txMonth === nowMonth) {
          currentMonthRev += tx.amount;
        } else if (
          (nowMonth === 0 && txYear === nowYear - 1 && txMonth === 11) ||
          (nowMonth > 0 && txYear === nowYear && txMonth === nowMonth - 1)
        ) {
          lastMonthRev += tx.amount;
        }
      });

      const processedRevenueTrend = last12Months.map(month => ({ month, revenue: monthlyRevenueMap[month] }));
      const growthRev = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

      // Subs Logic
      const totalAllTime = subscribers?.length || 0;
      const activeSubsCount = subscribers?.filter(s => s.status === 'active').length || 0;
      const cancelledCount = subscribers?.filter(s => ['cancelled', 'canceled', 'non-renewing'].includes(s.status?.toLowerCase() || '')).length || 0;
      const churnRaw = totalAllTime > 0 ? (cancelledCount / totalAllTime) * 100 : 0;

      const arpuTotal = activeSubsCount > 0 ? (mrrTotal / activeSubsCount) : 0;

      let thisMonthSubs = 0;
      let lastMonthSubs = 0;
      const monthlySubMap: Record<string, number> = {};
      last12Months.forEach(m => monthlySubMap[m] = 0);

      subscribers?.forEach(sub => {
        const d = new Date(sub.created_at);
        if (isSameMonth(d, now)) thisMonthSubs++;
        else if (isSameMonth(d, subMonths(now, 1))) lastMonthSubs++;

        const monthKey = format(d, 'MMM yyyy');
        if (monthlySubMap[monthKey] !== undefined) monthlySubMap[monthKey]++;
      });
      const growthSub = lastMonthSubs > 0 ? ((thisMonthSubs - lastMonthSubs) / lastMonthSubs) * 100 : 0;
      const processedSubTrend = last12Months.map(month => ({ month, subscribers: monthlySubMap[month] }));

      // Plan Dist
      const planDistributionMap: Record<string, number> = {};
      subscribers?.filter(s => s.status === 'active').forEach(sub => {
        const plan = plans?.find(p => p.id === sub.plan_id);
        const planName = plan?.name || 'Unknown Plan';
        planDistributionMap[planName] = (planDistributionMap[planName] || 0) + 1;
      });
      const processedPlanDist = Object.keys(planDistributionMap).map(name => ({
        name,
        value: planDistributionMap[name]
      })).filter(p => p.value > 0);

      setRevenueData(processedRevenueTrend);
      setSubscriberTrend(processedSubTrend);
      setPlanDistribution(processedPlanDist);

      setStats({
        totalRevenue: Math.round(totalRev),
        currentMonthRevenue: Math.round(currentMonthRev),
        mrr: Math.round(mrrTotal),
        revenueGrowth: Math.round(growthRev * 10) / 10,
        activeSubscribers: activeSubsCount,
        subscriberGrowth: Math.round(growthSub * 10) / 10,
        averageRevenue: arpuTotal,
        churnRate: Math.round(churnRaw * 10) / 10
      });

    } catch (error) {
      console.error("Error fetching analytics natively:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-lg border border-border/50 shadow-xl bg-background/95 backdrop-blur-xl">
          <p className="font-medium text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="font-bold text-foreground">
                {entry.name === 'revenue'
                  ? `₦${Number(entry.value).toLocaleString()}`
                  : `${entry.value} ${entry.name}`}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          </div>
        </header>
        <AnalyticsPageSkeleton />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Advanced Analytics</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container py-6 sm:py-8 px-4 sm:px-6 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Premium AI Banner */}
              <div className="relative overflow-hidden rounded-2xl glass-card border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/5 p-6 shadow-soft group hover:shadow-glow transition-all duration-500">
                <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-20">
                  <Sparkles className="w-48 h-48 animate-pulse text-primary" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-2">
                      Intelligent Insights
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                      Leverage our AI-driven analysis engine to uncover hidden trends in your subscriber base, predict churn before it happens, and discover precise pathways to accelerate MRR.
                    </p>
                  </div>
                  <EphemeralAIDialog analyticsData={{
                    totalRevenue: stats.totalRevenue,
                    revenueGrowth: stats.revenueGrowth,
                    activeSubscribers: stats.activeSubscribers,
                    subscriberGrowth: stats.subscriberGrowth,
                    averageRevenue: stats.averageRevenue,
                    churnRate: stats.churnRate,
                    revenueData,
                    planDistribution
                  }}>
                    <Button className="gap-2 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-full px-6 hover:scale-105 active:scale-95">
                      <Sparkles className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </EphemeralAIDialog>
                </div>
              </div>

              {/* Top Row: Financials */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-50"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Lifetime Revenue</p>
                        <ExplainPopover
                          title="Lifetime Revenue"
                          description="The total cumulative revenue collected from all subscription payments and one-time payments since the organization was created. This includes all successfully captured transactions drawn directly from your local database for maximum accuracy."
                          formula="Σ(Subscription Txns) + Σ(One-Time Payments)"
                        />
                      </div>
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold tracking-tight">₦{stats.totalRevenue.toLocaleString()}</div>
                      <p className={`text-xs font-medium mt-2 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                        {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% all time track
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-500 opacity-50"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Monthly Recurring (MRR)</p>
                        <ExplainPopover
                          title="Monthly Recurring Revenue (MRR)"
                          description="The predictable revenue your business generates from all currently active subscriptions each month. It represents your baseline financial health and is calculated from the live subscription price of every active plan."
                          formula="Σ(Price of each Active Subscription)"
                        />
                      </div>
                      <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold tracking-tight">₦{stats.mrr.toLocaleString()}</div>
                      <p className="text-xs font-medium mt-2 flex items-center text-blue-500">
                        <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                        From {stats.activeSubscribers} active subs
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-50"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Current Month</p>
                        <ExplainPopover
                          title="Current Month Revenue"
                          description="The total revenue captured specifically within the current calendar month, covering both subscription renewals and one-time payments. The growth indicator compares this month's total against the previous month's."
                          formula="Σ(All transactions paid in current calendar month)"
                        />
                      </div>
                      <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CalendarDays className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold tracking-tight">₦{stats.currentMonthRevenue.toLocaleString()}</div>
                      <p className={`text-xs font-medium mt-2 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                        {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% vs last month
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row: Subscriber Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                        <ExplainPopover
                          title="Active Subscriptions"
                          description="The total count of subscriber records currently in an 'active' status. This is a live count from your database and represents paying customers with valid, non-expired subscription plans."
                        />
                      </div>
                      <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
                    <p className="text-xs text-muted-foreground mt-1 text-primary/80">+{stats.subscriberGrowth}% relative growth</p>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Average Revenue (ARPU)</p>
                        <ExplainPopover
                          title="Average Revenue Per User (ARPU)"
                          description="The average amount of monthly recurring revenue generated per active subscriber. A higher ARPU indicates that customers are subscribing to more valuable, higher-tier plans."
                          formula="MRR ÷ Active Subscribers"
                        />
                      </div>
                      <div className="h-9 w-9 bg-accent/10 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold">₦{Math.round(stats.averageRevenue).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Per active user</p>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Platform Churn Rate</p>
                        <ExplainPopover
                          title="Platform Churn Rate"
                          description="The percentage of all-time subscribers who have cancelled or not renewed their subscription. A lower churn rate indicates better subscriber retention. This is a historical churn measure, not period-specific."
                          formula="(Cancelled Subs ÷ Total All-Time Subs) × 100"
                        />
                      </div>
                      <div className="h-9 w-9 bg-rose-500/10 rounded-lg flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{stats.churnRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Historically cancelled plans</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
                {/* Main Area Chart */}
                <Card className="xl:col-span-2 glass-card border-border/50 shadow-[var(--shadow-soft)] overflow-hidden">
                  <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Revenue Velocity
                        </CardTitle>
                        <CardDescription>Trailing 12-month aggregated capture</CardDescription>
                      </div>
                      <ExplainPopover
                        title="Revenue Velocity"
                        description="A 12-month rolling view of all revenue captured each calendar month. Each data point represents the sum of all successful subscription charges and one-time payments made within that month. Use this to spot seasonal trends, acceleration, or slowdown in revenue growth."
                        formula="Monthly Total = Σ(Subscription Txns in month) + Σ(OTP Txns in month)"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                          dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Plan Distribution and Trend */}
                <div className="space-y-6 flex flex-col">
                  <Card className="glass-card border-border/50 shadow-[var(--shadow-soft)] flex-1">
                    <CardHeader className="pb-2 relative">
                      <div>
                        <CardTitle className="text-base">Acquisition Kinetics</CardTitle>
                        <CardDescription className="text-xs">New plans per month</CardDescription>
                        <div className="mt-1">
                          <ExplainPopover
                            title="Acquisition Kinetics"
                            description="Shows how many new subscribers signed up to any plan each calendar month over the past 12 months. This is a leading indicator of business growth — a rising bar trend means you are accelerating customer acquisition."
                          />
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-4 top-4 hover:bg-muted">
                              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] glass-card">
                          <DialogHeader>
                            <DialogTitle>Acquisition Breakdown</DialogTitle>
                            <DialogDescription>
                              Detailed month-by-month historical acquisition records.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-4 max-h-[60vh] overflow-y-auto premium-scrollbar pr-2">
                             {[...subscriberTrend].reverse().map((record, idx) => (
                               <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <CalendarDays className="h-4 w-4 text-accent" />
                                      <span className="font-medium text-sm">{record.month}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="font-bold text-accent">{record.subscribers} new</span>
                                  </div>
                               </div>
                             ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={subscriberTrend} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis 
                            dataKey="month" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={5}
                            tickFormatter={(value) => value.split(' ')[0]} 
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dx={5}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.1)' }} />
                          <Bar dataKey="subscribers" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40}>
                             <LabelList dataKey="subscribers" position="top" style={{ fill: "hsl(var(--foreground))", fontSize: 10 }} formatter={(v: number) => v > 0 ? v : ''} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-border/50 shadow-[var(--shadow-soft)] flex-1 pt-2">
                    <CardHeader className="pb-0 pt-4 relative">
                      <div className="flex flex-col items-center justify-center gap-1">
                         <CardTitle className="text-base text-center">Plan Distribution</CardTitle>
                         <ExplainPopover
                           title="Plan Distribution"
                           description="A breakdown of your currently active subscribers across each plan. The donut chart segments are proportional to the subscriber count per plan. This shows which plans are most popular and helps inform pricing and packaging decisions."
                         />
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-4 top-4 hover:bg-muted">
                              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] glass-card">
                          <DialogHeader>
                            <DialogTitle>Active Plans Breakdown</DialogTitle>
                            <DialogDescription>
                              Detailed breakdown of your current active subscriptions.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-4 max-h-[60vh] overflow-y-auto premium-scrollbar pr-2">
                             {planDistribution.map((plan, idx) => (
                               <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3 w-[60%]">
                                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{backgroundColor: COLORS[idx % COLORS.length]}}/>
                                      <span className="font-medium text-sm truncate" title={plan.name}>{plan.name}</span>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                      <span className="font-bold">{plan.value} subs</span>
                                      <span className="text-xs text-muted-foreground mt-0.5">
                                          {((plan.value / (stats.activeSubscribers || 1)) * 100).toFixed(1)}% of total
                                      </span>
                                  </div>
                               </div>
                             ))}
                             {planDistribution.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4">No active plans found.</p>
                             )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={planDistribution}
                            cx="50%" cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, opacity: 0.5 }}
                            label={({ name, value }) => `${name} (${value})`}
                            style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                          >
                            {planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {planDistribution.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            {entry.name}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
            <FloatingSupport />
          </main>
        </SidebarInset>
  );
}