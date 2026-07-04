import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { Receipt, Plus, ArrowLeft, FileText, Layers, Briefcase, RefreshCw, FileEdit, Download, Send } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { FloatingSupport } from "@/components/FloatingSupport";
import { APPLE_FONT, card, pageWrap, pageInner, pillBtn } from "@/lib/appleLayout";

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
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Invoice Studio</h1>
        </header>
        <PremiumLoader message="Loading invoice studio..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  const templates = [
    {
      name: "Consultation",
      icon: Briefcase,
      description: "One-time consulting session",
    },
    {
      name: "Starter Package",
      icon: Layers,
      description: "Service bundle or starter plan",
    },
    {
      name: "Monthly Retainer",
      icon: RefreshCw,
      description: "Recurring monthly engagement",
    },
  ];

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
          Invoice Studio
        </h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[800px] mx-auto px-6 pt-8 pb-16 space-y-6">
          
          {/* Hero Card */}
          <div className={`${card} p-8 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.01] via-transparent to-black/[0.02] dark:from-white/[0.01] dark:to-white/[0.02] pointer-events-none" />
            <div className="relative text-center">
              <div className="mx-auto w-[60px] h-[60px] rounded-[14px] bg-gradient-to-b from-black/[0.04] to-black/[0.07] dark:from-white/[0.06] dark:to-white/[0.10] flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <FileText className="h-7 w-7 text-black/55 dark:text-white/55" strokeWidth={1.5} />
              </div>
              <h2 className="text-[20px] font-semibold text-black dark:text-white tracking-[-0.02em] mb-1.5">
                Invoice Studio
              </h2>
              <p className="text-[13px] text-black/40 dark:text-white/40 max-w-[360px] mx-auto leading-[1.5] mb-6">
                Create beautifully structured invoices with smart defaults, instant PDF export, and direct email delivery.
              </p>
              <button 
                className={`${pillBtn} mx-auto text-[13px] px-5 py-2 gap-2`} 
                onClick={() => openInvoiceStudio()}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                New Invoice
              </button>
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 px-1 mb-2.5">
              Quick Start
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.name}
                    onClick={() => openInvoiceStudio(template.name)}
                    className={`${card} p-4 text-left transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09),0_0_0_0.5px_rgba(0,0,0,0.07)] hover:-translate-y-px active:scale-[0.98] group`}
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-3">
                      <Icon className="h-[18px] w-[18px] text-black dark:text-white" strokeWidth={1.8} />
                    </div>
                    <p className="text-[13px] font-semibold text-black dark:text-white tracking-[-0.01em] mb-0.5">
                      {template.name}
                    </p>
                    <p className="text-[11px] text-black/35 dark:text-white/35 leading-[1.4]">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* How It Works */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 px-1 mb-2.5">
              How It Works
            </p>
            <div className={`${card} p-5`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                  {
                    step: "1",
                    icon: FileEdit,
                    title: "Fill in details",
                    desc: "Add customer info, line items, tax, and payment terms.",
                  },
                  {
                    step: "2",
                    icon: Download,
                    title: "Export as PDF",
                    desc: "Download a clean, professional invoice ready to share.",
                  },
                  {
                    step: "3",
                    icon: Send,
                    title: "Send to client",
                    desc: "Open an email draft with the invoice details pre-filled.",
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
