import {
  LayoutDashboard,
  CreditCard,
  Users,
  TrendingUp,
  Settings,
  User,
  LogOut,
  Building2,
  FileText,
  Shield,
  Lock,
  CheckCircle,
  Banknote,
  AlertTriangle,
  Receipt,
  UserSquare,
  RotateCcw
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/RoleBadge";
import { OrgRoleType } from "@/hooks/useOrgRole";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  organization: {
    org_name: string;
    email: string;
    logo_url?: string | null;
  } | null;
  role?: OrgRoleType;
  userEmail?: string;
  canAccessSettings?: boolean;
}

export function AppSidebar({ organization, role, userEmail, canAccessSettings = true }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { open, isMobile, openMobile } = useSidebar();
  const isExpanded = isMobile ? openMobile : open;

  const menuItems = [
    { title: "Overview", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Plans", icon: CreditCard, url: "/plans" },
    { title: "Failed Payments", icon: AlertTriangle, url: "/dashboard/failed-payments" },
    { title: "Retry Queue", icon: RotateCcw, url: "/dashboard/retry-queue" },
    { title: "Standard Payments", icon: Banknote, url: "/payments" },
    { title: "Subscribers", icon: Users, url: "/dashboard/subscribers" },
    { title: "Billing Profiles", icon: UserSquare, url: "/dashboard/billing-profiles" },
    { title: "Analytics", icon: TrendingUp, url: "/dashboard/analytics" },
    { title: "Activity Logs", icon: FileText, url: "/dashboard/logs" },
    { title: "Staff", icon: Shield, url: "/dashboard/staff" },
    { title: "Create Invoice", icon: Receipt, url: "/dashboard/invoices" },
    { title: "Verify Transaction", icon: CheckCircle, url: "/dashboard/verify" },
  ];

  // Only show profile/settings to owners
  const settingsItems = canAccessSettings
    ? [
      { title: "Profile", icon: User, url: "/dashboard/profile" },
      { title: "Settings", icon: Settings, url: "/dashboard/settings" },
    ]
    : [
      { title: "Profile", icon: Lock, url: "/dashboard/profile", restricted: true },
      { title: "Settings", icon: Lock, url: "/dashboard/settings", restricted: true },
    ];

  // Display name and email based on role
  const displayName = role === 'staff' ? userEmail?.split('@')[0] || 'Staff' : organization?.org_name;
  const displayEmail = role === 'staff' ? userEmail : organization?.email;

  const handleSignOut = async () => {
    // Reset theme to light mode on sign-out so the next login starts fresh
    localStorage.removeItem("vite-ui-theme");

    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/20 bg-background/80 backdrop-blur-md">
      <SidebarContent className="px-2">
        {/* Premium Header */}
        <SidebarGroup className="pt-4">
          <div className={`flex items-center gap-3 px-2 py-2 mb-2 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
            {isExpanded ? (
              <div className="w-full bg-gradient-to-b from-sidebar-accent/50 to-sidebar-accent/30 border border-sidebar-border/50 rounded-xl p-2 shadow-sm group-hover:border-primary/20 transition-all duration-300 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
                <div className="relative shrink-0">
                  <img
                    src="/sidebar-logo.png"
                    alt="Recurra"
                    className="h-9 w-9 object-cover rounded-full ring-2 ring-background shadow-sm transform scale-110"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0 justify-center">
                  <span className="font-mono font-bold text-lg tracking-wider text-teal-900">
                    RECURRA
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative group/icon">
                <Avatar className="h-10 w-10 ring-1 ring-border/50 ring-offset-1 ring-offset-background transition-all duration-300 group-hover/icon:ring-primary/40 group-hover/icon:shadow-lg group-hover/icon:shadow-primary/10">
                  <AvatarImage src={organization?.logo_url || undefined} alt={organization?.org_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground text-sm font-semibold">
                    {organization?.org_name?.charAt(0).toUpperCase() || "O"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background shadow-sm animate-pulse" />
              </div>
            )}
          </div>
        </SidebarGroup>

        {isExpanded && <Separator className="mx-2 my-2 bg-border/30" />}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 mb-1">
            {isExpanded ? "Navigation" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-md transition-all duration-150 ${isActive(item.url)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'text-primary' : ''}`} />
                    {isExpanded && <span className={`text-[13px] ${isActive(item.url) ? 'font-medium' : ''}`}>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isExpanded && <Separator className="mx-2 my-2 bg-border/30" />}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 mb-1">
            {isExpanded ? "Account" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-md transition-all duration-150 ${isActive(item.url)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive(item.url) ? 'text-primary' : ''}`} />
                    {isExpanded && <span className={`text-[13px] ${isActive(item.url) ? 'font-medium' : ''}`}>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className={`rounded-lg bg-muted/30 border border-border/30 p-2.5 ${isExpanded ? '' : 'p-2'}`}>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className={`flex items-center gap-2.5 mb-2 ${isExpanded ? '' : 'justify-center'}`}>
                <Avatar className="h-8 w-8 ring-1 ring-border/40">
                  <AvatarImage src={organization?.logo_url || undefined} alt={displayName || ''} />
                  <AvatarFallback className="bg-primary/90 text-primary-foreground text-xs font-medium">
                    {displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[13px] font-medium truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                )}
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                tooltip="Sign Out"
                className="rounded-md hover:bg-destructive/8 hover:text-destructive text-muted-foreground transition-colors text-[13px]"
              >
                <LogOut className="h-4 w-4" />
                {isExpanded && <span>Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
