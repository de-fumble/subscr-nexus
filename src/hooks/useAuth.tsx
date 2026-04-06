import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // 1. Audit Logging (happens before the delay as confirmed)
      // Note: The specific audit logging logic from AppSidebar will be moved here or handled via props/state if needed.
      // But for now, we trigger the common notification.
      supabase.functions.invoke("send-notification-email", {
        body: { event_type: "logout" }
      }).catch(() => {});

      // 2. Clear local storage
      localStorage.removeItem("vite-ui-theme");

      // 3. Start sign-out animation
      setIsSigningOut(true);

      // 4. Wait for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 5. Perform actual sign out
      await supabase.auth.signOut();
      
      // 6. Reset state and navigate
      setIsSigningOut(false);
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
      toast.error("Failed to sign out");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isSigningOut, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
