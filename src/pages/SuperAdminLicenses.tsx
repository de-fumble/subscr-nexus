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
  const { isSuperadmin, loading: authLoading } = useSuperadmin();
  const [organizations, setOrganizations] = useState<OrganizationWithLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

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
    if (isSuperadmin) {
      fetchData();
    }
  }, [isSuperadmin]);

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">License Management</h1>
          <p className="text-muted-foreground">View and manage organization licenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={() => navigate("/superadmin")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.licensed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unlicensed</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.unlicensed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>All organizations with license status</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>License Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.org_name}</TableCell>
                  <TableCell>{org.email}</TableCell>
                  <TableCell>{getLicenseStatus(org.license)}</TableCell>
                  <TableCell>
                    {org.license ? PLAN_LABELS[org.license.plan_type] || org.license.plan_type : "-"}
                  </TableCell>
                  <TableCell>
                    {org.license ? format(new Date(org.license.expires_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {org.kyc_verified ? (
                      <Badge className="bg-green-500/10 text-green-600">Verified</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {format(new Date(org.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrganizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
