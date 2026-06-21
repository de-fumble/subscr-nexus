import { useState, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User, Mail, Trash2, Building2, Sparkles, Edit3, Clock, CheckCircle2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { RestrictedPage } from "@/components/RestrictedPage";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { KYCSection } from "@/components/KYCSection";
import { NameChangeRequestDialog } from "@/components/NameChangeRequestDialog";
import { FloatingSupport } from "@/components/FloatingSupport";
import { APPLE_FONT, card } from "@/lib/appleLayout";


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
  const { canAccessSettings, loading: roleLoading, role, canSubmitKYC } = useOrgRole();
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
    return <PremiumLoader message="Loading profile..." />;
  }

  // Show restricted page for non-owners
  if (!canAccessSettings) {
    return <RestrictedPage />;
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Profile</h1>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="container max-w-3xl py-8 px-4 sm:px-6">
          <div className="space-y-6">
            {/* Profile Card */}
            <div className={`${card} overflow-hidden`}>
              <div className="h-12 bg-black/[0.02] dark:bg-white/[0.02]" />
              <div className="px-6 pt-4 pb-4 border-b border-black/5 dark:border-white/5">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-5 -mt-8 sm:-mt-10">
                  <ProfilePictureUpload
                    currentLogoUrl={organization?.logo_url}
                    orgName={organization?.org_name || ""}
                    onUploadComplete={handleLogoUpload}
                  />
                  <div className="flex-1 pb-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <h2 className="text-[17px] font-semibold text-black dark:text-white">{organization?.org_name}</h2>
                      <Sparkles className="h-4 w-4 text-black/40 dark:text-white/40" />
                    </div>
                    <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                      <Building2 className="h-3.5 w-3.5" />
                      Organization Profile
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org_name" className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
                      <User className="h-3.5 w-3.5" />
                      Organization Name
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="org_name"
                        value={organization?.org_name || ""}
                        disabled
                        className="bg-black/5 dark:bg-white/5 border-transparent flex-1 h-9 px-3 text-[13px] rounded-lg text-black/50 dark:text-white/50"
                      />
                      {pendingNameRequest ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 shrink-0 border border-black/5 dark:border-white/5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[120px]">Pending: {pendingNameRequest.requested_name}</span>
                        </span>
                      ) : (
                        <NameChangeRequestDialog
                          orgId={organization?.id || ""}
                          currentName={organization?.org_name || ""}
                        >
                          <Button variant="outline" className="h-9 px-4 text-[12px] rounded-lg border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 gap-1.5 shrink-0">
                            <Edit3 className="h-3.5 w-3.5" />
                            Request Change
                          </Button>
                        </NameChangeRequestDialog>
                      )}
                    </div>
                    <p className="text-[11px] text-black/30 dark:text-white/30">
                      Name changes require admin approval
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
                      <Mail className="h-3.5 w-3.5" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={organization?.email || ""}
                      disabled
                      className="bg-black/5 dark:bg-white/5 border-transparent h-9 px-3 text-[13px] rounded-lg text-black/50 dark:text-white/50"
                    />
                    <p className="text-[11px] text-black/30 dark:text-white/30">
                      Email cannot be changed
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                disabled={!canSubmitKYC}
              />
            )}

            {/* Danger Zone */}
            <div className={`${card} overflow-hidden border border-red-500/10`}>
              <div className="px-6 pt-5 pb-3">
                <h2 className="text-[15px] font-semibold text-red-500 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </h2>
                <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <div className="px-6 pb-6 pt-4 border-t border-black/5 dark:border-white/5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting} className="h-9 px-4 text-[12px] bg-red-500 hover:bg-red-600 text-white rounded-full transition-all gap-1.5 shadow-[0_1px_2px_rgba(239,68,68,0.2)]">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/10 dark:border-white/10 max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[16px] font-semibold text-black dark:text-white">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-black/45 dark:text-white/45 mt-2 leading-relaxed">
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data including subscription plans,
                        subscribers, and transaction history from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-2">
                      <AlertDialogCancel className="h-9 rounded-full text-[12px] border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="h-9 rounded-full text-[12px] bg-red-500 hover:bg-red-600 text-white font-medium"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
