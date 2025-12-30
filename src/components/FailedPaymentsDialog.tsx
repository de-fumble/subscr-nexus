import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, User, CreditCard, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);

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
        plan_name: txn.plan?.name || txn.metadata?.plan_name || "One Time Payment",
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
    }
  }, [open]);

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

        <div className="flex justify-end mb-4">
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

        <ScrollArea className="h-[400px] pr-4">
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
          ) : (
            <div className="space-y-4">
              {failedPayments.map((payment) => (
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
