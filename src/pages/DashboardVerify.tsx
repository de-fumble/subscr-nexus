import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrgRole } from "@/hooks/useOrgRole";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";
import { FloatingSupport } from "@/components/FloatingSupport";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ReceiptText } from "lucide-react";


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
    return <PremiumLoader message="Loading..." />;
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
        <SidebarTrigger />
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Verify Transaction</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6 space-y-5">
          <Card className="p-5 sm:p-6 border-border/40 bg-gradient-to-br from-accent/5 to-background">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                  Transaction Verification Hub
                  <ReceiptText className="h-4 w-4 text-accent" />
                </h2>
                <p className="text-sm text-muted-foreground">
                  Verify transaction references instantly and generate downloadable receipts for confirmed payments.
                </p>
              </div>
            </div>
          </Card>
          <VerifyTransactionCard organization={organization} />
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
