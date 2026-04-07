import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit3, Send, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KYCEditRequestDialogProps {
  orgId: string;
  children: React.ReactNode;
}

export function KYCEditRequestDialog({ orgId, children }: KYCEditRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    if (open) {
      checkPendingRequest();
    }
  }, [open, orgId]);

  const checkPendingRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("kyc_edit_requests")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "pending")
        .maybeSingle();

      if (error) throw error;
      setPendingRequest(data);
    } catch (error) {
      console.error("Error checking pending KYC edit request:", error);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for editing your KYC details");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("kyc_edit_requests")
        .insert({
          org_id: orgId,
          reason: reason.trim(),
        });

      if (error) throw error;

      toast.success("KYC edit request submitted successfully");
      setOpen(false);
      setReason("");
      checkPendingRequest();
    } catch (error) {
      console.error("Error submitting KYC edit request:", error);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-accent" />
            Request KYC Edit
          </DialogTitle>
          <DialogDescription>
            Once your KYC is verified, changes require admin approval. Submit a request to unlock your profile for editing.
          </DialogDescription>
        </DialogHeader>

        {pendingRequest ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/30 rounded-2xl border border-dashed">
              <Clock className="h-12 w-12 text-amber-500 mb-3 animate-pulse" />
              <h4 className="text-lg font-semibold">Request Pending</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                You already have a pending edit request. Our team will review it shortly.
              </p>
              <Badge variant="secondary" className="mt-4">
                Submitted on {new Date(pendingRequest.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-600">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>Important:</strong> Upon approval of this request, your account will temporarily lose its "Verified" status. You will need to re-submit your KYC documents after making changes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Edit</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain what information needs to be updated and why..."
                className="glass-card border-border/50 min-h-[120px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {pendingRequest ? "Close" : "Cancel"}
          </Button>
          {!pendingRequest && (
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="bg-accent hover:bg-accent/90 gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
