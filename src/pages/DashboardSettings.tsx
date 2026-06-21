import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Key, Save, Shield, Lock, FileCheck, Building2, Link2, Link2Off, Webhook, Copy, Rocket } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useOrgRole } from "@/hooks/useOrgRole";
import { RestrictedPage } from "@/components/RestrictedPage";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { APPLE_FONT, card, pillBtn } from "@/lib/appleLayout";
import { PasswordVerificationDialog } from "@/components/PasswordVerificationDialog";
import { CompanyAccountSection } from "@/components/CompanyAccountSection";
import { LicenseRequestDialog } from "@/components/LicenseRequestDialog";
import { KYCSection } from "@/components/KYCSection";
import { SettingsPageSkeleton } from "@/components/DashboardSkeleton";
import { FloatingSupport } from "@/components/FloatingSupport";

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { canAccessSettings, loading: roleLoading, role } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    org_name: string;
    email: string;
    paystack_public_key: string | null;
    paystack_secret_key: string | null;
    logo_url?: string | null;
    kyc_verified?: boolean;
    kyc_submitted_at?: string | null;
    account_number?: string | null;
    account_name?: string | null;
    bank_name?: string | null;
  } | null>(null);
  const [currentLicense, setCurrentLicense] = useState<any>(null);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [hasExistingKeys, setHasExistingKeys] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // First check if user is org owner
      let orgData = null;

      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, paystack_public_key, paystack_secret_key, logo_url, kyc_verified, kyc_submitted_at, account_number, account_name, bank_name")
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
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, paystack_public_key, paystack_secret_key, logo_url, kyc_verified, kyc_submitted_at, account_number, account_name, bank_name")
            .eq("id", membership.org_id)
            .maybeSingle();

          orgData = memberOrg;
        }
      }

      if (!orgData) {
        toast.error("No organization found");
        return;
      }

      setOrganization(orgData);
      setHasExistingKeys(!!(orgData.paystack_public_key && orgData.paystack_secret_key));

      // Fetch current license
      if (orgData) {
        const { data: licenseData } = await supabase
          .from("licenses")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setCurrentLicense(licenseData);
      }
      // Don't load keys into form - they should only be updated, not viewed
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText("https://hhldoattlleyetxylfav.supabase.co/functions/v1/paystack-webhook");
    toast.success("Webhook URL copied to clipboard");
  };

  const handleSaveSettings = async () => {
    if (!publicKey.trim() || !secretKey.trim()) {
      toast.error("Please provide both Paystack keys");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          paystack_public_key: publicKey,
          paystack_secret_key: secretKey,
        })
        .eq("id", organization?.id);

      if (error) throw error;

      toast.success("API keys updated successfully");

      // Auto-sync Paystack data immediately after updating the keys
      toast.info("Syncing Paystack data... This may take a moment.");

      try {
        // First sync subscribers and billing profiles
        await supabase.functions.invoke("sync-billing-profiles");

        // Then pre-fetch analytics to cache data
        await supabase.functions.invoke("fetch-paystack-analytics");

        toast.success("Paystack data synced successfully!");
      } catch (syncError) {
        console.error("Error auto-syncing Paystack data:", syncError);
        toast.error("Keys saved, but automatic sync failed. We'll try again later.");
      }

      setPublicKey("");
      setSecretKey("");
      setHasExistingKeys(true);
      setIsVerified(false);
      fetchSettings();
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAccessApiSection = () => {
    setShowVerificationDialog(true);
  };

  const handleVerificationSuccess = () => {
    setIsVerified(true);
  };

  if (loading || roleLoading) {
    return (
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Settings</h1>
        </header>
        <SettingsPageSkeleton />
      </SidebarInset>
    );
  }

  // Show restricted page for non-owners (admin/staff cannot access)
  if (!canAccessSettings || role === 'admin' || role === 'staff') {
    return <RestrictedPage />;
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Settings</h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="container max-w-3xl py-8 px-4 sm:px-6">
          <Accordion type="single" collapsible className="w-full space-y-6">
            {/* Setup Navigation Card */}
            <AccordionItem value="setup" className="border-none">
              <div className={`${card} overflow-hidden`}>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h2 className="text-[16px] font-semibold text-black dark:text-white flex items-center gap-2">
                        Onboarding Setup
                      </h2>
                      <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                        Revisit the quick setup guide to configure your dashboard, branding, and billing profile.
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => navigate("/dashboard/setup")}
                      className={pillBtn + " w-full sm:w-auto"}
                    >
                      Go to Setup
                    </Button>
                  </div>
                </AccordionContent>
              </div>
            </AccordionItem>

            {/* Paystack Connection Status Card */}
            <AccordionItem value="paystack-connection" className="border-none">
              <div className={`${card} overflow-hidden`}>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                      {hasExistingKeys ? (
                        <Link2 className="h-5 w-5" />
                      ) : (
                        <Link2Off className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h2 className="text-[16px] font-semibold text-black dark:text-white flex items-center gap-2">
                        Paystack Connection
                        {hasExistingKeys && <Shield className="h-4 w-4 text-emerald-500" />}
                      </h2>
                      <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                        {hasExistingKeys
                          ? "Your Paystack account is actively connected and processing."
                          : "Connect your Paystack API keys to unlock unlimited plans."}
                      </p>
                    </div>
                    <div className="shrink-0 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                      {hasExistingKeys ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                {!hasExistingKeys && (
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                    <div className="mt-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[12px] text-black/60 dark:text-white/60">
                      <p className="font-semibold text-black dark:text-white mb-2 flex items-center gap-1.5">
                        <Rocket className="h-3.5 w-3.5" /> Benefits of connecting your Paystack:
                      </p>
                      <ul className="space-y-1.5 ml-1">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-black/45 dark:bg-white/45"></span> Create unlimited subscription plans</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-black/45 dark:bg-white/45"></span> Payments go directly to your Paystack account</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-black/45 dark:bg-white/45"></span> Full control over your payment settings</li>
                      </ul>
                    </div>
                  </AccordionContent>
                )}
              </div>
            </AccordionItem>

            {/* Paystack Integration Form */}
            <AccordionItem value="paystack-integration" className="border-none">
              <div className={`${card} overflow-hidden`}>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex items-center gap-4 text-left w-full">
                    <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Key className="h-5 w-5 text-black/70 dark:text-white/70" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h2 className="text-[16px] font-semibold text-black dark:text-white flex items-center gap-2 mb-1">
                        Paystack Integration
                        <Shield className="h-4 w-4 text-black/30 dark:text-white/30" />
                      </h2>
                      <p className="text-[12px] text-black/40 dark:text-white/40 font-normal">
                        {hasExistingKeys
                          ? "Your API keys are configured. You can safely update them below."
                          : "Configure your securely encrypted Paystack API keys to process payments"}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                  <div className="pt-4 space-y-5">
                    {!isVerified ? (
                      <div className="text-center py-8 px-4">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                          <Lock className="h-5 w-5 text-black/60 dark:text-white/60" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-black dark:text-white mb-1.5">Authentication Required</h3>
                        <p className="text-[12px] text-black/40 dark:text-white/40 mb-6 max-w-xs mx-auto leading-relaxed">
                          For your security, verify your identity before accessing or modifying your sensitive API keys.
                        </p>
                        <Button
                          onClick={handleAccessApiSection}
                          className={pillBtn + " mx-auto"}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Verify to Continue
                        </Button>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {hasExistingKeys && (
                          <div className="mb-5 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-start gap-3">
                            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-400 block mb-0.5">API Keys Configured</span>
                              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-500/80 leading-relaxed">
                                Your keys are encrypted and saved safely. Enter new keys below only if you wish to overwrite the existing configuration.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="public_key" className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">New Public Key</Label>
                            <Input
                              id="public_key"
                              type="password"
                              value={publicKey}
                              onChange={(e) => setPublicKey(e.target.value)}
                              placeholder="pk_test_..."
                              className="h-9 px-3 bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 focus-visible:ring-black/10 focus-visible:border-black rounded-lg text-[13px] font-mono transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="secret_key" className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">New Secret Key</Label>
                            <Input
                              id="secret_key"
                              type="password"
                              value={secretKey}
                              onChange={(e) => setSecretKey(e.target.value)}
                              placeholder="sk_test_..."
                              className="h-9 px-3 bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 focus-visible:ring-black/10 focus-visible:border-black rounded-lg text-[13px] font-mono transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                          <Button
                            onClick={handleSaveSettings}
                            disabled={saving || !publicKey.trim() || !secretKey.trim()}
                            className={pillBtn}
                          >
                            <Save className="h-3.5 w-3.5" />
                            {hasExistingKeys ? "Save Changes" : "Save Integration"}
                          </Button>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                          <p className="text-[12px] text-black/50 dark:text-white/50 flex items-center justify-center gap-1.5">
                            <Key className="h-3.5 w-3.5 opacity-50" />
                            Retrieve your API keys from the{" "}
                            <a
                              href="https://dashboard.paystack.com/#/settings/developers"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-black dark:text-white font-semibold hover:underline decoration-black/30 dark:decoration-white/30 underline-offset-4 transition-all"
                            >
                              Paystack Developer Dashboard
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </div>
            </AccordionItem>

            {/* Webhook Configuration Card */}
            {isVerified && hasExistingKeys && (
              <AccordionItem value="webhook-config" className="border-none">
                <div className={`${card} overflow-hidden`}>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex items-center gap-4 text-left w-full">
                      <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Webhook className="h-5 w-5 text-black/70 dark:text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-[16px] font-semibold text-black dark:text-white">Webhook Integration</h2>
                        <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                          Required to receive immediate layout payloads & payment alerts
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                    <div className="pt-4">
                      <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 group/webhook transition-colors">
                        <div className="mb-3">
                          <p className="text-[12px] font-semibold tracking-wide uppercase text-black/60 dark:text-white/60 flex items-center gap-1.5 mb-1">
                            Live Webhook URL <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          </p>
                          <p className="text-[11px] text-black/40 dark:text-white/40 leading-relaxed">
                            Copy the endpoint below and paste it into the <strong>Live Webhook URL</strong> field on your Paystack Dashboard.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                          <code className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#1c1c1e] text-[12px] font-mono break-all border border-black/10 dark:border-white/10 text-black dark:text-white flex items-center">
                            https://hhldoattlleyetxylfav.supabase.co/functions/v1/paystack-webhook
                          </code>
                          <Button variant="default" onClick={copyWebhookUrl} className={pillBtn}>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            )}

            {/* KYC Status Card */}
            {organization && !organization.kyc_verified && (
              <AccordionItem value="kyc-status" className="border-none">
                <div className={`${card} overflow-hidden`}>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                      <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <FileCheck className="h-5 w-5 text-black/70 dark:text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-[16px] font-semibold text-black dark:text-white">Complete Your Verification</h2>
                        <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                          {organization.kyc_submitted_at
                            ? "Your KYC documents are currently pending review."
                            : "Unlock full platform access by completing your business KYC verification."}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => navigate("/dashboard/profile")}
                        className={pillBtn + " w-full sm:w-auto"}
                      >
                        {organization.kyc_submitted_at ? "View Status" : "Complete KYC"}
                      </Button>
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            )}

            {/* License Status Card */}
            {organization && (
              <AccordionItem value="license-status" className="border-none">
                <div className={`${card} overflow-hidden`}>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                      <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Key className="h-5 w-5 text-black/70 dark:text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-[16px] font-semibold text-black dark:text-white">
                          {currentLicense ? 'Active License' : 'No Active License'}
                        </h2>
                        <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                          {currentLicense
                            ? `You are on the ${currentLicense.plan_type} plan. Valid until ${new Date(currentLicense.expires_at).toLocaleDateString()}.`
                            : 'Request a license to unlock premium features and higher limits.'}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  {!currentLicense && (
                    <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
                      <div className="flex justify-end pt-4">
                        <LicenseRequestDialog orgId={organization.id}>
                          <Button className={pillBtn + " w-full sm:w-auto"}>
                            Request License
                          </Button>
                        </LicenseRequestDialog>
                      </div>
                    </AccordionContent>
                  )}
                </div>
              </AccordionItem>
            )}

            {/* Company Bank Account Section */}
            {organization && (
              <CompanyAccountSection
                organization={organization}
                onUpdate={fetchSettings}
              />
            )}
            
          </Accordion>
        </div>
        <FloatingSupport />
      </main>

      <PasswordVerificationDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        onVerified={handleVerificationSuccess}
        title="Access API Keys"
        description="Verify your password to access sensitive settings"
      />
    </SidebarInset>
  );
}