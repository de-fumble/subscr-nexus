import { useState, useEffect, useCallback } from "react";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ArrowLeft, Mail, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import logoImage from "@/assets/logo.png";

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const userId = searchParams.get("uid") || "";
  useForceLightMode();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  // Countdown timer (5 minutes = 300 seconds)
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  // Rate limiting
  const [requestCount, setRequestCount] = useState(1);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitEnd, setRateLimitEnd] = useState<Date | null>(null);

  // Store expiry time from the backend
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!email || !userId) {
      toast.error("Invalid verification link");
      navigate("/auth");
    } else {
      // Set initial expiry (5 minutes from now — the OTP was just sent)
      const expiry = new Date(Date.now() + 300 * 1000);
      setExpiresAt(expiry);
    }
  }, [email, userId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (verified || rateLimited) return;

    const interval = setInterval(() => {
      if (expiresAt) {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          setCanResend(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, verified, rateLimited]);

  // Rate limit countdown
  useEffect(() => {
    if (!rateLimited || !rateLimitEnd) return;

    const interval = setInterval(() => {
      if (new Date() >= rateLimitEnd) {
        setRateLimited(false);
        setRateLimitEnd(null);
        setRequestCount(0);
        setCanResend(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimited, rateLimitEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatRateLimitTime = () => {
    if (!rateLimitEnd) return "";
    const remaining = Math.max(0, Math.floor((rateLimitEnd.getTime() - Date.now()) / 1000));
    const hours = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const handleVerify = async () => {
    if (otp.length !== 4) {
      toast.error("Please enter the complete 4-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, user_id: userId, otp }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setVerified(true);
        toast.success("Email verified successfully!");
        setTimeout(() => navigate("/auth"), 2500);
      } else if (data.expired) {
        toast.error("OTP has expired. Please request a new one.");
        setCanResend(true);
      } else {
        toast.error(data.message || "Invalid OTP code");
        setOtp("");
      }
    } catch (error) {
      console.error("Verify error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (requestCount >= 2) {
      const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setRateLimited(true);
      setRateLimitEnd(end);
      toast.error("Maximum OTP attempts reached. Try again in 2 hours.");
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, user_id: userId }),
        }
      );

      const data = await res.json();

      if (res.status === 429) {
        setRateLimited(true);
        setRateLimitEnd(new Date(data.can_retry_at));
        toast.error("Maximum OTP attempts reached. Try again later.");
        return;
      }

      if (data.success) {
        setRequestCount(data.request_count);
        setExpiresAt(new Date(data.expires_at));
        setCanResend(false);
        setOtp("");
        toast.success("New OTP sent to your email!");
      } else {
        toast.error(data.error || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 max-w-md w-full text-center border-border/50 shadow-xl rounded-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Email Verified!</h2>
          <p className="mt-2 text-muted-foreground font-mono">
            Your email has been verified successfully. Redirecting to login...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-mono">Back to login</span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img src={logoImage} alt="Recurra Logo" className="h-10 w-10 object-cover rounded-xl" />
          <span className="text-xl font-bold text-foreground font-mono">Recurra</span>
        </div>

        <Card className="p-6 sm:p-8 border-border/50 shadow-xl rounded-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Mail className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground font-mono">Verify Your Email</h2>
            <p className="mt-2 text-sm text-muted-foreground font-mono">
              We sent a 4-digit code to <strong>{email}</strong>
            </p>
          </div>

          {rateLimited ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <Clock className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground font-mono">Too Many Attempts</h3>
              <p className="text-sm text-muted-foreground font-mono">
                You've used all your OTP requests. Please try again in:
              </p>
              <div className="text-2xl font-bold text-destructive font-mono">
                {formatRateLimitTime()}
              </div>
            </div>
          ) : (
            <>
              {/* OTP Input */}
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={4}
                  value={otp}
                  onChange={setOtp}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-14 text-xl font-bold font-mono" />
                    <InputOTPSlot index={1} className="h-14 w-14 text-xl font-bold font-mono" />
                    <InputOTPSlot index={2} className="h-14 w-14 text-xl font-bold font-mono" />
                    <InputOTPSlot index={3} className="h-14 w-14 text-xl font-bold font-mono" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Countdown Timer */}
              <div className="text-center mb-6">
                {countdown > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
                    <Clock className="h-4 w-4" />
                    <span>Code expires in <strong className="text-foreground">{formatTime(countdown)}</strong></span>
                  </div>
                ) : (
                  <p className="text-sm text-destructive font-mono">OTP has expired</p>
                )}
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={otp.length !== 4 || isVerifying || countdown <= 0}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold font-mono rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-accent/20"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>

              {/* Resend */}
              <div className="mt-6 text-center">
                {canResend ? (
                  <Button
                    variant="ghost"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sm font-mono"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      `Resend Code (${2 - requestCount} attempt${2 - requestCount !== 1 ? "s" : ""} left)`
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    You can request a new code after the timer expires
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyOTP;
