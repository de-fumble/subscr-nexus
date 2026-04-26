import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Plus, Users, RefreshCw, Loader2,
  Copy, Check, LayoutGrid, List, MoreVertical, Pencil
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useOrgRole } from "@/hooks/useOrgRole";
import { PlansHubLinkCard } from "@/components/PlansHubLinkCard";
import { PlanManagementDialog } from "@/components/PlanManagementDialog";
import { EditPlanFeaturesDialog } from "@/components/EditPlanFeaturesDialog";
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

const intervalShort: Record<string, string> = {
  daily: "day", weekly: "wk", monthly: "mo",
  quarterly: "qtr", annually: "yr",
};

const Plans = () => {
  const navigate = useNavigate();
  const { canCreatePlans, canWrite } = useOrgRole();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [planToManage, setPlanToManage] = useState<Plan | null>(null);
  const [planToEditFeatures, setPlanToEditFeatures] = useState<Plan | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      let orgId = null, orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations").select("id, org_name, email, logo_url")
        .eq("user_id", user.id).maybeSingle();
      if (ownedOrg) { orgId = ownedOrg.id; orgData = ownedOrg; }
      else {
        const { data: membership } = await supabase
          .from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase
            .from("organizations").select("id, org_name, email, logo_url")
            .eq("id", membership.org_id).maybeSingle();
          orgData = memberOrg;
        }
      }
      setOrganization(orgData);
      if (!orgId) return;

      const { data: plansData, error } = await supabase
        .from("subscription_plans").select("*").eq("org_id", orgId)
        .order("is_active", { ascending: false }).order("created_at", { ascending: false });
      if (error) { toast.error("Failed to load plans"); return; }

      const { data: subscriberData } = await supabase.functions.invoke('list-subscribers');
      let subscriberCountByPlan: Record<string, number> = {};
      if (subscriberData?.subscribers) {
        subscriberData.subscribers.forEach((sub: any) => {
          subscriberCountByPlan[sub.plan_name] = (subscriberCountByPlan[sub.plan_name] || 0) + 1;
        });
      }
      setPlans((plansData || []).map(p => ({ ...p, subscriber_count: subscriberCountByPlan[p.name] || 0 })));
    } catch { toast.error("Failed to load plans"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const copySubscriptionLink = async (planId: string) => {
    const link = `${window.location.origin}/subscribe/${planId}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(planId);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleArchivePlan = async (planId: string) => {
    setArchiving(true);
    try {
      const { data, error } = await supabase.functions.invoke('archive-plan', { body: { planId } });
      if (error) throw error;
      if (data?.success) toast.success(data.message || "Plan archived");
      else throw new Error(data?.error || "Failed");
      fetchPlans();
    } catch { toast.error("Failed to archive plan"); }
    finally { setArchiving(false); }
  };

  const activePlans = plans.filter(p => p.is_active);
  const deletedPlans = plans.filter(p => !p.is_active);

  const renderPlanGrid = (plan: Plan) => (
    <div
      key={plan.id}
      className="flex flex-col rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-medium text-base text-foreground">{plan.name}</h3>
        {plan.category && (
          <Badge variant="secondary" className="font-normal text-xs">{plan.category}</Badge>
        )}
      </div>

      <div className="mb-4">
        <span className="text-2xl font-semibold text-foreground">
          ₦{plan.price.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground ml-1">
          /{intervalShort[plan.interval] || plan.interval}
        </span>
      </div>

      {plan.description && (
        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">{plan.description}</p>
      )}

      <div className="mt-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Users className="h-4 w-4" />
          <span>{plan.subscriber_count} active {(plan.subscriber_count === 1) ? 'subscriber' : 'subscribers'}</span>
        </div>

        <div className="flex gap-2">
          {plan.is_active && (
            <Button
              onClick={() => setPlanToManage(plan)}
              variant="outline"
              className="w-full font-medium"
            >
              Manage
            </Button>
          )}
          <Button
            onClick={() => copySubscriptionLink(plan.id)}
            variant="outline"
            className="w-full font-medium"
            disabled={!plan.is_active}
          >
            {copiedId === plan.id ? "Copied" : "Copy Link"}
          </Button>

          {canWrite && plan.is_active && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="cursor-pointer font-medium"
                  onClick={() => setPlanToEditFeatures(plan)}
                >
                  <Pencil className="h-4 w-4 mr-2 text-accent" />
                  Edit Features
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setPlanToDelete(plan.id)}
                >
                  Archive Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );

  const renderPlanRow = (plan: Plan) => (
    <div
      key={plan.id}
      className="flex items-center gap-4 px-4 py-4 rounded-lg border bg-card shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{plan.name}</p>
        {plan.description && <p className="text-sm text-muted-foreground truncate mt-1">{plan.description}</p>}
      </div>
      
      {plan.category && (
        <Badge variant="secondary" className="hidden sm:inline-flex font-normal shrink-0">
          {plan.category}
        </Badge>
      )}
      
      <div className="text-right shrink-0 w-28">
        <p className="font-medium text-sm text-foreground">₦{plan.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">/{intervalShort[plan.interval] || plan.interval}</p>
      </div>
      
      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground w-32 shrink-0">
        <Users className="h-4 w-4" />
        <span>{plan.subscriber_count} active</span>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {plan.is_active && (
          <Button onClick={() => setPlanToManage(plan)} variant="outline" size="sm" className="font-medium">
            Manage
          </Button>
        )}
        <Button onClick={() => copySubscriptionLink(plan.id)} variant="outline" size="sm" className="font-medium" disabled={!plan.is_active}>
          {copiedId === plan.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        {canWrite && plan.is_active && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-9 px-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="cursor-pointer font-medium"
                onClick={() => setPlanToEditFeatures(plan)}
              >
                <Pencil className="h-4 w-4 mr-2 text-accent" />
                Edit Features
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => setPlanToDelete(plan.id)}
              >
                Archive Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <SidebarInset><PremiumLoader message="Loading plans..." /><FloatingSupport /></SidebarInset>
  );

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <SidebarTrigger />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium text-foreground">Subscription Plans</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => fetchPlans(true)} disabled={refreshing} className="h-8 w-8">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          {canCreatePlans && (
            <Button onClick={() => navigate("/plans/create")} size="sm" className="h-8 gap-2 font-medium">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Plan</span>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {organization && <PlansHubLinkCard orgId={organization.id} orgName={organization.org_name} />}

          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h3 className="text-base font-medium text-foreground mb-2">No plans yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first subscription plan to start accepting recurring payments.
              </p>
              {canCreatePlans && (
                <Button onClick={() => navigate("/plans/create")} className="font-medium gap-2">
                  <Plus className="h-4 w-4" /> Create Plan
                </Button>
              )}
            </div>
          ) : (
            <Tabs defaultValue="active" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="active">
                    Active <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{activePlans.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="deleted">
                    Archived <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{deletedPlans.length}</span>
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-1 rounded-md border p-1 bg-muted/20">
                  <Button variant="ghost" size="icon"
                    className={`h-7 w-7 rounded-sm ${viewMode === "grid" ? "bg-background shadow-sm" : "hover:bg-muted"}`}
                    onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon"
                    className={`h-7 w-7 rounded-sm ${viewMode === "list" ? "bg-background shadow-sm" : "hover:bg-muted"}`}
                    onClick={() => setViewMode("list")}>
                    <List className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <TabsContent value="active" className="m-0 focus-visible:outline-none">
                {activePlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                    No active plans.
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activePlans.map((plan) => renderPlanGrid(plan))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activePlans.map((plan) => renderPlanRow(plan))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deleted" className="m-0 focus-visible:outline-none">
                {deletedPlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                    No archived plans.
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {deletedPlans.map((plan) => renderPlanGrid(plan))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deletedPlans.map((plan) => renderPlanRow(plan))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <FloatingSupport />

      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This plan will be archived and hidden from new subscribers. Existing subscription data is preserved. This action cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (planToDelete) { handleArchivePlan(planToDelete); setPlanToDelete(null); } }}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
            >
              {archiving ? "Archiving..." : "Archive Plan"}
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

      {planToEditFeatures && (
        <EditPlanFeaturesDialog
          open={!!planToEditFeatures}
          onOpenChange={(open) => !open && setPlanToEditFeatures(null)}
          plan={planToEditFeatures}
          onFeaturesUpdated={() => fetchPlans(true)}
        />
      )}
    </SidebarInset>
  );
};

export default Plans;