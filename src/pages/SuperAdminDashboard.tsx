import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/PremiumLoader";
import { cn } from "@/lib/utils";
import {
  Building2, Users, DollarSign, Wallet, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Zap,
  ShieldAlert, Scale, Activity, Info, ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Database, Cloud } from "lucide-react";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { SuperAdminMessageDialog } from "@/components/SuperAdminMessageDialog";
import {
  getDashboardDataSource,
  setDashboardDataSource,
  type DashboardDataSource,
} from "@/lib/dataSource";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const APPLE_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";

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

/* ── Info Popover ─────────────────────────────────────────── */
function InfoPopover({ title, description, formula }: {
  title: string; description: string; formula?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-black/6 dark:hover:bg-white/8 transition-colors shrink-0"
        >
          <Info className="w-2.5 h-2.5 text-black/20 dark:text-white/20 hover:text-black/40 dark:hover:text-white/40 transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-4 rounded-2xl border-0 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] bg-white dark:bg-[#2c2c2e]"
        style={{ fontFamily: APPLE_FONT }}
        align="start"
        side="bottom"
      >
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <p className="font-semibold text-[13px] text-black dark:text-white">{title}</p>
          <p className="text-[12px] text-black/50 dark:text-white/50 leading-relaxed">{description}</p>
          {formula && (
            <div className="pt-2 border-t border-black/6 dark:border-white/6">
              <div className="bg-black/4 dark:bg-white/6 rounded-lg p-2">
                <code className="text-[11px] font-mono text-black/60 dark:text-white/60">{formula}</code>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({
  label, value, detail, detailB,
  icon: Icon, onClick, info, live,
}: {
  label: string;
  value: string;
  detail?: string;
  detailB?: string;
  icon: React.ElementType;
  onClick?: () => void;
  info?: { title: string; description: string; formula?: string };
  live?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{ fontFamily: APPLE_FONT }}
      className={cn(
        "group bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4",
        "shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]",
        "transition-all duration-200 ease-out select-none",
        onClick && "cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.09),0_0_0_0.5px_rgba(0,0,0,0.07)] hover:-translate-y-px"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-[8px] bg-black/5 dark:bg-white/8 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
        </div>
        <div className="flex items-center gap-1.5">
          {live && (
            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-black/30 dark:text-white/30 uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Live
            </span>
          )}
          {info && <InfoPopover {...info} />}
        </div>
      </div>

      {/* Value */}
      <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums mb-1.5">
        {value}
      </p>

      {/* Label */}
      <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1">
        {label}
      </p>

      {/* Detail */}
      {(detail || detailB) && (
        <p className="text-[11px] text-black/30 dark:text-white/30 tabular-nums">
          {detail}{detail && detailB ? <span className="mx-1 opacity-50">·</span> : null}{detailB}
        </p>
      )}

      {/* Hover caret */}
      {onClick && (
        <div className="mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[11px] text-black/30 dark:text-white/30">View details</span>
          <ChevronRight className="w-3 h-3 text-black/25 dark:text-white/25" />
        </div>
      )}
    </div>
  );
}

/* ── Queue Row ────────────────────────────────────────────── */
function QueueRow({ icon: Icon, label, count, onClick }: {
  icon: React.ElementType; label: string; count: number; onClick?: () => void;
}) {
  const hasItems = count > 0;
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: APPLE_FONT }}
      className={cn(
        "w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-left group",
        "transition-colors duration-150",
        hasItems
          ? "bg-red-50/70 dark:bg-red-500/6 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "hover:bg-black/3 dark:hover:bg-white/4"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
          hasItems ? "bg-red-100/80 dark:bg-red-500/12" : "bg-black/5 dark:bg-white/6"
        )}>
          <Icon className={cn("w-3 h-3", hasItems ? "text-red-400" : "text-black/30 dark:text-white/30")} />
        </div>
        <span className={cn(
          "text-[13px] font-medium",
          hasItems ? "text-red-600 dark:text-red-400" : "text-black/60 dark:text-white/60"
        )}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {hasItems ? (
          <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
            {count}
          </span>
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-black/20 dark:text-white/20" />
        )}
      </div>
    </button>
  );
}

/* ── Section Label ────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{ fontFamily: APPLE_FONT }}
      className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 px-1 mb-2"
    >
      {children}
    </p>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { hasPanelAccess, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<DashboardDataSource>(getDashboardDataSource());

  useEffect(() => { setDashboardDataSource(dataSource); }, [dataSource]);

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
    if (hasPanelAccess) fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPanelAccess, dataSource]);

  if (authLoading || loading) return <PremiumLoader fullScreen message="Loading core panel..." />;
  if (!hasPanelAccess) return null;

  const s = stats!;
  const trendData = s.trend_data || [];

  const healthScore = Math.max(0, Math.min(100, Math.round(
    100
    - (s.failed_payments / Math.max(s.transaction_count, 1)) * 40
    - (s.suspended_organizations / Math.max(s.total_organizations, 1)) * 30
    - (s.defaulted_subscribers / Math.max(s.total_subscribers, 1)) * 20
    - (s.pending_appeals / 10)
  )));

  const healthLabel = healthScore >= 85 ? "Healthy" : healthScore >= 65 ? "Fair" : "Needs Attention";
  const pendingAlerts = s.pending_payouts + s.pending_deletions + s.pending_appeals + s.failed_payments;

  const fmt = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `₦${(n / 1_000).toFixed(0)}K`
    : `₦${n.toLocaleString()}`;

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
    <div
      className="min-h-screen bg-[#f5f5f7] dark:bg-[#000]"
      style={{ fontFamily: APPLE_FONT }}
    >
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white">
              Overview
            </h1>
            <p className="text-[12px] text-black/35 dark:text-white/35 mt-0.5">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {pendingAlerts > 0 && (
                <span className="text-red-500 ml-1.5">
                  · {pendingAlerts} {pendingAlerts === 1 ? "item" : "items"} need attention
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Source pill toggle */}
            <div className="flex items-center bg-black/[0.06] dark:bg-white/8 rounded-full p-0.5 gap-0.5">
              {(["local", "paystack"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setDataSource(src)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200",
                    dataSource === src
                      ? "bg-white dark:bg-white/12 text-black dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                  )}
                >
                  {src === "local" ? <Database className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                  {src === "local" ? "Recurra DB" : "Paystack"}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12px] font-medium transition-all duration-200 hover:opacity-75 active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
              Refresh
            </button>

            <SendNotificationDialog />
            <SuperAdminMessageDialog />
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────── */}
        <div>
          <SectionLabel>At a Glance</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Organizations"
              value={s.total_organizations.toLocaleString()}
              detail={`${s.active_organizations} active`}
              detailB={s.suspended_organizations > 0 ? `${s.suspended_organizations} suspended` : undefined}
              icon={Building2}
              onClick={() => navigate("/superadmin/organizations")}
              live
              info={{
                title: "Total Organizations",
                description: "All B2B institutions signed up on Recurra. Active = not suspended.",
                formula: "SUM(organizations)"
              }}
            />
            <KpiCard
              label="Subscribers"
              value={s.total_subscribers.toLocaleString()}
              detail={`${s.active_subscribers} active`}
              detailB={s.defaulted_subscribers > 0 ? `${s.defaulted_subscribers} defaulted` : undefined}
              icon={Users}
              live
              info={{
                title: "Total Subscribers",
                description: "All end-users subscribed across active organizations.",
                formula: "SUM(organization_subscribers)"
              }}
            />
            <KpiCard
              label="Processing Volume"
              value={fmt(s.total_revenue)}
              detail={`${s.transaction_count.toLocaleString()} transactions`}
              icon={DollarSign}
              info={{
                title: "Gross Processing Volume",
                description: "Total naira volume of all successful transactions since inception.",
                formula: "SUM(successful_transactions.amount)"
              }}
            />
            <KpiCard
              label="Platform Earnings"
              value={fmt(s.platform_earnings)}
              detail={`${fmt(Math.round(s.mrr * 0.05))} est. this month`}
              icon={Wallet}
              info={{
                title: "Platform Revenue",
                description: "Total earnings via the platform fee on each successful transaction.",
                formula: "total_transactions × ₦1,500"
              }}
            />
          </div>
        </div>

        {/* ── Middle: Charts + Sidebar ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">

          {/* Left column */}
          <div className="space-y-3">

            {/* MRR / ARR strip */}
            <div>
              <SectionLabel>Revenue</SectionLabel>
              <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-8">
                  {/* MRR */}
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35">MRR</p>
                      <InfoPopover
                        title="Monthly Recurring Revenue"
                        description="Forward-looking estimate of predictable monthly revenue from active subscriptions."
                        formula="Σ(active_subs.amount × interval_multiplier)"
                      />
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white tabular-nums leading-none">
                      {fmt(Math.round(s.mrr))}
                    </p>
                  </div>

                  <div className="w-px h-8 bg-black/8 dark:bg-white/8" />

                  {/* ARR */}
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35">ARR</p>
                      <InfoPopover
                        title="Annual Run Rate"
                        description="MRR projected over 12 months."
                        formula="MRR × 12"
                      />
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white tabular-nums leading-none">
                      {fmt(Math.round(s.mrr * 12))}
                    </p>
                  </div>

                  {/* Right mini stats */}
                  <div className="ml-auto flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30 mb-1">Avg / Org</p>
                      <p className="text-[14px] font-semibold text-black dark:text-white tabular-nums">
                        {s.active_organizations > 0 ? fmt(Math.round(s.mrr / s.active_organizations)) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30 mb-1">Failed Pmts</p>
                      <p className={cn("text-[14px] font-semibold tabular-nums", s.failed_payments > 0 ? "text-red-500" : "text-black/50 dark:text-white/50")}>
                        {s.failed_payments.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth chart */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-black dark:text-white">Platform Growth</p>
                  <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">Organizations & subscribers over time</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-black/30 dark:text-white/30 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 inline-block" /> Orgs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/15 inline-block" /> Subs
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData} margin={{ top: 6, right: 16, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.08)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.04)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="subs" name="Subscribers" stroke="rgba(0,0,0,0.18)" strokeWidth={1.5} fill="url(#gS)" activeDot={{ r: 3, strokeWidth: 0, fill: "rgba(0,0,0,0.4)" }} />
                  <Area type="monotone" dataKey="orgs" name="Organizations" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} fill="url(#gO)" activeDot={{ r: 3, strokeWidth: 0, fill: "rgba(0,0,0,0.6)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-3">
            <SectionLabel>Status</SectionLabel>

            {/* Health */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <p className="text-[13px] font-semibold text-black dark:text-white">Health</p>
                  <InfoPopover
                    title="Platform Health Score"
                    description="Composite 0–100 score across failed payments, suspensions, defaults, and open appeals."
                    formula="100 - (failed×40) - (suspended×30) - (defaulted×20) - (appeals/10)"
                  />
                </div>
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  healthScore >= 85
                    ? "bg-black/5 dark:bg-white/8 text-black/50 dark:text-white/50"
                    : healthScore >= 65
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
                )}>
                  {healthLabel}
                </span>
              </div>

              <div className="flex items-end gap-1 mb-3 leading-none">
                <span className="text-[32px] font-bold tracking-[-0.03em] text-black dark:text-white tabular-nums">{healthScore}</span>
                <span className="text-[13px] font-medium text-black/25 dark:text-white/25 mb-1">/100</span>
              </div>

              <div className="h-1 w-full bg-black/6 dark:bg-white/8 rounded-full overflow-hidden mb-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    healthScore >= 85 ? "bg-black/30 dark:bg-white/30"
                    : healthScore >= 65 ? "bg-amber-400"
                    : "bg-red-400"
                  )}
                  style={{ width: `${healthScore}%` }}
                />
              </div>

              <div className="space-y-0 divide-y divide-black/4 dark:divide-white/4">
                {[
                  { label: "Failed pmt rate", val: s.transaction_count > 0 ? `${((s.failed_payments / s.transaction_count) * 100).toFixed(1)}%` : "0%", bad: s.failed_payments > 0 },
                  { label: "Suspension rate", val: s.total_organizations > 0 ? `${((s.suspended_organizations / s.total_organizations) * 100).toFixed(1)}%` : "0%", bad: s.suspended_organizations > 0 },
                  { label: "Defaulted subs", val: s.defaulted_subscribers.toLocaleString(), bad: s.defaulted_subscribers > 0 },
                ].map(({ label, val, bad }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-[11px] text-black/40 dark:text-white/40">{label}</span>
                    <span className={cn("text-[11px] font-semibold tabular-nums", bad ? "text-red-500" : "text-black/35 dark:text-white/35")}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Queue */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] px-4 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-[13px] font-semibold text-black dark:text-white">Action Queue</p>
                {pendingAlerts > 0
                  ? <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 uppercase tracking-wide"><AlertTriangle className="w-3 h-3" />{pendingAlerts}</span>
                  : <CheckCircle2 className="w-3.5 h-3.5 text-black/20 dark:text-white/20" />
                }
              </div>
              <div className="space-y-0.5">
                <QueueRow icon={Clock} label="Pending Payouts" count={s.pending_payouts} onClick={() => navigate("/superadmin/payouts")} />
                <QueueRow icon={ShieldAlert} label="Pending Deletions" count={s.pending_deletions} onClick={() => navigate("/superadmin/deletions")} />
                <QueueRow icon={Scale} label="Open Appeals" count={s.pending_appeals} onClick={() => navigate("/superadmin/appeals")} />
                <QueueRow icon={Zap} label="Failed Payments" count={s.failed_payments} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: MRR Chart + Snapshot ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* MRR bar */}
          <div>
            <SectionLabel>MRR Trend</SectionLabel>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 pt-4 pb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-black dark:text-white">Monthly Recurring Revenue</p>
                <InfoPopover
                  title="MRR Trend"
                  description="Actual gross revenue processed monthly vs. current active MRR projection."
                  formula="Σ(monthly_processed_volume)"
                />
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trendData} margin={{ top: 6, right: 16, left: -12, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₦${v.toLocaleString()}`, "MRR"]} cursor={{ fill: "rgba(0,0,0,0.025)" }} />
                  <Bar dataKey="rev" name="MRR" fill="rgba(0,0,0,0.12)" radius={[4, 4, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Snapshot */}
          <div>
            <SectionLabel>Key Ratios</SectionLabel>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-y divide-black/5 dark:divide-white/5">
                {[
                  {
                    label: "Paystack Connected",
                    value: `${s.active_organizations}`,
                    sub: `of ${s.total_organizations} orgs`,
                    info: { title: "Paystack Connected", description: "Active orgs with valid Paystack live keys.", formula: "count(orgs where paystack_key IS NOT NULL)" }
                  },
                  {
                    label: "Subscriber Density",
                    value: s.active_organizations > 0 ? `${(s.active_subscribers / s.active_organizations).toFixed(1)}` : "—",
                    sub: "avg per org",
                    info: { title: "Subscriber Density", description: "Average active subscribers per active organization.", formula: "active_subscribers / active_organizations" }
                  },
                  {
                    label: "Revenue / Sub",
                    value: s.active_subscribers > 0 ? fmt(Math.round(s.total_revenue / s.total_subscribers)) : "—",
                    sub: "lifetime LTV est.",
                    info: { title: "Revenue Per Subscriber", description: "Estimated lifetime value per subscriber.", formula: "total_revenue / total_subscribers" }
                  },
                  {
                    label: "Take Rate",
                    value: s.total_revenue > 0 ? `${((s.platform_earnings / s.total_revenue) * 100).toFixed(2)}%` : "—",
                    sub: "earnings / volume",
                    info: { title: "Platform Take Rate", description: "Percentage of gross volume retained as revenue.", formula: "(platform_earnings / total_revenue) × 100" }
                  },
                ].map(({ label, value, sub, info }) => (
                  <div key={label} className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30">{label}</p>
                      <InfoPopover {...info} />
                    </div>
                    <p className="text-[20px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums">{value}</p>
                    <p className="text-[11px] text-black/30 dark:text-white/30">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex items-center justify-end">
                <button
                  onClick={() => navigate("/superadmin/organizations")}
                  className="flex items-center gap-1 text-[12px] font-medium text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                >
                  All organizations <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
