import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Banknote, Zap, Search, X, Download,
  ChevronLeft, ChevronRight, ArrowUpRight, TrendingUp,
  Loader2, RefreshCw, ListFilter,
} from "lucide-react";
import { getDashboardDataSource } from "@/lib/dataSource";
import { useOrgRole } from "@/hooks/useOrgRole";
import { PremiumLoader } from "@/components/PremiumLoader";
import { APPLE_FONT, card, sectionLabel, statValue, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

const PAGE_SIZE = 25;

type TxType = "subscription" | "one_time" | "quick_checkout";

interface UnifiedTransaction {
  id: string;
  date: string;
  amount: number;            // always Naira
  label: string;             // plan / payment name
  payer_name: string | null;
  payer_email: string;
  reference: string;
  type: TxType;
  status: "success" | "Successful" | string;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const TYPE_META: Record<TxType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  subscription:   { label: "Subscription",    icon: CreditCard, color: "text-black/50 dark:text-white/50",    bg: "bg-black/5 dark:bg-white/8"   },
  one_time:       { label: "Standard Payment", icon: Banknote,   color: "text-black/50 dark:text-white/50", bg: "bg-black/5 dark:bg-white/8"},
  quick_checkout: { label: "Quick Checkout",   icon: Zap,        color: "text-black/50 dark:text-white/50",  bg: "bg-black/5 dark:bg-white/8" },
};

function TypeBadge({ type }: { type: TxType }) {
  const m = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.color} ${m.bg}`}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

export default function DashboardAllTransactions() {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { boot(); }, []);

  const boot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email);

      let orgId: string | null = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
        setOrganization(ownedOrg);
      } else {
        const { data: mem } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (mem) {
          orgId = mem.org_id;
          const { data: memOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", orgId)
            .maybeSingle();
          setOrganization(memOrg);
        }
      }

      if (!orgId) {
        setLoading(false);
        return;
      }

      await fetchTransactions(orgId, false);
    } catch {
      toast.error("Boot failed");
      setLoading(false);
    }
  };

  const fetchTransactions = async (orgId: string, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          action: "export_transactions",
          orgId,
          dataSource: getDashboardDataSource(),
        },
      });

      if (error) throw error;

      const raw = (data as any)?.transactions;
      const rows = Array.isArray(raw) ? raw : [];

      const mapped: UnifiedTransaction[] = rows.map((txn, index) => {
        const rawType = String(txn.type || "").toLowerCase();
        let type: TxType = "subscription";
        if (rawType.includes("one")) {
          type = "one_time";
        } else if (rawType.includes("quick")) {
          type = "quick_checkout";
        }

        return {
          id: String(txn.reference || txn.id || index),
          date: txn.paid_at || txn.created_at || new Date().toISOString(),
          amount: Number(txn.amount) || 0,
          label: txn.plan_name || (type === "one_time" ? "Standard Payment" : type === "quick_checkout" ? "Quick Checkout" : "Unknown Plan"),
          payer_name: txn.customer_name || null,
          payer_email: txn.email || "Unknown",
          reference: txn.reference || "N/A",
          type,
          status: txn.status || "success",
        };
      });

      setTransactions(mapped);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (organization) {
      fetchTransactions(organization.id, true);
    }
  };

  // ── Filters logic ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...transactions];

    if (typeFilter !== "all") {
      list = list.filter(tx => tx.type === typeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(tx => {
        const name = (tx.payer_name || "").toLowerCase();
        const email = tx.payer_email.toLowerCase();
        const ref = tx.reference.toLowerCase();
        const lbl = tx.label.toLowerCase();
        return name.includes(q) || email.includes(q) || ref.includes(q) || lbl.includes(q);
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(tx => new Date(tx.date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(tx => new Date(tx.date) <= to);
    }

    return list;
  }, [transactions, search, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, typeFilter, dateFrom, dateTo]);

  const hasFilters = search || typeFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Stats
  const { totalAmount, countByType } = useMemo(() => {
    let sum = 0;
    const counts: Record<TxType, number> = { subscription: 0, one_time: 0, quick_checkout: 0 };
    filtered.forEach(tx => {
      sum += tx.amount;
      counts[tx.type] = (counts[tx.type] || 0) + 1;
    });
    return { totalAmount: sum, countByType: counts };
  }, [filtered]);

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExport = () => {
    setExporting(true);
    try {
      let csv = "Date,Type,Label,Payer Name,Payer Email,Amount,Reference\n";
      filtered.forEach(tx => {
        const row = [
          new Date(tx.date).toLocaleDateString(),
          tx.type,
          `"${tx.label.replace(/"/g, '""')}"`,
          `"${(tx.payer_name || "").replace(/"/g, '""')}"`,
          tx.payer_email,
          tx.amount,
          tx.reference,
        ];
        csv += row.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} transactions`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  if (loading) {
    return <PremiumLoader message="Loading transactions..." />;
  }

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">All Transactions</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className={pillBtn}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting || !filtered.length} className={pillBtn}>
            <Download className={`w-3 h-3 ${exporting ? 'animate-pulse' : ''}`} /> Export
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-5 bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1.5">Total Volume</p>
                <p className={statValue}>₦{totalAmount.toLocaleString()}</p>
                <p className="text-[11px] text-black/25 dark:text-white/25 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {filtered.length} transactions
                </p>
              </div>
              {(["subscription", "one_time", "quick_checkout"] as TxType[]).map(type => {
                const m = TYPE_META[type];
                const count = countByType[type];
                return (
                  <div key={type} className={`${card} px-5 py-4 flex flex-col justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-px transition-all duration-200 cursor-pointer`}
                    onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">{m.label}</p>
                      <div className={`h-6 w-6 rounded-lg ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                      </div>
                    </div>
                    <p className={statValue}>{count}</p>
                    <p className="text-[11px] text-black/25 dark:text-white/25 mt-1">transactions</p>
                  </div>
                );
              })}
            </div>

            {/* Filter bar */}
            <div className={`${card} p-5`}>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <input
                    placeholder="Search name, email, reference…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 w-full text-[13px] bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-8 w-44 text-[12px] bg-[#f5f5f7] dark:bg-[#000] border-none rounded-[8px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one_time">Standard Payment</SelectItem>
                    <SelectItem value="quick_checkout">Quick Checkout</SelectItem>
                  </SelectContent>
                </Select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-[12px] px-3 bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-[12px] px-3 bg-[#f5f5f7] dark:bg-[#000] rounded-[8px] border-none focus:outline-none focus:ring-1 focus:ring-black/10" />
                {hasFilters && (
                  <button onClick={clearFilters} className="text-[11px] font-medium text-black/45 dark:text-white/45 h-8 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              {hasFilters && (
                <p className="text-[11px] text-black/30 dark:text-white/30 mt-3">
                  Showing <strong>{filtered.length}</strong> of <strong>{transactions.length}</strong> transactions
                </p>
              )}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className={`${card} p-12 text-center`}>
                <ListFilter className="h-8 w-8 text-black/30 dark:text-white/30 mx-auto mb-3" />
                <p className="font-semibold text-xs text-black dark:text-white">{hasFilters ? "No matching transactions" : "No transactions yet"}</p>
                <p className="text-[11px] text-black/30 mt-1">{hasFilters ? "Try adjusting your filters." : "Transactions will appear here once payments come in."}</p>
                {hasFilters && <button onClick={clearFilters} className="mt-4 text-[11px] font-medium text-black/50 underline">Clear filters</button>}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className={`${card} hidden md:block overflow-hidden`}>
                  <div className="overflow-auto max-h-[calc(100vh-18rem)]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <th className={thCell}>Date & Time</th>
                          <th className={thCell}>Type</th>
                          <th className={thCell}>Label</th>
                          <th className={thCell}>Payer</th>
                          <th className={`${thCell} text-right`}>Amount</th>
                          <th className={thCell}>Reference</th>
                        </tr>
                      </thead>
                      <tbody className={tableDivider}>
                        {paginated.map(tx => (
                          <tr key={tx.id} className={trRow}>
                            <td className={`${tdCell} text-[12px] text-black/40 dark:text-white/40 whitespace-nowrap`}>
                              <div>{new Date(tx.date).toLocaleDateString()}</div>
                              <div className="text-[10px] opacity-70">{new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </td>
                            <td className={tdCell}><TypeBadge type={tx.type} /></td>
                            <td className={`${tdCell} font-semibold text-[13px] text-black dark:text-white max-w-[180px] truncate`} title={tx.label}>{tx.label}</td>
                            <td className={tdCell}>
                              <div className="text-[13px] font-medium text-black dark:text-white">{tx.payer_name || "—"}</div>
                              <div className="text-[11px] text-black/35 dark:text-white/35 truncate max-w-[180px]">{tx.payer_email}</div>
                            </td>
                            <td className={`${tdCell} text-right`}>
                              <span className="font-semibold text-[13px] text-black dark:text-white flex items-center justify-end gap-0.5">
                                <ArrowUpRight className="h-3 w-3 text-black/30" />
                                ₦{tx.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className={`${tdCell} font-mono text-[11px] text-black/35 dark:text-white/35`}>{tx.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className={`md:hidden ${tableDivider} ${card} overflow-hidden`}>
                  {paginated.map(tx => (
                    <div key={tx.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-[13px] text-black dark:text-white">{tx.label}</p>
                          <p className="text-[11px] text-black/35 dark:text-white/35">{tx.payer_name || tx.payer_email}</p>
                        </div>
                        <span className="font-semibold text-black dark:text-white text-[13px] shrink-0">
                          ₦{tx.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={tx.type} />
                        <span className="text-[10px] text-black/30 dark:text-white/30">{new Date(tx.date).toLocaleString()}</span>
                      </div>
                      <p className="font-mono text-[10px] text-black/35 dark:text-white/35 truncate">{tx.reference}</p>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[12px] text-black/40">
                      Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center justify-center p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`e-${i}`} className="text-[11px] px-1 text-black/30">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setPage(p as number)}
                              className={`h-7 w-7 rounded-full text-[11px] font-semibold transition-all ${
                                page === p
                                  ? "bg-black dark:bg-white text-white dark:text-black"
                                  : "hover:bg-black/5 dark:hover:bg-white/5 text-black/50"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center justify-center p-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
      </main>
      <FloatingSupport />
    </SidebarInset>
  );
}
