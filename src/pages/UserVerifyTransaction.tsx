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
  Download,
  Copy,
  TrendingUp,
  User,
  Mail,
  Calendar,
  Building2,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFReceiptDocument } from "@/components/PDFReceiptDocument";
import Navbar from "@/components/Navbar";

interface TransactionResult {
  reference: string;
  amount: number;
  status: string;
  customer_email: string;
  customer_name?: string;
  paid_at: string | null;
  plan_name?: string;
  currency?: string;
  organization_name?: string;
  payment_type?: string;
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
        body: { reference: transactionRef.trim() },
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
          organization_name: data.transaction.organization_name || "N/A",
          payment_type: data.transaction.payment_type || "Standard Payment",
        });
        toast.success("Transaction verified successfully");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Reference copied to clipboard");
  };

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-10 w-10 text-emerald-500" />;
    if (status === "failed") return <XCircle className="h-10 w-10 text-destructive" />;
    return <Clock className="h-10 w-10 text-amber-500" />;
  };

  const getStatusLabelColor = (status: string) => {
    if (status === "success") return "text-emerald-600 bg-emerald-50";
    if (status === "failed") return "text-destructive bg-destructive/5";
    return "text-amber-600 bg-amber-50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">Secure Verification</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-mono tracking-tight">
            Verify Transaction
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto font-mono">
            Securely confirm payment status and retrieve official receipts for any Recurra transaction.
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full max-w-2xl mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
          <Card className="p-2 sm:p-3 overflow-hidden glass-card border-none shadow-2xl rounded-3xl">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                <Input
                  placeholder="Enter transaction reference..."
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyTransaction()}
                  className="h-14 pl-12 pr-4 bg-transparent border-none text-lg font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button 
                onClick={verifyTransaction} 
                disabled={verifying}
                size="lg"
                className="h-14 px-8 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-accent/25"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify Status"
                )}
              </Button>
            </div>
          </Card>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Compliant</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Real-time status</span>
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Securely via Paystack</span>
          </div>
        </div>

        {/* Result Area - Digital Receipt Look */}
        {result ? (
          <div className="w-full max-w-2xl animate-fade-in-up">
            <Card className="overflow-hidden glass-card border-none shadow-2xl rounded-[2.5rem] relative">
              {/* Background Accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-accent opacity-20" />
              
              <div className="p-8 sm:p-12">
                {/* Status Header */}
                <div className="flex flex-col items-center mb-10 text-center">
                  <div className="mb-4 relative">
                    <div className="absolute -inset-4 bg-accent/5 rounded-full blur-xl animate-pulse" />
                    {getStatusIcon(result.status)}
                  </div>
                  <h2 className="text-2xl font-bold capitalize mb-1">{result.status}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusLabelColor(result.status)}`}>
                    Confirmed Status
                  </span>
                </div>

                {/* Main Data Groups */}
                <div className="space-y-10">
                  {/* Payment Details */}
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground font-mono uppercase text-[10px] tracking-widest font-bold border-b border-border/40 pb-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Payment Summary
                    </div>
                    <div className="grid grid-cols-2 gap-y-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-mono">Amount Paid</p>
                        <p className="text-2xl font-bold tracking-tight">
                          <span className="text-sm font-normal text-muted-foreground mr-1">{result.currency}</span>
                          {result.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs text-muted-foreground font-mono">Method</p>
                        <p className="text-sm font-medium">{result.payment_type}</p>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground font-mono">Reference</p>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(result.reference)}>
                          <p className="text-sm font-mono break-all group-hover:text-accent transition-colors">{result.reference}</p>
                          <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Customer Information */}
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground font-mono uppercase text-[10px] tracking-widest font-bold border-b border-border/40 pb-2">
                      <User className="w-3.5 h-3.5" />
                      Payer Information
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 sm:gap-x-8">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-muted-foreground font-mono">Full Name</p>
                          <p className="text-sm font-semibold truncate">{result.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-muted-foreground font-mono">Email Address</p>
                          <p className="text-sm font-semibold truncate">{result.customer_email}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Merchant & Timeline */}
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground font-mono uppercase text-[10px] tracking-widest font-bold border-b border-border/40 pb-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Metadata
                    </div>
                    <div className="grid grid-cols-2 gap-y-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-mono">Institution</p>
                        <p className="text-sm font-semibold flex items-center gap-1.5 tracking-tight">
                          <Building2 className="w-3.5 h-3.5 text-accent" />
                          {result.organization_name}
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs text-muted-foreground font-mono">Date & Time</p>
                        {result.paid_at && (
                          <p className="text-sm font-semibold flex items-center justify-end gap-1.5 tracking-tight">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {new Date(result.paid_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground font-mono">Plan / Product</p>
                        <p className="text-sm font-semibold">{result.plan_name}</p>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer Action */}
                <div className="mt-12 flex flex-col gap-4">
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
                          organizationName={result.organization_name || "Recurra"}
                        />
                      }
                      fileName={`receipt-${result.reference}.pdf`}
                      className="w-full"
                    >
                      {({ loading }) => (
                        <Button className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-bold transition-all duration-300 hover:scale-[1.02] shadow-xl gap-2 flex items-center justify-center" disabled={loading}>
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                          Download Official Receipt
                        </Button>
                      )}
                    </PDFDownloadLink>
                  )}
                  <p className="text-center text-[10px] text-muted-foreground font-mono tracking-tighter opacity-50 uppercase">
                    Verification Secured by paystack pci-dss certification • {new Date().getFullYear()} recurra i/o
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : !verifying && (
          <div className="w-full max-w-2xl px-6 py-12 border border-dashed border-muted-foreground/20 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-60 animate-in fade-in duration-1000">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="font-mono text-sm">Enter a reference above to view payment details</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserVerifyTransaction;
