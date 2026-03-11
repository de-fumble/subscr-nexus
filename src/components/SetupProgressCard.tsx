import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Key, CreditCard, Share2, ExternalLink, Webhook, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SetupProgressCardProps {
  hasPaymentProvider: boolean;
  hasPlans: boolean;
  orgId?: string;
  orgName?: string;
}

export function SetupProgressCard({ hasPaymentProvider, hasPlans, orgId, orgName }: SetupProgressCardProps) {
  const navigate = useNavigate();
  const webhookUrl = "https://hhldoattlleyetxylfav.supabase.co/functions/v1/paystack-webhook";

  // Calculate progress percentage
  // Step 4 (sharing) is automatically considered complete if plans exist
  const step4Completed = hasPlans; // Sharing is available once plans exist
  const completedSteps = [hasPaymentProvider, hasPaymentProvider /* webhook implies keys */, hasPlans, step4Completed].filter(Boolean).length;
  const progressPercentage = (completedSteps / 4) * 100;

  // If no orgId, don't show (still loading)
  if (!orgId) {
    return null;
  }

  // Always render — the parent page controls visibility

  const steps = [
    {
      id: 1,
      title: "Connect Payment Provider",
      description: hasPaymentProvider
        ? "Your Paystack API keys are configured. Payments will be routed through your account."
        : "Connect your Paystack account by adding your API keys. If you don't have Paystack API keys, we'll help you collect payments through our system.",
      completed: hasPaymentProvider,
      action: "Configure Payment",
      icon: Key,
      onClick: () => navigate("/dashboard/settings"),
    },
    {
      id: 2,
      title: "Configure Webhook URL (Required)",
      description: hasPaymentProvider
        ? "Your webhook should be configured to receive payment alerts. Verify this in your Settings."
        : (
          <span>
            Copy this unique Webhook URL and paste it into your Paystack Dashboard to enable real-time payment syncing:
            <code className="block mt-2 p-2 bg-muted rounded text-xs break-all border border-border">{webhookUrl}</code>
          </span>
        ),
      completed: hasPaymentProvider,
      action: "Copy Webhook URL",
      icon: Webhook,
      onClick: () => {
        navigator.clipboard.writeText(webhookUrl);
        toast.success("Webhook URL copied to clipboard!");
      },
    },
    {
      id: 3,
      title: "Create Your First Plan",
      description: hasPlans
        ? "You have successfully created subscription plans for your customers."
        : "Navigate to the Plans section in the sidebar and create your first subscription plan by entering the plan details including name, price, and billing interval.",
      completed: hasPlans,
      action: "Go to Plans",
      icon: CreditCard,
      onClick: () => navigate("/plans"),
      disabled: !hasPaymentProvider, // Disable if keys aren't added
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
    <Card className="glass-card border-0 shadow-[var(--shadow-medium)] mb-6 border-accent/20">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <CardTitle className="text-base sm:text-xl font-bold text-foreground">
          Setup Your Payment System
        </CardTitle>
        <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
          Complete these steps to start collecting payments
        </CardDescription>
        <div className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-foreground">
              Progress: {completedSteps} of 4 steps
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed;
          const isDisabled = step.disabled;

          return (
            <div
              key={step.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all",
                isCompleted
                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : isDisabled
                    ? "bg-muted/30 border-border/50 opacity-60"
                    : "bg-muted/30 border-border/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-3 sm:contents">
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 sm:hidden">
                  <div className="flex items-center gap-2">
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )} />
                    <h3 className={cn(
                      "font-semibold text-sm text-foreground",
                      isCompleted && "text-green-700 dark:text-green-300"
                    )}>
                      Step {step.id}: {step.title}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="hidden sm:flex items-center gap-2 mb-2">
                  <Icon className={cn(
                    "h-5 w-5",
                    isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )} />
                  <h3 className={cn(
                    "font-semibold text-foreground",
                    isCompleted && "text-green-700 dark:text-green-300"
                  )}>
                    Step {step.id}: {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                <div className="mt-3 sm:mt-2 flex sm:justify-end">
                  <Button
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                    onClick={step.onClick}
                    disabled={isDisabled || isCompleted}
                    className={cn(
                      "w-full sm:w-auto gap-2 text-xs sm:text-sm",
                      isCompleted && "border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      <>
                        {step.action}
                        {step.action.includes("Copy") ? <Copy className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {hasPlans && orgId && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground mb-1">
                  Ready to share with customers?
                </p>
                <p className="text-xs text-muted-foreground break-all">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{window.location.origin}/plans-hub/{orgId}</code>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/plans")}
                className="gap-2 shrink-0 w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4" />
                View Plans Hub
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
