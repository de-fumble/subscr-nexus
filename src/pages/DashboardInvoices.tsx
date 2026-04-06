import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { Receipt, Plus, ArrowLeft, FileText, Sparkles, ShieldCheck, Send, Wand2 } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { FloatingSupport } from "@/components/FloatingSupport";

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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const openInvoiceStudio = (templateName?: string) => {
    setSelectedTemplate(templateName || null);
    setShowCreateDialog(true);
  };

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
    return <PremiumLoader message="Loading invoice studio..." />;
  }

  return (
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

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8 glass-card border-border/40 relative overflow-hidden">
            <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center ring-8 ring-accent/5">
                <FileText className="h-10 w-10 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                  Create Premium Invoices
                  <Sparkles className="h-5 w-5 text-accent" />
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Generate and send beautifully structured invoices with smart defaults,
                  instant PDF export, and direct email delivery.
                </p>
              </div>
              <Button size="lg" className="gap-2 rounded-full px-7" onClick={() => openInvoiceStudio()}>
                <Plus className="h-5 w-5" />
                Open Invoice Studio
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 glass-card border-border/40">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Wand2 className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold">Quick Start Templates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => openInvoiceStudio("Consultation")}>
                Consultation
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => openInvoiceStudio("Starter Package")}>
                Starter Package
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => openInvoiceStudio("Monthly Retainer")}>
                Monthly Retainer
              </Button>
            </div>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 glass-card text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-1">Premium Design</h3>
              <p className="text-sm text-muted-foreground">
                Clean invoice layout with your organization details, ready for clients.
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
                <Send className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-1">Download or Send</h3>
              <p className="text-sm text-muted-foreground">
                Download as PDF or send directly to your customer's email
              </p>
            </Card>
          </div>
        </div>
        <FloatingSupport />
      </main>

      {organization && (
        <CreateInvoiceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          orgId={organization.id}
          orgName={organization.org_name}
          orgEmail={organization.email}
          initialTemplateName={selectedTemplate}
        />
      )}
    </SidebarInset>
  );
};

export default DashboardInvoices;
