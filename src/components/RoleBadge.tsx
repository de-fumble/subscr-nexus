import { Badge } from "@/components/ui/badge";
import { Crown, Shield, User } from "lucide-react";
import { OrgRoleType } from "@/hooks/useOrgRole";

interface RoleBadgeProps {
  role: OrgRoleType;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  if (!role) return null;

  const config = {
    owner: {
      label: "Owner",
      icon: Crown,
      variant: "default" as const,
      className: "bg-accent text-accent-foreground",
    },
    admin: {
      label: "Admin",
      icon: Shield,
      variant: "secondary" as const,
      className: "bg-primary text-primary-foreground",
    },
    staff: {
      label: "Staff",
      icon: User,
      variant: "outline" as const,
      className: "border-muted-foreground/30",
    },
  };

  const { label, icon: Icon, className: badgeClassName } = config[role];

  return (
    <Badge className={`${badgeClassName} ${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
