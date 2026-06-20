import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, Search, RefreshCw, Building2, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { PremiumLoader } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

interface OrganizationWithLicense {
  id: string;
  org_name: string;
  email: string;
  created_at: string;
  is_suspended: boolean;
  kyc_verified: boolean;
  license?: {
    id: string;
    plan_type: string;
    status: string;
    purchased_at: string;
    expires_at: string;
    amount: number;
  } | null;
}

const PLAN_LABELS: Record<string, string> = {
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
  "2_years": "2 Years",
};

export default function SuperAdminLicenses() {
  const navigate = useNavigate();
  const { hasPanelAccess, loading: authLoading } = useSuperadmin();
  const [organizations, setOrganizations] = useState<OrganizationWithLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      // Fetch all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, org_name, email, created_at, is_suspended, kyc_verified")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch all active licenses
      const { data: licenses, error: licensesError } = await supabase
        .from("licenses")
        .select("*")
        .in("status", ["active"]);

      if (licensesError) throw licensesError;

      // Map licenses to organizations
      const orgsWithLicenses = orgs.map((org) => {
        const license = licenses?.find((l) => l.org_id === org.id);
        return {
          ...org,
          license: license || null,
        };
      });

      setOrganizations(orgsWithLicenses);
      if (showRefresh) toast.success("Data refreshed");
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch data";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasPanelAccess) {
      fetchData();
    }
  }, [hasPanelAccess]);

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLicenseStatus = (license: OrganizationWithLicense["license"]) => {
    if (!license) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No License
        </Badge>
      );
    }

    const expiresAt = new Date(license.expires_at);
    const daysRemaining = differenceInDays(expiresAt, new Date());
    const isExpired = daysRemaining < 0;
    const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;

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
          {daysRemaining} days left
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

  const stats = {
    total: organizations.length,
    licensed: organizations.filter((o) => o.license && differenceInDays(new Date(o.license.expires_at), new Date()) >= 0).length,
    expired: organizations.filter((o) => o.license && differenceInDays(new Date(o.license.expires_at), new Date()) < 0).length,
    unlicensed: organizations.filter((o) => !o.license).length,
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading licenses..." />;
  }

  if (!hasPanelAccess) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">License Management</h1>
          <p className="text-muted-foreground mt-1">View and manage organization licenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/superadmin")}>
            Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{stats.licensed}</div>
          </CardContent>
        </Card>

        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-500">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card className="border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unlicensed</CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-500/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.unlicensed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>All organizations with license status</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Organization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>License Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead className="text-right pr-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium pl-6">{org.org_name}</TableCell>
                  <TableCell className="text-muted-foreground">{org.email}</TableCell>
                  <TableCell>{getLicenseStatus(org.license)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.license ? PLAN_LABELS[org.license.plan_type] || org.license.plan_type : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.license ? format(new Date(org.license.expires_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {org.kyc_verified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-none">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="shadow-none">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground pr-6">
                    {format(new Date(org.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrganizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery ? "No organizations match your search" : "No organizations found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
