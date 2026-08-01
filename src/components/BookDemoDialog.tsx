import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Mail, User, Building2, Loader2, ArrowRight, X, Shield, Clock } from "lucide-react";

interface BookDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookDemoDialog = ({ open, onOpenChange }: BookDemoDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Please fill in your name and email");
      return;
    }

    setIsSubmitting(true);

    try {
      const subject = encodeURIComponent(`Demo Request from ${formData.name} - ${formData.company || 'N/A'}`);
      const body = encodeURIComponent(
        `Name: ${formData.name}\n` +
        `Email: ${formData.email}\n` +
        `Company: ${formData.company || 'Not provided'}\n\n` +
        `Message:\n${formData.message || 'I would like to book a demo of Recurra.'}`
      );

      window.location.href = `mailto:Recurrra@outlook.com?subject=${subject}&body=${body}`;
      toast.success("Opening your email client...");

      setTimeout(() => {
        setFormData({ name: "", email: "", company: "", message: "" });
        onOpenChange(false);
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      toast.error("Failed to open email client. Please email Recurrra@outlook.com directly.");
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

        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/70 rounded-t-3xl sm:rounded-t-2xl overflow-hidden px-6 pt-6 pb-7">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Icon + title */}
          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Book a Demo</h2>
              <p className="text-sm text-white/70 mt-0.5">We'll reach out within 24 hours</p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="px-5 sm:px-7 pt-5 pb-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Email row on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="demo-name"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Work Email <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="demo-email"
                    type="email"
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-company" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company / Organisation
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="demo-company"
                  placeholder="Acme School, XYZ Cooperative..."
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="h-11 pl-9 bg-muted/40 border-border/60 focus:border-accent/60 focus:bg-background transition-all text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-message" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Anything we should know? <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(optional)</span>
              </Label>
              <Textarea
                id="demo-message"
                placeholder="e.g. We collect school fees for 800 students per term..."
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
                  Opening email...
                </>
              ) : (
                <>
                  Send demo request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" />
              Confidential
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-accent" />
              Reply within 24h
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookDemoDialog;
