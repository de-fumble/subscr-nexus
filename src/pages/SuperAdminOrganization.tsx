import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Ban, CheckCircle, DollarSign, Users, TrendingUp, AlertTriangle, RefreshCw, CreditCard, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumLoader, PremiumSpinner } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SuperAdminMessageDialog } from "@/components/SuperAdminMessageDialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--primary))", "hsl(var(--secondary))"];

interface OrganizationDetails {
  organization: any;
  plans: any[];
  subscribers: any[];
  live_subscribers: any[];
  live_transactions: any[];
  payout_requests: any[];
  deletion_requests: any[];
}

interface Analytics {
  total_revenue: number;
  recurring_revenue: number;
  platform_fee: number;
  transaction_count: number;
  mrr: number;
  arr: number;
  active_subscribers: number;
  churned_subscribers: number;
  defaulted_subscribers: number;
  total_subscribers: number;
  churn_rate: number;
  arpu: number;
  revenue_by_plan: any[];
  monthly_revenue_trend: any[];
  subscriber_growth: any[];
  subscribers_by_plan: any[];
  plan_distribution: any[];
  defaulted_list: any[];
}

export default function SuperAdminOrganization() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [detailsData, analyticsData] = await Promise.all([
        invokeSuperadmin('get_organization_details', { org_id: orgId }),
        invokeSuperadmin('get_organization_analytics', { org_id: orgId }),
      ]);
      setDetails(detailsData);
      setAnalytics(analyticsData);
      if (showRefresh) toast.success('Data refreshed');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invokeSuperadmin, orgId]);

  useEffect(() => {
    if (isSuperadmin && orgId) {
      fetchData();
    }
  }, [isSuperadmin, orgId, fetchData]);

  useEffect(() => {
    if (details?.organization && apiKeysDialogOpen) {
      setPublicKey(details.organization.paystack_public_key || "");
      setSecretKey(details.organization.paystack_secret_key || "");
    }
  }, [details, apiKeysDialogOpen]);

  const handleUpdateKeys = async () => {
    setActionLoading(true);
    try {
      if (!publicKey || !secretKey) {
        throw new Error("Both keys are required.");
      }
      await invokeSuperadmin('update_api_keys', { org_id: orgId, public_key: publicKey, secret_key: secretKey });
      toast.success('API keys updated successfully');
      setApiKeysDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update API keys');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await invokeSuperadmin('suspend_organization', { org_id: orgId, reason: suspendReason });
      toast.success('Organization suspended successfully');
      setSuspendDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      await invokeSuperadmin('restore_organization', { org_id: orgId });
      toast.success('Organization restored successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkResolved = async (subscriberId: string) => {
    try {
      await invokeSuperadmin('mark_payment_resolved', { subscriber_id: subscriberId });
      toast.success('Payment marked as resolved');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark payment resolved');
    }
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading organization..." />;
  }

  if (!details) {
    return (
      <div className="container py-8">
        <p>Organization not found</p>
      </div>
    );
  }

  const org = details.organization;

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{org.org_name}</h1>
              {org.is_suspended ? (
                <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">Suspended</Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20">Active</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{org.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {org.recurra_handling_request && !org.paystack_secret_key && (
            <Button size="sm" variant="secondary" onClick={() => setApiKeysDialogOpen(true)} className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
              <Key className="h-4 w-4 mr-2" />
              Configure Recurra Keys
            </Button>
          )}
          {org.recurra_handling_request && org.paystack_secret_key && (
             <Button size="sm" variant="outline" onClick={() => setApiKeysDialogOpen(true)}>
              <Key className="h-4 w-4 mr-2" />
              Manage Recurra Keys
            </Button>
          )}
          {org.is_suspended ? (
            <Button size="sm" onClick={handleRestore} disabled={actionLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Restore Organization
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setSuspendDialogOpen(true)} disabled={actionLoading}>
              <Ban className="h-4 w-4 mr-2" />
              Suspend Organization
            </Button>
          )}
          <SuperAdminMessageDialog 
            organization={{
              id: org.id,
              org_name: org.org_name,
              email: org.email
            }}
          />
        </div>
      </div>

      {/* Revenue Summary Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">₦{(analytics?.total_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From <span className="font-medium text-emerald-500">{analytics?.transaction_count || 0}</span> transactions
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Platform Fee Owed</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">₦{(analytics?.recurring_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
               Based on ₦{(analytics?.platform_fee || 0).toLocaleString()} platform fee
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
               <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-green-600">₦{(analytics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly Recurring Revenue
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
           <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent" />
           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-cyan-600">₦{(analytics?.arr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Annual Recurring Revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber Stats - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{analytics?.total_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time subscribers
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-green-600">{analytics?.active_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently paying
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Defaulted</CardTitle>
            <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-rose-500">{analytics?.defaulted_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Payment issues
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
               <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-orange-600">{analytics?.churn_rate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.churned_subscribers || 0} churned
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="plans">Plans ({details.plans.length})</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({details.live_subscribers?.length || details.subscribers.length})</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulters ({analytics?.defaulted_subscribers || 0})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({details.payout_requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-black/5 dark:border-white/5 shadow-sm">
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics?.monthly_revenue_trend || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-black/5 dark:border-white/5 shadow-sm">
              <CardHeader>
                <CardTitle>Subscriber Growth</CardTitle>
                <CardDescription>New subscribers over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.subscriber_growth || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="subscribers"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-black/5 dark:border-white/5 shadow-sm">
              <CardHeader>
                <CardTitle>Subscribers by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.subscribers_by_plan || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="active" fill="hsl(var(--primary))" name="Active" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="defaulted" fill="hsl(var(--destructive))" name="Defaulted" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="churned" fill="hsl(var(--muted-foreground))" name="Churned" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-black/5 dark:border-white/5 shadow-sm">
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Active subscribers by plan</CardDescription>
              </CardHeader>
              <CardContent>
                {(analytics?.plan_distribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.plan_distribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={100}
                        innerRadius={60}
                        dataKey="count"
                        paddingAngle={2}
                      >
                        {(analytics?.plan_distribution || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground border border-dashed rounded-lg">
                    No active subscribers to show distribution
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Plan Table */}
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>Revenue by Plan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Plan Name</TableHead>
                    <TableHead className="text-right">Active Subscribers</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right pr-6">Net Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics?.revenue_by_plan || []).map((plan) => (
                    <TableRow key={plan.name} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium pl-6">{plan.name}</TableCell>
                      <TableCell className="text-right">{plan.active_subscribers}</TableCell>
                      <TableCell className="text-right">₦{plan.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">₦{plan.platform_fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 pr-6">₦{plan.net_revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(analytics?.revenue_by_plan || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No revenue data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Paystack Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.plans.map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium pl-6">{plan.name}</TableCell>
                      <TableCell>₦{plan.price.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{plan.interval}</TableCell>
                      <TableCell>
                        {plan.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground shadow-none">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground pr-6">{plan.paystack_plan_code}</TableCell>
                    </TableRow>
                  ))}
                  {details.plans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No plans found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>Subscribers (Live from Paystack)</CardTitle>
              <CardDescription>All subscribers for this organization</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="pr-6">Next Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(details.live_subscribers || []).map((sub, index) => (
                    <TableRow key={sub.subscription_code || index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium pl-6">
                        {`${sub.customer?.first_name || ''} ${sub.customer?.last_name || ''}`.trim() || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sub.customer?.email || '-'}</TableCell>
                      <TableCell>{sub.plan?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.status === 'active' ? 'default' :
                          sub.status === 'attention' ? 'destructive' :
                          'secondary'
                        } className={
                          sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none' :
                          sub.status === 'attention' ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 shadow-none' :
                          'bg-muted/50 text-muted-foreground shadow-none'
                        }>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₦{((sub.amount || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground pr-6">
                        {sub.next_payment_date 
                          ? new Date(sub.next_payment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(details.live_subscribers || []).length === 0 && details.subscribers.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium pl-6">{sub.customer_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{sub.email}</TableCell>
                      <TableCell>{sub.subscription_plans?.name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.status === 'active' ? 'default' :
                          sub.status === 'attention' ? 'destructive' :
                          'secondary'
                        } className={
                          sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none' :
                          sub.status === 'attention' ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 shadow-none' :
                          'bg-muted/50 text-muted-foreground shadow-none'
                        }>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₦{sub.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground pr-6">
                        {sub.next_payment_date 
                          ? new Date(sub.next_payment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(details.live_subscribers || []).length === 0 && details.subscribers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No subscribers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaulters">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>Defaulted Subscribers</CardTitle>
              <CardDescription>Subscribers with payment issues</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics?.defaulted_list || []).map((defaulter, index) => (
                    <TableRow key={defaulter.id || index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium pl-6">{defaulter.customer_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{defaulter.email}</TableCell>
                      <TableCell>{defaulter.plan}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 shadow-none px-2">{defaulter.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₦{(defaulter.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {defaulter.date ? new Date(defaulter.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {defaulter.id && !defaulter.id.startsWith('SUB_') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => handleMarkResolved(defaulter.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(analytics?.defaulted_list || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No defaulted subscribers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead className="pr-6">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.payout_requests.map((payout) => (
                    <TableRow key={payout.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-lg pl-6">₦{payout.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payout.status === 'completed' ? 'default' :
                          payout.status === 'pending' ? 'secondary' :
                          payout.status === 'approved' ? 'outline' :
                          'destructive'
                        } className={
                          payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none' :
                          payout.status === 'pending' ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none shadow-none' :
                          payout.status === 'approved' ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none shadow-none' :
                          'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 shadow-none'
                        }>
                          <span className="capitalize">{payout.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(payout.requested_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground pr-6">{payout.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {details.payout_requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No payout requests
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={apiKeysDialogOpen} onOpenChange={setApiKeysDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Recurra Gateway Keys</DialogTitle>
            <DialogDescription>
              Provide the Recurra platform gateway keys for this organization's transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Input 
                id="publicKey" 
                placeholder="pk_..." 
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input 
                id="secretKey" 
                type="password"
                placeholder="sk_..." 
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeysDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateKeys} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Save API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              This will prevent the organization from accessing the platform. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for suspension..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={actionLoading || !suspendReason}>
              {actionLoading && <PremiumSpinner className="mr-2" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
