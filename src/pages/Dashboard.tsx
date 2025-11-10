import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DollarSign, Users, TrendingUp, Plus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
      icon: DollarSign,
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="border-b border-border/30 bg-gradient-card backdrop-blur-xl shadow-medium">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">
                {organization?.org_name || "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
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

      <div className="container mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Performance Overview</h2>
          <Button
            onClick={() => navigate("/plans/create")}
            variant="premium"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={index}
                className="p-7 transition-all duration-500 hover:shadow-elegant hover:-translate-y-1 animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-3.5 group-hover:from-accent/20 group-hover:to-accent/10 transition-all shadow-soft">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  {metric.showButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={metric.onButtonClick}
                      className="hover:bg-accent-soft hover:text-accent hover:border-accent"
                    >
                      {metric.buttonText}
                    </Button>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {metric.title}
                  </h3>
                  <p className="text-4xl font-bold gradient-text">
                    {metric.value}
                  </p>
                </div>
                {metric.showChart && chartData.length > 0 && (
                  <div className="mt-6 h-20 -mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--accent))"
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-10">
          <Card className="p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Active Subscription Plans
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor your recurring payment plans
                </p>
              </div>
              <Button
                onClick={() => navigate("/plans")}
                variant="outline"
                size="sm"
                className="hover:bg-accent-soft hover:text-accent hover:border-accent"
              >
                View All Plans
              </Button>
            </div>

            {plans.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 shadow-soft">
                  <Plus className="h-10 w-10 text-accent" />
                </div>
                <h4 className="mb-3 text-xl font-bold text-foreground">
                  No plans created yet
                </h4>
                <p className="mb-8 text-muted-foreground max-w-md mx-auto">
                  Create your first subscription plan to start accepting
                  recurring payments from your customers
                </p>
                <Button
                  onClick={() => navigate("/plans/create")}
                  variant="premium"
                  size="lg"
                >
                  Create Your First Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {plans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between border-b border-border/50 pb-5 last:border-0 last:pb-0 hover:bg-accent-soft/30 -mx-2 px-2 py-3 rounded-lg transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-lg text-foreground">
                          {plan.name}
                        </h4>
                        <span className="rounded-full bg-gradient-to-r from-accent/10 to-accent-deep/10 px-4 py-1.5 text-xs font-semibold text-accent border border-accent/20">
                          {plan.interval}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {plan.subscriber_count || 0} active subscribers
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold gradient-text">
                        ₦{plan.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
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
