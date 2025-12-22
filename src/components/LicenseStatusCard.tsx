import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Calendar, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface License {
  id: string;
  plan_type: string;
  status: string;
  purchased_at: string;
  expires_at: string;
  amount: number;
}

interface LicenseStatusCardProps {
  license: License | null;
  onRequestLicense?: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
  "2_years": "2 Years",
};

export function LicenseStatusCard({ license, onRequestLicense }: LicenseStatusCardProps) {
  if (!license) {
    return (
      <Card className="glass-card border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-amber-500" />
            License Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-600">No Active License</p>
              <p className="text-sm text-muted-foreground">
                Request a license to unlock all features
              </p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unlicensed
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiresAt = new Date(license.expires_at);
  const daysRemaining = differenceInDays(expiresAt, new Date());
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (isExpiringSoon) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Expires Soon
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <Card className={`glass-card border-0 ${isExpired ? 'border-destructive/30' : isExpiringSoon ? 'border-amber-500/30' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-accent" />
            License Status
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
            <p className="text-lg font-semibold">
              {PLAN_LABELS[license.plan_type] || license.plan_type}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Purchased</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(license.purchased_at), "MMM d, yyyy")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {isExpired ? "Expired" : "Expires"}
            </p>
            <p className={`text-lg font-semibold ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-amber-600' : ''}`}>
              {format(expiresAt, "MMM d, yyyy")}
              {!isExpired && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({daysRemaining} days)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
