import {
  LayoutDashboard,
  CreditCard,
  Users,
  TrendingUp,
  Settings,
  User,
  LogOut,
  FileText,
  Shield,
  Lock,
  CheckCircle,
  Banknote,
  AlertTriangle,
  Receipt,
  UserSquare,
  RotateCcw,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { logAuditEvent } from "@/utils/auditLogger";
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
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
  sidebarTooltipContentClass,
  sidebarTooltipArrowClass,
} from "@/components/ui/tooltip";
import type { ComponentProps, ComponentType } from "react";

export type SidebarNavItemConfig = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  url?: string;
  onClick?: () => void;
  showLock?: boolean;
  buttonClassName?: string;
};

const sidebarItemTooltipProps = (
  label: string,
): ComponentProps<typeof TooltipContent> => ({
  side: "right",
  align: "center",
  sideOffset: 16,
  className: sidebarTooltipContentClass,
  children: (
    <>
      <span className="relative z-10">{label}</span>
      <TooltipArrow className={sidebarTooltipArrowClass} width={12} height={6} />
    </>
  ),
});

function SidebarNavMenuItem({
  item,
  isExpanded,
  isActive,
  onNavigate,
}: {
  item: SidebarNavItemConfig;
  isExpanded: boolean;
  isActive: boolean;
  onNavigate: (url: string) => void;
}) {
  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.url) onNavigate(item.url);
  };

  const menuButton = (
    <SidebarMenuButton
      onClick={handleClick}
      isActive={isActive}
      tooltip={!isExpanded ? sidebarItemTooltipProps(item.badge) : undefined}
      className={cn(
        "rounded-md transition-all duration-150",
        isActive
          ? "bg-white/20 text-white border border-white/30 hover:!bg-white/25"
          : "text-white/70 hover:!bg-white/10 hover:!text-white",
        item.buttonClassName,
      )}
    >
      <item.icon
        className={cn("h-4 w-4", isActive ? "text-white" : "text-white/70")}
      />
      {isExpanded && (
        <span
          className={cn(
            "text-[13px] flex flex-1 items-center gap-1.5 min-w-0",
            isActive ? "font-medium text-white" : "text-white/80",
          )}
        >
          {item.title}
          {item.showLock && (
            <Lock className="h-3 w-3 opacity-60 text-emerald-400 shrink-0" />
          )}
        </span>
      )}
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {isExpanded ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
          <TooltipContent {...sidebarItemTooltipProps(item.badge)} />
        </Tooltip>
      ) : (
        menuButton
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { open, isMobile, openMobile } = useSidebar();
  const isExpanded = isMobile ? openMobile : open;
  const { hasPanelAccess } = useSuperadmin();
  const { role, canAccessSettings } = useOrgRole();
  const { signOut } = useAuth();

  const { data: session } = useQuery({
    queryKey: ["sidebar-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const { data: organization } = useQuery({
    queryKey: ["sidebar-organization", userId],
    queryFn: async () => {
      if (!userId) return null;
      // Check if owner
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (ownedOrg) return ownedOrg;
      // Check if staff
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (membership) {
        const { data: memberOrg } = await supabase
          .from("organizations")
          .select("id, org_name, email, logo_url")
          .eq("id", membership.org_id)
          .maybeSingle();
        return memberOrg;
      }
      return null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const navGroups: { label: string; items: SidebarNavItemConfig[] }[] = [
    {
      label: "Dashboard",
      items: [
        {
          title: "Overview",
          icon: LayoutDashboard,
          url: "/dashboard",
          badge: "Revenue, subscribers & alerts at a glance (coming soon)",
        },
      ],
    },
    {
      label: "Billing",
      items: [
        {
          title: "Plans",
          icon: CreditCard,
          url: "/plans",
          badge: "Create and manage recurring subscription plans",
        },
        {
          title: "Standard Payments",
          icon: Banknote,
          url: "/payments",
          badge: "One-time payment links and quick collections",
        },
        {
          title: "All Transactions",
          icon: ArrowLeftRight,
          url: "/dashboard/transactions",
          badge: "Search every subscription and one-off payment",
        },
        {
          title: "Failed Payments",
          icon: AlertTriangle,
          url: "/dashboard/failed-payments",
          badge: "Review declined charges and recovery options",
        },
        {
          title: "Refund Monitor",
          icon: RotateCcw,
          url: "/dashboard/refunds",
          badge: "Track and monitor Paystack refund statuses",
        },
        {
          title: "Auto Retry Queue",
          icon: RotateCcw,
          url: "/dashboard/retry-queue",
          showLock: true,
          badge: "Automatically retry failed payments (coming soon)",
        },
        {
          title: "Create Invoice",
          icon: Receipt,
          url: "/dashboard/invoices",
          badge: "Generate and send branded invoices",
        },
        {
          title: "Verify Transaction",
          icon: CheckCircle,
          url: "/dashboard/verify",
          badge: "Look up payment status by reference or receipt",
        },
      ],
    },
    {
      label: "Customers",
      items: [
        {
          title: "Subscribers",
          icon: Users,
          url: "/dashboard/subscribers",
          badge: "View and manage active subscribers",
        },
        {
          title: "Billing Profiles",
          icon: UserSquare,
          url: "/dashboard/billing-profiles",
          badge: "Customer payment history across your org",
        },
      ],
    },
    {
      label: "Analytics",
      items: [
        {
          title: "Analytics",
          icon: TrendingUp,
          url: "/dashboard/analytics",
          badge: "Charts, MRR trends and plan performance",
        },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          title: "Activity Logs",
          icon: FileText,
          url: "/dashboard/logs",
          badge: "Audit trail of team and account actions",
        },
      ],
    },
    {
      label: "Team",
      items: [
        {
          title: "Staff",
          icon: Shield,
          url: "/dashboard/staff",
          badge: "Invite admins and staff with role permissions",
        },
      ],
    },
  ];

  const settingsItems: SidebarNavItemConfig[] = canAccessSettings
    ? [
        {
          title: "Profile",
          icon: User,
          url: "/dashboard/profile",
          badge: "Business details, logo and KYC documents",
        },
        {
          title: "Settings",
          icon: Settings,
          url: "/dashboard/settings",
          badge: "Paystack keys, bank account and preferences",
        },
      ]
    : [
        {
          title: "Profile",
          icon: Lock,
          url: "/dashboard/profile",
          badge: "View profile — only the owner can edit",
        },
        {
          title: "Settings",
          icon: Lock,
          url: "/dashboard/settings",
          badge: "Owner-only — API keys, bank and payouts",
        },
      ];

  const displayName =
    role === "staff"
      ? userEmail?.split("@")[0] || "Staff"
      : organization?.org_name;
  const displayEmail = role === "staff" ? userEmail : organization?.email;

  const handleSignOut = async () => {
    if (organization) {
      await logAuditEvent(
        "logout",
        "organization",
        organization.id || "unknown",
        "auth",
        { email: displayEmail },
        role || "Owner",
      );
    }

    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/20 bg-background/80 backdrop-blur-md"
    >
      <SidebarContent className="px-2">
        <SidebarGroup className="pt-4">
          <div
            className={`flex items-center gap-3 px-2 py-2 mb-2 transition-all duration-300 ${isExpanded ? "justify-start" : "justify-center"}`}
          >
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
                    RECURRA
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative group/icon">
                <Avatar className="h-10 w-10 ring-1 ring-border/50 ring-offset-1 ring-offset-background transition-all duration-300 group-hover/icon:ring-primary/40 group-hover/icon:shadow-lg group-hover/icon:shadow-primary/10">
                  <AvatarImage
                    src={organization?.logo_url || undefined}
                    alt={organization?.org_name}
                  />
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

        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-white/50 font-medium px-2 mb-1">
              {isExpanded ? group.label : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavMenuItem
                    key={item.title}
                    item={item}
                    isExpanded={isExpanded}
                    isActive={item.url ? isActive(item.url) : false}
                    onNavigate={navigate}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {hasPanelAccess && (
          <>
            {isExpanded && <Separator className="mx-2 my-2 bg-border/30" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-white/50 font-medium px-2 mb-1">
                {isExpanded ? "Administration" : ""}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  <SidebarNavMenuItem
                    item={{
                      title: "Core Panel",
                      icon: ShieldCheck,
                      url: "/superadmin",
                      badge: "Platform admin — orgs, payouts and compliance",
                    }}
                    isExpanded={isExpanded}
                    isActive={location.pathname.startsWith("/superadmin")}
                    onNavigate={navigate}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isExpanded && <Separator className="mx-2 my-2 bg-border/30" />}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-white/50 font-medium px-2 mb-1">
            {isExpanded ? "Account" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {settingsItems.map((item) => (
                <SidebarNavMenuItem
                  key={item.title}
                  item={item}
                  isExpanded={isExpanded}
                  isActive={item.url ? isActive(item.url) : false}
                  onNavigate={navigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div
          className={`rounded-lg bg-white/10 border border-white/15 p-2.5 ${isExpanded ? "" : "p-2"}`}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={`flex items-center gap-2.5 mb-2 ${isExpanded ? "" : "justify-center"}`}
              >
                <Avatar className="h-8 w-8 ring-1 ring-white/30">
                  <AvatarImage
                    src={organization?.logo_url || undefined}
                    alt={displayName || ""}
                  />
                  <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                    {displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[13px] font-medium truncate text-white">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-white/60 truncate">
                      {displayEmail}
                    </p>
                  </div>
                )}
              </div>
            </SidebarMenuItem>
            <SidebarNavMenuItem
              item={{
                title: "Sign Out",
                icon: LogOut,
                badge: "End your session on this device",
                onClick: handleSignOut,
                buttonClassName:
                  "hover:!bg-red-500/20 hover:!text-red-300 text-[13px]",
              }}
              isExpanded={isExpanded}
              isActive={false}
              onNavigate={navigate}
            />
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
