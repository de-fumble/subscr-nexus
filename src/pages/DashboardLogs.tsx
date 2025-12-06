import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { Loader2 } from "lucide-react";

interface Organization {
  id: string;
  org_name: string;
  email: string;
}

export default function DashboardLogs() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

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

      // First check if user is org owner
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, org_name, email")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);
      } else {
        // Check if user is a member
        const { data: membership } = await supabase
          .from('organization_members')
          .select('org_id, organizations(id, org_name, email)')
          .eq('user_id', user.id)
          .single();

        if (membership?.organizations) {
          setOrganization(membership.organizations as unknown as Organization);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                Activity Logs
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8">
              {organization && (
                <AuditLogViewer orgId={organization.id} />
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
