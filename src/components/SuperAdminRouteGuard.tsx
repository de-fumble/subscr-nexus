import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { PremiumLoader } from "@/components/PremiumLoader";
import { toast } from "sonner";

interface SuperAdminRouteGuardProps {
  children: React.ReactNode;
}

export function SuperAdminRouteGuard({ children }: SuperAdminRouteGuardProps) {
  const { hasPanelAccess, canAccess, loading, departments, isSuperadmin } = useSuperadmin();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!hasPanelAccess) {
      navigate("/dashboard");
      return;
    }

    if (!canAccess(location.pathname)) {
      toast.error("Access denied. You don't have permission for this section.");
      const fallback = isSuperadmin
        ? "/superadmin"
        : departments.length > 0
          ? getFirstAccessibleRoute(canAccess)
          : "/dashboard";
      navigate(fallback);
    }
  }, [loading, hasPanelAccess, canAccess, location.pathname, navigate, isSuperadmin, departments]);

  if (loading) {
    return <PremiumLoader fullScreen message="Checking permissions..." />;
  }

  if (!hasPanelAccess || !canAccess(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}

function getFirstAccessibleRoute(canAccess: (path: string) => boolean): string {
  const candidates = [
    "/superadmin/onboarding",
    "/superadmin/email-history",
    "/superadmin/api-keys",
    "/superadmin/licenses",
    "/superadmin/payouts",
    "/superadmin/logs",
    "/superadmin/kyc",
    "/superadmin/organizations",
    "/superadmin",
  ];
  return candidates.find(canAccess) ?? "/dashboard";
}
