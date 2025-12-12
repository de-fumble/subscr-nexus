import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User, Mail, Save, Trash2, Building2, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { RestrictedPage } from "@/components/RestrictedPage";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { BackButton } from "@/components/BackButton";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function DashboardProfile() {
  const navigate = useNavigate();
  const { canAccessSettings, loading: roleLoading, role } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    org_name: string;
    email: string;
    logo_url?: string | null;
  } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
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
        .select("id, org_name, email, logo_url")
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
            .select("id, org_name, email, logo_url")
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
      setOrgName(orgData.org_name);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ org_name: orgName })
        .eq("id", organization?.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete organization (cascades will handle related data)
      const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Sign out
      await supabase.auth.signOut();
      
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setOrganization(prev => prev ? { ...prev, logo_url: url } : null);
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
                <p className="text-muted-foreground">Loading profile...</p>
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
              <h1 className="text-xl font-bold text-foreground">Profile Settings</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container max-w-3xl py-8 px-6">
              <div className="space-y-6">
                {/* Profile Card */}
                <Card className="glass-card border-0 shadow-[var(--shadow-medium)] overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
                  <CardHeader className="-mt-12 pb-4">
                    <div className="flex items-end gap-6">
                      <ProfilePictureUpload
                        currentLogoUrl={organization?.logo_url}
                        orgName={organization?.org_name || ""}
                        onUploadComplete={handleLogoUpload}
                      />
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-2xl">{organization?.org_name}</CardTitle>
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Building2 className="h-4 w-4" />
                          Organization Profile
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="org_name" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Organization Name
                        </Label>
                        <Input
                          id="org_name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="Enter organization name"
                          className="glass-card border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          value={organization?.email || ""}
                          disabled
                          className="bg-muted/50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="bg-accent hover:bg-accent/90 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50 glass-card shadow-[var(--shadow-medium)]">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Permanently delete your account and all associated data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting} className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data including subscription plans,
                            subscribers, and transaction history from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
