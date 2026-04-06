import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, FileText, CheckCircle2, AlertCircle, Clock3, Mail, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TransactionReceiptDialog } from "./TransactionReceiptDialog";

interface TransactionDetails {
  reference: string;
  amount: number;
  status: string;
  customer_email: string;
  customer_name: string;
  paid_at: string;
  plan: string;
  currency: string;
}

interface Organization {
  org_name: string;
  email: string;
  logo_url?: string | null;
}

interface VerifyTransactionCardProps {
  organization?: Organization | null;
}

export function VerifyTransactionCard({ organization }: VerifyTransactionCardProps) {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const handleVerify = async () => {
    if (!reference.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    setLoading(true);
    setTransaction(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-transaction", {
        body: { reference: reference.trim() },
      });

      if (error) throw error;

      if (data.transaction) {
        setTransaction(data.transaction);
        toast.success("Transaction found");
      } else {
        toast.error("Transaction not found");
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "success") {
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    }
    if (status === "failed") {
      return "bg-destructive/10 text-destructive border-destructive/20";
    }
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  };

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (status === "failed") return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <Clock3 className="h-5 w-5 text-amber-500" />;
  };

  return (
    <>
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            Verify Transaction
          </CardTitle>
          <CardDescription>
            Search by transaction reference to confirm payment status and generate a receipt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Paste transaction reference (e.g. TRX-123...)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className="font-mono text-sm"
              />
              <Button onClick={handleVerify} disabled={loading} className="sm:min-w-36 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </div>
          </div>

          {transaction && (
            <div className="space-y-4 animate-in fade-in-0 duration-300">
              <div className="rounded-xl border border-border/40 bg-background p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(transaction.status)}
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction status</p>
                    <Badge variant="outline" className={getStatusBadgeClass(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold tracking-tight">
                    {transaction.currency} {(transaction.amount / 100).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="border-border/40">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Reference</p>
                    <p className="font-mono text-xs sm:text-sm break-all">{transaction.reference}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Customer Email
                    </p>
                    <p className="text-sm break-all">{transaction.customer_email || "N/A"}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Customer Name</p>
                    <p className="text-sm">{transaction.customer_name || "N/A"}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="text-sm">{transaction.plan || "N/A"}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">Paid At</p>
                  <p className="text-sm">{new Date(transaction.paid_at).toLocaleString()}</p>
                </CardContent>
              </Card>

              {transaction.status === "success" && (
                <Button
                  onClick={() => setShowReceipt(true)}
                  className="w-full gap-2 rounded-full"
                >
                  <FileText className="h-4 w-4" />
                  Generate Receipt
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      {transaction && (
        <TransactionReceiptDialog
          open={showReceipt}
          onOpenChange={setShowReceipt}
          transaction={transaction}
          organization={organization}
        />
      )}
    </>
  );
}