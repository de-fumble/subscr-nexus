import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
  const [visualizeTab, setVisualizeTab] = useState<'revenue' | 'acquisitions' | 'distribution'>('revenue');

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
              <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background/80 to-accent/10 shadow-lg group transition-all duration-500 hover:border-primary/40 hover:shadow-primary/10 hover:shadow-xl">
                {/* Animated background orbs */}
                <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-accent/15 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-24 bg-primary/5 blur-2xl pointer-events-none" />

                {/* Subtle grid mesh overlay */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 p-5 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Left: identity + description */}
                    <div className="flex items-start gap-4">
                      {/* Icon badge */}
                      <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/20 flex items-center justify-center shadow-inner shadow-primary/10">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-accent">
                            Intelligent Insights
                          </h2>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border border-primary/30 text-primary/80 bg-primary/10">
                            AI
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs max-w-lg leading-relaxed">
                          Leverage our AI-driven analysis engine to uncover hidden trends in your subscriber base, predict churn, and discover exact pathways to accelerate MRR.
                        </p>
                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['Churn Prediction', 'Revenue Trends', 'Growth Signals', 'Plan Insights'].map((label) => (
                            <span key={label} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted/60 border border-border/50 text-muted-foreground">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: CTA */}
                    <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
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
                        <Button
                          size="sm"
                          className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 rounded-full px-5 hover:scale-105 active:scale-95 whitespace-nowrap font-semibold"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Generate AI Report
                        </Button>
                      </EphemeralAIDialog>
                      <p className="text-[10px] text-muted-foreground/60">Powered by Recurra AI · Updated live</p>
                    </div>
                  </div>
                </div>

                {/* Bottom shimmer line */}
                <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>

              {/* Core Metrics */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-50"></div>
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between space-y-0 mb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          Lifetime Revenue
                          <ExplainPopover
                            title="Lifetime Revenue"
                            description="The total cumulative revenue collected from all subscription payments and one-time payments since the organization was created."
                            formula="Σ(Subscription Txns) + Σ(One-Time Payments)"
                          />
                        </p>
                      </div>
                      <DollarSign className="h-4 w-4 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold tracking-tight">₦{(stats.totalRevenue / 1000).toLocaleString()}k</div>
                      <p className={`text-[10px] font-medium mt-1 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                        {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% all time
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-400 to-cyan-500 opacity-50"></div>
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between space-y-0 mb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          MRR
                          <ExplainPopover
                            title="Monthly Recurring Revenue (MRR)"
                            description="The predictable revenue your business generates from all currently active subscriptions each month."
                            formula="Σ(Price of each Active Subscription)"
                          />
                        </p>
                      </div>
                      <Activity className="h-4 w-4 text-blue-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold tracking-tight">₦{stats.mrr.toLocaleString()}</div>
                      <p className="text-[10px] font-medium mt-1 flex items-center text-blue-500">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        From {stats.activeSubscribers} subs
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift overflow-hidden border-border/50 group relative">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-purple-400 to-indigo-500 opacity-50"></div>
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between space-y-0 mb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          Current Month
                          <ExplainPopover
                            title="Current Month Revenue"
                            description="The total revenue captured specifically within the current calendar month."
                            formula="Σ(All transactions paid in current calendar month)"
                          />
                        </p>
                      </div>
                      <CalendarDays className="h-4 w-4 text-purple-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold tracking-tight">₦{stats.currentMonthRevenue.toLocaleString()}</div>
                      <p className={`text-[10px] font-medium mt-1 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                        {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% vs last mo
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          Active Subs
                          <ExplainPopover
                            title="Active Subscriptions"
                            description="The total count of subscriber records currently in an 'active' status."
                          />
                        </p>
                      </div>
                      <Users className="h-4 w-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">{stats.activeSubscribers}</div>
                      <p className="text-[10px] text-muted-foreground mt-1 text-primary/80">+{stats.subscriberGrowth}% growth</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          ARPU
                          <ExplainPopover
                            title="Average Revenue Per User (ARPU)"
                            description="The average amount of monthly recurring revenue generated per active subscriber."
                            formula="MRR ÷ Active Subscribers"
                          />
                        </p>
                      </div>
                      <BarChart3 className="h-4 w-4 text-accent opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">₦{Math.round(stats.averageRevenue).toLocaleString()}</div>
                      <p className="text-[10px] text-muted-foreground mt-1">Per active user</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-border/50 group">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          Churn Rate
                          <ExplainPopover
                            title="Platform Churn Rate"
                            description="The percentage of all-time subscribers who have cancelled or not renewed their subscription."
                            formula="(Cancelled Subs ÷ Total All-Time Subs) × 100"
                          />
                        </p>
                      </div>
                      <TrendingDown className="h-4 w-4 text-rose-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">{stats.churnRate}%</div>
                      <p className="text-[10px] text-muted-foreground mt-1">Cancelled plans</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Velocity — compact inline card */}
              <Card className="glass-card border-border/50 shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/30 bg-muted/20 py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">Revenue Velocity</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">· Trailing 12-month</span>
                  </div>
                  <ExplainPopover
                    title="Revenue Velocity"
                    description="A 12-month rolling view of all revenue captured each calendar month. Each data point represents the sum of all successful subscription charges and one-time payments made within that month."
                    formula="Monthly Total = Σ(Subscription Txns) + Σ(OTP Txns)"
                  />
                </div>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={revenueData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.25} />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                        tickFormatter={(v) => v.split(' ')[0]}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                        dx={-4}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Visualize Section */}
              <Card className="glass-card border-border/50 shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 bg-muted/20 py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">Visualize</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">· Choose a dataset to explore</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                    {(['revenue', 'acquisitions', 'distribution'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setVisualizeTab(tab)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                          visualizeTab === tab
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab === 'revenue' ? 'Revenue' : tab === 'acquisitions' ? 'Acquisitions' : 'Plan Split'}
                      </button>
                    ))}
                  </div>
                </div>
                <CardContent className="p-0">
                  {visualizeTab === 'revenue' && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">Monthly revenue over the last 12 months</p>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
                          <span className="text-muted-foreground">Revenue (₦)</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="vizRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} dx={-4} width={48} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#vizRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {visualizeTab === 'acquisitions' && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">New subscribers signed up per month</p>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
                          <span className="text-muted-foreground">Subscribers</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={subscriberTrend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={6} tickFormatter={(v) => v.split(' ')[0]} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dx={4} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.08)' }} />
                          <Bar dataKey="subscribers" fill="hsl(var(--accent))" radius={[5, 5, 0, 0]} maxBarSize={48}>
                            <LabelList dataKey="subscribers" position="top" style={{ fill: "hsl(var(--foreground))", fontSize: 10 }} formatter={(v: number) => v > 0 ? v : ''} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {visualizeTab === 'distribution' && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">Active subscribers across each plan</p>
                        <ExplainPopover
                          title="Plan Distribution"
                          description="A breakdown of your currently active subscribers across each plan. This shows which plans are most popular."
                        />
                      </div>
                      <div className="flex flex-col lg:flex-row items-center gap-4">
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={planDistribution}
                              cx="50%" cy="50%"
                              innerRadius={65}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {planDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full lg:w-64 shrink-0 space-y-2">
                          {planDistribution.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No active plans found.</p>}
                          {planDistribution.map((plan, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-xs font-medium truncate max-w-[120px]" title={plan.name}>{plan.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold">{plan.value}</span>
                                <span className="text-[10px] text-muted-foreground ml-1">({((plan.value / (stats.activeSubscribers || 1)) * 100).toFixed(1)}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
            <FloatingSupport />
          </main>
        </SidebarInset>
  );
}