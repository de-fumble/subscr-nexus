import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";

const SuperAdminHeader = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  return (
    <header className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center justify-between border-b border-border/30 bg-background/95 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity" />
        <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
          SuperAdmin Dashboard
        </h1>
      </div>
    </header>
  );
};

export function SuperAdminLayout() {
  const { isSuperadmin, loading } = useSuperadmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSuperadmin) {
      navigate("/dashboard");
    }
  }, [loading, isSuperadmin, navigate]);

  if (loading) {
    return <PremiumLoader fullScreen message="Authenticating SuperAdmin..." />;
  }

  // Prevent flashing content if not superadmin
  if (!isSuperadmin) return null;

  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden bg-background flex w-full">
        <SuperAdminSidebar />

        <SidebarInset className="flex-1 overflow-y-auto overflow-x-hidden bg-grid-white/[0.02]">
          <SuperAdminHeader />
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
