import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { Receipt, Plus, ArrowLeft, FileText } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const DashboardInvoices = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
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
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          orgData = staffOrg;
        }
      }

      if (!orgData) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar 
          organization={organization} 
          role={role} 
          userEmail={userEmail}
          canAccessSettings={canAccessSettings}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent" />
                Create Invoice
              </h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Create Invoice Card */}
              <Card className="p-8 glass-card">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-accent" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Create Professional Invoices</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Generate and send professional invoices to your customers. 
                      Download as PDF or send directly via email.
                    </p>
                  </div>

                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-5 w-5" />
                    Create New Invoice
                  </Button>
                </div>
              </Card>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6 glass-card text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Professional Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Clean, professional invoice template with your organization branding
                  </p>
                </Card>

                <Card className="p-6 glass-card text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Receipt className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Multiple Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Add multiple line items with quantities and automatic calculations
                  </p>
                </Card>

                <Card className="p-6 glass-card text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Download or Send</h3>
                  <p className="text-sm text-muted-foreground">
                    Download as PDF or send directly to your customer's email
                  </p>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      {organization && (
        <CreateInvoiceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          orgId={organization.id}
          orgName={organization.org_name}
          orgEmail={organization.email}
        />
      )}
    </SidebarProvider>
  );
};

export default DashboardInvoices;
