import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Search, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";

interface Transaction {
  id: string;
  reference: string;
  payer_name: string;
  plan_name: string;
  amount: number;
  status: string;
  paid_at: string;
  type: 'subscription' | 'one-time';
  email?: string;
}

interface TransactionFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
}

export function TransactionFilterDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
}: TransactionFilterDialogProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchReference, setSearchReference] = useState("");
  const [transactionType, setTransactionType] = useState<"all" | "subscription" | "one-time">("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTransactions([]);
      setSearched(false);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!dateFrom && !dateTo && !searchReference.trim()) {
      toast.error("Please specify at least one filter criteria");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const allTransactions: Transaction[] = [];

      // Fetch subscription transactions if type is "all" or "subscription"
      if (transactionType === "all" || transactionType === "subscription") {
        // Fetch subscription plans for this org
        const { data: plans } = await supabase
          .from("subscription_plans")
          .select("id, name")
          .eq("org_id", orgId);

        const planIds = plans?.map((p) => p.id) || [];
        const planMap = new Map(plans?.map((p) => [p.id, p.name]) || []);

        // Fetch subscribers for these plans
        if (planIds.length > 0) {
          const { data: subscribers } = await supabase
            .from("subscribers")
            .select("id, customer_name, email, plan_id")
            .in("plan_id", planIds);

          const subscriberMap = new Map(subscribers?.map((s) => [s.id, s]) || []);
          const subscriberIds = subscribers?.map((s) => s.id) || [];

          if (subscriberIds.length > 0) {
            let query = supabase
              .from("transactions")
              .select("*")
              .in("subscriber_id", subscriberIds)
              .order("paid_at", { ascending: false });

            if (dateFrom) {
              query = query.gte("paid_at", new Date(dateFrom).toISOString());
            }
            if (dateTo) {
              const endDate = new Date(dateTo);
              endDate.setHours(23, 59, 59, 999);
              query = query.lte("paid_at", endDate.toISOString());
            }
            if (searchReference.trim()) {
              query = query.ilike("paystack_reference", `%${searchReference.trim()}%`);
            }

            const { data: txns } = await query;

            txns?.forEach((txn) => {
              const sub = subscriberMap.get(txn.subscriber_id);
              allTransactions.push({
                id: txn.id,
                reference: txn.paystack_reference || "N/A",
                payer_name: sub?.customer_name || "Unknown",
                plan_name: planMap.get(sub?.plan_id || "") || "Unknown Plan",
                amount: Number(txn.amount),
                status: txn.status,
                paid_at: txn.paid_at || txn.created_at,
                type: "subscription",
                email: sub?.email,
              });
            });
          }
        }
      }

      // Fetch one-time payments if type is "all" or "one-time"
      if (transactionType === "all" || transactionType === "one-time") {
        // First get one-time payment definitions for this org
        const { data: otpDefs } = await supabase
          .from("one_time_payments")
          .select("id, name")
          .eq("org_id", orgId);

        const otpIds = otpDefs?.map((p) => p.id) || [];
        const otpMap = new Map(otpDefs?.map((p) => [p.id, p.name]) || []);

        if (otpIds.length > 0) {
          // Fetch from one_time_payment_transactions table
          let otpTxnQuery = supabase
            .from("one_time_payment_transactions")
            .select("*")
            .in("payment_id", otpIds)
            .order("paid_at", { ascending: false });

          if (dateFrom) {
            otpTxnQuery = otpTxnQuery.gte("paid_at", new Date(dateFrom).toISOString());
          }
          if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            otpTxnQuery = otpTxnQuery.lte("paid_at", endDate.toISOString());
          }
          if (searchReference.trim()) {
            otpTxnQuery = otpTxnQuery.ilike("paystack_reference", `%${searchReference.trim()}%`);
          }

          const { data: otpTxns } = await otpTxnQuery;

          otpTxns?.forEach((txn) => {
            allTransactions.push({
              id: txn.id,
              reference: txn.paystack_reference || "N/A",
              payer_name: txn.payer_name || "Unknown",
              plan_name: otpMap.get(txn.payment_id) || "One-Time Payment",
              amount: Number(txn.amount),
              status: "success",
              paid_at: txn.paid_at,
              type: "one-time",
              email: txn.payer_email || undefined,
            });
          });
        }

        // Also check one_time_payments table for direct payments (is_paid = true)
        let directOtpQuery = supabase
          .from("one_time_payments")
          .select("*")
          .eq("org_id", orgId)
          .eq("is_paid", true)
          .order("paid_at", { ascending: false });

        if (dateFrom) {
          directOtpQuery = directOtpQuery.gte("paid_at", new Date(dateFrom).toISOString());
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          directOtpQuery = directOtpQuery.lte("paid_at", endDate.toISOString());
        }
        if (searchReference.trim()) {
          directOtpQuery = directOtpQuery.ilike("paystack_reference", `%${searchReference.trim()}%`);
        }

        const { data: directOtpPayments } = await directOtpQuery;

        directOtpPayments?.forEach((payment) => {
          // Avoid duplicates - check if we already have this payment by reference
          const existingRefs = allTransactions.map((t) => t.reference);
          if (!existingRefs.includes(payment.paystack_reference || "")) {
            allTransactions.push({
              id: payment.id,
              reference: payment.paystack_reference || "N/A",
              payer_name: payment.paid_by_name || "Unknown",
              plan_name: payment.name || "One-Time Payment",
              amount: Number(payment.amount),
              status: "success",
              paid_at: payment.paid_at || payment.created_at,
              type: "one-time",
              email: payment.paid_by_email || undefined,
            });
          }
        });
      }

      // Sort by date
      allTransactions.sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      );

      setTransactions(allTransactions);

      if (allTransactions.length === 0) {
        toast.info("No transactions found matching your criteria");
      } else {
        toast.success(`Found ${allTransactions.length} transaction(s)`);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    setExporting(true);
    try {
      const exportData = transactions.map((txn) => ({
        Reference: txn.reference,
        "Payer Name": txn.payer_name,
        Email: txn.email || "N/A",
        "Plan/Payment": txn.plan_name,
        "Amount (₦)": txn.amount,
        Type: txn.type === "subscription" ? "Subscription" : "One-Time",
        Status: txn.status === "success" ? "Success" : "Failed",
        Date: new Date(txn.paid_at).toLocaleDateString(),
        Time: new Date(txn.paid_at).toLocaleTimeString(),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // Reference
        { wch: 25 }, // Payer Name
        { wch: 30 }, // Email
        { wch: 25 }, // Plan/Payment
        { wch: 15 }, // Amount
        { wch: 12 }, // Type
        { wch: 10 }, // Status
        { wch: 12 }, // Date
        { wch: 12 }, // Time
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      // Generate filename with date range
      let fileName = `${orgName}_Transactions`;
      if (dateFrom || dateTo) {
        fileName += `_${dateFrom || "start"}_to_${dateTo || "end"}`;
      }
      if (searchReference) {
        fileName += `_ref_${searchReference}`;
      }
      if (transactionType !== "all") {
        fileName += `_${transactionType}`;
      }
      fileName += ".xlsx";

      XLSX.writeFile(wb, fileName);
      toast.success("Transactions exported successfully");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export transactions");
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearchReference("");
    setTransactionType("all");
    setTransactions([]);
    setSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Filter & Export Transactions</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference ID</Label>
              <Input
                id="reference"
                placeholder="Search by reference..."
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={transactionType} onValueChange={(value: "all" | "subscription" | "one-time") => setTransactionType(value)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="subscription">Subscriptions Only</SelectItem>
                  <SelectItem value="one-time">One-Time Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
            {transactions.length > 0 && (
              <Button
                variant="default"
                onClick={handleExportExcel}
                disabled={exporting}
                className="gap-2 bg-green-600 hover:bg-green-700 ml-auto"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Excel ({transactions.length})
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto min-h-0">
          {searched && (
            <div className="py-2 text-sm text-muted-foreground">
              {transactions.length} transaction(s) found
            </div>
          )}

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      REF
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      PAYER
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      PLAN
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      AMOUNT
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      TYPE
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      STATUS
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">
                      DATE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 px-3 text-xs font-mono">
                        {txn.reference.length > 12
                          ? `${txn.reference.substring(0, 12)}...`
                          : txn.reference}
                      </td>
                      <td className="py-3 px-3 text-sm">{txn.payer_name}</td>
                      <td className="py-3 px-3 text-sm">{txn.plan_name}</td>
                      <td className="py-3 px-3 text-sm font-medium">
                        ₦{txn.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            txn.type === "subscription"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}
                        >
                          {txn.type === "subscription" ? "Sub" : "OTP"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            txn.status === "success"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {txn.status === "success" ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground">
                        {new Date(txn.paid_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : searched ? (
            <div className="py-12 text-center text-muted-foreground">
              No transactions found matching your criteria
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Use the filters above to search for transactions
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
