import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Key, Save, Eye, EyeOff, Shield } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { RestrictedPage } from "@/components/RestrictedPage";
import { BackButton } from "@/components/BackButton";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { canAccessSettings, loading: roleLoading, role } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    org_name: string;
    email: string;
    paystack_public_key: string | null;
    paystack_secret_key: string | null;
    logo_url?: string | null;
  } | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();

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
        .select("id, org_name, email, paystack_public_key, paystack_secret_key, logo_url")
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
            .select("id, org_name, email, paystack_public_key, paystack_secret_key, logo_url")
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
      setPublicKey(orgData.paystack_public_key || "");
      setSecretKey(orgData.paystack_secret_key || "");
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

      toast.success("Settings updated successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
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

  // Show restricted page for non-owners
  if (!canAccessSettings) {
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
                        Configure your Paystack API keys to process payments
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="public_key">Public Key</Label>
                      <div className="relative">
                        <Input
                          id="public_key"
                          type={showKeys ? "text" : "password"}
                          value={publicKey}
                          onChange={(e) => setPublicKey(e.target.value)}
                          placeholder="pk_test_..."
                          className="glass-card border-border/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secret_key">Secret Key</Label>
                      <div className="relative">
                        <Input
                          id="secret_key"
                          type={showKeys ? "text" : "password"}
                          value={secretKey}
                          onChange={(e) => setSecretKey(e.target.value)}
                          placeholder="sk_test_..."
                          className="glass-card border-border/50"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKeys(!showKeys)}
                      className="gap-2"
                    >
                      {showKeys ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide Keys
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Show Keys
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={saving}
                      className="bg-accent hover:bg-accent/90 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Settings
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
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
