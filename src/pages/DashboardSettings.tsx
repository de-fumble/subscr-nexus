import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Key, Save, Shield, Lock, FileCheck, Building2 } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { RestrictedPage } from "@/components/RestrictedPage";
import { BackButton } from "@/components/BackButton";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PasswordVerificationDialog } from "@/components/PasswordVerificationDialog";
import { CompanyAccountSection } from "@/components/CompanyAccountSection";
import { LicenseRequestDialog } from "@/components/LicenseRequestDialog";
import { KYCSection } from "@/components/KYCSection";

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
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading settings...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show restricted page for non-owners (admin/staff cannot access)
  if (!canAccessSettings || role === 'admin' || role === 'staff') {
    return <RestrictedPage />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <BackButton />
            <div className="flex-1 flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container max-w-3xl py-8 px-6">
              <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                      <Key className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Paystack Integration
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                      <CardDescription>
                        {hasExistingKeys 
                          ? "Your API keys are configured. You can update them below."
                          : "Configure your Paystack API keys to process payments"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isVerified ? (
                    // Locked state - require password verification
                    <div className="text-center py-8">
                      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl glass-card shadow-lg">
                        <Lock className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Password Required</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        For security, please verify your identity to access and update API keys.
                      </p>
                      <Button 
                        onClick={handleAccessApiSection}
                        className="bg-accent hover:bg-accent/90 gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Verify to Access
                      </Button>
                    </div>
                  ) : (
                    // Unlocked state - show update form
                    <>
                      {hasExistingKeys && (
                        <div className="p-4 glass-card rounded-xl border-green-500/20 bg-green-500/5">
                          <div className="flex items-center gap-2 text-green-600">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">API keys are configured</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter new keys below to update your existing configuration.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="public_key">New Public Key</Label>
                          <Input
                            id="public_key"
                            type="password"
                            value={publicKey}
                            onChange={(e) => setPublicKey(e.target.value)}
                            placeholder="pk_test_..."
                            className="glass-card border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secret_key">New Secret Key</Label>
                          <Input
                            id="secret_key"
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="sk_test_..."
                            className="glass-card border-border/50"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button 
                          onClick={handleSaveSettings} 
                          disabled={saving || !publicKey.trim() || !secretKey.trim()}
                          className="bg-accent hover:bg-accent/90 gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {hasExistingKeys ? "Update Keys" : "Save Keys"}
                        </Button>
                      </div>
                      
                      <div className="p-4 glass-card rounded-xl border-accent/20">
                        <p className="text-sm text-muted-foreground">
                          Get your Paystack API keys from your{" "}
                          <a
                            href="https://dashboard.paystack.com/#/settings/developers"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline font-medium"
                          >
                            Paystack Dashboard
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* KYC Status Card */}
              {organization && !organization.kyc_verified && (
                <Card className="mt-6 glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-amber-500">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Complete Your KYC</CardTitle>
                        <CardDescription>
                          {organization.kyc_submitted_at 
                            ? "Your KYC is pending review" 
                            : "Unlock full platform access by completing your KYC verification"}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => navigate("/dashboard/profile")}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        {organization.kyc_submitted_at ? "View Status" : "Complete KYC"}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              )}

              {/* License Status Card */}
              {organization && (
                <Card className={`mt-6 glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 ${currentLicense ? 'border-l-green-500' : 'border-l-muted'}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${currentLicense ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <Key className={`h-6 w-6 ${currentLicense ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {currentLicense ? 'License Active' : 'No Active License'}
                        </CardTitle>
                        <CardDescription>
                          {currentLicense 
                            ? `Your ${currentLicense.plan_type} license expires on ${new Date(currentLicense.expires_at).toLocaleDateString()}`
                            : 'Request a license to unlock premium features'}
                        </CardDescription>
                      </div>
                      {!currentLicense && (
                        <LicenseRequestDialog orgId={organization.id}>
                          <Button variant="outline">
                            Request License
                          </Button>
                        </LicenseRequestDialog>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              )}

              {/* Company Bank Account Section */}
              {organization && (
                <div className="mt-6">
                  <CompanyAccountSection 
                    organization={organization} 
                    onUpdate={fetchSettings}
                  />
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
      
      <PasswordVerificationDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        onVerified={handleVerificationSuccess}
        title="Access API Keys"
        description="Verify your password to access sensitive settings"
      />
    </SidebarProvider>
  );
}