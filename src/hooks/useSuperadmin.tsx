import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type SuperadminDepartment,
  canAccessRoute,
  canPerformAction,
  canSendEmail,
} from "@/lib/superadminPermissions";

export type { SuperadminDepartment };

export const useSuperadmin = () => {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [departments, setDepartments] = useState<SuperadminDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const hasPanelAccess = isSuperadmin || departments.length > 0;

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperadmin(false);
        setDepartments([]);
        setLoading(false);
        return;
      }

      const [{ data: roleData }, { data: deptData }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .maybeSingle(),
        supabase
          .from('superadmin_role_assignments')
          .select('department')
          .eq('user_id', user.id),
      ]);

      setIsSuperadmin(!!roleData);
      setDepartments((deptData || []).map((d) => d.department as SuperadminDepartment));
    } catch (error) {
      console.error('Error checking superadmin access:', error);
      setIsSuperadmin(false);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const canAccess = useCallback(
    (pathname: string) => canAccessRoute(pathname, isSuperadmin, departments),
    [isSuperadmin, departments],
  );

  const canAction = useCallback(
    (action: string) => canPerformAction(action, isSuperadmin, departments),
    [isSuperadmin, departments],
  );

  const invokeSuperadmin = async (action: string, params: Record<string, unknown> = {}) => {
    if (!canPerformAction(action, isSuperadmin, departments)) {
      throw new Error('You do not have permission to perform this action.');
    }

    const { data, error } = await supabase.functions.invoke('superadmin', {
      body: { action, ...params },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  return {
    isSuperadmin,
    departments,
    hasPanelAccess,
    loading,
    canAccess,
    canAction,
    canSendEmail: canSendEmail(isSuperadmin, departments),
    invokeSuperadmin,
    refreshAccess: checkAccess,
  };
};
