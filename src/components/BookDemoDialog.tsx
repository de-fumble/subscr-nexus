import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Mail, User, Building2, Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-accent" />
            Book a Demo
          </DialogTitle>
          <DialogDescription>
            Fill in your details and we'll get back to you to schedule a personalized demo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Full Name *
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Company Name
            </Label>
            <Input
              id="company"
              placeholder="Acme Inc."
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell us about your subscription management needs..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Demo Request
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This will open your email client to send the request to our team.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookDemoDialog;
