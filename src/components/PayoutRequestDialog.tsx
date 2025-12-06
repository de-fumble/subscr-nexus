import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Banknote, Clock, CheckCircle, XCircle } from "lucide-react";

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface PayoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  availableBalance: number;
  onRequestSubmitted: () => void;
}

export function PayoutRequestDialog({
  open,
  onOpenChange,
  orgId,
  availableBalance,
  onRequestSubmitted,
}: PayoutRequestDialogProps) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingRequests, setExistingRequests] = useState<PayoutRequest[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(false);

  useEffect(() => {
    if (open && orgId) {
      fetchExistingRequests();
    }
  }, [open, orgId]);

  const fetchExistingRequests = async () => {
    setFetchingRequests(true);
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("org_id", orgId)
        .order("requested_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setExistingRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching payout requests:", error);
    } finally {
      setFetchingRequests(false);
    }
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountValue > availableBalance) {
      toast.error("Amount exceeds available balance");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("payout_requests").insert({
        org_id: orgId,
        amount: amountValue,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Payout request submitted successfully");
      setAmount("");
      setNotes("");
      fetchExistingRequests();
      onRequestSubmitted();
    } catch (error: any) {
      console.error("Error submitting payout request:", error);
      toast.error(error.message || "Failed to submit payout request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary" as const;
      case "approved":
        return "outline" as const;
      case "completed":
        return "default" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const hasPendingRequest = existingRequests.some(r => r.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-accent" />
            Request Payout
          </DialogTitle>
          <DialogDescription>
            Submit a payout request for your available balance. Requests are reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Available Balance */}
          <div className="rounded-lg bg-accent/10 p-4">
            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-accent">
              ₦{availableBalance.toLocaleString()}
            </p>
          </div>

          {/* New Request Form */}
          {hasPendingRequest ? (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                You have a pending payout request. Please wait for it to be processed before submitting a new one.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  max={availableBalance}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes for this request..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Existing Requests */}
          {existingRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Recent Requests</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {fetchingRequests ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  existingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">₦{request.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(request.status)} className="gap-1">
                          {getStatusIcon(request.status)}
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {existingRequests.some(r => r.status === "rejected" && r.notes) && (
                <div className="mt-2">
                  {existingRequests
                    .filter(r => r.status === "rejected" && r.notes)
                    .slice(0, 1)
                    .map((r) => (
                      <div key={r.id} className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">Rejection Reason:</p>
                        <p className="text-sm text-muted-foreground">{r.notes}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || hasPendingRequest || !amount}
            className="bg-accent hover:bg-accent/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

