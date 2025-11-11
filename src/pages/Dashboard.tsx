import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, Plus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as recharts from "recharts";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { VerifyTransactionCard } from "@/components/VerifyTransactionCard";

interface Organization {
  id: string;
  org_name: string;
  email: string;
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
    totalLifetimeRevenue: 0,
  });
  const [chartData, setChartData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);

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

      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        toast.error("Failed to load organization data");
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
        setStats({
          totalRevenue: analyticsData.totalRevenue || 0,
          recurringRevenue: analyticsData.recurringRevenue || 0,
          activeSubscribers: analyticsData.activeSubscribers || 0,
          totalLifetimeRevenue: analyticsData.totalLifetimeRevenue || 0,
        });
        setChartData(analyticsData.chartData || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
      title: "Total Lifetime Revenue",
      value: `₦${stats.totalLifetimeRevenue.toLocaleString()}`,
      icon: TrendingUp,
      showChart: false,
      showButton: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {organization?.org_name || "Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {organization?.email}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
          <Button
            onClick={() => navigate("/plans/create")}
            className="bg-accent hover:bg-accent/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={index}
                className="p-6 transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {metric.showButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={metric.onButtonClick}
                    >
                      {metric.buttonText}
                    </Button>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {metric.value}
                  </p>
                </div>
                {metric.showChart && chartData.length > 0 && (
                  <div className="mt-4 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {metric.title === "Total Revenue" && plans.length > 0 && (
                  <div className="mt-4 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <recharts.BarChart data={plans.map(plan => ({
                        name: plan.name.substring(0, 10),
                        revenue: plan.price * (plan.subscriber_count || 0)
                      }))}>
                        <recharts.XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <recharts.YAxis hide />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => `₦${value.toLocaleString()}`}
                        />
                        <recharts.Bar 
                          dataKey="revenue" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </recharts.BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Your Subscription Plans
              </h3>
              <Button
                onClick={() => navigate("/plans")}
                variant="ghost"
                size="sm"
              >
                View All
              </Button>
            </div>

            {plans.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-foreground">
                  No plans yet
                </h4>
                <p className="mb-6 text-sm text-muted-foreground">
                  Create your first subscription plan to start accepting
                  payments
                </p>
                <Button
                  onClick={() => navigate("/plans/create")}
                  className="bg-accent hover:bg-accent/90"
                >
                  Create Your First Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-foreground">
                          {plan.name}
                        </h4>
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          {plan.interval}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">
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

        <div className="mt-8">
          <VerifyTransactionCard />
        </div>
      </div>

      <SubscriberManagementDialog
        open={showSubscriberDialog}
        onOpenChange={setShowSubscriberDialog}
        orgId={organization?.id || ""}
        onSubscriberRemoved={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;
