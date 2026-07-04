import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useOrgRole } from "@/hooks/useOrgRole";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";
import { FloatingSupport } from "@/components/FloatingSupport";
import { ShieldCheck, ArrowLeft, Search, ClipboardCheck, FileDown } from "lucide-react";
import { APPLE_FONT, card, pillBtn } from "@/lib/appleLayout";

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
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <button 
          onClick={() => navigate("/dashboard")} 
          className="flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-black/45 dark:text-white/45" />
          Verify Transaction
        </h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16 space-y-6">
          
          {/* Hero */}
          <div className={`${card} p-8 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.01] via-transparent to-black/[0.02] dark:from-white/[0.01] dark:to-white/[0.02] pointer-events-none" />
            <div className="relative text-center">
              <div className="mx-auto w-[60px] h-[60px] rounded-[14px] bg-gradient-to-b from-black/[0.04] to-black/[0.07] dark:from-white/[0.06] dark:to-white/[0.10] flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <ShieldCheck className="h-7 w-7 text-black/55 dark:text-white/55" strokeWidth={1.5} />
              </div>
              <h2 className="text-[20px] font-semibold text-black dark:text-white tracking-[-0.02em] mb-1.5">
                Transaction Verification
              </h2>
              <p className="text-[13px] text-black/40 dark:text-white/40 max-w-[380px] mx-auto leading-[1.5]">
                Look up any Paystack transaction reference to confirm payment status and generate downloadable receipts.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className={`${card} p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 mb-3.5">
              How It Works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  step: "1",
                  icon: Search,
                  title: "Enter reference",
                  desc: "Paste a Paystack transaction reference code.",
                },
                {
                  step: "2",
                  icon: ClipboardCheck,
                  title: "Confirm status",
                  desc: "View payment amount, customer, and status instantly.",
                },
                {
                  step: "3",
                  icon: FileDown,
                  title: "Get receipt",
                  desc: "Generate and download a PDF receipt for the payment.",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-white dark:text-black tabular-nums">{item.step}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-black dark:text-white tracking-[-0.01em] mb-0.5">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-black/35 dark:text-white/35 leading-[1.5]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verify Card */}
          <VerifyTransactionCard organization={organization} />
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
