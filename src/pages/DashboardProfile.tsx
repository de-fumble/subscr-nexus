import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User, Mail, Trash2, Building2, Sparkles, Edit3, Clock, CheckCircle2 } from "lucide-react";
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
import { KYCSection } from "@/components/KYCSection";
import { NameChangeRequestDialog } from "@/components/NameChangeRequestDialog";

interface OrganizationData {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
  business_nature: string | null;
  business_name: string | null;
  staff_count: string | null;
  business_type: string | null;
  is_registered: boolean;
  registration_document_url: string | null;
  monthly_revenue: string | null;
  kyc_verified: boolean;
  kyc_submitted_at: string | null;
}

interface NameChangeRequest {
  id: string;
  requested_name: string;
  status: string;
  created_at: string;
}

export default function DashboardProfile() {
  const navigate = useNavigate();
  const { canAccessSettings, loading: roleLoading, role } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [pendingNameRequest, setPendingNameRequest] = useState<NameChangeRequest | null>(null);

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
        .select("id, org_name, email, logo_url, business_nature, business_name, staff_count, business_type, is_registered, registration_document_url, monthly_revenue, kyc_verified, kyc_submitted_at")
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
            .select("id, org_name, email, logo_url, business_nature, business_name, staff_count, business_type, is_registered, registration_document_url, monthly_revenue, kyc_verified, kyc_submitted_at")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      if (!orgData) {
        toast.error("No organization found");
        return;
      }

      setOrganization(orgData as OrganizationData);

      // Check for pending name change request
      const { data: nameRequest } = await supabase
        .from("name_change_requests")
        .select("id, requested_name, status, created_at")
        .eq("org_id", orgData.id)
        .eq("status", "pending")
        .maybeSingle();

      setPendingNameRequest(nameRequest);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
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
                        <div className="flex gap-2">
                          <Input
                            id="org_name"
                            value={organization?.org_name || ""}
                            disabled
                            className="bg-muted/50 flex-1"
                          />
                          {pendingNameRequest ? (
                            <Badge variant="secondary" className="h-10 px-3 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending: {pendingNameRequest.requested_name}
                            </Badge>
                          ) : (
                            <NameChangeRequestDialog
                              orgId={organization?.id || ""}
                              currentName={organization?.org_name || ""}
                            >
                              <Button variant="outline" className="gap-2">
                                <Edit3 className="h-4 w-4" />
                                Request Change
                              </Button>
                            </NameChangeRequestDialog>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Name changes require admin approval
                        </p>
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
                  </CardContent>
                </Card>

                {/* KYC Section */}
                {organization && (
                  <KYCSection
                    orgId={organization.id}
                    kycData={{
                      business_nature: organization.business_nature,
                      business_name: organization.business_name,
                      staff_count: organization.staff_count,
                      business_type: organization.business_type,
                      is_registered: organization.is_registered,
                      registration_document_url: organization.registration_document_url,
                      monthly_revenue: organization.monthly_revenue,
                      kyc_verified: organization.kyc_verified,
                      kyc_submitted_at: organization.kyc_submitted_at,
                    }}
                    onUpdate={fetchProfile}
                  />
                )}

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
