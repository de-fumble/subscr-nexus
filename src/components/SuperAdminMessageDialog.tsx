import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  Loader2, 
  Send, 
  FileText, 
  User, 
  Users, 
  ChevronRight, 
  Sparkles,
  Search,
  MessageSquare,
  ShieldCheck,
  Zap,
  Bell
} from "lucide-react";
import { toast } from "sonner";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { cn } from "@/lib/utils";

interface SuperAdminMessageDialogProps {
  organization?: {
    id: string;
    org_name: string;
    email: string;
  };
  trigger?: React.ReactNode;
}

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Onboard",
    icon: Sparkles,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    subject: "Welcome to Recurra Platform!",
    message: "Hi,\n\nWe're excited to have you on board! Your organization is now active on Recurra. You can now start creating subscription plans and managing your customers.\n\nIf you need any assistance getting started, please don't hesitate to reach out to our support team.\n\nBest regards,\nThe Recurra Team"
  },
  {
    id: "verification",
    name: "Gateway Verified",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    subject: "Paystack Integration Verified",
    message: "Hello,\n\nGood news! Your Paystack integration has been successfully verified for your organization. You are now fully set up to start collecting payments from your subscribers.\n\nHappy billing!\n\nBest regards,\nThe Recurra Team"
  },
  {
    id: "compliance",
    name: "Policy Compliance",
    icon: MessageSquare,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    subject: "Action Required: Policy Compliance Update",
    message: "Dear Administrator,\n\nWe've noticed some activities on your account that may require your attention to ensure full compliance with our platform policies. Please review your recent subscription plans and customer interactions to ensure they align with our terms of service.\n\nMaintaining a secure and compliant platform is our top priority. Thank you for your cooperation.\n\nBest regards,\nRecurra Compliance Team"
  },
  {
    id: "maintenance",
    name: "System Update",
    icon: Zap,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    subject: "Upcoming Scheduled Maintenance",
    message: "Hi there,\n\nPlease be advised that we will be performing scheduled system maintenance on [Date] starting at [Time] UTC. During this window, the platform may be temporarily unavailable for up to [Duration].\n\nWe apologize for any inconvenience this may cause and thank you for your patience as we work to improve our services.\n\nBest regards,\nEngineering Team"
  },
  {
    id: "feature",
    name: "Feature Spotlight",
    icon: Bell,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    subject: "New Feature: Advanced Analytics Now Available",
    message: "Hello!\n\nWe're thrilled to announce the launch of our new Advanced Analytics dashboard! You can now track your MRR, churn rate, and subscriber growth with more precision than ever before.\n\nCheck out the 'Analytics' tab in your dashboard to see your new insights in action.\n\nBest regards,\nThe Recurra Product Team"
  }
];

export function SuperAdminMessageDialog({ organization, trigger }: SuperAdminMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(!organization);
  const [recipientEmail, setRecipientEmail] = useState(organization?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { invokeSuperadmin } = useSuperadmin();

  useEffect(() => {
    if (organization) {
      setRecipientEmail(organization.email);
      setIsBroadcast(false);
    }
  }, [organization]);

  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setMessage(template.message);
      toast.info(`${template.name} template applied`);
    }
  };

  const handleSend = async () => {
    if (!isBroadcast && !recipientEmail.trim()) {
      toast.error("Please provide a recipient email");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both subject and message");
      return;
    }

    setSending(true);
    try {
      const result = await invokeSuperadmin('send_email', {
        org_id: isBroadcast ? undefined : organization?.id,
        recipient_email: !isBroadcast && recipientEmail !== organization?.email ? recipientEmail.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
      });

      toast.success(result.message || "Email delivered successfully");
      if (!organization) {
        setRecipientEmail("");
        setIsBroadcast(true);
      }
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to deliver email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 bg-background/50 hover:bg-muted font-medium transition-all duration-300">
            <Mail className="h-4 w-4" />
            {organization ? "Email Organization" : "Create Message"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] border border-white/10 dark:border-white/5 shadow-2xl overflow-hidden p-0 bg-background/95 backdrop-blur-xl">
        {/* Premium Background Accents */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="p-8 space-y-6 relative z-10">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {isBroadcast ? "Broadcast Communication" : organization ? `Message ${organization.org_name}` : "Direct Messaging"}
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    {isBroadcast 
                      ? "Addressing all registered organizations on the platform."
                      : organization 
                        ? `Sending official correspondence to ${organization.email}`
                        : "Direct administrative outreach to a specific recipient."}
                  </DialogDescription>
                </div>
              </div>
              
              {!organization && (
                <div className="flex flex-col items-end gap-2 pr-4">
                  <div className="flex items-center space-x-2 bg-muted/30 p-2 px-3 rounded-full border border-border/50">
                    <Switch 
                      id="broadcast-mode" 
                      checked={isBroadcast} 
                      onCheckedChange={setIsBroadcast}
                      disabled={sending}
                    />
                    <Label htmlFor="broadcast-mode" className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                      {isBroadcast ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isBroadcast ? "Broadcast" : "Direct"}
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
            <div className="md:col-span-12 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recipient Selection */}
                {!isBroadcast && !organization && (
                  <div className="space-y-2 group animate-in slide-in-from-left duration-300">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Recipient</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="e.g. administrator@domain.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        disabled={sending}
                        className="bg-muted/30 border-muted-foreground/10 focus:border-primary/50 focus-visible:ring-primary/20 py-6 pl-10 h-12"
                      />
                    </div>
                  </div>
                )}

                {/* Template Selector */}
                <div className={cn("space-y-2 transition-all duration-300", (!isBroadcast && !organization) ? "md:col-span-1" : "md:col-span-2")}>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Smart Templates</Label>
                  <Select onValueChange={handleTemplateSelect} disabled={sending}>
                    <SelectTrigger className="w-full bg-muted/30 border-muted-foreground/10 py-6 h-12 focus:ring-primary/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Chose a high-performance template..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                      {EMAIL_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="focus:bg-primary/10 transition-colors py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", template.bg)}>
                              <template.icon className={cn("h-4 w-4", template.color)} />
                            </div>
                            <span className="font-medium">{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="The objective of this correspondence"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                  className="bg-muted/30 border-muted-foreground/10 focus:border-primary/50 focus-visible:ring-primary/20 h-12 text-lg font-medium"
                />
              </div>
              
              {/* Message Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message" className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Correspondence Body</Label>
                  <span className="text-[10px] text-muted-foreground italic font-medium">Platform Styling Applied</span>
                </div>
                <div className="relative">
                  <Textarea
                    id="message"
                    placeholder="Articulate your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sending}
                    className="min-h-[200px] bg-muted/30 border-muted-foreground/10 focus:border-primary/50 focus-visible:ring-primary/20 text-base leading-relaxed p-6 rounded-2xl resize-none shadow-inner"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-muted-foreground font-mono">
                    {message.length} characters
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-border/10">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Secure delivery via Resend API
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                Discard
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="gap-2.5 px-10 h-12 font-bold rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Delivering...
                  </>
                ) : (
                  <>
                    <span className="mb-0.5">Send Correspondence</span>
                    <Send className="h-4 w-4 rotate-12" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
