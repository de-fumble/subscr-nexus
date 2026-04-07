import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";

interface KYCApprovalModalProps {
  notificationId: string;
  onClose: () => void;
}

export function KYCApprovalModal({ notificationId, onClose }: KYCApprovalModalProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    setLoading(true);
    try {
      // Mark notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
      
      setOpen(false);
      onClose();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Still close if error, to not trap the user
      setOpen(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 z-0" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse delay-700" />
          
          <div className="relative z-10 p-6 pt-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150 opacity-20" />
                <div className="bg-primary/10 p-4 rounded-full relative">
                  <ShieldCheck className="w-12 h-12 text-primary animate-bounce" />
                </div>
                <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground p-1.5 rounded-full shadow-lg rotate-12">
                  <PartyPopper className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                KYC Verified!
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground max-w-[280px] mx-auto">
                Congratulations! Your organization's KYC documents have been reviewed and approved.
              </DialogDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 py-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 text-left transition-all hover:border-primary/30">
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Full Feature Access</p>
                  <p className="text-xs text-muted-foreground">Unlimited transactions and payouts enabled.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 text-left transition-all hover:border-primary/30">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Verified Badge</p>
                  <p className="text-xs text-muted-foreground">Your business is now officially verified on Recurra.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleClose} 
              disabled={loading}
              className="w-full h-12 text-base font-bold group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Let's Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
