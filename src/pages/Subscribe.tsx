import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Lock, CreditCard, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
        .select("org_name, logo_url")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <div className="glass-card max-w-md rounded-2xl border border-border/50 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Plan Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This subscription plan is no longer available or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 sm:py-12">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Plan Details Section */}
          <div className="order-2 lg:order-1">
            <div className="glass-card rounded-2xl border border-border/50 p-6 backdrop-blur-xl sm:p-8">
              {/* Organization branding */}
              {organization && (
                <div className="mb-6 flex items-center gap-3">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.org_name}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {organization.org_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    {organization.org_name}
                  </span>
                </div>
              )}

              {/* Plan name and category */}
              <div className="mb-6">
                {plan.category && (
                  <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {plan.category}
                  </span>
                )}
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {plan.name}
                </h1>
                {plan.description && (
                  <p className="mt-3 text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price display */}
              <div className="mb-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground sm:text-5xl">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/ {plan.interval}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Billed {plan.interval}ly • Cancel anytime
                </p>
              </div>

              {/* Features/Benefits */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">What you'll get:</h3>
                <ul className="space-y-2">
                  {[
                    "Full access to all features",
                    "Priority customer support",
                    "Automatic renewal",
                    "Secure payment processing",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Subscription Form Section */}
          <div className="order-1 lg:order-2">
            <div className="glass-card rounded-2xl border border-border/50 p-6 backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Complete your subscription
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your details to get started
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
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

                {/* Trust indicators */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>256-bit SSL encrypted</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 border-t border-border/50 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Instant Activation</span>
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    You will be redirected to Paystack to complete your payment securely.
                    <br />
                    <span className="mt-1 inline-flex items-center gap-1 text-primary/80">
                      <Shield className="h-3 w-3" />
                      Powered by Paystack
                    </span>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
