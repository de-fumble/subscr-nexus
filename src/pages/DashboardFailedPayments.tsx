import { useState, useEffect, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
  ArrowLeft
} from "lucide-react";
import * as XLSX from "xlsx";

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
  }, [failedPayments, statusFilter, searchName, searchReference, dateFrom, dateTo]);

  const failedCount = useMemo(() => failedPayments.filter(p => p.status === "failed").length, [failedPayments]);
  const abandonedCount = useMemo(() => failedPayments.filter(p => p.status === "abandoned").length, [failedPayments]);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchName("");
    setSearchReference("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = statusFilter !== "all" || searchName || searchReference || dateFrom || dateTo;

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
    return <PremiumLoader message="Loading failed payments..." />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar 
          organization={organization} 
          role={role} 
          userEmail={userEmail}
          canAccessSettings={canAccessSettings}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Failed Payments
              </h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPayments.map((payment) => (
                    <Card
                      key={payment.id}
                      className="p-4 glass-card border border-destructive/20 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{payment.customer_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{payment.email}</p>
                          </div>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>

                      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start gap-2">
                          {getFailureIcon(payment.failure_reason || "")}
                          <div>
                            <p className="text-sm font-medium text-destructive">Failure Reason</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {payment.failure_reason || "Unknown error"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Plan</p>
                          <p className="font-medium">{payment.plan_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium">₦{payment.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed On</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(payment.failed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reference</p>
                          <p className="font-mono text-xs truncate">{payment.reference}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardFailedPayments;
