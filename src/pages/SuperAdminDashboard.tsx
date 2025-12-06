import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Loader2, Building2, Users, DollarSign, AlertTriangle, Search, 
  TrendingUp, Clock, Ban, Scale, RefreshCw, TrendingDown, CreditCard 
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  suspended_organizations: number;
  total_subscribers: number;
  active_subscribers: number;
  defaulted_subscribers: number;
  total_revenue: number;
  platform_earnings: number;
  transaction_count: number;
  mrr: number;
  arr: number;
  failed_payments: number;
  pending_payouts: number;
  pending_deletions: number;
  pending_appeals: number;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  created_at: string;
  is_suspended: boolean;
  active_subscribers: number;
  total_subscribers: number;
  total_revenue: number;
  mrr: number;
  arr: number;
  defaulted_subscribers: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
      const [statsData, orgsData] = await Promise.all([
        invokeSuperadmin('get_platform_stats'),
        invokeSuperadmin('get_all_organizations'),
      ]);
      setStats(statsData);
      setOrganizations(orgsData.organizations);
      if (showRefresh) toast.success('Data refreshed');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin]);

  const filteredOrganizations = organizations.filter(org =>
    org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor all organizations on Recurra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/payouts')}>
            <Clock className="h-4 w-4 mr-2" />
            Payouts ({stats?.pending_payouts || 0})
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/deletions')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Deletions ({stats?.pending_deletions || 0})
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/appeals')}>
            <Scale className="h-4 w-4 mr-2" />
            Appeals ({stats?.pending_appeals || 0})
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/defaulters')}>
            <Ban className="h-4 w-4 mr-2" />
            Defaulters ({stats?.defaulted_subscribers || 0})
          </Button>
        </div>
      </div>

      {/* Platform Stats - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_organizations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_organizations || 0} active, {stats?.suspended_organizations || 0} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_subscribers || 0} active across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(stats?.total_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {stats?.transaction_count || 0} successful transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(stats?.platform_earnings || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ₦1,500 × {stats?.transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₦{(stats?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Sum of all active monthly subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₦{(stats?.arr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              MRR × 12 projected annually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Defaulted Subscribers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.defaulted_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Payment failed or non-renewing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.failed_payments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total failed payment attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>All organizations registered on the platform with live metrics</CardDescription>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subscribers</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Defaulted</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.org_name}</TableCell>
                  <TableCell>{org.email}</TableCell>
                  <TableCell>
                    {org.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{org.active_subscribers}</span>
                    <span className="text-muted-foreground text-xs"> / {org.total_subscribers}</span>
                  </TableCell>
                  <TableCell className="text-right">₦{(org.total_revenue || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">₦{(org.mrr || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {org.defaulted_subscribers > 0 ? (
                      <span className="text-destructive font-medium">{org.defaulted_subscribers}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/superadmin/organization/${org.id}`)}
                    >
                      View Dashboard
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrganizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No organizations match your search' : 'No organizations found'}
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
