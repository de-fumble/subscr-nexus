import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, Plus, Banknote } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import * as recharts from "recharts";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CompanyAccountSection } from "@/components/CompanyAccountSection";
import { PayoutRequestDialog } from "@/components/PayoutRequestDialog";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  subscriber_count?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
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
  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time updates for subscribers table
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
          // Refetch dashboard data when subscribers change
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

      // First check if user is an org owner
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        // Check if user is a staff member
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

      // Fetch plans with subscriber counts using aggregation
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("org_id", orgData.id)
        .eq("is_active", true);

      if (plansError) {
        console.error("Error fetching plans:", plansError);
      } else {
        // Fetch subscriber counts separately for each plan
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

      // Fetch real-time analytics from Paystack
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
        
        // Calculate available balance (total revenue - platform fees - already paid out)
        const platformFee = 1500; // Flat fee per transaction
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
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      title: "Recurring Revenue",
      value: `₦${stats.recurringRevenue.toLocaleString()}`,
      icon: Wallet,
      showChart: false,
      showButton: false,
    },
    {
      title: "Active Subscribers",
      value: stats.activeSubscribers.toString(),
      icon: Users,
      showChart: false,
      showButton: true,
      buttonText: "Manage",
      onButtonClick: () => setShowSubscriberDialog(true),
    },
    {
      title: "Total Revenue",
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      showChart: true,
      showButton: false,
    },
    {
      title: "Failed Payments",
      value: stats.totalFailedPayments.toString(),
      icon: TrendingUp,
      showChart: false,
      showPieChart: true,
      showButton: false,
    },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} />
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {organization?.org_name || "Dashboard"}
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-8 flex items-center justify-between animate-slide-in">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-1">Overview</h2>
                  <p className="text-sm text-muted-foreground">Real-time metrics and insights</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPayoutDialog(true)}
                    variant="outline"
                    className="gap-2 hover-lift border-accent/30"
                  >
                    <Banknote className="h-4 w-4" />
                    Request Payout
                  </Button>
                  <Button
                    onClick={() => navigate("/plans/create")}
                    className="bg-accent hover:bg-accent/90 gap-2 hover-lift shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Create Plan
                  </Button>
                </div>
              </div>

              {/* Company Account Section */}
              {organization && (
                <div className="mb-8 animate-fade-in">
                  <CompanyAccountSection 
                    organization={organization} 
                    onUpdate={fetchDashboardData}
                  />
                </div>
              )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={index}
                className="p-6 glass-card hover-lift border-0 shadow-[var(--shadow-medium)] animate-scale-in relative overflow-hidden group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 p-3 shadow-lg backdrop-blur-sm">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  {metric.showButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={metric.onButtonClick}
                      className="glass-card hover-lift border-accent/20"
                    >
                      {metric.buttonText}
                    </Button>
                  )}
                </div>
                <div className="relative z-10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {metric.title}
                  </h3>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {metric.value}
                  </p>
                </div>
                {metric.showChart && chartData.length > 0 && (
                  <div className="mt-4 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis 
                          dataKey="plan" 
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => `₦${value.toLocaleString()}`}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {metric.showPieChart && failedPaymentsData.length > 0 && (
                  <div className="mt-4 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={failedPaymentsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {failedPaymentsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-12 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <Card className="p-8 glass-card border-0 shadow-[var(--shadow-strong)] relative overflow-hidden">
            {/* Decorative wave at bottom */}
            <div className="absolute bottom-0 left-0 right-0 opacity-50 pointer-events-none">
              <img src="/src/assets/wave-accent.svg" alt="" className="w-full" />
            </div>
            
            <div className="mb-8 flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  Your Subscription Plans
                </h3>
                <p className="text-sm text-muted-foreground">Manage and monitor your active plans</p>
              </div>
              <Button
                onClick={() => navigate("/plans")}
                variant="ghost"
                size="sm"
                className="hover-lift"
              >
                View All
              </Button>
            </div>

            {plans.length === 0 ? (
              <div className="py-16 text-center relative z-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl glass-card shadow-lg">
                  <Plus className="h-10 w-10 text-accent" />
                </div>
                <h4 className="mb-3 text-xl font-bold text-foreground">
                  No plans yet
                </h4>
                <p className="mb-8 text-sm text-muted-foreground max-w-md mx-auto">
                  Create your first subscription plan to start accepting
                  payments and growing your business
                </p>
                <Button
                  onClick={() => navigate("/plans/create")}
                  className="bg-accent hover:bg-accent/90 hover-lift shadow-lg"
                >
                  Create Your First Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {plans.map((plan, idx) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-5 rounded-xl glass-card hover-lift border border-border/50 group animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">
                            {plan.name}
                          </h4>
                          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm">
                            {plan.interval}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground mb-1">
                        ₦{plan.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {plan.interval}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-12 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <VerifyTransactionCard />
        </div>
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
