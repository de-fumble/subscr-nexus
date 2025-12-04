import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperadmin = () => {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperadminStatus();
  }, []);

  const checkSuperadminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperadmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'superadmin')
        .single();

      setIsSuperadmin(!!data);
    } catch (error) {
      console.error('Error checking superadmin status:', error);
      setIsSuperadmin(false);
    } finally {
      setLoading(false);
    }
  };

  const invokeSuperadmin = async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('superadmin', {
      body: { action, ...params },
    });

    if (error) throw error;
    return data;
  };

  return { isSuperadmin, loading, invokeSuperadmin };
};
