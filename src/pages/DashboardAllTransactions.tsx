import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// CSV export — no extra dependency needed
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Banknote, Zap, Search, X, Download,
  ChevronLeft, ChevronRight, ArrowUpRight, TrendingUp,
  Loader2, RefreshCw, ListFilter,
} from "lucide-react";
import { getDashboardDataSource } from "@/lib/dataSource";


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
  subscription:   { label: "Subscription",    icon: CreditCard, color: "text-blue-500",    bg: "bg-blue-500/10"   },
  one_time:       { label: "Standard Payment", icon: Banknote,   color: "text-emerald-500", bg: "bg-emerald-500/10"},
  quick_checkout: { label: "Quick Checkout",   icon: Zap,        color: "text-violet-500",  bg: "bg-violet-500/10" },
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
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", orgId)
            .maybeSingle();
          if (staffOrg) setOrganization(staffOrg);
        }
      }

      if (!orgId) { navigate("/auth"); return; }
      await fetchAll(orgId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async (orgId: string) => {
    const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
      body: {
        action: "export_transactions",
        orgId,
        dataSource: getDashboardDataSource(),
      },
    });
    if (error) throw error;

    const rows = Array.isArray((data as any)?.transactions) ? (data as any).transactions : [];
    const unified: UnifiedTransaction[] = rows.map((tx: any, index: number) => {
      const rawType = String(tx.type || "").toLowerCase();
      const isOneTime = rawType.includes("one-time") || rawType.includes("one_time") || rawType.includes("standard");
      return {
        id: String(tx.reference || tx.id || index),
        date: tx.paid_at || tx.created_at || new Date().toISOString(),
        amount: Number(tx.amount) || 0,
        label: tx.plan_name || "Unknown",
        payer_name: tx.customer_name || null,
        payer_email: tx.email || "Unknown",
        reference: tx.reference || "N/A",
        type: isOneTime ? "one_time" : "subscription",
        status: tx.status || "success",
      };
    });

    // Sort newest first
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(unified);
  };

  const handleRefresh = async () => {
    if (!organization) return;
    setRefreshing(true);
    setPage(1);
    try { await fetchAll(organization.id); toast.success("Transactions refreshed"); }
    catch { toast.error("Refresh failed"); }
    finally { setRefreshing(false); }
  };

  // ── Derived / filtered ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (dateFrom && new Date(tx.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(tx.date) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !tx.payer_email.toLowerCase().includes(q) &&
          !(tx.payer_name?.toLowerCase().includes(q)) &&
          !tx.label.toLowerCase().includes(q) &&
          !tx.reference.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [typeFilter, dateFrom, dateTo, search]);

  const hasFilters = typeFilter !== "all" || dateFrom || dateTo || search;
  const clearFilters = () => { setTypeFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); };

  // Summary stats
  const totalAmount = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);
  const countByType = useMemo(() => ({
    subscription: transactions.filter(t => t.type === "subscription").length,
    one_time: transactions.filter(t => t.type === "one_time").length,
    quick_checkout: transactions.filter(t => t.type === "quick_checkout").length,
  }), [transactions]);

  // Export
  const handleExport = () => {
    if (!filtered.length) { toast.error("Nothing to export"); return; }
    setExporting(true);
    try {
      const header = ["Date", "Type", "Label", "Payer Name", "Payer Email", "Amount (₦)", "Reference", "Status"];
      const rows = filtered.map(tx => [
        new Date(tx.date).toLocaleString(),
        TYPE_META[tx.type].label,
        tx.label,
        tx.payer_name || "—",
        tx.payer_email,
        tx.amount.toFixed(2),
        tx.reference,
        tx.status,
      ]);
      const csv = [header, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
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

  // ── Skeleton ────────────────────────────────────────────────────────────
  if (loading) {
    return <PremiumLoader message="Loading transactions..." />;
  }

  return (
            <SidebarInset className="flex-1 flex flex-col">

          {/* Sticky Header */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-4">
            <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <ListFilter className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-semibold tracking-tight">All Transactions</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 h-8 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !filtered.length} className="gap-1.5 h-8 text-xs">
                <Download className={`h-3.5 w-3.5 ${exporting ? "animate-pulse" : ""}`} />
                Export
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card border-border/50 p-4 hover-lift">
                <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                <p className="text-xl font-bold tracking-tight">₦{totalAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {filtered.length} transactions
                </p>
              </Card>
              {(["subscription", "one_time", "quick_checkout"] as TxType[]).map(type => {
                const m = TYPE_META[type];
                const count = countByType[type];
                return (
                  <Card key={type} className="glass-card border-border/50 p-4 hover-lift cursor-pointer"
                    onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <div className={`h-6 w-6 rounded-lg ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground mt-1">transactions</p>
                  </Card>
                );
              })}
            </div>

            {/* Filter bar */}
            <Card className="glass-card border-border/50 p-3 sm:p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, reference…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one_time">Standard Payment</SelectItem>
                    <SelectItem value="quick_checkout">Quick Checkout</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9 text-xs">
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
              {hasFilters && (
                <p className="text-xs text-muted-foreground mt-3">
                  Showing <strong>{filtered.length}</strong> of <strong>{transactions.length}</strong> transactions
                </p>
              )}
            </Card>

            {/* Table */}
            {filtered.length === 0 ? (
              <Card className="glass-card border-border/50 p-12 text-center">
                <ListFilter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">{hasFilters ? "No matching transactions" : "No transactions yet"}</p>
                <p className="text-sm text-muted-foreground mt-1">{hasFilters ? "Try adjusting your filters." : "Transactions will appear here once payments come in."}</p>
                {hasFilters && <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">Clear filters</Button>}
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <Card className="glass-card border-border/50 hidden md:block overflow-hidden">
                  <div className="overflow-auto max-h-[calc(100vh-18rem)]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <TableRow className="border-border/30">
                          <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                          <TableHead className="text-xs font-semibold">Type</TableHead>
                          <TableHead className="text-xs font-semibold">Label</TableHead>
                          <TableHead className="text-xs font-semibold">Payer</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                          <TableHead className="text-xs font-semibold">Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map(tx => (
                          <TableRow key={tx.id} className="hover:bg-muted/20 border-border/20 transition-colors group">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              <div>{new Date(tx.date).toLocaleDateString()}</div>
                              <div className="text-[10px] opacity-70">{new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </TableCell>
                            <TableCell><TypeBadge type={tx.type} /></TableCell>
                            <TableCell className="font-medium text-sm max-w-[180px] truncate" title={tx.label}>{tx.label}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{tx.payer_name || "—"}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{tx.payer_email}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                                <ArrowUpRight className="h-3 w-3" />
                                ₦{tx.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground">{tx.reference}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {paginated.map(tx => (
                    <Card key={tx.id} className="glass-card border-border/40 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{tx.label}</p>
                          <p className="text-xs text-muted-foreground">{tx.payer_name || tx.payer_email}</p>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                          ₦{tx.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={tx.type} />
                        <span className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleString()}</span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{tx.reference}</p>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                      Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`e-${i}`} className="text-xs px-1 text-muted-foreground">…</span>
                          ) : (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(p as number)}
                              className="h-8 w-8 p-0 text-xs"
                            >
                              {p}
                            </Button>
                          )
                        )}
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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
