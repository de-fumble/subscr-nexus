import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, ExternalLink, Archive, Users } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  category: string | null;
  paystack_plan_code: string;
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
}

const Plans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get organization
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!org) return;

      // Fetch plans with subscriber counts
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(`
          *,
          subscribers(count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching plans:", error);
        toast.error("Failed to load plans");
        return;
      }

      const plansWithCounts = data.map((plan) => ({
        ...plan,
        subscriber_count: plan.subscribers?.[0]?.count || 0,
      }));

      setPlans(plansWithCounts);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const copySubscriptionLink = (planId: string) => {
    const link = `${window.location.origin}/subscribe/${planId}`;
    navigator.clipboard.writeText(link);
    toast.success("Subscription link copied to clipboard!");
  };

  const handleArchivePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: false })
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plan deleted successfully");
      fetchPlans();
    } catch (error) {
      console.error("Error archiving plan:", error);
      toast.error("Failed to archive plan");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="border-b border-border/30 bg-gradient-card backdrop-blur-xl shadow-medium">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-accent-soft hover:text-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">
                  Subscription Plans
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all your recurring payment plans
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/plans/create")}
              variant="premium"
              className="gap-2"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-16 shadow-elegant">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 shadow-soft">
                <Plus className="h-10 w-10 text-accent" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-foreground">
                No plans created yet
              </h3>
              <p className="mb-8 text-muted-foreground max-w-md mx-auto">
                Create your first subscription plan to start accepting recurring payments
              </p>
              <Button
                onClick={() => navigate("/plans/create")}
                variant="premium"
                size="lg"
              >
                Create Your First Plan
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Card
                key={plan.id}
                className="p-8 transition-all duration-500 hover:shadow-elegant hover:-translate-y-1 animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground group-hover:gradient-text transition-all">
                      {plan.name}
                    </h3>
                    {plan.category && (
                      <span className="mt-3 inline-block rounded-full bg-gradient-to-r from-accent/10 to-accent-deep/10 px-4 py-1.5 text-xs font-semibold text-accent border border-accent/20 shadow-soft">
                        {plan.category}
                      </span>
                    )}
                  </div>
                  <div className={`rounded-full px-4 py-1.5 text-xs font-bold shadow-soft ${
                    plan.is_active
                      ? "bg-gradient-to-r from-accent/20 to-accent/10 text-accent border border-accent/30"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {plan.is_active ? "Active" : "Deleted"}
                  </div>
                </div>

                {plan.description && (
                  <p className="mb-6 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {plan.description}
                  </p>
                )}

                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold gradient-text">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">
                      / {plan.interval}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {plan.subscriber_count || 0} active subscribers
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => copySubscriptionLink(plan.id)}
                    variant="outline"
                    className="w-full gap-2 hover:bg-accent-soft hover:text-accent hover:border-accent"
                    disabled={!plan.is_active}
                    title={plan.is_active ? "Copy subscription link" : "This plan is deleted"}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copy Subscription Link
                  </Button>
                  <Button
                    onClick={() => handleArchivePlan(plan.id)}
                    variant="destructive"
                    className="w-full gap-2 shadow-medium hover:shadow-strong"
                  >
                    <Archive className="h-4 w-4" />
                    Delete Plan
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
