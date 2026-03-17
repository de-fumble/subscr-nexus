import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, ShieldCheck } from "lucide-react";
import { PremiumLoader } from "@/components/PremiumLoader";

export default function SuperAdminProfile() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading } = useSuperadmin();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isSuperadmin) {
      fetchUser();
    }
  }, [isSuperadmin]);

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading profile..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your superadmin account</p>
      </div>

      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="h-16 sm:h-24 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent" />
        <CardHeader className="-mt-8 sm:-mt-12 pb-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6">
            <div className="h-20 w-20 rounded-full border-4 border-background bg-muted flex items-center justify-center shadow-sm">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1 pb-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <CardTitle className="text-xl sm:text-2xl">Super Admin</CardTitle>
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <CardDescription className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                Core Panel Access
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Account Role
              </Label>
              <div className="flex items-center">
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none px-3 py-1">
                  System Administrator
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You have full access to platform governance and administration.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                value={userEmail || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contact system administration to change your email address
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
