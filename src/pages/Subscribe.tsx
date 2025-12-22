import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Lock, CreditCard, CheckCircle2, Sparkles, ArrowLeft, Star, Zap, Award } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-primary animate-pulse" />
        </div>
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

      <main className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12 max-w-6xl mx-auto">
          {/* Plan Details Section - 3 columns */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="glass-card rounded-3xl border border-border/50 p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-2xl">
              {/* Organization branding - Premium display */}
              {organization && (
                <div className="mb-8 flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-border/30">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.org_name}
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-primary/20 shadow-xl"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold shadow-xl">
                      {organization.org_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">You're subscribing to</p>
                    <p className="text-xl font-bold text-foreground">{organization.org_name}</p>
                  </div>
                </div>
              )}

              {/* Plan name and category */}
              <div className="mb-8">
                {plan.category && (
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
                    <Star className="h-3.5 w-3.5" />
                    {plan.category}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  {plan.name}
                </h1>
                {plan.description && (
                  <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price display - Premium styling */}
              <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 p-8 border border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xl text-muted-foreground font-medium">
                      / {getIntervalText(plan.interval)}
                    </span>
                  </div>
                  <p className="mt-3 text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Billed {plan.interval}ly • Cancel anytime
                  </p>
                </div>
              </div>

              {/* Features/Benefits - Premium list */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  What's included
                </h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {[
                    "Full access to all features",
                    "Priority customer support",
                    "Automatic renewal",
                    "Secure payment processing",
                    "Email notifications",
                    "Cancel anytime",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-muted-foreground group">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Subscription Form Section - 2 columns */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="glass-card rounded-3xl border border-border/50 p-6 sm:p-8 backdrop-blur-xl shadow-2xl sticky top-24">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Complete your subscription
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Enter your details to get started
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
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
                    className="h-12 rounded-xl border-border/50 bg-background/50 px-4 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">
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
                    className="h-12 rounded-xl border-border/50 bg-background/50 px-4 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
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

                {/* Trust indicators - Premium */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30">
                    <Lock className="h-4 w-4 text-primary" />
                    <span>256-bit SSL encrypted • Your data is secure</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground text-center">Secure Payment</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground text-center">Instant Activation</span>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground pt-2">
                    You will be redirected to Paystack to complete payment
                    <br />
                    <span className="mt-2 inline-flex items-center gap-1.5 text-primary/80 font-medium">
                      <Shield className="h-3.5 w-3.5" />
                      Powered by Paystack
                    </span>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;