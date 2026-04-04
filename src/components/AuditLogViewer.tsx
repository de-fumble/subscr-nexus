import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, RefreshCw, Filter, FileText, Download, Trash2, Clock, Pause, Play } from "lucide-react";

const RETENTION_MS = 72 * 60 * 60 * 1000; // 72 hours in ms
const PAUSE_KEY = (orgId?: string) => `log_retention_paused_${orgId ?? "superadmin"}`;
const CYCLE_START_KEY = (orgId?: string) => `log_cycle_start_${orgId ?? "superadmin"}`;

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  module: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogViewerProps {
  orgId?: string;
  isSuperadmin?: boolean;
  isPremium?: boolean;
  /** When true, shows the global pause/resume control (SuperAdmin only) */
  showRetentionControls?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/20 text-green-700 dark:text-green-400",
  update: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/20 text-red-700 dark:text-red-400",
  suspend: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  restore: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  approve: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  reject: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
  login: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
};

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "subscribers", label: "Subscribers" },
  { value: "plans", label: "Plans" },
  { value: "staff", label: "Staff" },
  { value: "payments", label: "Payments" },
  { value: "settings", label: "Settings" },
  { value: "payout", label: "Payouts" },
  { value: "organization", label: "Organization" },
];

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function AuditLogViewer({
  orgId,
  isSuperadmin = false,
  isPremium = false,
  showRetentionControls = false,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    module: "all",
    action: "all",
    dateFrom: "",
    dateTo: "",
  });

  // --- Retention timer state ---
  const [paused, setPaused] = useState<boolean>(() => {
    try { return localStorage.getItem(PAUSE_KEY(orgId)) === "true"; } catch { return false; }
  });
  const [cycleStart, setCycleStart] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(CYCLE_START_KEY(orgId));
      return stored ? Number(stored) : Date.now();
    } catch { return Date.now(); }
  });
  const [msLeft, setMsLeft] = useState<number>(RETENTION_MS);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist cycle start on first mount if none stored
  useEffect(() => {
    try {
      if (!localStorage.getItem(CYCLE_START_KEY(orgId))) {
        const now = Date.now();
        localStorage.setItem(CYCLE_START_KEY(orgId), String(now));
        setCycleStart(now);
      }
    } catch {}
  }, [orgId]);

  // Tick the countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (paused) {
      // Don't tick — just show current remaining
      const elapsed = Date.now() - cycleStart;
      setMsLeft(Math.max(0, RETENTION_MS - elapsed));
      return;
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - cycleStart;
      const remaining = RETENTION_MS - elapsed;
      if (remaining <= 0) {
        setMsLeft(0);
        clearInterval(timerRef.current!);
        setShowExpiredDialog(true);
      } else {
        setMsLeft(remaining);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, cycleStart]);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem(PAUSE_KEY(orgId), String(next)); } catch {}
    toast.info(next ? "Log retention timer paused" : "Log retention timer resumed");
  };

  const fetchLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (orgId) {
        query = query.eq("entity_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
      if (showRefresh) toast.success("Logs refreshed");
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // --- Download logs as plain text ---
  const handleDownload = () => {
    const lines = logs.map((log) =>
      `[${new Date(log.created_at).toLocaleString()}] ${log.action.toUpperCase()} | ${log.entity_type} | Module: ${log.module ?? "-"} | Details: ${JSON.stringify(log.details)}`
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Delete all logs for this org (or all if superadmin) ---
  const handleDeleteAndReset = async () => {
    setDeleting(true);
    try {
      let query = supabase.from("audit_logs").delete();
      if (orgId) {
        query = (query as any).eq("entity_id", orgId);
      } else {
        // superadmin — delete all
        query = (query as any).neq("id", "00000000-0000-0000-0000-000000000000");
      }
      const { error } = await query;
      if (error) throw error;

      // Reset cycle
      const now = Date.now();
      localStorage.setItem(CYCLE_START_KEY(orgId), String(now));
      setCycleStart(now);
      setMsLeft(RETENTION_MS);
      setShowExpiredDialog(false);
      setLogs([]);
      toast.success("Logs deleted and 72-hour cycle reset");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete logs");
    } finally {
      setDeleting(false);
    }
  };

  const getActionBadgeClass = (action: string) => {
    for (const [key, value] of Object.entries(ACTION_COLORS)) {
      if (action.toLowerCase().includes(key)) return value;
    }
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  };

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !log.action.toLowerCase().includes(searchLower) &&
        !log.entity_type.toLowerCase().includes(searchLower) &&
        !JSON.stringify(log.details).toLowerCase().includes(searchLower)
      ) return false;
    }
    if (filters.module !== "all" && log.module !== filters.module) return false;
    if (filters.action !== "all" && !log.action.toLowerCase().includes(filters.action)) return false;
    if (filters.dateFrom && new Date(log.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(log.created_at) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });

  const progressPct = Math.max(0, Math.min(100, (msLeft / RETENTION_MS) * 100));
  const isUrgent = msLeft < 3 * 60 * 60 * 1000; // under 3 hours

  return (
    <div className="space-y-4">
      {/* Premium banner */}
      {!isSuperadmin && orgId && !isPremium && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 sm:p-4 rounded-xl flex items-start gap-3">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold mb-1 text-sm sm:text-base">72-Hour Log Retention</h4>
            <p className="text-xs sm:text-sm">
              Your organization is on a free or standard plan. Logs older than 72 hours are automatically deleted.
              Upgrade to Premium for unlimited retention.
            </p>
          </div>
        </div>
      )}

      {/* 72-hour countdown bar */}
      <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isUrgent && !paused
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-border/50 bg-muted/20"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 shrink-0 ${isUrgent && !paused ? "text-rose-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Log Retention Cycle
              </p>
              <p className={`text-lg font-mono font-bold tabular-nums ${
                paused ? "text-muted-foreground" : isUrgent ? "text-rose-500" : "text-foreground"
              }`}>
                {paused ? "PAUSED" : formatCountdown(msLeft)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleDownload} disabled={logs.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Download Logs
            </Button>
            {(showRetentionControls || isSuperadmin) && (
              <Button
                variant={paused ? "default" : "outline"}
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={togglePause}
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress
            value={progressPct}
            className={`h-2 ${isUrgent && !paused ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary"}`}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Cycle started {new Date(cycleStart).toLocaleString()}</span>
            <span>{paused ? "Timer paused by admin" : `Resets in ${formatCountdown(msLeft)}`}</span>
          </div>
        </div>
      </div>

      {/* Main log viewer card */}
      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Audit Logs
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Immutable record of all actions {isSuperadmin ? "across the platform" : "in your organization"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-3 sm:px-6">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={filters.module} onValueChange={(v) => setFilters({ ...filters, module: v })}>
              <SelectTrigger className="text-sm">
                <Filter className="h-3.5 w-3.5 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 sm:col-span-2 lg:col-span-1 gap-2">
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="text-xs" />
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="text-xs" />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {filters.search || filters.module !== "all" || filters.dateFrom || filters.dateTo
                ? "No logs match your filters"
                : "No audit logs found"}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden space-y-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`text-[10px] ${getActionBadgeClass(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleDateString()}{" "}
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {(log.details as any)?.role || "User"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {log.entity_type.replace(/_/g, " ")}
                      </span>
                      {log.module && (
                        <Badge variant="outline" className="text-[10px] capitalize">{log.module}</Badge>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-auto max-h-[520px] rounded-lg border border-border/50">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">Timestamp</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Entity</TableHead>
                      <TableHead className="text-xs">Module</TableHead>
                      <TableHead className="text-xs">Details</TableHead>
                      {isSuperadmin && <TableHead className="text-xs">Actor</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[11px]">
                            {(log.details as any)?.role || "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getActionBadgeClass(log.action)} text-[11px]`}>
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {log.entity_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {log.module && (
                            <Badge variant="outline" className="capitalize text-[11px]">
                              {log.module}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : "-"}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell className="font-mono text-xs">
                            {log.actor_id.slice(0, 8)}...
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground text-center pt-1">
            Showing {filteredLogs.length} of {logs.length} logs • Immutable records
          </div>
        </CardContent>
      </Card>

      {/* Expiry Dialog — auto-opens when timer hits zero */}
      <Dialog open={showExpiredDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <Clock className="h-5 w-5" />
              72-Hour Retention Period Reached
            </DialogTitle>
            <DialogDescription>
              The audit log retention window has expired. Please download a copy of your logs before they are permanently deleted and the 72-hour cycle resets.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
            <strong>{logs.length} log entries</strong> will be permanently deleted. This action cannot be undone.
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2 flex-1" onClick={handleDownload} disabled={logs.length === 0}>
              <Download className="h-4 w-4" />
              Download Logs (.txt)
            </Button>
            <Button
              variant="destructive"
              className="gap-2 flex-1"
              onClick={handleDeleteAndReset}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete & Reset Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
