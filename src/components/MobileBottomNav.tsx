import { CreditCard, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Plans", icon: CreditCard, url: "/plans" },
  { label: "Failed", icon: AlertTriangle, url: "/dashboard/failed-payments" },
  { label: "Verify", icon: CheckCircle, url: "/dashboard/verify" },
  { label: "Settings", icon: Settings, url: "/dashboard/settings" },
];

const dashboardPaths = [
  "/dashboard", "/dashboard/setup", "/plans", "/payments",
  "/dashboard/failed-payments", "/dashboard/retry-queue",
  "/dashboard/subscribers", "/dashboard/billing-profiles",
  "/dashboard/analytics", "/dashboard/logs", "/dashboard/staff",
  "/dashboard/invoices", "/dashboard/verify", "/dashboard/profile",
  "/dashboard/settings",
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboardRoute = dashboardPaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  if (!isDashboardRoute) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive(item.url)
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive(item.url) ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* Spacer to prevent content from being hidden behind the bottom nav */}
      <div className="md:hidden h-14" />
    </>
  );
}
