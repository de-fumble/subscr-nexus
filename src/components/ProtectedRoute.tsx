import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

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
      const { data: org } = await supabase
        .from("organizations")
        .select("is_suspended")
        .eq("user_id", userId)
        .single();

      setIsSuspended(org?.is_suspended || false);
    } catch (error) {
      console.error("Error checking suspension:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
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
