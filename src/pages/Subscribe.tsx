import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Lock, CreditCard, CheckCircle2, Sparkles, ArrowLeft, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import logoImage from "@/assets/logo.png";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  category: string | null;
  paystack_plan_code: string;
  org_id: string;
}

interface Organization {
  org_name: string;
  logo_url: string | null;
  email: string;
}

const Subscribe = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Plan not found or inactive");
        return;
      }

      setPlan(data);

      // Fetch organization details
      const { data: orgData } = await supabase
        .from("organizations")
        .select("org_name, logo_url, email")
        .eq("id", data.org_id)
        .single();

      if (orgData) {
        setOrganization(orgData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("initialize-subscription", {
        body: {
          email: formData.email,
          name: formData.name,
          plan_code: plan?.paystack_plan_code,
          plan_id: planId,
        },
      });

      if (error) {
        console.error("Error:", error);
        toast.error(error.message || "Failed to initialize subscription");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to start subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const getIntervalText = (interval: string) => {
    const map: Record<string, string> = {
      daily: "day",
      weekly: "week",
      monthly: "month",
      quarterly: "quarter",
      biannually: "6 months",
      annually: "year",
    };
    return map[interval] || interval;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        {/* Premium background decorations */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -left-60 -top-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-60 -right-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        {/* Header skeleton */}
        <header className="sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
              <div className="h-5 w-24 rounded-lg bg-muted/50 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-full bg-muted/50 animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 sm:py-10 lg:py-16">
          <div className="max-w-2xl mx-auto">
            {/* Premium skeleton card */}
            <div className="rounded-3xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Organization header skeleton */}
              <div className="relative p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 animate-shimmer ring-4 ring-background/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded-full bg-muted/50 animate-pulse" />
                    <div className="h-6 w-48 rounded-lg bg-muted/60 animate-shimmer" />
                    <div className="h-3 w-40 rounded-full bg-muted/40 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Content skeleton */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Plan name skeleton */}
                <div className="space-y-3">
                  <div className="h-6 w-20 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
                  <div className="h-8 w-3/4 rounded-lg bg-muted/60 animate-shimmer" />
                  <div className="h-4 w-full rounded-lg bg-muted/40 animate-pulse" />
                </div>

                {/* Price skeleton */}
                <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-5 sm:p-6 border border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative space-y-2">
                    <div className="flex items-baseline gap-2">
                      <div className="h-10 w-32 rounded-lg bg-muted/60 animate-shimmer" />
                      <div className="h-5 w-16 rounded-lg bg-muted/40 animate-pulse" />
                    </div>
                    <div className="h-4 w-40 rounded-full bg-muted/40 animate-pulse" />
                  </div>
                </div>

                {/* Features skeleton */}
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-28 rounded-full bg-muted/30 border border-border/50 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>

                <div className="border-t border-border/50" />

                {/* Form skeleton */}
                <div className="space-y-4">
                  <div className="h-5 w-48 rounded-lg bg-muted/50 animate-pulse" />
                  
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                    <div className="h-12 w-full rounded-xl bg-muted/30 border border-border/50 animate-shimmer" />
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
                    <div className="h-12 w-full rounded-xl bg-muted/30 border border-border/50 animate-shimmer" />
                  </div>

                  <div className="h-14 w-full rounded-xl bg-gradient-to-r from-primary/40 to-primary/30 animate-pulse-glow shadow-lg" />
                </div>

                {/* Trust indicators skeleton */}
                <div className="space-y-3 pt-2">
                  <div className="h-12 w-full rounded-xl bg-muted/30 border border-border/30 animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 rounded-xl border border-border/50 bg-muted/20 animate-pulse" />
                    <div className="h-16 rounded-xl border border-border/50 bg-muted/20 animate-pulse" style={{ animationDelay: '0.15s' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer skeleton */}
            <div className="mt-8 flex justify-center">
              <div className="h-4 w-64 rounded-full bg-muted/30 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <div className="glass-card max-w-md rounded-3xl border border-border/50 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Plan Not Found</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            This subscription plan is no longer available or has been deactivated.
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Premium background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -left-60 -top-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-60 -right-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoImage} alt="Recurra" className="h-10 w-10 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Recurra</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-10 lg:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Single Premium Card */}
          <div className="glass-card rounded-3xl border border-border/50 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Organization Header with Profile */}
            {organization && (
              <div className="relative p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative flex items-center gap-4">
                  {/* Organization Logo */}
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.org_name}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-4 ring-background/50 shadow-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl sm:text-3xl font-bold shadow-xl ring-4 ring-background/50 flex-shrink-0">
                      {organization.org_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">You're subscribing to</p>
                    <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">{organization.org_name}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{organization.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Details */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Plan name and category */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {plan.category && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                      <Star className="h-3 w-3" />
                      {plan.category}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {plan.name}
                </h1>
                {plan.description && (
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price display */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-5 sm:p-6 border border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  <span className="text-base sm:text-lg text-muted-foreground font-medium">
                    / {getIntervalText(plan.interval)}
                  </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  Billed {plan.interval} • Cancel anytime
                </p>
              </div>

              {/* Features list - compact */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Priority support",
                  "Auto-renewal",
                  "Secure payments",
                  "Email alerts",
                ].map((feature, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                    {feature}
                  </span>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Subscription Form */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Complete your subscription
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      disabled={submitting}
                      className="h-12 rounded-xl border-border/50 bg-background/50 px-4 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      disabled={submitting}
                      className="h-12 rounded-xl border-border/50 bg-background/50 px-4 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold text-base shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Trust indicators */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border/30">
                  <Lock className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>256-bit SSL encrypted • Your data is secure</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground text-center">Secure Payment</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground text-center">Instant Activation</span>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  You will be redirected to Paystack to complete payment
                  <span className="mt-1.5 flex items-center justify-center gap-1.5 text-primary/80 font-medium">
                    <Shield className="h-3.5 w-3.5" />
                    Powered by Paystack
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              By subscribing, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;
