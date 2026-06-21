import { useState, useEffect, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  AlertCircle,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  Sparkles,
  CheckCircle2,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { FloatingSupport } from "@/components/FloatingSupport";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logoSvg from "@/assets/logo.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

const ITEMS_PER_PAGE = 30;

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

  const getStatusText = (status: string) => {
    if (status === "abandoned") return <span className="text-[12px] font-medium text-black/40 dark:text-white/40">Abandoned</span>;
    if (status === "failed") return <span className="text-[12px] font-semibold text-red-500">Failed</span>;
    return <span className="text-[12px] text-black/50">{status}</span>;
  };

  const getFailureIcon = (reason: string) => {
    if (reason.toLowerCase().includes("insufficient")) {
      return <CreditCard className="h-3.5 w-3.5 text-red-500" />;
    }
    return <AlertTriangle className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />;
  };

  if (loading) {
    return (
      <SidebarInset className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Failed Payments</h1>
        </header>
        <PremiumLoader message="Loading payments..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Failed Payments
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExportToExcel} disabled={exporting || filteredPayments.length === 0} className={pillBtn}>
            <Download className="w-3 h-3" /> Export
          </button>
          <button onClick={() => organization && fetchFailedPayments(organization)} className={pillBtn}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-black/5 dark:border-white/5">
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-[13px] font-medium transition-colors relative ${
                activeTab === "history" 
                ? "text-black dark:text-white border-b-2 border-black dark:border-white" 
                : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              }`}
            >
              Transaction History
            </button>
            <button
              onClick={() => setActiveTab("recovery")}
              className={`px-4 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === "recovery" 
                ? "text-black dark:text-white border-b-2 border-black dark:border-white" 
                : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              }`}
            >
              Recovery Queue
              {retryQueue.length > 0 && (
                <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {retryQueue.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "history" ? (
            <div className="space-y-6">
              {/* Quick Status Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-black/5 dark:bg-white/6 text-black/60 dark:text-white/60 hover:bg-black/10"
                  }`}
                >
                  All ({failedPayments.length})
                </button>
                <button
                  onClick={() => setStatusFilter("failed")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    statusFilter === "failed"
                      ? "bg-red-500 text-white"
                      : "bg-black/5 dark:bg-white/6 text-black/60 dark:text-white/60 hover:bg-black/10"
                  }`}
                >
                  Failed ({failedCount})
                </button>
                <button
                  onClick={() => setStatusFilter("abandoned")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    statusFilter === "abandoned"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-black/5 dark:bg-white/6 text-black/60 dark:text-white/60 hover:bg-black/10"
                  }`}
                >
                  Abandoned ({abandonedCount})
                </button>
              </div>

              {/* Filters Card */}
              <div className={`${card} p-5`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-black/35 dark:text-white/35 uppercase tracking-wider">Name / Email</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                      <input
                        placeholder="Search..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-8 h-8 w-full text-[13px] bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-black/35 dark:text-white/35 uppercase tracking-wider">Reference</span>
                    <input
                      placeholder="Search ref..."
                      value={searchReference}
                      onChange={(e) => setSearchReference(e.target.value)}
                      className="h-8 w-full text-[13px] px-3 bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-black/35 dark:text-white/35 uppercase tracking-wider">From Date</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 w-full text-[13px] px-3 bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-black/35 dark:text-white/35 uppercase tracking-wider">To Date</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 w-full text-[13px] px-3 bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-black/35 dark:text-white/35 uppercase tracking-wider">Plan</span>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-full h-8 text-[12px] bg-[#f5f5f7] dark:bg-[#000] border-none rounded-[8px]">
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
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                    <p className="text-[12px] text-black/40">
                      Showing {filteredPayments.length} of {failedPayments.length} payments
                    </p>
                    <button onClick={clearFilters} className="text-[11px] font-medium text-black/45 dark:text-white/45 flex items-center gap-1">
                      <X className="h-3 w-3" /> Clear filters
                    </button>
                  </div>
                )}
              </div>

              {/* Payments List */}
              {filteredPayments.length === 0 ? (
                <div className={`${card} p-12 text-center`}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/8">
                    <CreditCard className="h-6 w-6 text-black/40 dark:text-white/40" />
                  </div>
                  <h4 className="text-[14px] font-semibold mb-1">No Failed Payments</h4>
                  <p className="text-[12px] text-black/30 max-w-xs mx-auto">
                    All your subscribers' payments are up to date.
                  </p>
                </div>
              ) : (
                <div className={card}>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="border-b border-black/5 dark:border-white/5">
                        <tr>
                          <th className={thCell}>Customer</th>
                          <th className={thCell}>Reference</th>
                          <th className={thCell}>Plan</th>
                          <th className={`${thCell} text-right`}>Amount</th>
                          <th className={thCell}>Status</th>
                          <th className={thCell}>Reason</th>
                          <th className={`${thCell} text-right`}>Date</th>
                        </tr>
                      </thead>
                      <tbody className={tableDivider}>
                        {paginatedPayments.map((payment) => (
                          <tr key={payment.id} className={trRow}>
                            <td className={tdCell}>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-black dark:text-white">{payment.customer_name || "Unknown"}</span>
                                <span className="text-[11px] text-black/35 dark:text-white/35">{payment.email}</span>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <span className="font-mono text-[11px] text-black/40 dark:text-white/40">{payment.reference}</span>
                            </td>
                            <td className={`${tdCell} text-[12px] text-black/50 dark:text-white/50`}>{payment.plan_name}</td>
                            <td className={`${tdCell} text-right text-[13px] font-semibold text-black dark:text-white`}>₦{payment.amount.toLocaleString()}</td>
                            <td className={tdCell}>{getStatusText(payment.status)}</td>
                            <td className={`${tdCell} max-w-[220px] truncate text-black/50 dark:text-white/50 text-[12px]`} title={payment.failure_reason || "Unknown error"}>
                              <div className="flex items-center gap-1.5">
                                {getFailureIcon(payment.failure_reason || "")}
                                <span className="truncate">{payment.failure_reason || "Unknown error"}</span>
                              </div>
                            </td>
                            <td className={`${tdCell} text-right text-[12px] text-black/35 dark:text-white/35`}>
                              {new Date(payment.failed_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List View */}
                  <div className={`grid gap-0 md:hidden ${tableDivider}`}>
                    {paginatedPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col min-w-0 pr-2">
                            <p className="text-[13px] font-medium text-black dark:text-white truncate">{payment.customer_name || "Unknown"}</p>
                            <p className="text-[11px] text-black/35 dark:text-white/35 truncate">{payment.email}</p>
                          </div>
                          <div className="shrink-0">
                            {getStatusText(payment.status)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-semibold text-black dark:text-white">₦{payment.amount.toLocaleString()}</span>
                          <span className="text-black/35 dark:text-white/35">{new Date(payment.failed_at).toLocaleDateString()}</span>
                        </div>

                        <div className="p-2.5 rounded-[8px] bg-red-500/5 border border-red-500/10 flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {getFailureIcon(payment.failure_reason || "")}
                          </div>
                          <p className="text-[11px] text-black/45 dark:text-white/45 leading-normal line-clamp-2">
                            {payment.failure_reason || "Unknown error"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-black/5 dark:border-white/5">
                      <p className="text-[12px] text-black/40">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center justify-center p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[12px] font-semibold">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex items-center justify-center p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recovery Banner */}
              <div className={`${card} p-6 relative overflow-hidden`}>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/8 overflow-hidden p-1.5">
                      <img src={logoSvg} alt="Recurra Logo" className="h-full w-full object-contain rounded-full" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
                        Manual Recovery Center
                      </h4>
                      <p className="mt-1 text-[12px] text-black/40 dark:text-white/40 max-w-xl leading-relaxed">
                        Intelligent recovery engine matched <span className="font-semibold text-black dark:text-white">{retryQueue.length}</span> recoverable failures. 
                        Manually trigger retries for subscribers with saved payment methods.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="flex flex-col px-4 py-2 rounded-[12px] bg-black/[0.015] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 shadow-sm">
                      <span className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 font-bold mb-1">Potential Recovery</span>
                      <span className="text-[16px] font-bold text-black dark:text-white leading-none">
                        ₦{retryQueue.reduce((sum, sub) => sum + (sub.amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col px-4 py-2 rounded-[12px] bg-black/[0.015] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 shadow-sm">
                      <span className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35 font-bold mb-1">Queue Status</span>
                      <span className="text-[16px] font-bold text-black dark:text-white leading-none">
                        {retryQueue.filter(s => s.has_authorization).length} 
                        <span className="text-[10px] font-medium text-black/30 dark:text-white/30 ml-1">Ready</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {queueLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-black/[0.01] rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                  <Loader2 className="h-6 w-6 text-black/30 dark:text-white/30 animate-spin mb-3" />
                  <p className="text-[12px] font-medium text-black/40">Synchronizing recovery queue...</p>
                </div>
              ) : retryQueue.length === 0 ? (
                <div className={`${card} flex flex-col items-center justify-center py-20 text-center`}>
                  <div className="relative mb-4">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/8 shadow-sm">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                  </div>
                  <h4 className="text-[14px] font-semibold mb-1">Recovery Queue Clear</h4>
                  <p className="text-[12px] text-black/30 max-w-xs mx-auto mb-6">
                    All your subscribers are currently in good standing. No recoverable failures detected.
                  </p>
                  <button 
                    className={pillBtn}
                    onClick={() => organization && fetchRetryQueue(organization)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Check for Updates
                  </button>
                </div>
              ) : (
                <div className={card}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <th className={thCell}>Subscriber Identity</th>
                          <th className={thCell}>Current Plan</th>
                          <th className={`${thCell} text-right`}>Recovery Amount</th>
                          <th className={`${thCell} text-center`}>Retry Attempts</th>
                          <th className={thCell}>Failed Transaction</th>
                          <th className={thCell}>Reason</th>
                          <th className={thCell}>Status Details</th>
                          <th className={`${thCell} text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody className={tableDivider}>
                        {retryQueue.map((sub) => {
                          const queueItemId = sub.id;
                          const subscriberId = sub.subscriber_id || sub.id;
                          return (
                          <tr key={queueItemId} className={trRow}>
                            <td className={tdCell}>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-xl shrink-0">
                                  <AvatarFallback className="bg-black/5 dark:bg-white/8 text-black/50 dark:text-white/50 text-[10px] font-bold rounded-xl">
                                    {getInitials(sub.customer_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] font-medium text-black dark:text-white truncate max-w-[180px]">
                                    {sub.customer_name || "Anonymous Subscriber"}
                                  </span>
                                  <span className="text-[10px] text-black/35 dark:text-white/35">
                                    {sub.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <span className="text-black/50 dark:text-white/50 font-medium text-[12px]">{sub.plan_name}</span>
                            </td>
                            <td className={`${tdCell} text-right`}>
                              <span className="font-semibold text-black dark:text-white text-[13px]">₦{sub.amount.toLocaleString()}</span>
                            </td>
                            <td className={`${tdCell} text-center`}>
                              <div className="inline-flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                  {[1, 2, 3].map((i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1 w-4 rounded-full transition-all duration-300 ${
                                        i <= (sub.retry_count || 0) 
                                        ? "bg-red-500/80" 
                                        : "bg-black/10 dark:bg-white/10"
                                      }`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-[9px] font-semibold text-black/25 dark:text-white/25 uppercase tracking-wider">
                                  {sub.retry_count || 0} OF 3
                                </span>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <div className="flex flex-col min-w-0">
                                <span className="font-mono text-[10px] text-black/40 dark:text-white/40 truncate max-w-[180px]">
                                  {sub.reference || "No reference"}
                                </span>
                                <span className="text-[10px] text-black/30 dark:text-white/30">
                                  {sub.payment_failed_at
                                    ? new Date(sub.payment_failed_at).toLocaleDateString()
                                    : "Unknown time"}
                                </span>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <div 
                                className={`flex items-start gap-1.5 text-black/45 dark:text-white/45 cursor-pointer max-w-[180px]`}
                                onClick={() => toggleReason(queueItemId)}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {getFailureIcon(sub.failure_reason || "")}
                                </div>
                                <span className={`text-[11px] leading-tight ${expandedReasons.has(queueItemId) ? "whitespace-normal" : "truncate"}`}>
                                  {sub.failure_reason || "Unknown error"}
                                </span>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <div className="flex flex-col gap-1">
                                {sub.has_authorization ? (
                                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Ready to Recover</span>
                                ) : (
                                  <span className="text-[10px] text-black/30 dark:text-white/30 font-semibold uppercase tracking-wider">No Auth Token</span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30">
                                  <History className="h-3 w-3" />
                                  {sub.last_retry_at 
                                    ? `Tried ${new Date(sub.last_retry_at).toLocaleDateString()}` 
                                    : 'No attempts'
                                  }
                                </div>
                              </div>
                            </td>
                            <td className={`${tdCell} text-right`}>
                              <button
                                onClick={() => handleRetry(subscriberId, queueItemId)}
                                disabled={retryingId === queueItemId || !sub.has_authorization || sub.retry_count >= 3}
                                className={`text-[11px] font-semibold tracking-[-0.01em] bg-black dark:bg-white text-white dark:text-black rounded-full px-3.5 py-1.5 transition-all disabled:opacity-40`}
                              >
                                {retryingId === queueItemId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : sub.retry_count >= 3 ? (
                                  "Limit Reached"
                                ) : (
                                  "Retry Now"
                                )}
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
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
