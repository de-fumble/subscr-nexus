import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Ban, CheckCircle, DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react";
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
} from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--primary))", "hsl(var(--secondary))"];

interface OrganizationDetails {
  organization: any;
  plans: any[];
  subscribers: any[];
  payout_requests: any[];
  deletion_requests: any[];
}

interface Analytics {
  total_revenue: number;
  recurring_revenue: number;
  platform_fee: number;
  active_subscribers: number;
  churned_subscribers: number;
  defaulted_subscribers: number;
  new_subscribers_this_month: number;
  subscriber_growth_rate: number;
  churn_rate: number;
  arpu: number;
  revenue_by_plan: any[];
  monthly_revenue_trend: any[];
  subscribers_by_plan: any[];
  plan_distribution: any[];
}

export default function SuperAdminOrganization() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (isSuperadmin && orgId) {
      fetchData();
    }
  }, [isSuperadmin, orgId]);

  const fetchData = async () => {
    try {
      const [detailsData, analyticsData] = await Promise.all([
        invokeSuperadmin('get_organization_details', { org_id: orgId }),
        invokeSuperadmin('get_organization_analytics', { org_id: orgId }),
      ]);
      setDetails(detailsData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
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

      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(analytics?.total_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(analytics?.recurring_revenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">After {((analytics?.platform_fee || 0) / (analytics?.total_revenue || 1) * 100).toFixed(0)}% platform fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.active_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics?.subscriber_growth_rate || 0}% growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Defaulted</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.defaulted_subscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.churn_rate || 0}% churn rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="plans">Plans ({details.plans.length})</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({details.subscribers.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({details.payout_requests.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.monthly_revenue_trend || []}>
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
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Active subscribers by plan</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Metrics Table */}
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
                    <TableHead className="text-right">ARPU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.revenue_by_plan?.map((plan) => (
                    <TableRow key={plan.name}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-right">{plan.active_subscribers}</TableCell>
                      <TableCell className="text-right">₦{plan.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ₦{plan.active_subscribers > 0 ? Math.round(plan.revenue / plan.active_subscribers).toLocaleString() : 0}
                      </TableCell>
                    </TableRow>
                  ))}
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.subscribers.map((sub) => (
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
                      <TableCell>₦{sub.amount.toLocaleString()}</TableCell>
                      <TableCell>{sub.retry_count || 0}</TableCell>
                      <TableCell>
                        {['attention', 'paused', 'non-renewing'].includes(sub.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkResolved(sub.id)}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
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
                  {details.payout_requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">₦{req.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          req.status === 'completed' ? 'default' :
                          req.status === 'pending' ? 'secondary' :
                          req.status === 'approved' ? 'outline' :
                          'destructive'
                        }>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(req.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell>{req.processed_at ? new Date(req.processed_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{req.notes || '-'}</TableCell>
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

        <TabsContent value="audit">
          <AuditLogSection orgId={orgId!} invokeSuperadmin={invokeSuperadmin} />
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              This will prevent the organization from accessing their account and processing payments.
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
            <Button variant="destructive" onClick={handleSuspend} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditLogSection({ orgId, invokeSuperadmin }: { orgId: string; invokeSuperadmin: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [orgId]);

  const fetchLogs = async () => {
    try {
      const data = await invokeSuperadmin('get_audit_logs', { entity_id: orgId, limit: 50 });
      setLogs(data.audit_logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Recent actions on this organization</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell>{log.entity_type}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : '-'}
                </TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
