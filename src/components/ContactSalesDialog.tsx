import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, Send, User, Building2, X, Shield, Clock, Loader2 } from "lucide-react";

interface ContactSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactSalesDialog = ({ open, onOpenChange }: ContactSalesDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const mailtoLink = `mailto:Nebulatech.innovations@outlook.com?subject=Sales Inquiry from ${encodeURIComponent(formData.name)} - ${encodeURIComponent(formData.company)}&body=${encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}`
      )}`;
      
      window.location.href = mailtoLink;
      
      toast({
        title: "Opening email client",
        description: "Your default email client will open to send the message.",
      });
      
      setFormData({ name: "", email: "", company: "", message: "" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open email client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        /* Mobile: bottom sheet positioning */
        fixed bottom-0 left-0 right-0 top-auto
        translate-x-0 translate-y-0
        rounded-t-3xl rounded-b-none
        max-h-[92dvh] overflow-y-auto

        /* Desktop: centered modal */
        sm:fixed sm:bottom-auto sm:top-1/2 sm:left-1/2
        sm:-translate-x-1/2 sm:-translate-y-1/2
        sm:rounded-2xl
        sm:max-h-[90vh]
        sm:max-w-lg sm:w-full

        /* Slide-in transition - smooth 600ms ease */
        duration-600 ease-out
        data-[state=open]:animate-in
        data-[state=closed]:animate-out
        data-[state=open]:fade-in-0
        data-[state=closed]:fade-out-0

        /* Mobile: slide up from bottom of viewport */
        data-[state=open]:slide-in-from-bottom-full
        data-[state=closed]:slide-out-to-bottom-full

        /* Desktop: smooth gentle slide up into center */
        sm:data-[state=open]:slide-in-from-bottom-6
        sm:data-[state=closed]:slide-out-to-bottom-6

        bg-background border-border/50
        shadow-2xl
        p-0 gap-0
        [&>button]:hidden
      ">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/70 rounded-t-3xl sm:rounded-t-2xl overflow-hidden px-6 pt-6 pb-7">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Talk to Sales</h2>
              <p className="text-sm text-white/70 mt-0.5">Custom plans & enterprise solutions</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-5 sm:px-7 pt-5 pb-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sales-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="sales-name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sales-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Work Email <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="sales-email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sales-company" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company Name <span className="text-accent">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="sales-company"
                  placeholder="Acme Corporation"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sales-message" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                How can we help?
              </Label>
              <Textarea
                id="sales-message"
                placeholder="Tell us about your volume, requirements, or custom needs..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all resize-none text-sm rounded-xl"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 rounded-full font-semibold text-base transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 hover:scale-[1.01] mt-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Contact Sales Team
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Trust indicator */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" />
              Direct Support
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-accent" />
              Same-day response
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSalesDialog;
