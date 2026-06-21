import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, Activity, CalendarDays, BarChart3, HelpCircle } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useOrgRole } from "@/hooks/useOrgRole";
import { EphemeralAIDialog } from "@/components/EphemeralAIDialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AnalyticsPageSkeleton } from "@/components/DashboardSkeleton";
import { FloatingSupport } from "@/components/FloatingSupport";
import { getDashboardDataSource } from "@/lib/dataSource";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

const COLORS = ["#000000", "#333333", "#666666", "#999999"];

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
        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white transition-colors px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
          <HelpCircle className="h-2.5 w-2.5" />
          Explain
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-white dark:bg-[#1c1c1e] rounded-[12px] border border-black/5 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-4" side="top" align="start">
        <p className="font-semibold text-xs text-black dark:text-white mb-1">{title}</p>
        <p className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">{description}</p>
        {formula && (
          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">Formula</p>
            <code className="block text-[10px] bg-black/5 dark:bg-white/5 rounded-lg px-2.5 py-1.5 font-mono text-black dark:text-white">{formula}</code>
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

      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: { orgId, dataSource: getDashboardDataSource() }
      });
      
      if (analyticsError || !analyticsData) {
         throw analyticsError || new Error("No data returned");
      }

      setRevenueData(analyticsData.revenueTrend || []);
      setSubscriberTrend(analyticsData.subscriberTrend || []);
      setPlanDistribution(analyticsData.planDistribution ? analyticsData.planDistribution.map((p: any) => ({ name: p.name, value: p.count })) : []);

      const trend = analyticsData.revenueTrend || [];
      const currentMonthRev = trend.length > 0 ? trend[trend.length - 1].revenue : 0;
      const prevMonthRev = trend.length > 1 ? trend[trend.length - 2].revenue : 0;
      const revGrowth = prevMonthRev > 0 ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;

      setStats({
        totalRevenue: analyticsData.totalRevenue || 0,
        currentMonthRevenue: currentMonthRev,
        mrr: analyticsData.recurringRevenue || 0,
        revenueGrowth: Math.round(revGrowth * 10) / 10,
        activeSubscribers: analyticsData.activeSubscribers || 0,
        subscriberGrowth: analyticsData.subscriberGrowthRate || 0,
        averageRevenue: analyticsData.arpu || 0,
        churnRate: analyticsData.churnRate || 0
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
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border-none p-3" style={{ fontFamily: APPLE_FONT }}>
          <p className="font-semibold text-xs text-black/50 dark:text-white/50 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="font-semibold text-[13px] text-black dark:text-white">
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
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Advanced Analytics</h1>
        </header>
        <AnalyticsPageSkeleton />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  const tooltipStyle = {
    backgroundColor: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    fontFamily: APPLE_FONT,
    padding: "6px 12px",
  } as const;

  const axisStyle = {
    fontSize: 11,
    fill: "rgba(0,0,0,0.28)",
    fontFamily: APPLE_FONT,
  } as const;

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Advanced Analytics</h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

          {/* Premium AI Banner */}
          <div className="relative overflow-hidden rounded-[16px] bg-white dark:bg-[#1c1c1e] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] p-5 sm:p-6 group transition-all duration-300">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-black/50 dark:text-white/50" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[14px] font-semibold text-black dark:text-white">
                      Intelligent Insights
                    </h2>
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded-full border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5">
                      AI
                    </span>
                  </div>
                  <p className="text-black/40 dark:text-white/40 text-[12px] max-w-lg leading-relaxed">
                    Leverage our AI-driven analysis engine to uncover hidden trends in your subscriber base, predict churn, and discover exact pathways to accelerate MRR.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
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
                  <button className={pillBtn}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate AI Report
                  </button>
                </EphemeralAIDialog>
                <p className="text-[9px] text-black/25 dark:text-white/25">Powered by Recurra AI · Updated live</p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div>
            <p className={sectionLabel}>Key Performance Indicators</p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              
              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between space-y-0 mb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    Lifetime Rev
                    <ExplainPopover
                      title="Lifetime Revenue"
                      description="The total cumulative revenue collected from all subscription payments and one-time payments since the organization was created."
                      formula="Σ(Subscription Txns) + Σ(One-Time Payments)"
                    />
                  </p>
                  <DollarSign className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>₦{(stats.totalRevenue / 1000).toLocaleString()}k</p>
                  <p className={`text-[10px] font-medium mt-1 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% all time
                  </p>
                </div>
              </div>

              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between space-y-0 mb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    MRR
                    <ExplainPopover
                      title="Monthly Recurring Revenue (MRR)"
                      description="The predictable revenue your business generates from all currently active subscriptions each month."
                      formula="Σ(Price of each Active Subscription)"
                    />
                  </p>
                  <Activity className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>₦{stats.mrr.toLocaleString()}</p>
                  <p className="text-[10px] font-medium mt-1 text-black/30 dark:text-white/30">
                    From {stats.activeSubscribers} subs
                  </p>
                </div>
              </div>

              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between space-y-0 mb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    This Month
                    <ExplainPopover
                      title="Current Month Revenue"
                      description="The total revenue captured specifically within the current calendar month."
                      formula="Σ(All transactions paid in current calendar month)"
                    />
                  </p>
                  <CalendarDays className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>₦{stats.currentMonthRevenue.toLocaleString()}</p>
                  <p className={`text-[10px] font-medium mt-1 flex items-center ${stats.revenueGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% vs last mo
                  </p>
                </div>
              </div>

              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between pb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    Active Subs
                    <ExplainPopover
                      title="Active Subscriptions"
                      description="The total count of subscriber records currently in an 'active' status."
                    />
                  </p>
                  <Users className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>{stats.activeSubscribers}</p>
                  <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">+{stats.subscriberGrowth}% growth</p>
                </div>
              </div>

              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between pb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    ARPU
                    <ExplainPopover
                      title="Average Revenue Per User (ARPU)"
                      description="The average amount of monthly recurring revenue generated per active subscriber."
                      formula="MRR ÷ Active Subscribers"
                    />
                  </p>
                  <BarChart3 className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>₦{Math.round(stats.averageRevenue).toLocaleString()}</p>
                  <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">Per active user</p>
                </div>
              </div>

              <div className={`${card} px-4 py-4 flex flex-col justify-between h-full`}>
                <div className="flex items-center justify-between pb-3">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] flex items-center gap-1">
                    Churn Rate
                    <ExplainPopover
                      title="Platform Churn Rate"
                      description="The percentage of all-time subscribers who have cancelled or not renewed their subscription."
                      formula="(Cancelled Subs ÷ Total All-Time Subs) × 100"
                    />
                  </p>
                  <TrendingDown className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                </div>
                <div>
                  <p className={statValue}>{stats.churnRate}%</p>
                  <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">Cancelled plans</p>
                </div>
              </div>

            </div>
          </div>

          {/* Revenue Velocity */}
          <div className={card}>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 py-3 px-5">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-black/45 dark:text-white/45" />
                <span className="text-[13px] font-semibold text-black dark:text-white">Revenue Velocity</span>
                <span className="text-[11px] text-black/30 dark:text-white/30 hidden sm:inline">· Trailing 12-month</span>
              </div>
              <ExplainPopover
                title="Revenue Velocity"
                description="A 12-month rolling view of all revenue captured each calendar month. Each data point represents the sum of all successful subscription charges and one-time payments made within that month."
                formula="Monthly Total = Σ(Subscription Txns) + Σ(OTP Txns)"
              />
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={revenueData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={axisStyle}
                    dy={6}
                    tickFormatter={(v) => v.split(' ')[0]}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisStyle}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    activeDot={{ r: 4, strokeWidth: 0, fill: "rgba(0,0,0,0.6)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visualize Section */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 py-3 px-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-black/45 dark:text-white/45" />
                <span className="text-[13px] font-semibold text-black dark:text-white">Visualize</span>
                <span className="text-[11px] text-black/30 dark:text-white/30 hidden sm:inline">· Choose a dataset to explore</span>
              </div>
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/6 rounded-full p-0.5">
                {(['revenue', 'acquisitions', 'distribution'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setVisualizeTab(tab)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-semibold rounded-full transition-all duration-200",
                      visualizeTab === tab
                        ? "bg-white dark:bg-white/12 text-black dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                        : "text-black/40 dark:text-white/40 hover:text-black/60"
                    )}
                  >
                    {tab === 'revenue' ? 'Revenue' : tab === 'acquisitions' ? 'Acquisitions' : 'Plan Split'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-5">
              {visualizeTab === 'revenue' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] text-black/40 dark:text-white/40">Monthly revenue over the last 12 months</p>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-black/60" />
                      <span className="text-black/45 dark:text-white/45 font-medium">Revenue (₦)</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="vizRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#000000" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#000000" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} width={48} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="revenue" stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} fillOpacity={1} fill="url(#vizRevenue)" activeDot={{ r: 4, strokeWidth: 0, fill: "rgba(0,0,0,0.6)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {visualizeTab === 'acquisitions' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] text-black/40 dark:text-white/40">New subscribers signed up per month</p>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-black/40" />
                      <span className="text-black/45 dark:text-white/45 font-medium">Subscribers</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={subscriberTrend} margin={{ top: 20, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} dy={6} tickFormatter={(v) => v.split(' ')[0]} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} allowDecimals={false} width={30} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.015)' }} />
                      <Bar dataKey="subscribers" fill="rgba(0,0,0,0.4)" radius={[4, 4, 0, 0]} maxBarSize={32}>
                        <LabelList dataKey="subscribers" position="top" style={{ fill: "rgba(0,0,0,0.4)", fontSize: 10, fontFamily: APPLE_FONT }} formatter={(v: number) => v > 0 ? v : ''} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {visualizeTab === 'distribution' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] text-black/40 dark:text-white/40">Active subscribers across each plan</p>
                    <ExplainPopover
                      title="Plan Distribution"
                      description="A breakdown of your currently active subscribers across each plan. This shows which plans are most popular."
                    />
                  </div>
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="flex-1 w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={planDistribution}
                            cx="50%" cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {planDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || "#000000"} className="hover:opacity-80 transition-opacity outline-none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={6}
                            formatter={(value) => <span className="text-[11px] text-black/50 dark:text-white/50" style={{ fontFamily: APPLE_FONT }}>{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full lg:w-64 shrink-0 space-y-1.5">
                      {planDistribution.length === 0 && <p className="text-center text-[11px] text-black/30 dark:text-white/30 py-4">No active plans found.</p>}
                      {planDistribution.map((plan, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-[10px] border border-black/5 dark:border-white/5 bg-black/[0.01] hover:bg-black/[0.02] transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] || "#000000" }} />
                            <span className="text-[11px] font-medium truncate max-w-[120px] text-black/60 dark:text-white/60" title={plan.name}>{plan.name}</span>
                          </div>
                          <div className="text-right text-[11px]">
                            <span className="font-bold text-black dark:text-white">{plan.value}</span>
                            <span className="text-[10px] text-black/30 dark:text-white/30 ml-1">({((plan.value / (stats.activeSubscribers || 1)) * 100).toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}