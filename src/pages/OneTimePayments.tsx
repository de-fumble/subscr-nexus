import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ExternalLink, RefreshCw, Loader2, CheckCircle2, Clock, DollarSign, TrendingUp, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as XLSX from "xlsx";

interface Payment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  is_paid: boolean;
  paid_at: string | null;
  paid_by_email: string | null;
  paid_by_name: string | null;
  created_at: string;
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
        .select("*")
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

  const pendingPayments = payments.filter(p => !p.is_paid);
  const paidPayments = payments.filter(p => p.is_paid);

  // Analytics calculations
  const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPayments = payments.length;
  const conversionRate = totalPayments > 0 ? ((paidPayments.length / totalPayments) * 100).toFixed(1) : "0";

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

    // Aggregate paid payments
    paidPayments.forEach((payment) => {
      if (payment.paid_at) {
        const date = new Date(payment.paid_at);
        const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (monthlyMap.has(key)) {
          const current = monthlyMap.get(key)!;
          monthlyMap.set(key, {
            revenue: current.revenue + payment.amount,
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

      // Filter payments from this year
      const yearPayments = paidPayments.filter((p) => {
        if (!p.paid_at) return false;
        return new Date(p.paid_at) >= startOfYear;
      });

      // Monthly summary
      const monthlySummary: Record<string, { revenue: number; count: number }> = {};
      for (let i = 0; i <= now.getMonth(); i++) {
        const monthName = new Date(now.getFullYear(), i, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        monthlySummary[monthName] = { revenue: 0, count: 0 };
      }

      yearPayments.forEach((payment) => {
        if (payment.paid_at) {
          const date = new Date(payment.paid_at);
          const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          if (monthlySummary[monthName]) {
            monthlySummary[monthName].revenue += payment.amount;
            monthlySummary[monthName].count += 1;
          }
        }
      });

      const summaryData = Object.entries(monthlySummary).map(([month, data]) => ({
        Month: month,
        "Total Revenue (₦)": data.revenue,
        "Payment Count": data.count,
      }));

      const transactionsData = yearPayments.map((p) => ({
        "Payment Name": p.name,
        "Amount (₦)": p.amount,
        "Payer Name": p.paid_by_name || "N/A",
        "Payer Email": p.paid_by_email || "N/A",
        "Paid Date": p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "N/A",
        "Created Date": new Date(p.created_at).toLocaleDateString(),
      }));

      const wb = XLSX.utils.book_new();
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      const transactionsWs = XLSX.utils.json_to_sheet(transactionsData);

      XLSX.utils.book_append_sheet(wb, summaryWs, "Monthly Summary");
      XLSX.utils.book_append_sheet(wb, transactionsWs, "All Transactions");

      const fileName = `one-time-payments-${now.getFullYear()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Export downloaded successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const renderPaymentCard = (payment: Payment, index: number) => (
    <Card
      key={payment.id}
      className="p-6 glass-card border-0 shadow-[var(--shadow-medium)] transition-all duration-300 hover:shadow-[var(--shadow-strong)] animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">
            {payment.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Created {new Date(payment.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={payment.is_paid ? "default" : "secondary"} className="gap-1">
          {payment.is_paid ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          )}
        </Badge>
      </div>

      {payment.description && (
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {payment.description}
        </p>
      )}

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            ₦{payment.amount.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            one-time
          </span>
        </div>
      </div>

      {payment.is_paid && payment.paid_by_email && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-muted-foreground">
            Paid by: <span className="text-foreground font-medium">{payment.paid_by_name || payment.paid_by_email}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {payment.paid_at && new Date(payment.paid_at).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={() => copyPaymentLink(payment.id)}
          variant="outline"
          className="w-full gap-2"
          disabled={payment.is_paid}
          title={payment.is_paid ? "This payment has been completed" : "Copy payment link"}
        >
          <ExternalLink className="h-4 w-4" />
          {payment.is_paid ? "Payment Completed" : "Copy Payment Link"}
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <PremiumLoader message="Loading payments..." />
          </SidebarInset>
        </div>
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
                <p className="text-sm sm:text-base text-muted-foreground">Manage standard payment links</p>
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
                        disabled={exporting || paidPayments.length === 0}
                        title="Export to Excel"
                      >
                        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">₦{totalCollected.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{paidPayments.length} payments received</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">₦{totalPending.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{pendingPayments.length} awaiting payment</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Payment Links</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{totalPayments}</div>
                    <p className="text-xs text-muted-foreground">Links created</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">Paid vs created</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              {paidPayments.length > 0 && (
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
                      <CardTitle className="text-lg">Payments per Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip
                            formatter={(value: number) => [value, "Payments"]}
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
                      No payments yet
                    </h3>
                    <p className="mb-6 text-muted-foreground">
                      Create your first one-time payment link
                    </p>
                    {canCreatePlans && (
                      <Button
                        onClick={() => navigate("/payments/create")}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Create Your First Payment
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Tabs defaultValue="pending" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                      Pending
                      <Badge variant="secondary" className="ml-1">{pendingPayments.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="paid" className="gap-2">
                      Paid
                      <Badge variant="secondary" className="ml-1">{paidPayments.length}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending">
                    {pendingPayments.length === 0 ? (
                      <Card className="p-8 glass-card border-0">
                        <div className="text-center text-muted-foreground">
                          <p>No pending payments</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pendingPayments.map((payment, index) => renderPaymentCard(payment, index))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paid">
                    {paidPayments.length === 0 ? (
                      <Card className="p-8 glass-card border-0">
                        <div className="text-center text-muted-foreground">
                          <p>No paid payments yet</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {paidPayments.map((payment, index) => renderPaymentCard(payment, index))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default OneTimePayments;