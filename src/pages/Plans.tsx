import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ExternalLink, Archive, Users, RefreshCw, Loader2, Settings } from "lucide-react";
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
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { PlansHubLinkCard } from "@/components/PlansHubLinkCard";
import { PlanManagementDialog } from "@/components/PlanManagementDialog";
import { FloatingSupport } from "@/components/FloatingSupport";

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

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const Plans = () => {
  const navigate = useNavigate();
  const { canCreatePlans, canWrite, role, canAccessSettings } = useOrgRole();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [planToManage, setPlanToManage] = useState<Plan | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // Get organization - check if owner first, then check membership
      let orgId = null;
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
        orgData = ownedOrg;
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);
      if (!orgId) return;

      // Fetch plans for this organization
      const { data: plansData, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("org_id", orgId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching plans:", error);
        toast.error("Failed to load plans");
        return;
      }

      // Fetch subscriber counts from Paystack
      const { data: subscriberData, error: subError } = await supabase.functions.invoke('list-subscribers');
      
      let subscriberCountByPlan: Record<string, number> = {};
      
      if (!subError && subscriberData?.subscribers) {
        // Group subscribers by plan_name and count
        subscriberData.subscribers.forEach((sub: any) => {
          const planName = sub.plan_name;
          subscriberCountByPlan[planName] = (subscriberCountByPlan[planName] || 0) + 1;
        });
      }

      const plansWithCounts = (plansData || []).map((plan) => ({
        ...plan,
        subscriber_count: subscriberCountByPlan[plan.name] || 0,
      }));

      setPlans(plansWithCounts);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const copySubscriptionLink = (planId: string) => {
    const link = `${window.location.origin}/subscribe/${planId}`;
    navigator.clipboard.writeText(link);
    toast.success("Subscription link copied to clipboard!");
  };

  const handleArchivePlan = async (planId: string) => {
    setArchiving(true);
    try {
      const { data, error } = await supabase.functions.invoke('archive-plan', {
        body: { planId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || "Plan deleted and subscriptions cancelled");
      } else {
        throw new Error(data?.error || "Failed to archive plan");
      }
      
      fetchPlans();
    } catch (error) {
      console.error("Error archiving plan:", error);
      toast.error("Failed to archive plan");
    } finally {
      setArchiving(false);
    }
  };

  const activePlans = plans.filter(p => p.is_active);
  const deletedPlans = plans.filter(p => !p.is_active);

  const renderPlanCard = (plan: Plan, index: number) => (
    <Card
      key={plan.id}
      className="p-6 glass-card border-0 shadow-[var(--shadow-medium)] transition-all duration-300 hover:shadow-[var(--shadow-strong)] animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">
            {plan.name}
          </h3>
          {plan.category && (
            <span className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {plan.category}
            </span>
          )}
        </div>
        <Badge variant={plan.is_active ? "default" : "secondary"}>
          {plan.is_active ? "Active" : "Deleted"}
        </Badge>
      </div>

      {plan.description && (
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {plan.description}
        </p>
      )}

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            ₦{plan.price.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            / {plan.interval}
          </span>
        </div>
      </div>

      {/* Subscriber count */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{plan.subscriber_count} subscriber{plan.subscriber_count !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {plan.is_active && (
          <Button
            onClick={() => setPlanToManage(plan)}
            variant="default"
            className="w-full gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Plan
          </Button>
        )}
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
        {canWrite && plan.is_active && (
          <Button
            onClick={() => setPlanToDelete(plan.id)}
            variant="destructive"
            className="w-full gap-2"
          >
            <Archive className="h-4 w-4" />
            Delete Plan
          </Button>
        )}
      </div>
    </Card>
  );

  if (loading) {
    return (
      <SidebarInset>
        <PremiumLoader message="Loading plans..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
        <SidebarTrigger />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Subscription Plans</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchPlans(true)}
            disabled={refreshing}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          {canCreatePlans && (
            <Button
              onClick={() => navigate("/plans/create")}
              className="bg-accent hover:bg-accent/90 gap-2 text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Plan</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6">
            <p className="text-muted-foreground">Manage your recurring payment plans</p>
          </div>

          {/* Plans Hub Link Card */}
          {organization && (
            <div className="mb-6">
              <PlansHubLinkCard
                orgId={organization.id}
                orgName={organization.org_name}
              />
            </div>
          )}

          {plans.length === 0 ? (
            <Card className="p-12 glass-card border-0 shadow-[var(--shadow-medium)]">
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
                {canCreatePlans && (
                  <Button
                    onClick={() => navigate("/plans/create")}
                    className="bg-accent hover:bg-accent/90"
                  >
                    Create Your First Plan
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  Active Plans
                  <Badge variant="secondary" className="ml-1">{activePlans.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="deleted" className="gap-2">
                  Deleted Plans
                  <Badge variant="secondary" className="ml-1">{deletedPlans.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {activePlans.length === 0 ? (
                  <Card className="p-8 glass-card border-0">
                    <div className="text-center text-muted-foreground">
                      <p>No active plans</p>
                      {canCreatePlans && (
                        <Button
                          onClick={() => navigate("/plans/create")}
                          className="mt-4"
                          variant="outline"
                        >
                          Create a Plan
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activePlans.map((plan, index) => renderPlanCard(plan, index))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deleted">
                {deletedPlans.length === 0 ? (
                  <Card className="p-8 glass-card border-0">
                    <div className="text-center text-muted-foreground">
                      <p>No deleted plans</p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {deletedPlans.map((plan, index) => renderPlanCard(plan, index))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <FloatingSupport />

      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent className="glass-card">
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
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving ? "Cancelling subscriptions..." : "Archive Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {planToManage && (
        <PlanManagementDialog
          open={!!planToManage}
          onOpenChange={(open) => !open && setPlanToManage(null)}
          plan={planToManage}
          onSubscriberRemoved={() => fetchPlans(true)}
        />
      )}
    </SidebarInset>
  );
};

export default Plans;