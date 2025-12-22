import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrgRoleType = 'owner' | 'admin' | 'staff' | null;

interface OrgRoleResult {
  role: OrgRoleType;
  orgId: string | null;
  loading: boolean;
  canWrite: boolean;
  canManageStaff: boolean;
  canRequestPayout: boolean;
  canAccessSettings: boolean;
  canCreatePlans: boolean;
  canRequestLicense: boolean;
  canSubmitKYC: boolean;
  canResetAnalytics: boolean;
  refreshRole: () => Promise<void>;
}

export const useOrgRole = (): OrgRoleResult => {
  const [role, setRole] = useState<OrgRoleType>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setOrgId(null);
        setLoading(false);
        return;
      }

      // First check if user is an org owner
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (org) {
        setRole('owner');
        setOrgId(org.id);
        setLoading(false);
        return;
      }

      // Check if user is a member of any organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setRole(membership.role as OrgRoleType);
        setOrgId(membership.org_id);
        setLoading(false);
        return;
      }

      setRole(null);
      setOrgId(null);
    } catch (error) {
      console.error('Error checking org role:', error);
      setRole(null);
      setOrgId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
  }, []);

  const canWrite = role === 'owner' || role === 'admin';
  const canManageStaff = role === 'owner';
  const canRequestPayout = role === 'owner'; // Only owner can request payouts
  const canAccessSettings = role === 'owner'; // Only owner can access bank settings
  const canCreatePlans = role === 'owner' || role === 'admin'; // Staff cannot create plans
  
  // New owner-only permissions
  const canRequestLicense = role === 'owner'; // Only owner can request licenses
  const canSubmitKYC = role === 'owner'; // Only owner can submit KYC
  const canResetAnalytics = role === 'owner'; // Only owner can reset analytics

  return {
    role,
    orgId,
    loading,
    canWrite,
    canManageStaff,
    canRequestPayout,
    canAccessSettings,
    canCreatePlans,
    canRequestLicense,
    canSubmitKYC,
    canResetAnalytics,
    refreshRole: checkRole,
  };
};
