import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Mail, User, Building2, Loader2, ArrowRight } from "lucide-react";

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

      toast.success("Opening your email client to send the demo request");

      // Reset form and close dialog after a short delay
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
      <DialogContent className="sm:max-w-md w-[95vw] md:w-full bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl animate-fade-in duration-300">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
            <Calendar className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold font-mono">
            Book a Demo
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            See how Recurra can transform your subscription billing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                Company Name
              </Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your needs..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="bg-muted/30 border-border/50 focus:border-accent/50 transition-all font-mono resize-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg hover:shadow-accent/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Opening Email...
              </>
            ) : (
              <>
                Send Request
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-mono">
            Secure & Confidential
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookDemoDialog;
