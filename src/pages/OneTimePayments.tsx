import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, RefreshCw, Loader2, CheckCircle2, DollarSign, TrendingUp, FileText, Download, Users, Ban, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as XLSX from "xlsx";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

interface PaymentTransaction {
  id: string;
  payment_id: string;
  amount: number;
  paid_at: string;
  payer_email: string;
  payer_name: string;
  paystack_reference: string;
}

interface Payment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  is_paid: boolean;
  is_active?: boolean;
  created_at: string;
  one_time_payment_transactions: PaymentTransaction[];
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

interface MonthlyData {
  month: string;
  revenue: number;
  count: number;
}

const OneTimePayments = () => {
  const navigate = useNavigate();
  const { canCreatePlans, role, canAccessSettings } = useOrgRole();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      let orgId = null;
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);
      if (!orgId) return;

      const { data: paymentsData, error } = await supabase
        .from("one_time_payments")
        .select(`
          *,
          one_time_payment_transactions(*)
        `)
        .eq("org_id", orgId)
        .neq("is_quick_payment", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        toast.error("Failed to load payments");
        return;
      }

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncMissingPayments = async () => {
    if (!organization) {
      fetchPayments(true); // Fallback to normal refresh
      return;
    }
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          action: "sync_one_time_payments",
          orgId: organization.id,
        },
      });

      if (error) {
        console.error("Sync error response:", error);
      } else if (data?.synced > 0) {
        toast.success(`Synced ${data.synced} missing standard payment${data.synced > 1 ? 's' : ''}!`);
      }
      
      // Always fetch latest data after sync attempt
      await fetchPayments(true);
    } catch (error) {
      console.error("Error syncing payments:", error);
      // Still try to refresh local data even if sync fails
      await fetchPayments(true);
    }
  };

  const copyPaymentLink = (paymentId: string) => {
    const link = `${window.location.origin}/pay/${paymentId}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied!");
  };

  const allTransactions = payments.flatMap(p => p.one_time_payment_transactions || []);
  const activePayments = payments.filter((p) => p.is_active !== false);

  // Analytics calculations
  const totalCollected = allTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = allTransactions.length;
  const totalPayments = activePayments.length;
  const avgRevenuePerLink = totalPayments > 0 ? (totalCollected / totalPayments) : 0;

  // Monthly revenue data for chart
  const getMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyMap.set(key, { revenue: 0, count: 0 });
    }

    // Aggregate paid transactions
    allTransactions.forEach((txn) => {
      if (txn.paid_at) {
        const date = new Date(txn.paid_at);
        const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (monthlyMap.has(key)) {
          const current = monthlyMap.get(key)!;
          monthlyMap.set(key, {
            revenue: current.revenue + txn.amount,
            count: current.count + 1,
          });
        }
      }
    });

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      count: data.count,
    }));
  };

  const monthlyData = getMonthlyData();

  // Export to Excel
  const handleExport = () => {
    setExporting(true);
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Filter transactions from this year
      const yearTransactions = allTransactions
        .filter((t) => t.paid_at && new Date(t.paid_at) >= startOfYear)
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

      // Monthly summary
      const monthlySummary: Record<string, { revenue: number; count: number }> = {};
      for (let i = 0; i <= now.getMonth(); i++) {
        const monthName = new Date(now.getFullYear(), i, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        monthlySummary[monthName] = { revenue: 0, count: 0 };
      }

      yearTransactions.forEach((txn) => {
        if (txn.paid_at) {
          const date = new Date(txn.paid_at);
          const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          if (monthlySummary[monthName]) {
            monthlySummary[monthName].revenue += txn.amount;
            monthlySummary[monthName].count += 1;
          }
        }
      });

      const summaryData = Object.entries(monthlySummary).map(([month, data]) => ({
        Month: month,
        "Total Revenue (₦)": data.revenue,
        "Transaction Count": data.count,
      }));

      const transactionsData = yearTransactions.map((t) => {
        const parentLink = payments.find(p => p.id === t.payment_id);
        return {
          "Payment Link Name": parentLink?.name || "Unknown",
          "Amount (₦)": t.amount,
          "Payer Name": t.payer_name || "N/A",
          "Payer Email": t.payer_email || "N/A",
          "Paid Date": new Date(t.paid_at).toLocaleDateString(),
          "Reference": t.paystack_reference,
        };
      });

      const wb = XLSX.utils.book_new();
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      const transactionsWs = XLSX.utils.json_to_sheet(transactionsData);

      XLSX.utils.book_append_sheet(wb, summaryWs, "Monthly Summary");
      XLSX.utils.book_append_sheet(wb, transactionsWs, "All Transactions");

      const fileName = `standard-payments-transactions-${now.getFullYear()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Export downloaded successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleCancelLink = async (paymentId: string) => {
    if (!window.confirm("Are you sure you want to cancel this payment link? Users will no longer be able to make payments.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("one_time_payments")
        .update({ is_active: false })
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Payment link cancelled successfully");
      fetchPayments(true);
    } catch (error) {
      console.error("Error cancelling link:", error);
      toast.error("Failed to cancel payment link");
    }
  };

  const renderPaymentCard = (payment: Payment, index: number) => {
    const txns = payment.one_time_payment_transactions || [];
    const linkRevenue = txns.reduce((sum, t) => sum + t.amount, 0);

    return (
      <div
        key={payment.id}
        className={`${card} p-5 flex flex-col h-full ${payment.is_active === false ? 'opacity-65 grayscale-[0.2]' : ''}`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[15px] font-semibold text-black dark:text-white truncate">
              {payment.name}
            </h3>
            <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">
              Created {new Date(payment.created_at).toLocaleDateString()}
            </p>
          </div>
          {payment.is_active !== false ? (
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/10 text-emerald-600 bg-emerald-500/5 text-[10px] font-semibold shrink-0">Active</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full border border-black/8 dark:border-white/8 text-[10px] text-black/40 dark:text-white/40 shrink-0">Cancelled</span>
          )}
        </div>

        {payment.description && (
          <p className="mb-4 text-[12px] text-black/40 dark:text-white/40 line-clamp-2 min-h-[36px] leading-relaxed">
            {payment.description}
          </p>
        )}

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-semibold text-black dark:text-white">
              ₦{payment.amount.toLocaleString()}
            </span>
            <span className="text-[11px] text-black/30 dark:text-white/30">
              per transaction
            </span>
          </div>
        </div>

        <div className="mb-5 flex-1 rounded-xl bg-black/[0.015] dark:bg-white/[0.02] p-3 border border-black/5 dark:border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-black/35 dark:text-white/35">Total Generated</span>
            <span className="font-semibold text-black dark:text-white">₦{linkRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-black/35 dark:text-white/35">Successful Payments</span>
            <span className="font-semibold text-black dark:text-white">{txns.length}</span>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          {payment.is_active !== false ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => copyPaymentLink(payment.id)}
                className="flex-1 px-3.5 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Copy Link
              </button>

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="p-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0 text-black/50 dark:text-white/50"
                    title="Show QR Code"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#1c1c1e] border-black/5 rounded-[16px]">
                  <DialogHeader>
                    <DialogTitle className="text-center text-[15px] font-semibold">{payment.name} QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl mt-4">
                    <QRCodeSVG 
                      value={`${window.location.origin}/pay/${payment.id}`}
                      size={200}
                      level={"M"}
                      includeMargin={true}
                      className="shadow-sm rounded-lg"
                    />
                    <p className="mt-4 text-[11px] text-black/40 font-medium text-center">
                      Scan this code to go directly to the payment page.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <button
                onClick={() => handleCancelLink(payment.id)}
                className="p-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0 text-black/40"
                title="Cancel Payment Link"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full px-3.5 py-1.5 rounded-full border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[11px] font-medium opacity-50 cursor-not-allowed text-black/30 flex items-center justify-center gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" /> Link Disabled
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Standard Payments</h1>
        </header>
        <PremiumLoader message="Loading payments..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  const tooltipStyle = {
    backgroundColor: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    fontFamily: APPLE_FONT,
    padding: "6px 12px",
  } as const;

  const axisStyle = {
    fontSize: 11,
    fill: "rgba(0,0,0,0.28)",
    fontFamily: APPLE_FONT,
  } as const;

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Standard Payments</h1>
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={syncMissingPayments} 
            disabled={refreshing} 
            className={pillBtn}
            title="Sync and Refresh"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          {organization && (
            <QuickCheckoutModal orgId={organization.id} />
          )}
          {canCreatePlans && (
            <button 
              onClick={() => navigate("/payments/create")} 
              className={pillBtn}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Payment
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">
          <div>
            <p className={sectionLabel}>Key Statistics</p>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              
              <div className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Total Collected</p>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-black/35 hover:text-black/60 transition-colors"
                      onClick={handleExport}
                      disabled={exporting || allTransactions.length === 0}
                      title="Export to Excel"
                    >
                      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                    <DollarSign className="h-3.5 w-3.5 text-black/30" />
                  </div>
                </div>
                <div>
                  <p className={statValue}>₦{totalCollected.toLocaleString()}</p>
                  <p className="text-[10px] text-black/30 mt-0.5">Across all links</p>
                </div>
              </div>

              <div className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Total Transactions</p>
                  <Users className="h-3.5 w-3.5 text-black/30" />
                </div>
                <div>
                  <p className={statValue}>{totalTransactions.toLocaleString()}</p>
                  <p className="text-[10px] text-black/30 mt-0.5">Successful payments</p>
                </div>
              </div>

              <div className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Active Links</p>
                  <FileText className="h-3.5 w-3.5 text-black/30" />
                </div>
                <div>
                  <p className={statValue}>{totalPayments}</p>
                  <p className="text-[10px] text-black/30 mt-0.5">Ready for payments</p>
                </div>
              </div>

              <div className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Avg Rev / Link</p>
                  <TrendingUp className="h-3.5 w-3.5 text-black/30" />
                </div>
                <div>
                  <p className={statValue}>₦{Math.round(avgRevenuePerLink).toLocaleString()}</p>
                  <p className="text-[10px] text-black/30 mt-0.5">Per standard link</p>
                </div>
              </div>

            </div>
          </div>

          {/* Charts Section */}
          {allTransactions.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={card}>
                <div className="py-3 px-5 border-b border-black/5 dark:border-white/5">
                  <p className="text-[13px] font-semibold text-black dark:text-white">Revenue Trend</p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={monthlyData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`} width={48} />
                      <Tooltip
                        formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                        contentStyle={tooltipStyle}
                        cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "rgba(0,0,0,0.6)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={card}>
                <div className="py-3 px-5 border-b border-black/5 dark:border-white/5">
                  <p className="text-[13px] font-semibold text-black dark:text-white">Transaction Volume</p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} allowDecimals={false} width={30} />
                      <Tooltip
                        formatter={(value: number) => [value, "Transactions"]}
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'rgba(0,0,0,0.015)' }}
                      />
                      <Bar dataKey="count" fill="rgba(0,0,0,0.4)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {payments.length === 0 ? (
            <div className={`${card} p-12 text-center`}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/8">
                <Plus className="h-6 w-6 text-black/40" />
              </div>
              <h3 className="mb-1 text-[14px] font-semibold text-black dark:text-white">
                No payment links yet
              </h3>
              <p className="mb-6 text-[12px] text-black/35 max-w-xs mx-auto">
                Create your first reusable payment link to start collecting standard payments.
              </p>
              {canCreatePlans && (
                <button
                  onClick={() => navigate("/payments/create")}
                  className={pillBtn + " mx-auto"}
                >
                  Create Your First Payment Link
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {payments.map((payment, index) => renderPaymentCard(payment, index))}
            </div>
          )}
        </div>
      </main>
      <FloatingSupport />
    </SidebarInset>
  );
};

function QuickCheckoutModal({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "qr" | "success">("form");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("RECURRA CHECKOUT");
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === "qr" && paymentId) {
      // Setup Realtime listener as primary
      const channel = supabase
        .channel(`transactions-${paymentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "one_time_payment_transactions",
            filter: `payment_id=eq.${paymentId}`,
          },
          () => {
            handleSuccess();
          }
        )
        .subscribe();
      
      // Setup Polling as fallback
      const checkPayment = async () => {
        const { data } = await supabase
          .from("one_time_payment_transactions")
          .select("id")
          .eq("payment_id", paymentId)
          .maybeSingle();
          
        if (data) {
          handleSuccess();
        }
      };

      const handleSuccess = () => {
        if (step !== "success") {
          setStep("success");
          clearInterval(intervalId);
          supabase.removeChannel(channel);
          setTimeout(() => {
            setOpen(false);
          }, 3000); // Close after 3 seconds
        }
      };

      intervalId = setInterval(checkPayment, 3000);
      checkPayment(); // Initial check
      
      return () => {
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      };
    }
  }, [step, paymentId]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep("form");
        setAmount("");
        setDescription("RECURRA CHECKOUT");
        setPaymentId(null);
      }, 300);
    }
    setOpen(newOpen);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No user");
      
      const { data, error } = await supabase
        .from("one_time_payments")
        .insert({
          org_id: orgId,
          name: "Quick Checkout",
          description: description,
          amount: Number(amount),
          currency: "NGN",
          is_quick_payment: true,
          created_by: user.user.id
        })
        .select()
        .single();
        
      if (error) throw error;
      setPaymentId(data.id);
      setStep("qr");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className={pillBtn}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Quick Checkout
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1c1c1e] border-black/5 rounded-[16px]" style={{ fontFamily: APPLE_FONT }}>
        <DialogHeader>
          <DialogTitle className="text-center text-[15px] font-semibold text-black dark:text-white">
            {step === "form" ? "Quick Checkout" : step === "qr" ? "Scan to Pay" : "Payment Successful"}
          </DialogTitle>
        </DialogHeader>
        
        {step === "form" && (
          <form onSubmit={handleGenerate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wider">Amount (₦)</label>
              <input 
                type="number"
                min="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-9 w-full px-3 text-[13px] bg-[#f5f5f7] dark:bg-[#000] border-none rounded-[8px] focus:outline-none focus:ring-1 focus:ring-black/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wider">Description (Optional)</label>
              <input 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="RECURRA CHECKOUT"
                className="h-9 w-full px-3 text-[13px] bg-[#f5f5f7] dark:bg-[#000] border-none rounded-[8px] focus:outline-none focus:ring-1 focus:ring-black/10"
              />
            </div>
            <button type="submit" className={pillBtn + " w-full h-9 justify-center mt-2"} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Checkout"}
            </button>
          </form>
        )}
        
        {step === "qr" && paymentId && (
          <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1c1c1e] rounded-xl mt-4">
            <QRCodeSVG 
              value={`${window.location.origin}/pay/${paymentId}`}
              size={200}
              level={"M"}
              includeMargin={true}
              className="shadow-sm rounded-lg"
            />
            <p className="mt-4 text-[12px] text-black/50 dark:text-white/50 font-semibold animate-pulse flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for payment...
            </p>
          </div>
        )}
        
        {step === "success" && (
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 rounded-xl mt-4 border border-emerald-500/10">
            <div className="h-14 w-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-[15px] font-semibold text-emerald-600 mb-1">Payment Received!</h3>
            <p className="text-[11px] text-emerald-600/60 font-medium">Closing automatically...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OneTimePayments;