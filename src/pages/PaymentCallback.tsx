import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Home } from "lucide-react";
import logoImage from "@/assets/logo.svg";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  
  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");
  const paymentId = searchParams.get("payment_id");

  useEffect(() => {
    const verifyPayment = async () => {
      const ref = reference || trxref;
      
      if (!ref) {
        setStatus("failed");
        setMessage("No payment reference found");
        return;
      }

      try {
        // Call edge function to verify and update payment
        const { data, error } = await supabase.functions.invoke("verify-one-time-payment", {
          body: { reference: ref, payment_id: paymentId },
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("failed");
          setMessage("Failed to verify payment");
          return;
        }

        if (data.success) {
          setStatus("success");
          setMessage("Payment completed successfully!");
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment verification failed");
        }
      } catch (error) {
        console.error("Error:", error);
        setStatus("failed");
        setMessage("An error occurred while verifying payment");
      }
    };

    verifyPayment();
  }, [reference, trxref]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -left-60 -top-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl" />
        <div className="absolute -bottom-60 -right-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl" />
      </div>

      <div className="glass-card max-w-md w-full rounded-3xl border border-border/50 p-10 text-center backdrop-blur-xl shadow-2xl">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3 mb-8">
          <img src={logoImage} alt="Recurra" className="h-10 w-10 rounded-xl object-cover shadow-lg" />
          <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Recurra</span>
        </Link>

        {status === "loading" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Verifying Payment</h1>
            <p className="mt-3 text-muted-foreground">
              Please wait while we confirm your payment...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
            <p className="mt-3 text-muted-foreground">{message}</p>
            <Link to="/">
              <Button className="mt-6 gap-2">
                <Home className="h-4 w-4" />
                Go to Homepage
              </Button>
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
            <p className="mt-3 text-muted-foreground">{message}</p>
            <Link to="/">
              <Button variant="outline" className="mt-6 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;