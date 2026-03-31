import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ExternalLink, RefreshCw, Loader2, CheckCircle2, DollarSign, TrendingUp, FileText, Download, Users, Ban, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as XLSX from "xlsx";

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

  const copyPaymentLink = (paymentId: string) => {
    const link = `${window.location.origin}/pay/${paymentId}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard!");
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
      <Card
        key={payment.id}
        className={`p-6 glass-card border-0 shadow-[var(--shadow-medium)] transition-all duration-300 hover:shadow-[var(--shadow-strong)] animate-fade-in flex flex-col h-full ${payment.is_active === false ? 'opacity-75 grayscale-[0.3]' : ''}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground line-clamp-1">
              {payment.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Created {new Date(payment.created_at).toLocaleDateString()}
            </p>
          </div>
          {payment.is_active !== false ? (
            <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shrink-0 ml-2">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 shrink-0 ml-2">
              <Ban className="h-3 w-3" />
              Deleted
            </Badge>
          )}
        </div>

        {payment.description && (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {payment.description}
          </p>
        )}

        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              ₦{payment.amount.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              per transaction
            </span>
          </div>
        </div>

        <div className="mb-6 flex-1 rounded-xl bg-muted/50 p-4 border border-border/50">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-muted-foreground">Total Generated</span>
            <span className="font-semibold text-foreground">₦{linkRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Successful Payments</span>
            <span className="font-semibold text-foreground">{txns.length}</span>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          {payment.is_active !== false ? (
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => copyPaymentLink(payment.id)}
                variant="outline"
                className="flex-1 gap-2 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Copy Link</span>
                <span className="sm:hidden">Copy</span>
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="shrink-0 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    title="Show QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center">{payment.name} QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl mt-4">
                    <QRCodeSVG 
                      value={`${window.location.origin}/pay/${payment.id}`}
                      size={250}
                      level={"M"}
                      includeMargin={true}
                      className="shadow-sm rounded-lg"
                    />
                    <p className="mt-6 text-sm text-zinc-500 font-medium text-center">
                      Scan this code to go directly to the payment page.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => handleCancelLink(payment.id)}
                variant="ghost"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Cancel Payment Link"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              disabled
              className="w-full gap-2 opacity-50 cursor-not-allowed"
            >
              <Ban className="h-4 w-4" />
              Link Disabled
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <PremiumLoader message="Loading payments..." />
          </SidebarInset>
        </div>
        <FloatingSupport />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Standard Payments</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchPayments(true)}
                disabled={refreshing}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {canCreatePlans && (
                <Button
                  onClick={() => navigate("/payments/create")}
                  className="bg-accent hover:bg-accent/90 gap-2 text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Payment</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <div className="mb-6">
                <p className="text-sm sm:text-base text-muted-foreground">Manage and track your reusable standard payment links</p>
              </div>

              {/* Analytics Section */}
              <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleExport}
                        disabled={exporting || allTransactions.length === 0}
                        title="Export to Excel"
                      >
                        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">₦{totalCollected.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Across all payment links</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Successful payments</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Payment Links</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{totalPayments}</div>
                    <p className="text-xs text-muted-foreground">Links ready for payments</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Revenue / Link</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">₦{Math.round(avgRevenuePerLink).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Per standard payment link</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              {allTransactions.length > 0 && (
                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                  <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                    <CardHeader>
                      <CardTitle className="text-lg">Transaction Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip
                            formatter={(value: number) => [value, "Transactions"]}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {payments.length === 0 ? (
                <Card className="p-12 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      No payment links yet
                    </h3>
                    <p className="mb-6 text-muted-foreground">
                      Create your first reusable payment link to start collecting standard payments.
                    </p>
                    {canCreatePlans && (
                      <Button
                        onClick={() => navigate("/payments/create")}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Create Your First Payment Link
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {payments.map((payment, index) => renderPaymentCard(payment, index))}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
      <FloatingSupport />
    </SidebarProvider>
  );
};

export default OneTimePayments;