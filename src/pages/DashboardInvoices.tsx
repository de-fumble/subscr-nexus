import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { Receipt, Plus, ArrowLeft, FileText, Sparkles, ShieldCheck, Send, Wand2 } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { FloatingSupport } from "@/components/FloatingSupport";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

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
    return (
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Create Invoice</h1>
        </header>
        <PremiumLoader message="Loading invoice studio..." />
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
          <Receipt className="h-4 w-4 text-black/45 dark:text-white/45" />
          Create Invoice
        </h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[800px] mx-auto px-6 pt-8 pb-16 space-y-6">
          
          <div className={`${card} p-8 relative overflow-hidden text-center`}>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-black/50 dark:text-white/50" />
            </div>
            <div className="space-y-2 mb-6">
              <h2 className="text-[18px] font-semibold text-black dark:text-white flex items-center justify-center gap-1.5">
                Create Premium Invoices
                <Sparkles className="h-4 w-4 text-black/40 dark:text-white/40 animate-pulse" />
              </h2>
              <p className="text-[12px] text-black/40 dark:text-white/40 max-w-sm mx-auto leading-relaxed">
                Generate and send beautifully structured invoices with smart defaults,
                instant PDF export, and direct email delivery.
              </p>
            </div>
            <button className={`${pillBtn} mx-auto`} onClick={() => openInvoiceStudio()}>
              <Plus className="h-4 w-4" /> Open Invoice Studio
            </button>
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="h-4 w-4 text-black/45 dark:text-white/45" />
              <p className="text-[12px] font-semibold text-black dark:text-white">Quick Start Templates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => openInvoiceStudio("Consultation")}
                className="px-3.5 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Consultation
              </button>
              <button 
                onClick={() => openInvoiceStudio("Starter Package")}
                className="px-3.5 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Starter Package
              </button>
              <button 
                onClick={() => openInvoiceStudio("Monthly Retainer")}
                className="px-3.5 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-[#1c1c1e] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Monthly Retainer
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className={`${card} p-5 text-center space-y-2`}>
              <div className="mx-auto w-10 h-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-black/50 dark:text-white/50" />
              </div>
              <h3 className="text-[13px] font-semibold text-black dark:text-white">Premium Design</h3>
              <p className="text-[11px] text-black/40 dark:text-white/40 leading-relaxed">
                Clean invoice layout with your organization details, ready for clients.
              </p>
            </div>
            <div className={`${card} p-5 text-center space-y-2`}>
              <div className="mx-auto w-10 h-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-black/50 dark:text-white/50" />
              </div>
              <h3 className="text-[13px] font-semibold text-black dark:text-white">Multiple Items</h3>
              <p className="text-[11px] text-black/40 dark:text-white/40 leading-relaxed">
                Add multiple line items with quantities and automatic calculations.
              </p>
            </div>
            <div className={`${card} p-5 text-center space-y-2`}>
              <div className="mx-auto w-10 h-10 rounded-xl bg-black/5 dark:bg-white/8 flex items-center justify-center">
                <Send className="h-5 w-5 text-black/50 dark:text-white/50" />
              </div>
              <h3 className="text-[13px] font-semibold text-black dark:text-white">Download or Send</h3>
              <p className="text-[11px] text-black/40 dark:text-white/40 leading-relaxed">
                Download as PDF or send directly to your customer's email.
              </p>
            </div>
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
