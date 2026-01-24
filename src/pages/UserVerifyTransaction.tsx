import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Receipt, 
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Download
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFReceiptDocument } from "@/components/PDFReceiptDocument";

interface TransactionResult {
  reference: string;
  amount: number;
  status: string;
  customer_email: string;
  customer_name?: string;
  paid_at: string | null;
  plan_name?: string;
  currency?: string;
}

const UserVerifyTransaction = () => {
  const [transactionRef, setTransactionRef] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const navigate = useNavigate();

  const verifyTransaction = async () => {
    if (!transactionRef.trim()) {
      toast.error("Please enter a transaction reference");
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-transaction", {
        body: { reference: transactionRef },
      });

      if (error) throw error;

      if (data.transaction) {
        setResult({
          reference: data.transaction.reference,
          amount: data.transaction.amount / 100,
          status: data.transaction.status,
          customer_email: data.transaction.customer_email || "N/A",
          customer_name: data.transaction.customer_name || "N/A",
          paid_at: data.transaction.paid_at,
          plan_name: data.transaction.plan,
          currency: data.transaction.currency || "NGN",
        });
      } else {
        toast.error(data.message || data.error || "Transaction not found");
      }
    } catch (error: any) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status === "failed") return <XCircle className="h-6 w-6 text-destructive" />;
    return <Clock className="h-6 w-6 text-yellow-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "success") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (status === "failed") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/user-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Verify Transaction</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Info Card */}
        <Card className="p-4 rounded-2xl glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold">Transaction Verification</h2>
              <p className="text-xs text-muted-foreground">Check your payment status</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your transaction reference to verify payment status and download receipts.
          </p>
        </Card>

        {/* Search Input */}
        <Card className="p-4 rounded-2xl glass-card space-y-3">
          <Input
            placeholder="Enter transaction reference..."
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verifyTransaction()}
            className="text-center font-mono"
          />
          <Button 
            onClick={verifyTransaction} 
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              "Verify Transaction"
            )}
          </Button>
        </Card>

        {/* Transaction Result */}
        {result && (
          <Card className="p-4 rounded-2xl glass-card space-y-4">
            {/* Status Header */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${getStatusColor(result.status)}`}>
              {getStatusIcon(result.status)}
              <div>
                <p className="font-semibold capitalize">{result.status}</p>
                <p className="text-xs opacity-80">Transaction Status</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="font-mono text-xs break-all">{result.reference}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold">{result.currency} {result.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm truncate">{result.customer_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm truncate">{result.customer_email}</p>
              </div>
              {result.plan_name && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Plan/Payment</p>
                  <p className="text-sm">{result.plan_name}</p>
                </div>
              )}
              {result.paid_at && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Paid At</p>
                  <p className="text-sm">{new Date(result.paid_at).toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Download Receipt */}
            {result.status === "success" && result.paid_at && (
              <PDFDownloadLink
                document={
                  <PDFReceiptDocument
                    reference={result.reference}
                    amount={result.amount}
                    currency={result.currency || "NGN"}
                    status={result.status}
                    customerName={result.customer_name || "N/A"}
                    customerEmail={result.customer_email}
                    paidAt={result.paid_at}
                    plan={result.plan_name || "N/A"}
                    organizationName="Recurra"
                  />
                }
                fileName={`receipt-${result.reference}.pdf`}
                className="w-full"
              >
                {({ loading }) => (
                  <Button variant="outline" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download Receipt
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default UserVerifyTransaction;
