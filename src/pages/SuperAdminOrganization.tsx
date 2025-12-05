import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Ban, CheckCircle, DollarSign, Users, TrendingUp, AlertTriangle, RefreshCw, CreditCard } from "lucide-react";
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{org.org_name}</h1>
              {org.is_suspended ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{org.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {org.is_suspended ? (
            <Button onClick={handleRestore} disabled={actionLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Restore Organization
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setSuspendDialogOpen(true)} disabled={actionLoading}>
              <Ban className="h-4 w-4 mr-2" />
              Suspend Organization
            </Button>
          )}
        </div>
      </div>

      {/* Revenue Summary Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(analytics?.total_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics?.transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(analytics?.recurring_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              After ₦{(analytics?.platform_fee || 0).toLocaleString()} platform fee
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₦{(analytics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly Recurring Revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₦{(analytics?.arr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Annual Recurring Revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber Stats - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              All-time subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics?.active_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently paying
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Defaulted</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{analytics?.defaulted_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Payment issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics?.churn_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
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
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics?.monthly_revenue_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscriber Growth</CardTitle>
                <CardDescription>New subscribers over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.subscriber_growth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="subscribers"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subscribers by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.subscribers_by_plan || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="active" fill="hsl(var(--primary))" name="Active" />
                    <Bar dataKey="defaulted" fill="hsl(var(--destructive))" name="Defaulted" />
                    <Bar dataKey="churned" fill="hsl(var(--muted-foreground))" name="Churned" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
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
                        labelLine={true}
                        label={({ name, count, percentage }) => `${name}: ${count} (${percentage}%)`}
                        outerRadius={100}
                        dataKey="count"
                      >
                        {(analytics?.plan_distribution || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No active subscribers to show distribution
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Plan Table */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead className="text-right">Active Subscribers</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Net Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics?.revenue_by_plan || []).map((plan) => (
                    <TableRow key={plan.name}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-right">{plan.active_subscribers}</TableCell>
                      <TableCell className="text-right">₦{plan.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">₦{plan.platform_fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">₦{plan.net_revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(analytics?.revenue_by_plan || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paystack Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>₦{plan.price.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{plan.interval}</TableCell>
                      <TableCell>
                        {plan.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{plan.paystack_plan_code}</TableCell>
                    </TableRow>
                  ))}
                  {details.plans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Subscribers (Live from Paystack)</CardTitle>
              <CardDescription>All subscribers for this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Next Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(details.live_subscribers || []).map((sub, index) => (
                    <TableRow key={sub.subscription_code || index}>
                      <TableCell className="font-medium">
                        {`${sub.customer?.first_name || ''} ${sub.customer?.last_name || ''}`.trim() || '-'}
                      </TableCell>
                      <TableCell>{sub.customer?.email || '-'}</TableCell>
                      <TableCell>{sub.plan?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.status === 'active' ? 'default' :
                          sub.status === 'attention' ? 'destructive' :
                          'secondary'
                        }>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₦{((sub.amount || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        {sub.next_payment_date 
                          ? new Date(sub.next_payment_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(details.live_subscribers || []).length === 0 && details.subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.customer_name || '-'}</TableCell>
                      <TableCell>{sub.email}</TableCell>
                      <TableCell>{sub.subscription_plans?.name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.status === 'active' ? 'default' :
                          sub.status === 'attention' ? 'destructive' :
                          'secondary'
                        }>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₦{sub.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {sub.next_payment_date 
                          ? new Date(sub.next_payment_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(details.live_subscribers || []).length === 0 && details.subscribers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Defaulted Subscribers</CardTitle>
              <CardDescription>Subscribers with payment issues</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics?.defaulted_list || []).map((defaulter, index) => (
                    <TableRow key={defaulter.id || index}>
                      <TableCell className="font-medium">{defaulter.customer_name || '-'}</TableCell>
                      <TableCell>{defaulter.email}</TableCell>
                      <TableCell>{defaulter.plan}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{defaulter.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-right">₦{(defaulter.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {defaulter.date ? new Date(defaulter.date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {defaulter.id && !defaulter.id.startsWith('SUB_') && (
                          <Button
                            variant="ghost"
                            size="sm"
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
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.payout_requests.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">₦{payout.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payout.status === 'completed' ? 'default' :
                          payout.status === 'pending' ? 'secondary' :
                          payout.status === 'approved' ? 'outline' :
                          'destructive'
                        }>
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payout.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{payout.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {details.payout_requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
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
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
