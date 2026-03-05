import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SetupProgressCard } from "@/components/SetupProgressCard";
import { Button } from "@/components/ui/button";
import { useOrgRole } from "@/hooks/useOrgRole";
import { PremiumLoader } from "@/components/PremiumLoader";
import { ArrowRight, Rocket } from "lucide-react";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  paystack_secret_key?: string | null;
  paystack_public_key?: string | null;
}

const DashboardSetup = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [hasPlans, setHasPlans] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email);

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, paystack_secret_key, paystack_public_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, paystack_secret_key, paystack_public_key")
            .eq("id", membership.org_id)
            .maybeSingle();
          orgData = staffOrg;
        }
      }

      if (!orgData) { navigate("/auth"); return; }
      setOrganization(orgData);

      const { count } = await supabase
        .from("subscription_plans")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgData.id)
        .eq("is_active", true);
      setHasPlans((count || 0) > 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PremiumLoader message="Loading setup..." />;

  const setupComplete = !!organization?.paystack_secret_key && hasPlans;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
            <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
            <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">Setup</h1>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-3xl space-y-4 sm:space-y-6">
              <div className="text-center space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                <div className="mx-auto flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent/10 mb-3 sm:mb-4">
                  <Rocket className="h-5 w-5 sm:h-7 sm:w-7 text-accent" />
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                  Welcome to {organization?.org_name || "Recurra"}
                </h2>
                <p className="text-xs sm:text-base text-muted-foreground max-w-md mx-auto px-2">
                  Complete the steps below to start collecting payments.
                </p>
              </div>

              <SetupProgressCard
                hasPaymentProvider={!!organization?.paystack_secret_key}
                hasPlans={hasPlans}
                orgId={organization?.id}
                orgName={organization?.org_name}
              />

              <div className="flex justify-center pt-2">
                <Button
                  size="lg"
                  onClick={() => {
                    sessionStorage.setItem("hasSeenSetup", "true");
                    navigate("/dashboard");
                  }}
                  className="gap-2 rounded-full px-8"
                >
                  {setupComplete ? "Go to Dashboard" : "Continue to Dashboard"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardSetup;
