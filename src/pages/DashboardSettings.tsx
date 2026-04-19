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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
          <SidebarTrigger />
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
          </div>
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
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
        <SidebarTrigger />
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container max-w-3xl py-6 sm:py-8 px-4 sm:px-6">
          <Accordion type="single" collapsible className="w-full space-y-6">
            {/* Setup Navigation Card */}
            <AccordionItem value="setup" className="border-none">
              <Card className="glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-blue-500 group hover:shadow-blue-500/10 hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500/20 to-blue-600/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Rocket className="h-7 w-7 text-blue-500 drop-shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        Onboarding Setup
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Revisit the quick setup guide to configure your dashboard, branding, and billing profile.
                      </CardDescription>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => navigate("/dashboard/setup")}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-5 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 w-full sm:w-auto font-medium"
                    >
                      Go to Setup
                    </Button>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Paystack Connection Status Card */}
            <AccordionItem value="paystack-connection" className="border-none">
              <Card className={`glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 group hover:shadow-xl transition-all duration-500 relative overflow-hidden ${hasExistingKeys ? 'border-l-emerald-500 hover:shadow-emerald-500/10' : 'border-l-amber-500 hover:shadow-amber-500/10'}`}>
                <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${hasExistingKeys ? 'from-emerald-500/5 to-transparent' : 'from-amber-500/5 to-transparent'}`}></div>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 ${hasExistingKeys ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5' : 'bg-gradient-to-br from-amber-500/20 to-amber-600/5'}`}>
                      {hasExistingKeys ? (
                        <Link2 className="h-7 w-7 text-emerald-500 drop-shadow-sm" />
                      ) : (
                        <Link2Off className="h-7 w-7 text-amber-500 drop-shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        Paystack Connection
                        {hasExistingKeys && <Shield className="h-5 w-5 text-emerald-500 drop-shadow-sm" />}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {hasExistingKeys
                          ? "Your Paystack account is actively connected and processing."
                          : "Connect your Paystack API keys to unlock unlimited plans."}
                      </CardDescription>
                    </div>
                    <div className="shrink-0 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                      {hasExistingKeys ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 drop-shadow-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                {!hasExistingKeys && (
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 text-sm text-muted-foreground shadow-inner">
                      <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Rocket className="h-4 w-4" /> Benefits of connecting your Paystack:
                      </p>
                      <ul className="space-y-2 ml-1">
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Create unlimited subscription plans</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Payments go directly to your Paystack account</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Full control over your payment settings</li>
                      </ul>
                    </div>
                  </AccordionContent>
                )}
              </Card>
            </AccordionItem>

            {/* Paystack Integration Form */}
            <AccordionItem value="paystack-integration" className="border-none">
              <Card className="glass-card border-0 shadow-[var(--shadow-medium)] group hover:shadow-xl transition-all duration-500 hover:shadow-accent/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-accent/10 transition-colors duration-500"></div>
                <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                  <div className="flex items-center gap-4 text-left w-full">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 border border-accent/10">
                      <Key className="h-7 w-7 text-accent drop-shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <CardTitle className="text-xl flex items-center gap-2 mb-1">
                        Paystack Integration
                        <Shield className="h-5 w-5 text-muted-foreground/50" />
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {hasExistingKeys
                          ? "Your API keys are configured. You can safely update them below."
                          : "Configure your securely encrypted Paystack API keys to process payments"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                  <div className="pt-4 space-y-6">
                    {!isVerified ? (
                      <div className="text-center py-10 px-4">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-background to-muted border border-border shadow-2xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                          <div className="absolute inset-0 bg-accent/5"></div>
                          <Lock className="h-12 w-12 text-muted-foreground relative z-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 tracking-tight">Authentication Required</h3>
                        <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                          For your security, we require you to verify your identity before accessing or modifying your sensitive API keys.
                        </p>
                        <Button
                          onClick={handleAccessApiSection}
                          className="bg-foreground hover:bg-foreground/90 text-background rounded-full px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 gap-3"
                        >
                          <Lock className="h-5 w-5" />
                          Verify to Continue
                        </Button>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {hasExistingKeys && (
                          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent flex items-start gap-3">
                            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">API Keys Configured</span>
                              <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                                Your keys are encrypted and saved safely. Enter new keys below only if you wish to overwrite the existing configuration.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-5">
                          <div className="space-y-2.5">
                            <Label htmlFor="public_key" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">New Public Key</Label>
                            <Input
                              id="public_key"
                              type="password"
                              value={publicKey}
                              onChange={(e) => setPublicKey(e.target.value)}
                              placeholder="pk_test_..."
                              className="h-14 px-4 bg-background/50 border-border/50 focus-visible:ring-accent/50 focus-visible:border-accent rounded-xl text-lg font-mono transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2.5">
                            <Label htmlFor="secret_key" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">New Secret Key</Label>
                            <Input
                              id="secret_key"
                              type="password"
                              value={secretKey}
                              onChange={(e) => setSecretKey(e.target.value)}
                              placeholder="sk_test_..."
                              className="h-14 px-4 bg-background/50 border-border/50 focus-visible:ring-accent/50 focus-visible:border-accent rounded-xl text-lg font-mono transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-8">
                          <Button
                            onClick={handleSaveSettings}
                            disabled={saving || !publicKey.trim() || !secretKey.trim()}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-8 h-12 font-semibold shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all duration-300 gap-2"
                          >
                            <Save className="h-5 w-5" />
                            {hasExistingKeys ? "Save Changes" : "Save Integration"}
                          </Button>
                        </div>

                        <div className="mt-8 p-5 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/30 text-center">
                          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Key className="h-4 w-4 opacity-50" />
                            Retrieve your API keys from the{" "}
                            <a
                              href="https://dashboard.paystack.com/#/settings/developers"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent font-semibold hover:underline decoration-accent/30 underline-offset-4 transition-all"
                            >
                              Paystack Developer Dashboard
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Webhook Configuration Card */}
            {isVerified && hasExistingKeys && (
              <AccordionItem value="webhook-config" className="border-none">
                <Card className="glass-card border-0 shadow-[var(--shadow-medium)] group hover:shadow-xl transition-all duration-500 hover:shadow-purple-500/5 relative overflow-hidden">
                  <div className="absolute top-1/2 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-500"></div>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex items-center gap-4 text-left w-full">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 border border-purple-500/10">
                        <Webhook className="h-7 w-7 text-purple-500 drop-shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <CardTitle className="text-xl">Webhook Integration</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          Required to receive immediate layout payloads & payment alerts
                        </CardDescription>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                    <div className="pt-4">
                      <div className="p-5 rounded-2xl border border-border/50 bg-background/50 shadow-inner group/webhook hover:border-purple-500/30 transition-colors">
                        <div className="mb-4">
                          <p className="text-sm font-semibold tracking-wide uppercase text-foreground/80 flex items-center gap-2 mb-1.5">Live Webhook URL <span className="flex h-2 w-2 rounded-full bg-red-500"></span></p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Copy the endpoint below and paste it into the <strong>Live Webhook URL</strong> field on your Paystack Dashboard.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                          <code className="flex-1 px-4 py-3.5 rounded-xl bg-muted/70 text-sm font-mono break-all border border-border/50 text-foreground group-hover/webhook:border-purple-500/20 transition-colors flex items-center">
                            https://hhldoattlleyetxylfav.supabase.co/functions/v1/paystack-webhook
                          </code>
                          <Button variant="default" onClick={copyWebhookUrl} className="shrink-0 h-auto py-3.5 px-6 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium shadow-md hover:shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all gap-2" title="Copy Webhook URL">
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )}

            {/* KYC Status Card */}
            {organization && !organization.kyc_verified && (
              <AccordionItem value="kyc-status" className="border-none">
                <Card className="glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-amber-500 group hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <FileCheck className="h-7 w-7 text-amber-500 drop-shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <CardTitle className="text-xl">Complete Your Verification</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {organization.kyc_submitted_at
                            ? "Your KYC documents are currently pending review."
                            : "Unlock full platform access by completing your business KYC verification."}
                        </CardDescription>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                    <div className="flex sm:justify-end pt-4">
                      <Button
                        onClick={() => navigate("/dashboard/profile")}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6 py-5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 w-full sm:w-auto font-medium"
                      >
                        {organization.kyc_submitted_at ? "View Status" : "Complete KYC"}
                      </Button>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )}

            {/* License Status Card */}
            {organization && (
              <AccordionItem value="license-status" className="border-none">
                <Card className={`glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 group hover:shadow-xl transition-all duration-500 relative overflow-hidden ${currentLicense ? 'border-l-emerald-500 hover:shadow-emerald-500/10' : 'border-l-slate-400 hover:shadow-slate-500/10'}`}>
                  <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${currentLicense ? 'from-emerald-500/5 to-transparent' : 'from-slate-500/5 to-transparent'}`}></div>
                  <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 ${currentLicense ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5' : 'bg-gradient-to-br from-slate-400/20 to-slate-500/5'}`}>
                        <Key className={`h-7 w-7 ${currentLicense ? 'text-emerald-500' : 'text-slate-500'} drop-shadow-sm`} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <CardTitle className="text-xl">
                          {currentLicense ? 'Active License' : 'No Active License'}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {currentLicense
                            ? `You are on the ${currentLicense.plan_type} plan. Valid until ${new Date(currentLicense.expires_at).toLocaleDateString()}.`
                            : 'Request a license to unlock premium features and higher limits.'}
                        </CardDescription>
                      </div>
                    </div>
                  </AccordionTrigger>
                  {!currentLicense && (
                    <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
                      <div className="flex sm:justify-end pt-4">
                        <LicenseRequestDialog orgId={organization.id}>
                          <Button className="rounded-full px-6 py-5 bg-slate-800 hover:bg-slate-700 text-white shadow-lg transition-all duration-300 w-full sm:w-auto font-medium">
                            Request License
                          </Button>
                        </LicenseRequestDialog>
                      </div>
                    </AccordionContent>
                  )}
                </Card>
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