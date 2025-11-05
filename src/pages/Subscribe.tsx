import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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

const Subscribe = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
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

      // Redirect to Paystack checkout
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Plan Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This subscription plan is no longer available.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-2xl px-6">
        <Card className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">{plan.name}</h1>
            {plan.category && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {plan.category}
              </span>
            )}
            {plan.description && (
              <p className="mt-4 text-muted-foreground">{plan.description}</p>
            )}
            <div className="mt-6">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-foreground">
                  ₦{plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/ {plan.interval}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent hover:bg-accent/90"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You will be redirected to Paystack to complete your payment securely.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;
