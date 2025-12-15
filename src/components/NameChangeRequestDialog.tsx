import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit3, Send } from "lucide-react";

interface NameChangeRequestDialogProps {
  orgId: string;
  currentName: string;
  children: React.ReactNode;
}

export function NameChangeRequestDialog({ orgId, currentName, children }: NameChangeRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!requestedName.trim()) {
      toast.error("Please enter the new organization name");
      return;
    }

    if (requestedName.trim() === currentName) {
      toast.error("New name must be different from current name");
      return;
    }

    setLoading(true);
    try {
      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from("name_change_requests")
        .select("id")
        .eq("org_id", orgId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingRequest) {
        toast.error("You already have a pending name change request");
        return;
      }

      const { error } = await supabase
        .from("name_change_requests")
        .insert({
          org_id: orgId,
          current_name: currentName,
          requested_name: requestedName.trim(),
          reason: reason.trim() || null,
        });

      if (error) throw error;

      toast.success("Name change request submitted successfully");
      setOpen(false);
      setRequestedName("");
      setReason("");
    } catch (error) {
      console.error("Error submitting name change request:", error);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-accent" />
            Request Name Change
          </DialogTitle>
          <DialogDescription>
            Submit a request to change your organization name. This will be reviewed by our admin team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Name</Label>
            <Input value={currentName} disabled className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">New Organization Name</Label>
            <Input
              id="new-name"
              value={requestedName}
              onChange={(e) => setRequestedName(e.target.value)}
              placeholder="Enter the new name"
              className="glass-card border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you want to change the organization name..."
              className="glass-card border-border/50 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !requestedName.trim()}
            className="bg-accent hover:bg-accent/90 gap-2"
          >
            <Send className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
