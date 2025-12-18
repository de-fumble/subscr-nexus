import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface RefundRequestDialogProps {
  children: React.ReactNode;
  userEmail: string;
}

const REFUND_REASONS = [
  { id: "debited_twice", label: "I was debited twice for the same transaction" },
  { id: "wrong_amount", label: "I was charged the wrong amount" },
  { id: "service_not_received", label: "I didn't receive the service/subscription" },
  { id: "cancelled_subscription", label: "I cancelled my subscription but was still charged" },
  { id: "unauthorized", label: "Unauthorized transaction on my account" },
  { id: "other", label: "Other (please specify below)" },
];

export function RefundRequestDialog({ children, userEmail }: RefundRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    transactionRef: "",
    refundReason: "",
    customComplaint: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.refundReason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.refundReason === "other" && !formData.customComplaint.trim()) {
      toast.error("Please provide details in the complaint box");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit a refund request");
        return;
      }

      const reasonLabel = REFUND_REASONS.find(r => r.id === formData.refundReason)?.label || formData.refundReason;

      const { error } = await supabase.from("refund_requests").insert({
        user_id: user.id,
        user_email: userEmail,
        user_name: formData.fullName,
        phone_number: formData.phoneNumber,
        transaction_reference: formData.transactionRef || null,
        refund_reason: reasonLabel,
        custom_complaint: formData.customComplaint || null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Refund request submitted successfully");
    } catch (error) {
      console.error("Error submitting refund request:", error);
      toast.error("Failed to submit refund request");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        fullName: "",
        phoneNumber: "",
        transactionRef: "",
        refundReason: "",
        customComplaint: "",
      });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg glass-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            Request a Refund
          </DialogTitle>
          <DialogDescription>
            Please provide your details and describe your issue. Our team will review and respond promptly.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Request Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                We've received your refund request. Our support team will review it and contact you within 24-48 hours.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={userEmail}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">This is your registered email</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="e.g., +234 801 234 5678"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">We'll use this to contact you about your request</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionRef">Transaction Reference (Optional)</Label>
              <Input
                id="transactionRef"
                placeholder="Enter the Paystack transaction reference"
                value={formData.transactionRef}
                onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Reason for Refund <span className="text-destructive">*</span></Label>
              <RadioGroup
                value={formData.refundReason}
                onValueChange={(value) => setFormData({ ...formData, refundReason: value })}
                className="space-y-2"
              >
                {REFUND_REASONS.map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={reason.id} id={reason.id} />
                    <Label htmlFor={reason.id} className="flex-1 cursor-pointer text-sm">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customComplaint">
                Additional Details {formData.refundReason === "other" && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="customComplaint"
                placeholder="Please provide any additional details about your refund request..."
                value={formData.customComplaint}
                onChange={(e) => setFormData({ ...formData, customComplaint: e.target.value })}
                rows={4}
                required={formData.refundReason === "other"}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}