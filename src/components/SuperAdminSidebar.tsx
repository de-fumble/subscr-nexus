import {
  LayoutDashboard,
  Building2,
  Clock,
  ShieldAlert,
  Scale,
  Ban,
  FileText,
  Key,
  FileCheck,
  LogOut,
  UserIcon,
  LayoutGrid,
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
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: 'Overview', href: '/superadmin', icon: LayoutDashboard },
  { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
  { name: 'Payouts', href: '/superadmin/payouts', icon: Clock },
  { name: 'Deletions', href: '/superadmin/deletions', icon: ShieldAlert },
  { name: 'Appeals', href: '/superadmin/appeals', icon: Scale },
  { name: 'Defaulters', href: '/superadmin/defaulters', icon: Ban },
  { name: 'Logs', href: '/superadmin/logs', icon: FileText },
  { name: 'Licenses', href: '/superadmin/licenses', icon: Key },
  { name: 'KYC', href: '/superadmin/kyc', icon: FileCheck },
  { name: 'Profile', href: '/superadmin/profile', icon: UserIcon },
];

export function SuperAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { open, isMobile, openMobile } = useSidebar();
  const isExpanded = isMobile ? openMobile : open;

  const handleSignOut = async () => {
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
                  <span className="font-mono font-bold text-lg tracking-wider text-white">
                    Core Panel
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative group/icon">
                <Avatar className="h-10 w-10 ring-1 ring-border/50 ring-offset-1 ring-offset-background transition-all duration-300 group-hover/icon:ring-primary/40 group-hover/icon:shadow-lg group-hover/icon:shadow-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-background to-sidebar-accent text-white text-sm font-semibold">
                    C
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
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-white/50 font-medium px-2 mb-1">
            {isExpanded ? "Governance" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.href)}
                    isActive={isActive(item.href)}
                    tooltip={item.name}
                    className={`rounded-md transition-all duration-150 ${isActive(item.href)
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'hover:bg-white/10 text-white/70 hover:text-white'
                      }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-white' : 'text-white/70'}`} />
                    {isExpanded && <span className={`text-[13px] ${isActive(item.href) ? 'font-medium text-white' : 'text-white/80'}`}>{item.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className={`rounded-lg bg-white/10 border border-white/15 p-2.5 ${isExpanded ? '' : 'p-2'}`}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/dashboard")}
                tooltip="User Dashboard"
                className="rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[13px] mb-1"
              >
                <LayoutGrid className="h-4 w-4" />
                {isExpanded && <span>User Dashboard</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                tooltip="Sign Out"
                className="rounded-md hover:bg-red-500/20 hover:text-red-300 text-white/70 transition-colors text-[13px]"
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
