import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, ExternalLink, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

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

      // Get organization - check if owner first, then check membership
      let orgId = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          orgId = membership.org_id;
        }
      }

      if (!orgId) return;

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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Subscription Plans
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your recurring payment plans
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/plans/create")}
              className="bg-accent hover:bg-accent/90 gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                No plans yet
              </h3>
              <p className="mb-6 text-muted-foreground">
                Create your first subscription plan to start accepting payments
              </p>
              <Button
                onClick={() => navigate("/plans/create")}
                className="bg-accent hover:bg-accent/90"
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
                className="p-6 transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    {plan.category && (
                      <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {plan.category}
                      </span>
                    )}
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                    plan.is_active
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {plan.is_active ? "Active" : "Deleted"}
                  </div>
                </div>

                {plan.description && (
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {plan.interval}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => copySubscriptionLink(plan.id)}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={!plan.is_active}
                    title={plan.is_active ? "Copy subscription link" : "This plan is deleted"}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copy Subscription Link
                  </Button>
                  <Button
                    onClick={() => setPlanToDelete(plan.id)}
                    variant="destructive"
                    className="w-full gap-2"
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

      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This plan will be archived, not permanently deleted. It will no longer be visible to new subscribers, but existing subscription data will be preserved for auditing purposes. You can view archived plans in your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (planToDelete) {
                  handleArchivePlan(planToDelete);
                  setPlanToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Plans;
