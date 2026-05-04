import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/PremiumLoader";
import { cn } from "@/lib/utils";
import {
  Building2, Users, DollarSign, TrendingUp, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Zap, ArrowUpRight,
  ShieldAlert, Scale, Wallet, BarChart3, Activity, Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Cloud } from "lucide-react";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { SuperAdminMessageDialog } from "@/components/SuperAdminMessageDialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  suspended_organizations: number;
  total_subscribers: number;
  active_subscribers: number;
  defaulted_subscribers: number;
  total_revenue: number;
  platform_earnings: number;
  transaction_count: number;
  mrr: number;
  arr: number;
  failed_payments: number;
  pending_payouts: number;
  pending_deletions: number;
  pending_appeals: number;
  trend_data: any[];
}

function ExplainPopover({ title, description, formula }: { title: string; description: string; formula?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5 rounded-full inline-flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0 group/info"
        >
          <Info className="h-3 w-3 text-muted-foreground opacity-50 group-hover/info:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 shadow-strong border-black/5 dark:border-white/5 bg-background/95 backdrop-blur-xl" align="start" side="bottom">
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-none">{title}</h4>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
          {formula && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Calculation</p>
              <div className="rounded-md bg-muted/40 p-2 border border-border/50">
                <code className="text-xs font-mono text-primary/80">{formula}</code>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  pulse,
  onClick,
  explanation,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ElementType;
  accent: string;
  pulse?: boolean;
  onClick?: () => void;
  explanation?: { title: string; description: string; formula?: string };
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm transition-all duration-200 group",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* top accent line */}
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accent}`} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            {explanation && <ExplainPopover {...explanation} />}
          </div>
          <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${accent.replace("bg-gradient-to-r", "").replace("from-", "from-").replace("to-", "to-")} opacity-10 flex items-center justify-center relative`}>
            <div className={`absolute inset-0 rounded-lg opacity-10 ${accent}`} />
            <Icon className="h-3.5 w-3.5 relative z-10 text-foreground opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
            {sub && <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">{sub}</div>}
          </div>
          {pulse && (
            <span className="flex h-2 w-2 mb-1">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-emerald-400 opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ icon: Icon, label, count, color, onClick }: {
  icon: React.ElementType; label: string; count: number; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-150 text-left group",
        count > 0
          ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10"
          : "border-border/40 bg-muted/20 hover:bg-muted/40"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", count > 0 ? "bg-rose-500/10" : "bg-muted/50")}>
          <Icon className={cn("h-3.5 w-3.5", count > 0 ? "text-rose-500" : "text-muted-foreground")} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold px-2 tabular-nums">
            {count}
          </Badge>
        )}
        {count === 0 && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 opacity-70" />
        )}
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'local' | 'paystack'>('local');

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const statsData = await invokeSuperadmin("get_platform_stats", { data_source: dataSource });
      setStats(statsData);
      setLastRefreshed(new Date());
      if (showRefresh) toast.success("Data refreshed");
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, dataSource]);

  if (authLoading || loading) return <PremiumLoader fullScreen message="Loading core panel..." />;
  if (!isSuperadmin) return null;

  const s = stats!;

  // Chart data from real edge function
  const trendData = s.trend_data || [];

  const healthScore = Math.max(0, Math.min(100, Math.round(
    100
    - (s.failed_payments / Math.max(s.transaction_count, 1)) * 40
    - (s.suspended_organizations / Math.max(s.total_organizations, 1)) * 30
    - (s.defaulted_subscribers / Math.max(s.total_subscribers, 1)) * 20
    - (s.pending_appeals / 10)
  )));

  const healthColor = healthScore >= 85 ? "text-emerald-500" : healthScore >= 65 ? "text-amber-500" : "text-rose-500";
  const healthLabel = healthScore >= 85 ? "Healthy" : healthScore >= 65 ? "Fair" : "Needs Attention";

  const pendingAlerts = s.pending_payouts + s.pending_deletions + s.pending_appeals + s.failed_payments;

  const fmtNaira = (n: number) =>
    n >= 1_000_000
      ? `₦${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `₦${(n / 1_000).toFixed(0)}K`
      : `₦${n.toLocaleString()}`;

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold tracking-tight">Core Panel</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold uppercase tracking-wider px-2">
              Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last refreshed {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {pendingAlerts > 0 && (
              <span className="ml-2 text-rose-500 font-medium">
                · {pendingAlerts} action{pendingAlerts !== 1 ? "s" : ""} require attention
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={dataSource} onValueChange={(val) => setDataSource(val as 'local' | 'paystack')} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="local" className="text-xs px-3 gap-1.5 h-6">
                <Database className="h-3 w-3" />
                Recurra DB
              </TabsTrigger>
              <TabsTrigger value="paystack" className="text-xs px-3 gap-1.5 h-6">
                <Cloud className="h-3 w-3" />
                Paystack API
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="gap-1.5 font-mono text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <SendNotificationDialog />
          <SuperAdminMessageDialog />
        </div>
      </div>

      {/* ── Tier 1: Primary KPIs ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Organizations"
          value={s.total_organizations.toLocaleString()}
          sub={<><span className="text-emerald-500 font-semibold">{s.active_organizations} active</span> · <span className="text-rose-500">{s.suspended_organizations} suspended</span></>}
          icon={Building2}
          accent="bg-gradient-to-r from-blue-500 to-cyan-500"
          pulse
          onClick={() => navigate("/superadmin/organizations")}
          explanation={{
            title: "Total Organizations",
            description: "The total number of B2B institutions that have signed up to use Recurra. Active means not currently suspended by an admin.",
            formula: "SUM(organizations)"
          }}
        />
        <StatCard
          label="Platform Subscribers"
          value={s.total_subscribers.toLocaleString()}
          sub={<><span className="text-violet-500 font-semibold">{s.active_subscribers} active</span> · <span className="text-amber-500">{s.defaulted_subscribers} defaulted</span></>}
          icon={Users}
          accent="bg-gradient-to-r from-violet-500 to-purple-500"
          pulse
          explanation={{
            title: "Total Subscribers",
            description: "The total sum of all end-users currently subscribed across all active organizations on the platform.",
            formula: "SUM(organization_subscribers)"
          }}
        />
        <StatCard
          label="Processing Volume"
          value={fmtNaira(s.total_revenue)}
          sub={<><span className="text-emerald-500 font-semibold">{s.transaction_count.toLocaleString()}</span> successful txns</>}
          icon={DollarSign}
          accent="bg-gradient-to-r from-emerald-500 to-teal-500"
          explanation={{
            title: "Gross Processing Volume (GPV)",
            description: "The total naira volume of all successful transactions processed through the platform since inception.",
            formula: "SUM(successful_transactions.amount)"
          }}
        />
        <StatCard
          label="Platform Earnings"
          value={fmtNaira(s.platform_earnings)}
          sub={<><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500 font-semibold">{fmtNaira(Math.round(s.mrr * 0.05))}</span> est. this mo</>}
          icon={Wallet}
          accent="bg-gradient-to-r from-amber-500 to-orange-500"
          explanation={{
            title: "Platform Revenue",
            description: "The total earnings generated by the platform fee applied to each successful transaction.",
            formula: "total_transactions × ₦1,500"
          }}
        />
      </div>

      {/* ── Tier 2: Revenue Metrics + Health ── */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        {/* MRR / ARR */}
        <Card className="border-black/5 dark:border-white/5 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-semibold">Revenue Projection</CardTitle>
                <ExplainPopover 
                  title="Monthly Recurring Revenue" 
                  description="A forward-looking estimate of predictable revenue generated by active subscriptions across the platform in a month."
                  formula="Σ(active_subscription_price × normalization_factor)"
                />
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-xs">MRR · ARR · per-org avg</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">MRR</p>
                  <ExplainPopover 
                    title="MRR Calculation" 
                    description="Calculated by identifying all active subscriptions and normalizing their intervals into a monthly value (e.g. daily × 30, annual ÷ 12)."
                    formula="Σ(active_subs.amount × interval_multiplier)"
                  />
                </div>
                <p className="text-3xl font-bold tracking-tight text-emerald-500 tabular-nums">{fmtNaira(Math.round(s.mrr))}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">ARR</p>
                  <ExplainPopover 
                    title="Annual Run Rate" 
                    description="The MRR projected over a 12-month period."
                    formula="MRR × 12"
                  />
                </div>
                <p className="text-xl font-bold tracking-tight text-blue-500 tabular-nums">{fmtNaira(Math.round(s.mrr * 12))}</p>
              </div>
            </div>
            <div className="h-px bg-border/50" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg MRR / Org</p>
                <p className="text-sm font-bold tabular-nums">
                  {s.active_organizations > 0 ? fmtNaira(Math.round(s.mrr / s.active_organizations)) : "—"}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Failed Pmts</p>
                <p className={cn("text-sm font-bold tabular-nums", s.failed_payments > 0 ? "text-rose-500" : "text-emerald-500")}>
                  {s.failed_payments.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Health Score */}
        <Card className="border-black/5 dark:border-white/5 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-semibold">Platform Health</CardTitle>
                <ExplainPopover 
                  title="Platform Health Score" 
                  description="A composite metric from 0 to 100 assessing the overall operational stability and risk level of the entire platform ecosystem."
                  formula="100 - (failed_pmt_rate × 40) - (suspension_rate × 30) - (defaulter_rate × 20) - (appeals / 10)"
                />
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-xs">Composite score across all signals</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className={cn("text-5xl font-black tabular-nums", healthColor)}>{healthScore}</span>
                <span className="text-lg text-muted-foreground font-bold">/100</span>
              </div>
              <Badge className={cn(
                "text-xs font-semibold px-2.5",
                healthScore >= 85 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                healthScore >= 65 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
                "bg-rose-500/10 text-rose-600 border-rose-500/30"
              )}>
                {healthLabel}
              </Badge>
            </div>
            {/* Score bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4">
              <div
                className={cn("h-full rounded-full transition-all duration-1000", healthScore >= 85 ? "bg-emerald-500" : healthScore >= 65 ? "bg-amber-500" : "bg-rose-500")}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { label: "Failed payment rate", val: s.transaction_count > 0 ? `${((s.failed_payments / s.transaction_count) * 100).toFixed(1)}%` : "0%", bad: s.failed_payments > 0 },
                { label: "Suspension rate", val: s.total_organizations > 0 ? `${((s.suspended_organizations / s.total_organizations) * 100).toFixed(1)}%` : "0%", bad: s.suspended_organizations > 0 },
                { label: "Defaulted subscribers", val: s.defaulted_subscribers.toLocaleString(), bad: s.defaulted_subscribers > 0 },
              ].map(({ label, val, bad }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-semibold tabular-nums", bad ? "text-rose-500" : "text-emerald-500")}>{val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="border-black/5 dark:border-white/5 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Action Queue</CardTitle>
              {pendingAlerts > 0
                ? <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
                : <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              }
            </div>
            <CardDescription className="text-xs">Items requiring your review</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <AlertRow icon={Clock} label="Pending Payouts" count={s.pending_payouts} onClick={() => navigate("/superadmin/payouts")} />
            <AlertRow icon={ShieldAlert} label="Pending Deletions" count={s.pending_deletions} onClick={() => navigate("/superadmin/deletions")} />
            <AlertRow icon={Scale} label="Open Appeals" count={s.pending_appeals} onClick={() => navigate("/superadmin/appeals")} />
            <AlertRow icon={Zap} label="Failed Payments" count={s.failed_payments} />
          </CardContent>
        </Card>
      </div>

      {/* ── Tier 3: Charts ── */}
      <div className="grid gap-3 md:grid-cols-5">
        {/* Growth Trend — spans 3 cols */}
        <Card className="md:col-span-3 border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Platform Growth</CardTitle>
                <CardDescription className="text-xs mt-0.5">Organizations & subscribers over time</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />Orgs</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />Subs</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="subs" name="Subscribers" stroke="#8b5cf6" strokeWidth={2} fill="url(#gSubs)" activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="orgs" name="Organizations" stroke="#3b82f6" strokeWidth={2} fill="url(#gOrgs)" activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR Bar — spans 2 cols */}
        <Card className="md:col-span-2 border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4 border-b border-border/30 bg-muted/20">
            <div className="pb-3">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-semibold">MRR Trend</CardTitle>
                <ExplainPopover 
                  title="Historical MRR Trend" 
                  description="Displays the actual gross revenue processed in previous months compared to the current month's active MRR projection. Historical bars represent realized volume, while the current month represents active subscriptions."
                  formula="Σ(monthly_processed_volume)"
                />
              </div>
              <CardDescription className="text-xs mt-0.5">Monthly recurring estimate</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`₦${v.toLocaleString()}`, "MRR"]}
                />
                <Bar dataKey="rev" name="MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Tier 4: Data Table — Quick Org Summary ── */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/40 py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Platform Snapshot</CardTitle>
              <CardDescription className="text-xs">Key ratios at a glance</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/superadmin/organizations")}>
              All Organizations <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border/30">
            {[
              {
                label: "Paystack Connected", value: `${s.active_organizations}`,
                sub: `of ${s.total_organizations} orgs`, color: "text-emerald-500",
                exp: { title: "Paystack Connected", description: "Number of active organizations that have successfully connected valid Paystack live keys.", formula: "count(organizations where paystack_secret_key is not null)" }
              },
              {
                label: "Subscriber Density", value: s.active_organizations > 0 ? `${(s.active_subscribers / s.active_organizations).toFixed(1)}` : "—",
                sub: "avg subs per org", color: "text-blue-500",
                exp: { title: "Subscriber Density", description: "The average number of active subscribers managed by a single active organization on the platform.", formula: "active_subscribers / active_organizations" }
              },
              {
                label: "Revenue / Subscriber", value: s.active_subscribers > 0 ? fmtNaira(Math.round(s.total_revenue / s.total_subscribers)) : "—",
                sub: "lifetime LTV est.", color: "text-violet-500",
                exp: { title: "Revenue Per Subscriber", description: "The estimated lifetime value (LTV) or gross average processing volume driven by a single subscriber.", formula: "total_revenue / total_subscribers" }
              },
              {
                label: "Platform Take Rate", value: s.total_revenue > 0 ? `${((s.platform_earnings / s.total_revenue) * 100).toFixed(2)}%` : "—",
                sub: "earnings / volume", color: "text-amber-500",
                exp: { title: "Platform Take Rate", description: "The percentage of gross processing volume that Recurra retains as revenue via the transaction fee.", formula: "(platform_earnings / total_revenue) × 100" }
              },
            ].map(({ label, value, sub, color, exp }) => (
              <div key={label} className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                  <ExplainPopover {...exp} />
                </div>
                <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
