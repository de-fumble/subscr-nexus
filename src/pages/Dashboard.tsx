import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, Plus, Banknote, AlertTriangle, FileCheck, Key, Download, Filter, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CompanyAccountSection } from "@/components/CompanyAccountSection";
import { PayoutRequestDialog } from "@/components/PayoutRequestDialog";
import { FailedPaymentsDialog } from "@/components/FailedPaymentsDialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import { LicenseRequestDialog } from "@/components/LicenseRequestDialog";
import { PlansHubLinkCard } from "@/components/PlansHubLinkCard";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  logo_url?: string | null;
  kyc_verified?: boolean;
  kyc_submitted_at?: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  subscriber_count?: number;
}

const DashboardHeader = ({ orgName }: { orgName?: string }) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
      <SidebarTrigger />
      <div className="flex-1 flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">
          {isCollapsed ? (orgName || "Dashboard") : "Dashboard"}
        </h1>
      </div>
    </header>
  );
};

// Circular progress indicator component
const CircularProgress = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="transform -rotate-90">
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="4"
      />
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { canRequestPayout, canCreatePlans, canAccessSettings, canRequestLicense, role } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    recurringRevenue: 0,
    activeSubscribers: 0,
    totalFailedPayments: 0,
  });
  const [chartData, setChartData] = useState<Array<{ plan: string; revenue: number }>>([]);
  const [failedPaymentsData, setFailedPaymentsData] = useState<Array<{ name: string; value: number }>>([]);
  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [currentLicense, setCurrentLicense] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D' | '90D'>('7D');

  // Generate time-series data for the line chart
  const timeSeriesData = [
    { month: 'Jan', value: 3200000 },
    { month: 'Feb', value: 3450000 },
    { month: 'Mar', value: 3800000 },
    { month: 'Apr', value: 4100000 },
    { month: 'May', value: 4250000 },
    { month: 'Jun', value: 4400000 },
  ];

  // Revenue distribution data
  const revenueDistribution = [
    { name: 'Schools', value: 60, color: 'hsl(var(--chart-1))' },
    { name: 'Churches', value: 30, color: 'hsl(var(--chart-2))' },
    { name: 'Coops', value: 10, color: 'hsl(var(--chart-3))' },
  ];

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('dashboard-subscribers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = staffOrg;
        }
      }

      if (!orgData) {
        console.error("No organization found for user");
        toast.error("No organization found");
        navigate("/auth");
        return;
      }

      setOrganization(orgData);

      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("org_id", orgData.id)
        .eq("is_active", true);

      if (plansError) {
        console.error("Error fetching plans:", plansError);
      } else {
        const plansWithCounts = await Promise.all(
          plansData.map(async (plan) => {
            const { count } = await supabase
              .from("subscribers")
              .select("*", { count: "exact", head: true })
              .eq("plan_id", plan.id)
              .eq("status", "active");
            
            return {
              ...plan,
              subscriber_count: count || 0,
            };
          })
        );
        setPlans(plansWithCounts);
      }

      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke(
        "fetch-paystack-analytics"
      );

      if (analyticsError) {
        console.error("Error fetching analytics:", analyticsError);
        toast.error("Failed to load analytics data");
      } else if (analyticsData) {
        const chart = analyticsData.chartData || [];
        setChartData(chart);
        const failedData = analyticsData.failedPaymentsData || [];
        setFailedPaymentsData(failedData);
        const totalFromPlans = chart.reduce((sum: number, item: { revenue: number }) => sum + (item.revenue || 0), 0);
        const totalFailed = failedData.reduce((sum: number, item: { value: number }) => sum + (item.value || 0), 0);
        
        const platformFee = 1500;
        const transactionCount = analyticsData.transactionCount || 0;
        const totalPlatformFees = transactionCount * platformFee;
        const calculatedBalance = Math.max(0, totalFromPlans - totalPlatformFees);
        setAvailableBalance(calculatedBalance);
        
        setStats({
          totalRevenue: totalFromPlans,
          recurringRevenue: analyticsData.recurringRevenue || 0,
          activeSubscribers: analyticsData.activeSubscribers || 0,
          totalFailedPayments: totalFailed,
        });
      }

      if (orgData) {
        const { data: payoutData } = await supabase
          .from("payout_requests")
          .select("amount, status")
          .eq("org_id", orgData.id);

        if (payoutData) {
          const pending = payoutData
            .filter((p) => p.status === "pending" || p.status === "approved")
            .reduce((sum, p) => sum + p.amount, 0);
          const paidOut = payoutData
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + p.amount, 0);
          setPendingPayouts(pending);
          setTotalPaidOut(paidOut);
        }

        const { data: licenseData } = await supabase
          .from("licenses")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("status", "active")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setCurrentLicense(licenseData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  if (loading) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <DashboardHeader orgName={organization?.org_name} />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-6">
              
              {/* Top Stats Row - 4 Cards */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {/* Total Revenue (MTD) */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Total Revenue (MTD)</span>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-accent hover:text-accent/80 text-xs">
                          Export
                        </Button>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        ₦{stats.totalRevenue > 0 ? (stats.totalRevenue / 1000000).toFixed(1) + 'M' : '0'}
                      </p>
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <ArrowUp className="h-3 w-3" />
                        <span>12.5% vs last month</span>
                      </div>
                    </div>
                    <CircularProgress percentage={75} color="hsl(142, 76%, 36%)" />
                  </div>
                </Card>

                {/* Active Subscribers */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Active Subscribers</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-accent hover:text-accent/80 text-xs"
                          onClick={() => navigate("/dashboard/subscribers")}
                        >
                          View All
                        </Button>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        {stats.activeSubscribers.toLocaleString()}
                      </p>
                      <span className="text-sm text-muted-foreground">of 2,000 total</span>
                    </div>
                    <CircularProgress percentage={60} color="hsl(35, 92%, 50%)" />
                  </div>
                </Card>

                {/* Failed Payments */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Failed Payments</span>
                        <FailedPaymentsDialog>
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-destructive hover:text-destructive/80 text-xs">
                            Retry All
                          </Button>
                        </FailedPaymentsDialog>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">
                        {stats.totalFailedPayments || 28}
                      </p>
                      <div className="flex items-center gap-1 text-destructive text-sm">
                        <ArrowDown className="h-3 w-3" />
                        <span>5.2% vs last month</span>
                      </div>
                    </div>
                    <CircularProgress percentage={85} color="hsl(0, 84%, 60%)" />
                  </div>
                </Card>

                {/* Upcoming Payouts */}
                <Card className="p-5 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Upcoming Payouts</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 text-accent hover:text-accent/80 text-xs"
                        onClick={() => setShowPayoutDialog(true)}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">May 15</span>
                        <span className="font-semibold">₦850K</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">May 22</span>
                        <span className="font-semibold">₦300K</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
                {/* Collections Over Time - Takes 2/3 */}
                <Card className="lg:col-span-2 p-6 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground">Collections Over Time</h3>
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      {(['7D', '30D', '90D'] as const).map((period) => (
                        <Button
                          key={period}
                          variant={chartPeriod === period ? "default" : "ghost"}
                          size="sm"
                          className={`px-3 py-1 text-xs ${chartPeriod === period ? 'bg-primary text-primary-foreground' : ''}`}
                          onClick={() => setChartPeriod(period)}
                        >
                          {period}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `₦${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Revenue Distribution - Takes 1/3 */}
                <Card className="p-6 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Revenue Distribution</h3>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      By Type
                    </Button>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative h-40 w-40 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {revenueDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">₦4.2M</span>
                      </div>
                    </div>
                    <div className="space-y-2 w-full">
                      {revenueDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-muted-foreground">{item.name} ({item.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Transactions Table */}
              <Card className="p-6 glass-card border-0 shadow-[var(--shadow-medium)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Recent Transactions</h3>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">MEMBER</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PLAN</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AMOUNT</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-4 px-4 text-sm font-mono">TX-789456</td>
                        <td className="py-4 px-4 text-sm">John Doe</td>
                        <td className="py-4 px-4 text-sm">Monthly</td>
                        <td className="py-4 px-4 text-sm font-medium">₦25,000</td>
                        <td className="py-4 px-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Success</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Quick Status Section - Moved below */}
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {/* KYC Status Card */}
                {organization && !organization.kyc_verified && (
                  <Card className="p-4 glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FileCheck className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">Complete Your KYC</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Unlock full platform access
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/dashboard/profile")}
                        className="shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                      >
                        Complete
                      </Button>
                    </div>
                  </Card>
                )}

                {/* License Status Card */}
                {organization && canRequestLicense && (
                  <Card className={`p-4 glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 ${currentLicense ? 'border-l-green-500' : 'border-l-muted-foreground'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${currentLicense ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <Key className={`h-5 w-5 ${currentLicense ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">
                          {currentLicense ? 'License Active' : 'No License'}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {currentLicense 
                            ? `Expires ${new Date(currentLicense.expires_at).toLocaleDateString()}`
                            : 'Request a license to get started'}
                        </p>
                      </div>
                      {!currentLicense && (
                        <LicenseRequestDialog orgId={organization.id}>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            Request
                          </Button>
                        </LicenseRequestDialog>
                      )}
                    </div>
                  </Card>
                )}

                {/* Balance Overview Card */}
                {organization && canAccessSettings && (
                  <Card className="p-4 glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-accent">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Wallet className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">Available Balance</h3>
                        <p className="text-lg font-bold text-green-600">
                          ₦{availableBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        <div>Pending: ₦{pendingPayouts.toLocaleString()}</div>
                        <div>Paid: ₦{totalPaidOut.toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Plans Hub Link Card */}
              {organization && (
                <div className="mt-6">
                  <PlansHubLinkCard 
                    orgId={organization.id} 
                    orgName={organization.org_name}
                  />
                </div>
              )}

              {/* Company Account Section - Only show to owners */}
              {organization && canAccessSettings && (
                <div className="mt-6">
                  <CompanyAccountSection 
                    organization={organization} 
                    onUpdate={fetchDashboardData}
                  />
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
      
      <SubscriberManagementDialog
        open={showSubscriberDialog}
        onOpenChange={setShowSubscriberDialog}
        orgId={organization?.id || ""}
        onSubscriberRemoved={fetchDashboardData}
      />
      
      <PayoutRequestDialog
        open={showPayoutDialog}
        onOpenChange={setShowPayoutDialog}
        orgId={organization?.id || ""}
        availableBalance={availableBalance}
        onRequestSubmitted={fetchDashboardData}
      />
    </SidebarProvider>
  );
};

export default Dashboard;
