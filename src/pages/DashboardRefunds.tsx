import { useState, useEffect, useMemo } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RotateCcw,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import { FloatingSupport } from "@/components/FloatingSupport";
import { PremiumLoader } from "@/components/PremiumLoader";
import * as XLSX from "xlsx";
import {
  APPLE_FONT,
  card,
  pageInner,
  sectionLabel,
  thCell,
  trRow,
  tdCell,
  tableDivider,
  pillBtn,
} from "@/lib/appleLayout";

const ITEMS_PER_PAGE = 30;

interface Refund {
  id: string | number;
  reference: string;
  refund_amount: number;
  original_amount: number | null;
  currency: string;
  status: string;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  created_at: string;
  updated_at: string;
  settlement_id: string | null;
  merchant_note: string | null;
  customer_note: string | null;
  deducted_amount: number | null;
}

interface Summary {
  total: number;
  count: number;
  pending: number;
  processed: number;
  failed: number;
}

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  },
  processed: {
    label: "Processed",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-500/10",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
  declined: {
    label: "Declined",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-500/10",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
};

const getStatus = (status: string) =>
  statusMeta[status.toLowerCase()] ?? {
    label: status,
    color: "text-black/50 dark:text-white/50",
    bg: "bg-black/[0.03] dark:bg-white/[0.04]",
    icon: <AlertCircle className="w-3.5 h-3.5 text-black/30" />,
  };

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function DashboardRefunds() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      let resolvedOrgId: string | null = null;

      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        resolvedOrgId = ownedOrg.id;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) resolvedOrgId = membership.org_id;
      }

      if (!resolvedOrgId) {
        navigate("/auth");
        return;
      }

      setOrgId(resolvedOrgId);
      await fetchRefunds(resolvedOrgId);
    } catch (err: any) {
      toast.error("Failed to load refunds");
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async (id: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: { action: "list_refunds", orgId: id },
      });
      if (error) throw error;
      setRefunds(data?.refunds || []);
      setSummary(data?.summary || null);
    } catch (err: any) {
      const msg = err?.message || "Failed to fetch refunds from Paystack";
      setError(msg);
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    return refunds.filter((r) => {
      if (statusFilter !== "all" && r.status.toLowerCase() !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.customer_name.toLowerCase().includes(q) ||
          r.customer_email.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q) ||
          r.plan_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [refunds, statusFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No refunds to export");
      return;
    }
    setExporting(true);
    try {
      const rows = filtered.map((r) => ({
        "Customer Name": r.customer_name,
        Email: r.customer_email,
        "Transaction Ref": r.reference,
        Plan: r.plan_name,
        "Refund Amount (₦)": r.refund_amount,
        "Original Amount (₦)": r.original_amount ?? "—",
        Currency: r.currency,
        Status: r.status,
        "Merchant Note": r.merchant_note ?? "",
        "Customer Note": r.customer_note ?? "",
        Created: formatDate(r.created_at),
        Updated: formatDate(r.updated_at),
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Refunds");
      XLSX.writeFile(wb, `refunds-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Exported ${filtered.length} refund(s)`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = search || statusFilter !== "all";

  if (loading) {
    return (
      <SidebarInset className="flex-1 flex flex-col">
        <header
          className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4"
          style={{ fontFamily: APPLE_FONT }}
        >
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-400" />
            Refund Monitor
          </h1>
        </header>
        <PremiumLoader message="Loading refunds…" />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1 flex flex-col">
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4"
        style={{ fontFamily: APPLE_FONT }}
      >
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-blue-400" />
          Refund Monitor
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className={pillBtn}
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Export
          </button>
          <button
            onClick={() => orgId && fetchRefunds(orgId, true)}
            disabled={refreshing}
            className={pillBtn}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main
        className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]"
        style={{ fontFamily: APPLE_FONT }}
      >
        <div className={pageInner}>

          {/* ── Summary Cards ── */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Refunded",
                  value: `₦${summary.total.toLocaleString()}`,
                  sub: `${summary.count} refund${summary.count !== 1 ? "s" : ""}`,
                  iconBg: "bg-blue-50 dark:bg-blue-500/12",
                  icon: <RotateCcw className="w-3.5 h-3.5 text-blue-400" />,
                },
                {
                  label: "Processed",
                  value: summary.processed.toString(),
                  sub: "Successfully refunded",
                  iconBg: "bg-emerald-50 dark:bg-emerald-500/12",
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
                },
                {
                  label: "Pending",
                  value: summary.pending.toString(),
                  sub: "Awaiting processing",
                  iconBg: "bg-amber-50 dark:bg-amber-500/12",
                  icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                },
                {
                  label: "Failed / Declined",
                  value: summary.failed.toString(),
                  sub: "Not processed",
                  iconBg: "bg-red-50 dark:bg-red-500/10",
                  icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`${card} px-5 py-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-7 h-7 rounded-[8px] ${stat.iconBg} flex items-center justify-center`}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none text-black dark:text-white tabular-nums mb-1.5">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-0.5">
                    {stat.label}
                  </p>
                  <p className="text-[11px] text-black/25 dark:text-white/25">{stat.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Filters ── */}
          <div className={`${card} px-5 py-4`}>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, ref, plan…"
                  className="w-full pl-9 pr-3 py-2 rounded-[8px] bg-[#f5f5f7] dark:bg-[#000] text-[13px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                />
              </div>

              {/* Status pill filters */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: "all", label: `All (${refunds.length})` },
                  { key: "processed", label: `Processed (${summary?.processed ?? 0})` },
                  { key: "pending", label: `Pending (${summary?.pending ?? 0})` },
                  { key: "failed", label: `Failed (${summary?.failed ?? 0})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      statusFilter === key
                        ? key === "processed"
                          ? "bg-emerald-500 text-white"
                          : key === "pending"
                          ? "bg-amber-500 text-white"
                          : key === "failed"
                          ? "bg-red-500 text-white"
                          : "bg-black dark:bg-white text-white dark:text-black"
                        : "bg-black/5 dark:bg-white/6 text-black/60 dark:text-white/60 hover:bg-black/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Clear */}
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="flex items-center gap-1 text-[11px] text-black/40 dark:text-white/40 hover:text-black/60 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Error state ── */}
          {error && !loading && (
            <div className={`${card} p-8 flex flex-col items-center text-center gap-4`}>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-black dark:text-white">
                  Couldn't load refunds
                </p>
                <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 max-w-xs">{error}</p>
              </div>
              <button
                onClick={() => orgId && fetchRefunds(orgId, true)}
                className={pillBtn}
              >
                <RefreshCw className="w-3 h-3" />
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!error && refunds.length === 0 && (
            <div className={`${card} p-12 flex flex-col items-center text-center gap-4`}>
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <RotateCcw className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-black dark:text-white">
                  No refunds yet
                </p>
                <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 max-w-xs">
                  Refunds you initiate from the dashboard will appear here with live Paystack status updates.
                </p>
              </div>
            </div>
          )}

          {/* ── No results for filters ── */}
          {!error && refunds.length > 0 && filtered.length === 0 && (
            <div className={`${card} p-10 flex flex-col items-center text-center gap-3`}>
              <Search className="w-6 h-6 text-black/20 dark:text-white/20" />
              <p className="text-[13px] text-black/40 dark:text-white/40">
                No refunds match your current filters.
              </p>
            </div>
          )}

          {/* ── Table ── */}
          {!error && filtered.length > 0 && (
            <div className={card}>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="border-b border-black/5 dark:border-white/5">
                    <tr>
                      <th className={thCell}>Customer</th>
                      <th className={thCell}>Transaction Ref</th>
                      <th className={thCell}>Plan</th>
                      <th className={`${thCell} text-right`}>Refunded</th>
                      <th className={`${thCell} text-right`}>Original</th>
                      <th className={thCell}>Status</th>
                      <th className={thCell}>Note</th>
                      <th className={`${thCell} text-right`}>Date</th>
                    </tr>
                  </thead>
                  <tbody className={tableDivider}>
                    {paginated.map((r) => {
                      const st = getStatus(r.status);
                      return (
                        <tr key={r.id} className={trRow}>
                          <td className={tdCell}>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-black dark:text-white">
                                {r.customer_name}
                              </span>
                              <span className="text-[11px] text-black/35 dark:text-white/35">
                                {r.customer_email}
                              </span>
                            </div>
                          </td>
                          <td className={tdCell}>
                            <span className="font-mono text-[11px] text-black/40 dark:text-white/40">
                              {r.reference}
                            </span>
                          </td>
                          <td className={`${tdCell} text-[12px] text-black/50 dark:text-white/50`}>
                            {r.plan_name}
                          </td>
                          <td className={`${tdCell} text-right text-[13px] font-semibold text-black dark:text-white tabular-nums`}>
                            ₦{r.refund_amount.toLocaleString()}
                          </td>
                          <td className={`${tdCell} text-right text-[12px] text-black/40 dark:text-white/40 tabular-nums`}>
                            {r.original_amount !== null ? `₦${r.original_amount.toLocaleString()}` : "—"}
                          </td>
                          <td className={tdCell}>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.color}`}
                            >
                              {st.icon}
                              {st.label}
                            </span>
                          </td>
                          <td
                            className={`${tdCell} max-w-[160px] truncate text-[11px] text-black/35 dark:text-white/35`}
                            title={r.merchant_note || r.customer_note || ""}
                          >
                            {r.merchant_note || r.customer_note || "—"}
                          </td>
                          <td className={`${tdCell} text-right text-[11px] text-black/35 dark:text-white/35`}>
                            {formatDate(r.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className={`md:hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]`}>
                {paginated.map((r) => {
                  const st = getStatus(r.status);
                  return (
                    <div key={r.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-black dark:text-white truncate">
                            {r.customer_name}
                          </p>
                          <p className="text-[11px] text-black/35 dark:text-white/35 truncate">
                            {r.customer_email}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}
                        >
                          {st.icon}
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-black dark:text-white tabular-nums">
                          ₦{r.refund_amount.toLocaleString()}
                        </span>
                        <span className="text-black/35 dark:text-white/35">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-black/30 dark:text-white/30 truncate">
                        {r.reference}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 p-4 border-t border-black/5 dark:border-white/5">
                  <p className="text-[12px] text-black/40 dark:text-white/40">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[12px] font-semibold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <FloatingSupport />
    </SidebarInset>
  );
}
