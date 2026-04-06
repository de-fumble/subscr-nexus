import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { PremiumLoader } from "@/components/PremiumLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          // Check suspension status
          setTimeout(() => {
            checkSuspensionStatus(session.user.id);
          }, 0);
        } else {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkSuspensionStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSuspensionStatus = async (userId: string) => {
    try {
      // First check if user is an org owner
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("is_suspended, is_clocked_out")
        .eq("user_id", userId)
        .maybeSingle();

      if (ownedOrg) {
        setIsSuspended(ownedOrg.is_suspended || false);
        setLoading(false);
        return;
      }

      // Check if user is a staff member
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id, is_suspended")
        .eq("user_id", userId)
        .maybeSingle();

      if (membership) {
        // Fetch org suspension/clock_out status
        const { data: org } = await supabase
          .from("organizations")
          .select("is_suspended, is_clocked_out")
          .eq("id", membership.org_id)
          .maybeSingle();

        // A staff member is blocked if: 
        // 1. The platform suspended the org `org?.is_suspended`
        // 2. The owner suspended this specific member `membership.is_suspended`
        // 3. The owner clocked out the org `org?.is_clocked_out`

        if (org?.is_suspended || membership.is_suspended || org?.is_clocked_out) {
             setIsSuspended(true);
        } else {
             setIsSuspended(false);
        }
      }
    } catch (error) {
      console.error("Error checking suspension:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PremiumLoader message="Loading..." fullScreen />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Allow superadmin routes even if suspended (they won't have org anyway)
  const isSuperadminRoute = location.pathname.startsWith("/superadmin");
  
  if (isSuspended && !isSuperadminRoute) {
    return <Navigate to="/suspended" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
