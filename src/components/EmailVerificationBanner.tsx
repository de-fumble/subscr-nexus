import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, X } from "lucide-react";

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-verification-email", {
        body: { email },
      });

      if (error) throw error;
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email");
    } finally {
      setSending(false);
    }
  };

  if (dismissed) return null;

  return (
    <Alert className="bg-amber-500/10 border-amber-500/30 mb-4">
      <Mail className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-amber-700 dark:text-amber-300">
          Please verify your email address to access all features.
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={sending}
            className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
          >
            {sending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Email"
            )}
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDismissed(true);
                onDismiss();
              }}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
