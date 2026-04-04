import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

/**
 * DashboardLayout — wraps all protected dashboard routes with a single,
 * persistent SidebarProvider + AppSidebar so the sidebar state is never
 * reset when navigating between pages.
 *
 * Each child page only needs to render its own <SidebarInset> (or any
 * content inside the content area); the sidebar itself lives here.
 */
export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
