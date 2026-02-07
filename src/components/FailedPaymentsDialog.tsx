import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, User, CreditCard, Calendar, AlertCircle, Search, X, Download } from "lucide-react";
import { toast } from "sonner";
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

interface FailedPaymentsDialogProps {
  children: React.ReactNode;
}

export function FailedPaymentsDialog({ children }: FailedPaymentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "abandoned">("all");
  const [searchName, setSearchName] = useState("");
  const [searchReference, setSearchReference] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchFailedPayments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get organization with Paystack keys
      let org = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, paystack_secret_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        org = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, paystack_secret_key")
            .eq("id", membership.org_id)
            .maybeSingle();
          org = memberOrg;
        }
      }

      if (!org?.paystack_secret_key) {
        toast.error("Paystack keys not configured");
        return;
      }

      // Fetch failed transactions directly from Paystack
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
        amount: txn.amount / 100, // Convert from kobo to naira
        plan_name: txn.plan?.name || txn.metadata?.plan_name || "Standard Payment",
        failure_reason: txn.gateway_response || txn.message || getDefaultFailureReason(txn.status, 0),
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
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine failure reason based on status
  const getDefaultFailureReason = (status: string, retryCount: number): string => {
    if (status === "abandoned") return "Customer abandoned checkout";
    if (status === "failed") return "Payment failed - Card declined or insufficient funds";
    if (status === "cancelled") return "Subscription cancelled by user";
    if (status === "non_renewing") return "Subscription set to not renew";
    if (retryCount >= 3) return "Maximum retry attempts reached - Card declined";
    if (retryCount > 0) return "Payment failed - Insufficient funds or card issue";
    return "Payment failed - Unknown reason";
  };

  useEffect(() => {
    if (open) {
      fetchFailedPayments();
    } else {
      // Reset filters when dialog closes
      setStatusFilter("all");
      setSearchName("");
      setSearchReference("");
      setDateFrom("");
      setDateTo("");
    }
  }, [open]);

  const filteredPayments = useMemo(() => {
    return failedPayments.filter((payment) => {
      // Filter by status (failed vs abandoned)
      if (statusFilter === "failed" && payment.status !== "failed") return false;
      if (statusFilter === "abandoned" && payment.status !== "abandoned") return false;

      // Filter by name/email
      if (searchName) {
        const nameMatch = payment.customer_name?.toLowerCase().includes(searchName.toLowerCase());
        const emailMatch = payment.email.toLowerCase().includes(searchName.toLowerCase());
        if (!nameMatch && !emailMatch) return false;
      }

      // Filter by reference
      if (searchReference) {
        if (!payment.reference.toLowerCase().includes(searchReference.toLowerCase())) return false;
      }

      // Filter by date range
      if (dateFrom) {
        const paymentDate = new Date(payment.failed_at);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) return false;
      }

      if (dateTo) {
        const paymentDate = new Date(payment.failed_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
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
      // Prepare data for export
      const exportData = filteredPayments.map((payment) => ({
        "Customer Name": payment.customer_name || "Unknown",
        "Email": payment.email,
        "Amount (₦)": payment.amount,
        "Plan": payment.plan_name,
        "Status": payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
        "Failure Reason": payment.failure_reason || "Unknown",
        "Failed Date": new Date(payment.failed_at).toLocaleDateString(),
        "Failed Time": new Date(payment.failed_at).toLocaleTimeString(),
        "Retry Attempts": payment.retry_count,
        "Last Retry": payment.last_retry_at ? new Date(payment.last_retry_at).toLocaleString() : "N/A",
        "Reference": payment.reference,
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // Customer Name
        { wch: 30 }, // Email
        { wch: 12 }, // Amount
        { wch: 20 }, // Plan
        { wch: 12 }, // Status
        { wch: 40 }, // Failure Reason
        { wch: 12 }, // Failed Date
        { wch: 12 }, // Failed Time
        { wch: 14 }, // Retry Attempts
        { wch: 20 }, // Last Retry
        { wch: 25 }, // Reference
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Failed Payments");

      // Generate filename with date and filter info
      const filterLabel = statusFilter === "all" ? "all" : statusFilter;
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `failed-payments-${filterLabel}-${dateStr}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredPayments.length} payment(s) to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export payments");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string, retryCount: number) => {
    if (status === "abandoned") {
      return <Badge variant="secondary">Abandoned</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (status === "non_renewing") {
      return <Badge variant="secondary">Non-Renewing</Badge>;
    }
    if (retryCount >= 3) {
      return <Badge variant="destructive">Max Retries</Badge>;
    }
    return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Retry {retryCount}/3</Badge>;
  }

  const getFailureIcon = (reason: string) => {
    if (reason.toLowerCase().includes("insufficient")) {
      return <CreditCard className="h-4 w-4 text-destructive" />;
    }
    if (reason.toLowerCase().includes("cancelled")) {
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Failed Payments
          </DialogTitle>
          <DialogDescription>
            View subscribers with failed payment attempts and the reasons for each failure
          </DialogDescription>
        </DialogHeader>

        {/* Quick Status Filters */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="gap-1"
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

        {/* Filters */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="searchName" className="text-xs text-muted-foreground">Name / Email</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchName"
                  placeholder="Search by name or email..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="searchRef" className="text-xs text-muted-foreground">Reference</Label>
              <Input
                id="searchRef"
                placeholder="Search by reference..."
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {failedPayments.length} payments
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8">
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            disabled={loading || exporting || filteredPayments.length === 0}
            className="gap-2"
          >
            <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
            Export to Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFailedPayments}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : failedPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Failed Payments</h4>
              <p className="text-sm text-muted-foreground">
                All your subscribers' payments are up to date
              </p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Matching Payments</h4>
              <p className="text-sm text-muted-foreground">
                No failed payments match your filters
              </p>
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 rounded-xl glass-card border border-destructive/20 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.customer_name || "Unknown Customer"}
                        </p>
                        <p className="text-sm text-muted-foreground">{payment.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(payment.status, payment.retry_count)}
                  </div>

                  {/* Failure Reason - Highlighted */}
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="flex items-start gap-2">
                      {getFailureIcon(payment.failure_reason || "")}
                      <div>
                        <p className="text-sm font-medium text-destructive">Failure Reason</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {payment.failure_reason || "Unknown error occurred"}
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
                      <p className="text-muted-foreground">Retry Attempts</p>
                      <p className="font-medium">{payment.retry_count} / 3</p>
                    </div>
                  </div>

                  {payment.last_retry_at && (
                    <p className="text-xs text-muted-foreground">
                      Last retry: {new Date(payment.last_retry_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
