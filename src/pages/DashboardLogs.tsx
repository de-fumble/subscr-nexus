import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { Loader2 } from "lucide-react";
import { FloatingSupport } from "@/components/FloatingSupport";
import { useOrgRole } from "@/hooks/useOrgRole";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

export default function DashboardLogs() {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // First check if user is org owner
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .single();

      let membership: any = null;
      if (orgData) {
        setOrganization(orgData);
      } else {
        // Check if user is a member
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('org_id, organizations(id, org_name, email, logo_url)')
          .eq('user_id', user.id)
          .single();

        membership = memberData;
        if (membership?.organizations) {
          setOrganization(membership.organizations as unknown as Organization);
        }
      }

      // Fetch current license to determine if premium
      const activeOrgId = orgData?.id || (membership?.organizations as any)?.id;
      if (activeOrgId) {
        const { data: licenseData } = await supabase
          .from("licenses")
          .select("id")
          .eq("org_id", activeOrgId)
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle();

        setIsPremium(!!licenseData);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Activity Logs</h1>
        </header>
        <div className="flex-1 flex items-center justify-center bg-[#f5f5f7] dark:bg-[#000]">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-black/40 dark:text-white/40 mx-auto mb-3" />
            <p className="text-[12px] text-black/40">Loading logs...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Activity Logs</h1>
      </header>
      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">
          {organization && (
            <AuditLogViewer orgId={organization.id} isPremium={isPremium} />
          )}
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
