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
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

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
      className={`${card} p-6 flex flex-col h-full`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-[15px] text-black dark:text-white">{plan.name}</h3>
        {plan.category && (
          <span className="px-2 py-0.5 rounded-full border border-black/8 dark:border-white/8 text-[10px] text-black/50 dark:text-white/50">{plan.category}</span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-[22px] font-semibold text-black dark:text-white">
          ₦{plan.price.toLocaleString()}
        </span>
        <span className="text-[12px] text-black/40 dark:text-white/40 ml-1">
          /{intervalShort[plan.interval] || plan.interval}
        </span>
      </div>

      {plan.description && (
        <p className="text-[12px] text-black/40 dark:text-white/40 mb-6 line-clamp-2 min-h-[40px] leading-relaxed">{plan.description}</p>
      )}

      <div className="mt-auto">
        <div className="flex items-center gap-1.5 text-[12px] text-black/35 dark:text-white/35 mb-6">
          <Users className="h-3.5 w-3.5" />
          <span>{plan.subscriber_count} active {(plan.subscriber_count === 1) ? 'subscriber' : 'subscribers'}</span>
        </div>

        <div className="flex gap-2">
          {plan.is_active && (
            <button
              onClick={() => setPlanToManage(plan)}
              className="flex-1 px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Manage
            </button>
          )}
          <button
            onClick={() => copySubscriptionLink(plan.id)}
            className="flex-1 px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            disabled={!plan.is_active}
          >
            {copiedId === plan.id ? "Copied" : "Copy Link"}
          </button>

          {canWrite && plan.is_active && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0">
                  <MoreVertical className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-[#1c1c1e] border-black/5">
                <DropdownMenuItem 
                  className="cursor-pointer font-medium text-[12px]"
                  onClick={() => setPlanToEditFeatures(plan)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2 text-black/50" />
                  Edit Features
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500 cursor-pointer text-[12px]"
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
      className={`${card} flex items-center gap-4 px-5 py-4`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] text-black dark:text-white truncate">{plan.name}</p>
        {plan.description && <p className="text-[11px] text-black/35 dark:text-white/35 truncate mt-1">{plan.description}</p>}
      </div>
      
      {plan.category && (
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full border border-black/8 dark:border-white/8 text-[10px] text-black/40 dark:text-white/40 shrink-0">
          {plan.category}
        </span>
      )}
      
      <div className="text-right shrink-0 w-28">
        <p className="font-semibold text-[13px] text-black dark:text-white">₦{plan.price.toLocaleString()}</p>
        <p className="text-[10px] text-black/35 dark:text-white/35">/{intervalShort[plan.interval] || plan.interval}</p>
      </div>
      
      <div className="hidden md:flex items-center gap-1.5 text-[12px] text-black/35 w-32 shrink-0">
        <Users className="h-3.5 w-3.5" />
        <span>{plan.subscriber_count} active</span>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {plan.is_active && (
          <button 
            onClick={() => setPlanToManage(plan)} 
            className="px-3.5 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Manage
          </button>
        )}
        <button 
          onClick={() => copySubscriptionLink(plan.id)} 
          className="p-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-black/50 dark:text-white/50" 
          disabled={!plan.is_active}
        >
          {copiedId === plan.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {canWrite && plan.is_active && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                <MoreVertical className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-[#1c1c1e] border-black/5">
              <DropdownMenuItem 
                className="cursor-pointer font-medium text-[12px]"
                onClick={() => setPlanToEditFeatures(plan)}
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-black/50" />
                Edit Features
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500 cursor-pointer text-[12px]"
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
    <SidebarInset>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Subscription Plans</h1>
      </header>
      <PremiumLoader message="Loading plans..." />
      <FloatingSupport />
    </SidebarInset>
  );

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Subscription Plans</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => fetchPlans(true)} disabled={refreshing} className={pillBtn}>
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
          {canCreatePlans && (
            <button onClick={() => navigate("/plans/create")} className={pillBtn}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Plan
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

          {organization && <PlansHubLinkCard orgId={organization.id} orgName={organization.org_name} />}

          {plans.length === 0 ? (
            <div className={`${card} p-12 text-center`}>
              <h3 className="text-[14px] font-semibold mb-1 text-black dark:text-white">No plans yet</h3>
              <p className="text-[12px] text-black/30 max-w-xs mx-auto mb-6">
                Create your first subscription plan to start accepting recurring payments.
              </p>
              {canCreatePlans && (
                <button onClick={() => navigate("/plans/create")} className={pillBtn + " mx-auto"}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Plan
                </button>
              )}
            </div>
          ) : (
            <Tabs defaultValue="active" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-black/5 dark:bg-white/6 rounded-full p-0.5">
                  <TabsTrigger value="active" className="rounded-full text-[12px] px-3.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-white/12 data-[state=active]:text-black data-[state=active]:shadow-sm">
                    Active <span className="ml-1.5 rounded-full bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px]">{activePlans.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="rounded-full text-[12px] px-3.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-white/12 data-[state=active]:text-black data-[state=active]:shadow-sm">
                    Archived <span className="ml-1.5 rounded-full bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px]">{deletedPlans.length}</span>
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/6 rounded-full p-0.5">
                  <button 
                    className={`p-1 rounded-full transition-all ${viewMode === "grid" ? "bg-white dark:bg-white/12 text-black dark:text-white shadow-sm" : "text-black/40 hover:text-black/60"}`}
                    onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    className={`p-1 rounded-full transition-all ${viewMode === "list" ? "bg-white dark:bg-white/12 text-black dark:text-white shadow-sm" : "text-black/40 hover:text-black/60"}`}
                    onClick={() => setViewMode("list")}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <TabsContent value="active" className="m-0 focus-visible:outline-none">
                {activePlans.length === 0 ? (
                  <div className={`${card} p-12 text-center text-[12px] text-black/35`}>
                    No active plans.
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className={`${card} p-12 text-center text-[12px] text-black/35`}>
                    No archived plans.
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <AlertDialogContent className="max-w-md bg-white dark:bg-[#1c1c1e] rounded-[16px] border border-black/5 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.15)]" style={{ fontFamily: APPLE_FONT }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-semibold text-black dark:text-white">Archive this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-black/40 leading-relaxed">
              This plan will be archived and hidden from new subscribers. Existing subscription data is preserved. This action cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-full h-8 text-[12px] font-medium border-black/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (planToDelete) { handleArchivePlan(planToDelete); setPlanToDelete(null); } }}
              disabled={archiving}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full h-8 text-[12px] font-medium"
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