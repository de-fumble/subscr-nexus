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
  Lock
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/RoleBadge";
import { OrgRoleType } from "@/hooks/useOrgRole";

interface AppSidebarProps {
  organization: {
    org_name: string;
    email: string;
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
    <Sidebar collapsible="icon">
      <SidebarContent>
      <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            {open && (
              <div className="flex items-center gap-2 w-full">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{organization?.org_name || "Dashboard"}</span>
                <RoleBadge role={role || null} />
              </div>
            )}
            {!open && <Building2 className="h-4 w-4" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {open && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{open ? "Account" : ""}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {open && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
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
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
              <LogOut className="h-4 w-4" />
              {open && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
