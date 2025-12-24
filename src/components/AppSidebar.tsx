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
  Sparkles,
  CheckCircle
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
  const { open } = useSidebar();

  const menuItems = [
    { title: "Overview", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Plans", icon: CreditCard, url: "/plans" },
    { title: "Subscribers", icon: Users, url: "/dashboard/subscribers" },
    { title: "Analytics", icon: TrendingUp, url: "/dashboard/analytics" },
    { title: "Activity Logs", icon: FileText, url: "/dashboard/logs" },
    { title: "Staff", icon: Shield, url: "/dashboard/staff" },
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
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="glass-sidebar border-r-0">
      <SidebarContent className="px-2">
        {/* Premium Header */}
        <SidebarGroup className="pt-4">
          <div className={`flex items-center gap-3 px-2 py-3 rounded-xl glass-card mb-2 ${open ? '' : 'justify-center'}`}>
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-accent/30 ring-offset-1 ring-offset-background">
                <AvatarImage src={organization?.logo_url || undefined} alt={organization?.org_name} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-accent/70 text-accent-foreground font-bold">
                  {organization?.org_name?.charAt(0).toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            {open && (
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate text-foreground">{organization?.org_name || "Dashboard"}</p>
                  <Sparkles className="h-3 w-3 text-accent shrink-0" />
                </div>
                <RoleBadge role={role || null} />
              </div>
            )}
          </div>
        </SidebarGroup>

        {open && <Separator className="mx-2 my-2 bg-border/50" />}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-2">
            {open ? "Navigation" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-lg transition-all duration-200 ${
                      isActive(item.url) 
                        ? 'bg-accent text-accent-foreground shadow-md hover-glow' 
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive(item.url) ? '' : 'text-muted-foreground'}`} />
                    {open && <span className="font-medium">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && <Separator className="mx-2 my-2 bg-border/50" />}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-2">
            {open ? "Account" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-lg transition-all duration-200 ${
                      isActive(item.url) 
                        ? 'bg-accent text-accent-foreground shadow-md' 
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive(item.url) ? '' : 'text-muted-foreground'}`} />
                    {open && <span className="font-medium">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className={`glass-card rounded-xl p-3 ${open ? '' : 'p-2'}`}>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className={`flex items-center gap-3 mb-3 ${open ? '' : 'justify-center'}`}>
                <Avatar className="h-9 w-9 ring-2 ring-border">
                  <AvatarImage src={organization?.logo_url || undefined} alt={displayName || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {open && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                )}
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut} 
                tooltip="Sign Out"
                className="rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {open && <span>Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
