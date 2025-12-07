import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Key, Save, Eye, EyeOff } from "lucide-react";

export default function DashboardSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    paystack_public_key: string | null;
    paystack_secret_key: string | null;
  } | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

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

      // First check if user is org owner
      let orgData = null;

      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, paystack_public_key, paystack_secret_key")
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
            .select("id, paystack_public_key, paystack_secret_key")
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Paystack Integration</CardTitle>
          </div>
          <CardDescription>
            Configure your Paystack API keys to process payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="public_key">Public Key</Label>
            <div className="relative">
              <Input
                id="public_key"
                type={showKeys ? "text" : "password"}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="pk_test_..."
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
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeys(!showKeys)}
            >
              {showKeys ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Keys
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Keys
                </>
              )}
            </Button>
          </div>
          <div className="pt-4">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Get your Paystack API keys from your{" "}
              <a
                href="https://dashboard.paystack.com/#/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Paystack Dashboard
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
