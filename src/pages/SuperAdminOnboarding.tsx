import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone,
  Search,
  RefreshCw,
  Users,
  TrendingUp,
  CalendarDays,
  X,
  Instagram,
  Globe,
} from "lucide-react";
import { PremiumLoader } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface ReferralSource {
  id: string;
  user_id: string | null;
  email: string;
  org_name: string | null;
  source: string;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  google: "Google",
  from_a_friend: "From a friend",
  at_an_event: "At an event",
};

const SOURCE_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-600 border-pink-500/30",
  tiktok: "bg-slate-500/10 text-slate-700 border-slate-400/30 dark:text-slate-300",
  snapchat: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  google: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  from_a_friend: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  at_an_event: "bg-violet-500/10 text-violet-600 border-violet-500/30",
};

const ALL_SOURCES = Object.keys(SOURCE_LABELS);

export default function SuperAdminOnboarding() {
  const navigate = useNavigate();
  const { hasPanelAccess, loading: authLoading } = useSuperadmin();

  const [rows, setRows] = useState<ReferralSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      let query = supabase
        .from("referral_sources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (dateFilter !== "all") {
        const now = new Date();
        let from: Date;
        switch (dateFilter) {
          case "today":
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "7days":
            from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30days":
            from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            from = new Date(0);
        }
        query = query.gte("created_at", from.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data as ReferralSource[]) || []);
      if (showRefresh) toast.success("Onboarding data refreshed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch onboarding data";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasPanelAccess) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPanelAccess, dateFilter]);

  // Client-side filters
  const filtered = rows.filter((r) => {
    const matchSearch =
      !searchQuery ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.org_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchSource = sourceFilter === "all" || r.source === sourceFilter;
    return matchSearch && matchSource;
  });

  // Breakdown per source
  const breakdown = ALL_SOURCES.map((src) => ({
    source: src,
    label: SOURCE_LABELS[src],
    count: rows.filter((r) => r.source === src).length,
  })).sort((a, b) => b.count - a.count);

  const topSource = breakdown[0];

  const thisWeekCount = rows.filter(
    (r) => new Date(r.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const hasFilters = searchQuery || sourceFilter !== "all" || dateFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setDateFilter("all");
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading onboarding data..." />;
  }

  if (!hasPanelAccess) return null;

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            Onboarding
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            How new organizations discovered Recurra
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{rows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">signups answered</p>
          </CardContent>
        </Card>

        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold tracking-tight">
              {rows.length > 0 && topSource?.count > 0
                ? SOURCE_LABELS[topSource.source]
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length > 0 && topSource?.count > 0
                ? `${topSource.count} response${topSource.count !== 1 ? "s" : ""}`
                : "No data yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{thisWeekCount}</div>
            <p className="text-xs text-muted-foreground mt-1">in the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Source Breakdown
          </CardTitle>
          <CardDescription>Distribution across all referral channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdown.map(({ source, label, count }) => {
              const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <Badge
                      className={`text-[11px] font-medium border ${SOURCE_COLORS[source] ?? "bg-muted text-muted-foreground border-border"}`}
                    >
                      {label}
                    </Badge>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-700"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{count}</span>
                    <span className="text-xs ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Responses</CardTitle>
                <CardDescription>
                  {filtered.length} of {rows.length} responses
                  {hasFilters && " (filtered)"}
                </CardDescription>
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="onboarding-search"
                  placeholder="Search by email or org name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger id="onboarding-source-filter" className="w-full sm:w-44 bg-background">
                  <Instagram className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {ALL_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>
                      {SOURCE_LABELS[src]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="onboarding-date-filter" className="w-full sm:w-36 bg-background">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Organization</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right pr-6">Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-medium">
                      {row.org_name || (
                        <span className="text-muted-foreground italic text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[11px] font-medium border ${SOURCE_COLORS[row.source] ?? "bg-muted text-muted-foreground border-border"}`}
                      >
                        {SOURCE_LABELS[row.source] ?? row.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm pr-6 whitespace-nowrap">
                      {format(new Date(row.created_at), "MMM d, yyyy · h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No responses found</p>
                      <p className="text-xs mt-1 opacity-70">
                        {hasFilters
                          ? "Try adjusting your filters"
                          : "Responses will appear here as new users sign up"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
