import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrgRole } from "@/hooks/useOrgRole";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";
import { FloatingSupport } from "@/components/FloatingSupport";
import { ShieldCheck, ReceiptText } from "lucide-react";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

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
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Verify Transaction</h1>
        </header>
        <PremiumLoader message="Loading..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Verify Transaction</h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16 space-y-6">
          <div className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-black/50 dark:text-white/50" />
              </div>
              <div className="space-y-1">
                <h2 className="text-[14px] font-semibold text-black dark:text-white flex items-center gap-2">
                  Transaction Verification Hub
                  <ReceiptText className="h-4 w-4 text-black/35" />
                </h2>
                <p className="text-[12px] text-black/40 dark:text-white/40 leading-relaxed">
                  Verify transaction references instantly and generate downloadable receipts for confirmed payments.
                </p>
              </div>
            </div>
          </div>
          <VerifyTransactionCard organization={organization} />
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
