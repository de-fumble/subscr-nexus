import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Circle, ArrowRight, Key, CreditCard, Share2, ExternalLink, Webhook, Copy, Clock, Shield, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SetupProgressCardProps {
  hasPaymentProvider: boolean;
  hasPlans: boolean;
  orgId?: string;
  orgName?: string;
  isRecurraPending?: boolean;    // recurra_handling_request = true but recurra_keys_managed = false
  isRecurraManaged?: boolean;    // recurra_keys_managed = true (admin approved)
}

export function SetupProgressCard({ hasPaymentProvider, hasPlans, orgId, orgName, isRecurraPending, isRecurraManaged }: SetupProgressCardProps) {
  const navigate = useNavigate();
  const webhookUrl = "https://hhldoattlleyetxylfav.supabase.co/functions/v1/paystack-webhook";
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPendingKeysModalOpen, setIsPendingKeysModalOpen] = useState(false);

  // Calculate progress percentage
  // Step 4 (sharing) is automatically considered complete if plans exist
  const step4Completed = hasPlans; // Sharing is available once plans exist
  const completedSteps = [hasPaymentProvider, hasPaymentProvider /* webhook implies keys */, hasPlans, step4Completed].filter(Boolean).length;
  const progressPercentage = (completedSteps / 4) * 100;

  // If no orgId, don't show (still loading)
  if (!orgId) {
    return null;
  }

  // Handle "Create Plan" click when Recurra is pending
  const handleCreatePlanClick = () => {
    if (isRecurraPending) {
      setIsPendingKeysModalOpen(true);
      return;
    }
    navigate("/plans");
  };

  const steps = [
    {
      id: 1,
      title: "Connect Payment Provider",
      description: isRecurraManaged
        ? "Recurra is managing your payment processing. No configuration needed on your end."
        : isRecurraPending
          ? "Your request for Recurra to manage payments is being reviewed. Secure keys will be assigned shortly."
          : hasPaymentProvider
            ? "Your Paystack API keys are configured. Payments will be routed through your account."
            : "Connect your Paystack account by adding your API keys. If you don't have Paystack API keys, we'll help you collect payments through our system.",
      completed: hasPaymentProvider,
      isPending: isRecurraPending,
      action: isRecurraManaged ? "Managed by Recurra" : isRecurraPending ? "Pending Approval" : hasPaymentProvider ? "Done" : "Configure Payment",
      icon: isRecurraPending ? Clock : isRecurraManaged ? Shield : Key,
      onClick: () => {
        if (!isRecurraPending && !isRecurraManaged && !hasPaymentProvider) {
          setIsPaymentModalOpen(true);
        }
      },
    },
    {
      id: 2,
      title: "Configure Webhook URL (Required)",
      description: isRecurraManaged
        ? "Webhooks are automatically configured when Recurra manages your payments."
        : hasPaymentProvider
          ? "Your webhook should be configured to receive payment alerts. Verify this in your Settings."
          : (
            <span>
              Copy this unique Webhook URL and paste it into your Paystack Dashboard to enable real-time payment syncing:
              <code className="block mt-2 p-2 bg-muted rounded text-xs break-all border border-border">{webhookUrl}</code>
            </span>
          ),
      completed: hasPaymentProvider || isRecurraManaged,
      isPending: isRecurraPending,
      action: isRecurraManaged ? "Auto-configured" : "Copy Webhook URL",
      icon: Webhook,
      onClick: () => {
        if (!isRecurraManaged) {
          navigator.clipboard.writeText(webhookUrl);
          toast.success("Webhook URL copied to clipboard!");
        }
      },
    },
    {
      id: 3,
      title: "Create Your First Plan",
      description: hasPlans
        ? "You have successfully created subscription plans for your customers."
        : isRecurraPending
          ? "Plan creation will be available once the system finishes assigning your secure keys."
          : "Navigate to the Plans section in the sidebar and create your first subscription plan by entering the plan details including name, price, and billing interval.",
      completed: hasPlans,
      action: "Go to Plans",
      icon: CreditCard,
      onClick: handleCreatePlanClick,
      disabled: !hasPaymentProvider || isRecurraPending, // Disable if keys aren't added OR pending
    },
    {
      id: 4,
      title: "Share Your Plans Hub",
      description: hasPlans
        ? "Share your Plans Hub link or QR code with customers to enable them to view and subscribe to your plans. Access this from the Plans page."
        : "Once you've created your first plan, you can share your Plans Hub link or QR code with customers to collect and manage payments.",
      completed: hasPlans,
      action: "View Plans Hub",
      icon: Share2,
      onClick: () => navigate("/plans"),
      disabled: !hasPlans,
    },
  ];

  return (
    <Card className="glass-card border-0 shadow-2xl mb-8 border-accent/20 overflow-hidden rounded-3xl">
      <CardHeader className="px-5 sm:px-8 py-4 sm:py-5 bg-muted/40 border-b border-border/50 relative overflow-hidden">
        {/* Progress background glow */}
        <div 
          className="absolute inset-0 bg-accent/5 transition-all duration-1000" 
          style={{ width: `${progressPercentage}%` }}
        />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                Setup Checklist
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Getting you ready for business
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xl sm:text-2xl font-black text-accent tabular-nums leading-none">
                {Math.round(progressPercentage)}%
              </span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                Setup Progress
              </span>
            </div>
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <div className="hidden sm:flex flex-col items-start px-3 py-1 bg-accent/10 rounded-lg border border-accent/20">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">
                Step {completedSteps} / 4
              </span>
              <span className="text-[8px] font-medium text-muted-foreground mt-0.5">
                Onboarding Progress
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 relative">
          <Progress value={progressPercentage} className="h-1.5 rounded-full bg-accent/10" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed;
          const isDisabled = step.disabled;
          const isPending = step.isPending;

          return (            <div
              key={step.id}
              className={cn(
                "group relative flex gap-4 p-4 sm:p-6 transition-all duration-300",
                index < 2 && "md:border-b md:border-border/40",
                isCompleted
                  ? "bg-green-50/10 dark:bg-green-950/5"
                  : isPending
                    ? "bg-amber-50/10 dark:bg-amber-950/5"
                    : isDisabled
                      ? "bg-muted/10 opacity-60"
                      : "hover:bg-accent/[0.02] active:bg-accent/[0.04]"
              )}
            >
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-500 shadow-sm",
                  isCompleted
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : isPending
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : isDisabled
                        ? "bg-muted text-muted-foreground/50"
                        : "bg-accent/10 text-accent group-hover:scale-110 group-hover:shadow-md group-hover:shadow-accent/10"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
                  ) : isPending ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={cn(
                    "text-sm sm:text-base font-bold leading-none mb-1.5 tracking-tight",
                    isCompleted ? "text-green-700 dark:text-green-300"
                      : isPending ? "text-amber-700 dark:text-amber-300"
                        : "text-foreground"
                  )}>
                    {step.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {step.description}
                  </p>
                </div>

                <div className="shrink-0 flex items-center">
                  <Button
                    variant={isCompleted ? "ghost" : isPending ? "outline" : "default"}
                    size="sm"
                    onClick={step.onClick}
                    disabled={isDisabled || isCompleted || isPending}
                    className={cn(
                      "w-full h-8 sm:h-9 px-4 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300",
                      isCompleted 
                        ? "text-green-600 hover:text-green-600 bg-transparent cursor-default" 
                        : isPending
                          ? "text-amber-600 border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/30 cursor-default"
                          : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.01]"
                    )}
                  >
                    {isCompleted ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Done
                      </span>
                    ) : isPending ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {step.action}
                      </span>
                    ) : (
                      <>
                        {step.action}
                        {step.action.includes("Copy") ? <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1.5" /> : <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1.5" />}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {hasPlans && orgId && (
          <div className="p-4 sm:p-6 bg-accent/5 border-t border-accent/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-[0.2em] opacity-70">
                  Your Public Hub
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 overflow-hidden">
                  <code className="text-[10px] sm:text-xs bg-muted/70 px-2 py-1 rounded border border-border/50 truncate font-mono">
                    {window.location.origin}/plans-hub/{orgId}
                  </code>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/plans")}
                className="gap-2 shrink-0 h-9 sm:h-10 px-4 sm:px-6 rounded-lg border-accent/20 hover:bg-accent/10 transition-all duration-300"
              >
                <ExternalLink className="h-4 w-4" />
                View Hub
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Payment Configuration Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[700px] border-accent/20 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Choose Payment Configuration</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              How would you like to handle payments on your platform?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <Card 
              className="relative overflow-hidden cursor-pointer hover:border-accent/50 transition-all group border-2 border-accent/30 hover:border-accent shadow-md shadow-accent/5"
              onClick={async () => {
                setIsPaymentModalOpen(false);
                if (orgId) {
                  try {
                    const { error } = await supabase.from("organizations").update({ recurra_handling_request: true }).eq("id", orgId);
                    if (error) throw error;
                    toast.success("Request submitted! Recurra will assign secure keys shortly.");
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (error: any) {
                    toast.error("Failed to set preference: " + error.message);
                  }
                } else {
                  toast.success("Recurra Payment Handling selected.");
                }
              }}
            >
              {/* Recommended badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                  <Sparkles className="h-2.5 w-2.5" />
                  Recommended
                </span>
              </div>
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3 border-b border-border/40 bg-accent/5">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 rounded-full bg-accent/15 items-center justify-center text-accent">
                    <Shield className="h-4 w-4" />
                  </span>
                  Let Recurra Handle It
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">2.5% charge</strong> on every payment made as Recurra's fee.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    No setup needed — start collecting immediately
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    Secure keys managed by our team
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    Webhook auto-configured for you
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className="relative overflow-hidden cursor-pointer hover:border-accent/50 transition-all group border-2 border-transparent hover:border-accent"
              onClick={() => {
                setIsPaymentModalOpen(false);
                navigate("/dashboard/settings");
              }}
            >
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 rounded-full bg-muted items-center justify-center text-muted-foreground group-hover:text-accent transition-colors">
                    <Key className="h-4 w-4" />
                  </span>
                  Configure Your Own
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">0% charge</strong> from Recurra. No prior fee unless payment for the software license is required.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    Full control of your payment flow
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    Connect your own Paystack gateway
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    Manual webhook configuration
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Keys Modal - shown when user tries to create plans while keys are pending */}
      <Dialog open={isPendingKeysModalOpen} onOpenChange={setIsPendingKeysModalOpen}>
        <DialogContent className="sm:max-w-[440px] border-amber-500/20 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col items-center text-center py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-5">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-lg font-bold mb-2">Secure Keys Being Assigned</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Plans cannot be created until the system is done assigning secure keys.
            </DialogDescription>
            <p className="text-xs text-muted-foreground/70 mt-3">
              This usually takes a short while. You'll be notified once your account is ready.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPendingKeysModalOpen(false)}
              className="mt-6 rounded-lg px-6"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
