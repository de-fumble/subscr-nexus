import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowLeft, Mail } from "lucide-react";
import logoImage from "@/assets/logo.png";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-email-token", {
        body: { token },
      });

      if (error) throw error;

      if (data.success) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else if (data.expired) {
        setStatus("expired");
        setMessage("This verification link has expired. Please request a new one.");
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("Failed to verify email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img 
            src={logoImage} 
            alt="Recurra Logo" 
            className="h-10 w-10 object-cover rounded-xl"
          />
          <span className="text-xl font-bold text-foreground">Recurra</span>
        </div>

        <Card className="p-8 border-border/50 shadow-xl text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                <Loader2 className="h-7 w-7 text-accent animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Verifying Email</h2>
              <p className="mt-2 text-muted-foreground">Please wait...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Email Verified!</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <p className="mt-4 text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <Button
                className="mt-6"
                onClick={() => navigate("/auth")}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Mail className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Link Expired</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <Button
                className="mt-6"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
