import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SetupProgressCard } from "@/components/SetupProgressCard";
import { useOrgRole } from "@/hooks/useOrgRole";
import { PremiumLoader } from "@/components/PremiumLoader";
import { ArrowRight } from "lucide-react";
import { FloatingSupport } from "@/components/FloatingSupport";
import logoImage from "@/assets/logo.svg";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  paystack_secret_key?: string | null;
  paystack_public_key?: string | null;
  recurra_handling_request?: boolean | null;
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
        .select("*")
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
            .select("*")
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

  const setupComplete = (!!organization?.paystack_secret_key || organization?.recurra_handling_request) && hasPlans;

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Setup</h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[650px] mx-auto px-6 pt-10 pb-16 space-y-8">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm border border-black/5 mb-4">
              <img 
                src={logoImage} 
                alt="Recurra Logo" 
                className="h-10 w-10 object-contain rounded-full" 
              />
            </div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white">
              Welcome to {organization?.org_name || "Recurra"}
            </h2>
            <p className="text-[12px] text-black/40 dark:text-white/40 max-w-xs mx-auto">
              Complete these few steps to start collecting payments.
            </p>
          </div>

          <SetupProgressCard
            hasPaymentProvider={!!organization?.paystack_secret_key || organization?.recurra_handling_request || false}
            hasPlans={hasPlans}
            orgId={organization?.id}
            orgName={organization?.org_name}
          />

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                sessionStorage.setItem("setup_redirect_done", "true");
                navigate("/dashboard", { replace: true });
              }}
              className={pillBtn + " px-8 py-2 text-[13px] font-semibold"}
            >
              {setupComplete ? "Go to Dashboard" : "Continue to Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
};

export default DashboardSetup;
