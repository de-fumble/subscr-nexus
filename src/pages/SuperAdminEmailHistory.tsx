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
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Filter,
  MailOpen,
  TrendingUp,
  AlertCircle,
  X,
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

interface EmailLog {
  id: string;
  sent_at: string;
  recipient_email: string;
  recipient_name: string | null;
  org_id: string | null;
  subject: string;
  email_type: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  login: "Login Alert",
  logout: "Logout Notification",
  signup: "Welcome",
  password_reset: "Password Reset",
  otp: "OTP Verification",
  kyc_approved: "KYC Approved",
  superadmin_message: "Admin Message",
};

const EMAIL_TYPE_COLORS: Record<string, string> = {
  login: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  logout: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  signup: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  password_reset: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  otp: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  kyc_approved: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  superadmin_message: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

export default function SuperAdminEmailHistory() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading } = useSuperadmin();

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchLogs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);

      // Apply date filter server-side
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
        query = query.gte("sent_at", from.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setLogs((data as EmailLog[]) || []);
      if (showRefresh) toast.success("Email history refreshed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch email history";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) fetchLogs();
  }, [isSuperadmin, dateFilter]);

  // Client-side filters
  const filtered = logs.filter((log) => {
    const matchSearch =
      !searchQuery ||
      log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recipient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === "all" || log.email_type === typeFilter;
    const matchStatus = statusFilter === "all" || log.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    types: [...new Set(logs.map((l) => l.email_type))].length,
  };

  const hasFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading email history..." />;
  }

  if (!isSuperadmin) return null;

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            Email History
          </h1>
          <p className="text-muted-foreground mt-1">
            All outbound emails sent across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          {
            label: "Total Emails",
            value: stats.total,
            icon: MailOpen,
            color: "indigo",
          },
          {
            label: "Delivered",
            value: stats.sent,
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Failed",
            value: stats.failed,
            icon: XCircle,
            color: "rose",
          },
          {
            label: "Email Types",
            value: stats.types,
            icon: TrendingUp,
            color: "violet",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className={`h-8 w-8 rounded-full bg-${color}-500/10 flex items-center justify-center`}>
                <Icon className={`h-4 w-4 text-${color}-500`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color === "rose" && value > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Email Log</CardTitle>
                <CardDescription>
                  {filtered.length} of {logs.length} emails
                  {hasFilters && " (filtered)"}
                </CardDescription>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email-history-search"
                  placeholder="Search by recipient, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="email-type-filter" className="w-full sm:w-44 bg-background">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Email type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(EMAIL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="email-status-filter" className="w-full sm:w-36 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="email-date-filter" className="w-full sm:w-36 bg-background">
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
                  <TableHead className="pl-6">Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Recipient */}
                    <TableCell className="pl-6">
                      <div className="flex flex-col min-w-0">
                        {log.recipient_name && (
                          <span className="font-medium text-sm truncate max-w-[180px]">
                            {log.recipient_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {log.recipient_email}
                        </span>
                      </div>
                    </TableCell>

                    {/* Subject */}
                    <TableCell className="max-w-[240px]">
                      <span className="text-sm truncate block max-w-[240px]" title={log.subject}>
                        {log.subject}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge
                        className={`text-[11px] font-medium border ${EMAIL_TYPE_COLORS[log.email_type] ?? "bg-muted text-muted-foreground border-border"}`}
                      >
                        {EMAIL_TYPE_LABELS[log.email_type] ?? log.email_type}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {log.status === "sent" ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs font-medium">Delivered</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400" title={log.error_message ?? undefined}>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs font-medium">Failed</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-right text-muted-foreground text-sm pr-6 whitespace-nowrap">
                      {format(new Date(log.sent_at), "MMM d, yyyy · h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No emails found</p>
                      <p className="text-xs mt-1 opacity-70">
                        {hasFilters
                          ? "Try adjusting your filters"
                          : "Emails will appear here as they are sent"}
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
