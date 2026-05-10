import { useState, useEffect, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import {
  AlertTriangle,
  RefreshCw,
  User,
  CreditCard,
  Calendar,
  AlertCircle,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";
import { FloatingSupport } from "@/components/FloatingSupport";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoSvg from "@/assets/logo.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 30;

// Helper to get initials
const getInitials = (name: string | null | undefined) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

interface FailedPayment {
  id: string;
  email: string;
  customer_name: string | null;
  amount: number;
  plan_name: string;
  failure_reason: string | null;
  failed_at: string;
  retry_count: number;
  last_retry_at: string | null;
  status: string;
  reference: string;
}

interface RetryQueueItem {
  id: string;
  subscriber_id?: string;
  email: string;
  customer_name: string | null;
  amount: number;
  retry_count: number;
  last_retry_at: string | null;
  payment_failed_at: string | null;
  status: string;
  plan_name: string;
  failure_reason: string | null;
  reference: string;
  has_authorization: boolean;
  is_exhausted: boolean;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
  paystack_secret_key?: string | null;
}

const DashboardFailedPayments = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "abandoned">("all");
  const [searchName, setSearchName] = useState("");
  const [searchReference, setSearchReference] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"history" | "recovery">("history");

  const uniquePlans = useMemo(() => {
    const plans = new Set<string>();
    failedPayments.forEach(p => {
      if (p.plan_name) plans.add(p.plan_name);
    });
    return Array.from(plans).sort();
  }, [failedPayments]);
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());

  const toggleReason = (id: string) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReasons(newExpanded);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email);

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url, paystack_secret_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url, paystack_secret_key")
            .eq("id", membership.org_id)
            .maybeSingle();
          orgData = staffOrg;
        }
      }

      if (!orgData) {
        navigate("/auth");
        return;
      }

      setOrganization(orgData);
      await fetchFailedPayments(orgData);
      await fetchRetryQueue(orgData);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchFailedPayments = async (org: Organization) => {
    if (!org?.paystack_secret_key) {
      toast.error("Paystack keys not configured");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          orgId: org.id,
          action: "failed_transactions"
        },
      });

      if (error) throw error;

      const payments: FailedPayment[] = (data?.failedTransactions || []).map((txn: any) => ({
        id: txn.id?.toString() || txn.reference,
        email: txn.customer?.email || "Unknown",
        customer_name: txn.customer?.first_name
          ? `${txn.customer.first_name} ${txn.customer.last_name || ""}`.trim()
          : txn.metadata?.customer_name || null,
        amount: txn.amount / 100,
        plan_name: txn.plan?.name || txn.metadata?.plan_name || "Standard Payment",
        failure_reason: txn.gateway_response || txn.message || getDefaultFailureReason(txn.status),
        failed_at: txn.created_at || txn.transaction_date,
        retry_count: 0,
        last_retry_at: null,
        status: txn.status,
        reference: txn.reference,
      }));

      setFailedPayments(payments);
    } catch (error) {
      console.error("Error fetching failed payments:", error);
      toast.error("Failed to load failed payments");
    }
  };
  
  const fetchRetryQueue = async (org: Organization) => {
    setQueueLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("retry-failed-payments", {
        body: {
          orgId: org.id,
          action: "status"
        },
      });

      if (error) throw error;
      setRetryQueue(data?.retryQueue || []);
    } catch (error) {
      console.error("Error fetching retry queue:", error);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleRetry = async (subscriberId: string, queueItemId: string) => {
    setRetryingId(queueItemId);
    try {
      const { data, error } = await supabase.functions.invoke("retry-failed-payments", {
        body: {
          subscriberId,
          action: "retry_one"
        },
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        if (organization) {
          fetchRetryQueue(organization);
          fetchFailedPayments(organization);
        }
      } else {
        toast.error(data.message || "Retry failed");
        if (organization) fetchRetryQueue(organization);
      }
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("An error occurred during retry");
    } finally {
      setRetryingId(null);
    }
  };

  const getDefaultFailureReason = (status: string): string => {
    if (status === "abandoned") return "Customer abandoned checkout";
    if (status === "failed") return "Payment failed - Card declined or insufficient funds";
    if (status === "cancelled") return "Subscription cancelled by user";
    return "Payment failed - Unknown reason";
  };

  const filteredPayments = useMemo(() => {
    return failedPayments.filter((payment) => {
      if (statusFilter === "failed" && payment.status !== "failed") return false;
      if (statusFilter === "abandoned" && payment.status !== "abandoned") return false;

      if (planFilter !== "all" && payment.plan_name !== planFilter) return false;

      if (searchName) {
        const nameMatch = payment.customer_name?.toLowerCase().includes(searchName.toLowerCase());
        const emailMatch = payment.email.toLowerCase().includes(searchName.toLowerCase());
        if (!nameMatch && !emailMatch) return false;
      }

      if (searchReference) {
        if (!payment.reference.toLowerCase().includes(searchReference.toLowerCase())) return false;
      }

      if (dateFrom) {
        const paymentDate = new Date(payment.failed_at);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) return false;
      }

      if (dateTo) {
        const paymentDate = new Date(payment.failed_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) return false;
      }

      return true;
    });
  }, [failedPayments, statusFilter, planFilter, searchName, searchReference, dateFrom, dateTo]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, planFilter, searchName, searchReference, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const failedCount = useMemo(() => failedPayments.filter(p => p.status === "failed").length, [failedPayments]);
  const abandonedCount = useMemo(() => failedPayments.filter(p => p.status === "abandoned").length, [failedPayments]);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchName("");
    setSearchReference("");
    setDateFrom("");
    setDateTo("");
    setPlanFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || searchName || searchReference || dateFrom || dateTo || planFilter !== "all";

  const handleExportToExcel = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payments to export");
      return;
    }

    setExporting(true);
    try {
      const exportData = filteredPayments.map((payment) => ({
        "Customer Name": payment.customer_name || "Unknown",
        "Email": payment.email,
        "Amount (₦)": payment.amount,
        "Plan": payment.plan_name,
        "Status": payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
        "Failure Reason": payment.failure_reason || "Unknown",
        "Failed Date": new Date(payment.failed_at).toLocaleDateString(),
        "Reference": payment.reference,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 20 },
        { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 25 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Failed Payments");
      const filename = `failed-payments-${statusFilter}-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredPayments.length} payment(s)`);
    } catch (error) {
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "abandoned") return <Badge variant="secondary">Abandoned</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getFailureIcon = (reason: string) => {
    if (reason.toLowerCase().includes("insufficient")) {
      return <CreditCard className="h-4 w-4 text-destructive" />;
    }
    if (reason.toLowerCase().includes("cancelled") || reason.toLowerCase().includes("abandoned")) {
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  if (loading) {
    return (
      <SidebarInset className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
          <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
          <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Failed Payments
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-24 bg-muted animate-pulse rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
            </div>
          </div>
        </main>
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
        <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
        <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Failed Payments
        </h1>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === "history" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Transaction History
            </button>
            <button
              onClick={() => setActiveTab("recovery")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === "recovery" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recovery Queue
              {retryQueue.length > 0 && (
                <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px]">
                  {retryQueue.length}
                </Badge>
              )}
            </button>
          </div>

          {activeTab === "history" ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Status Filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({failedPayments.length})
                </Button>
                <Button
                  variant={statusFilter === "failed" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("failed")}
                  className="gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed ({failedCount})
                </Button>
                <Button
                  variant={statusFilter === "abandoned" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("abandoned")}
                  className="gap-1"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Abandoned ({abandonedCount})
                </Button>
              </div>

              {/* Filters Card */}
              <Card className="p-4 glass-card">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Name / Email</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Reference</Label>
                    <Input
                      placeholder="Search by reference..."
                      value={searchReference}
                      onChange={(e) => setSearchReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Filter by Plan</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {uniquePlans.map(plan => (
                          <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredPayments.length} of {failedPayments.length} payments
                    </p>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                      <X className="h-3 w-3" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={exporting || filteredPayments.length === 0}
                  className="gap-2"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                  Export to Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => organization && fetchFailedPayments(organization)}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Payments List */}
              {filteredPayments.length === 0 ? (
                <Card className="p-12 glass-card text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    {hasActiveFilters ? (
                      <Search className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h4 className="text-lg font-semibold mb-2">
                    {hasActiveFilters ? "No Matching Payments" : "No Failed Payments"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "No failed payments match your filters"
                      : "All your subscribers' payments are up to date"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                      Clear filters
                    </Button>
                  )}
                </Card>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto w-full bg-card rounded-xl border shadow-sm">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-muted/50 text-muted-foreground border-b text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Reference</th>
                          <th className="py-3 px-4">Plan</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {paginatedPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{payment.customer_name || "Unknown"}</span>
                                <span className="text-[11px] text-muted-foreground">{payment.email}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs">{payment.reference}</span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{payment.plan_name}</td>
                            <td className="py-3 px-4 text-right font-medium">₦{payment.amount.toLocaleString()}</td>
                            <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                            <td className="py-3 px-4 max-w-[220px] truncate text-muted-foreground" title={payment.failure_reason || "Unknown error"}>
                              <div className="flex items-center gap-1.5">
                                {getFailureIcon(payment.failure_reason || "")}
                                <span className="truncate">{payment.failure_reason || "Unknown error"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {new Date(payment.failed_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List View */}
                  <div className="grid gap-3 md:hidden">
                    {paginatedPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 bg-card rounded-lg border shadow-sm space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col min-w-0 pr-2">
                            <p className="font-medium text-sm truncate">{payment.customer_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">{payment.email}</p>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">₦{payment.amount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{new Date(payment.failed_at).toLocaleDateString()}</span>
                        </div>

                        <div className="p-2 rounded bg-destructive/5 border border-destructive/10 flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {getFailureIcon(payment.failure_reason || "")}
                          </div>
                          <p className="text-[11px] leading-tight text-muted-foreground line-clamp-2">
                            {payment.failure_reason || "Unknown error"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        <span className="text-sm font-medium px-2">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Recovery Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-6 shadow-sm">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background shadow-premium border-2 border-primary/10 overflow-hidden p-1.5">
                      <img src={logoSvg} alt="Recurra Logo" className="h-full w-full object-contain rounded-full" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                        Manual Recovery Center
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        Intelligent recovery engine matched <span className="font-semibold text-foreground">{retryQueue.length}</span> recoverable failures. 
                        Manually trigger retries for subscribers with saved payment methods.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
                    <div className="flex flex-col px-4 py-2.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Potential Recovery</span>
                      <span className="text-xl font-bold text-foreground leading-none flex items-baseline gap-1">
                        <span className="text-sm font-medium text-muted-foreground">₦</span>
                        {retryQueue.reduce((sum, sub) => sum + (sub.amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col px-4 py-2.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Queue Status</span>
                      <span className="text-xl font-bold text-foreground leading-none">
                        {retryQueue.filter(s => s.has_authorization).length} 
                        <span className="text-xs font-medium text-muted-foreground ml-1">Ready</span>
                      </span>
                    </div>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-12 -right-12 h-64 w-64 bg-primary/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-12 -left-12 h-48 w-48 bg-secondary/5 rounded-full blur-3xl opacity-30" />
              </div>

              {queueLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                  <div className="relative h-12 w-12 mb-4">
                    <RefreshCw className="h-12 w-12 text-primary/40 animate-spin absolute inset-0" />
                    <RefreshCw className="h-12 w-12 text-primary animate-spin duration-700 absolute inset-0 opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Synchronizing recovery queue...</p>
                </div>
              ) : retryQueue.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 glass-card">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-background border border-border/50 shadow-xl">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Recovery Queue Clear</h4>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
                    Excellent! All your subscribers are currently in good standing. No recoverable failures detected at this time.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 px-6 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    onClick={() => organization && fetchRetryQueue(organization)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check for Updates
                  </Button>
                </Card>
              ) : (
                <div className="bg-card rounded-2xl border shadow-premium overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 text-muted-foreground border-b text-[11px] uppercase tracking-widest font-bold">
                          <th className="py-4 px-6">Subscriber Identity</th>
                          <th className="py-4 px-6">Current Plan</th>
                          <th className="py-4 px-6 text-right">Recovery Amount</th>
                          <th className="py-4 px-6 text-center">Retry Attempts</th>
                          <th className="py-4 px-6">Failed Transaction</th>
                          <th className="py-4 px-6">Reason</th>
                          <th className="py-4 px-6">Status Details</th>
                          <th className="py-4 px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {retryQueue.map((sub) => {
                          const queueItemId = sub.id;
                          const subscriberId = sub.subscriber_id || sub.id;
                          return (
                          <tr key={queueItemId} className="group hover:bg-muted/10 transition-all duration-200 whitespace-nowrap">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-border/50 shadow-sm transition-transform group-hover:scale-105">
                                  <AvatarFallback className="bg-primary/5 text-primary text-[11px] font-bold">
                                    {getInitials(sub.customer_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-foreground truncate max-w-[180px]">
                                    {sub.customer_name || "Anonymous Subscriber"}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    {sub.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                <span className="text-muted-foreground font-medium">{sub.plan_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-foreground">₦{sub.amount.toLocaleString()}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight uppercase tracking-tighter">Full Balance</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5">
                                  {[1, 2, 3].map((i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1 w-5 rounded-full transition-all duration-500 ${
                                        i <= (sub.retry_count || 0) 
                                        ? "bg-destructive/70 shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
                                        : "bg-muted-foreground/10"
                                      }`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                  {sub.retry_count || 0} OF 3 USED
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col min-w-0">
                                <span className="font-mono text-[11px] text-foreground truncate max-w-[180px]">
                                  {sub.reference || "No reference"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {sub.payment_failed_at
                                    ? new Date(sub.payment_failed_at).toLocaleString()
                                    : "Unknown time"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div 
                                className={`flex items-start gap-2 text-muted-foreground transition-all duration-300 cursor-pointer hover:text-foreground ${
                                  expandedReasons.has(queueItemId) ? "max-w-[300px]" : "max-w-[180px]"
                                }`}
                                onClick={() => toggleReason(queueItemId)}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {getFailureIcon(sub.failure_reason || "")}
                                </div>
                                <span className={`text-[11px] leading-relaxed ${expandedReasons.has(queueItemId) ? "whitespace-normal" : "truncate"}`}>
                                  {sub.failure_reason || "Unknown error"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1.5">
                                {sub.has_authorization ? (
                                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 gap-1 font-bold text-[10px] py-0.5 w-fit">
                                    <ShieldCheck className="h-3 w-3" />
                                    READY TO RECOVER
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-destructive/5 text-destructive/60 border-destructive/20 gap-1 font-bold text-[10px] py-0.5 w-fit">
                                    <AlertCircle className="h-3 w-3" />
                                    NO AUTH TOKEN
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <History className="h-3 w-3" />
                                  {sub.last_retry_at 
                                    ? `Last tried ${new Date(sub.last_retry_at).toLocaleDateString()}` 
                                    : sub.payment_failed_at 
                                      ? `Failed on ${new Date(sub.payment_failed_at).toLocaleDateString()}`
                                      : 'No attempts yet'
                                  }
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                variant={sub.has_authorization ? "default" : "secondary"}
                                onClick={() => handleRetry(subscriberId, queueItemId)}
                                disabled={retryingId === queueItemId || !sub.has_authorization || sub.retry_count >= 3}
                                className={`gap-2 px-4 h-9 font-semibold transition-all duration-300 ${
                                  sub.has_authorization && retryingId !== queueItemId
                                  ? "hover:shadow-glow hover:scale-[1.02] bg-primary text-primary-foreground" 
                                  : ""
                                }`}
                              >
                                {retryingId === queueItemId ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Retrying...
                                  </>
                                ) : sub.retry_count >= 3 ? (
                                  "Limit Reached"
                                ) : (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Retry Now
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                    <div className="bg-muted/30 px-6 py-3 border-t">
                      <p className="text-[11px] text-muted-foreground text-center italic leading-relaxed">
                        Manual recovery attempts are processed via the secure gateway. Each attempt is tracked against the recovery limit. After 3 unsuccessful attempts, the subscriber's status will be updated to <span className="font-bold text-destructive">Payment Failed</span>.
                      </p>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
};

export default DashboardFailedPayments;
