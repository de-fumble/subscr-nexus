import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useOrgRole } from "@/hooks/useOrgRole";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";
import { FloatingSupport } from "@/components/FloatingSupport";


interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

export default function DashboardVerify() {
  const navigate = useNavigate();
  const { canAccessSettings, role, loading: roleLoading } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // Check if user is an org owner
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = staffOrg;
        }
      }

      if (!orgData) {
        toast.error("No organization found");
        navigate("/auth");
        return;
      }

      setOrganization(orgData);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <PremiumLoader message="Loading..." />
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            
            <div className="flex-1 flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">Verify Transaction</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container max-w-3xl py-6 sm:py-8 px-4 sm:px-6">
              <VerifyTransactionCard organization={organization} />
            </div>
            <FloatingSupport />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
