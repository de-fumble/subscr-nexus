import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
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
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BackButton } from "@/components/BackButton";
import { useOrgRole } from "@/hooks/useOrgRole";
import { AIInsightsCard } from "@/components/AIInsightsCard";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--primary))", "hsl(var(--secondary))"];

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    activeSubscribers: 0,
    subscriberGrowth: 0,
    averageRevenue: 0,
    churnRate: 0,
  });
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [planDistribution, setPlanDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [subscriberTrend, setSubscriberTrend] = useState<Array<{ month: string; subscribers: number }>>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // Get organization - check if owner first, then check membership
      let orgId = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
        setOrganization(ownedOrg);
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          if (memberOrg) {
            setOrganization(memberOrg);
          }
        }
      }

      if (!orgId) return;

      // Fetch real analytics from Paystack
      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke(
        "fetch-paystack-analytics"
      );

      if (analyticsError) {
        console.error("Analytics error:", analyticsError);
        toast.error("Failed to fetch Paystack analytics");
      }

      // Fetch plans for distribution
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("org_id", orgId);

      // Use Paystack data if available, otherwise fallback to calculated values
      if (analyticsData) {
        // Use plan distribution from edge function (active subscribers by plan)
        if (analyticsData.planDistribution && analyticsData.planDistribution.length > 0) {
          const planDist = analyticsData.planDistribution.map((p: { name: string; count: number; percentage: number }) => ({
            name: p.name,
            value: p.count,
            percentage: p.percentage,
          }));
          setPlanDistribution(planDist);
        } else if (plans) {
          // Fallback to local database query
          const planDist = await Promise.all(
            plans.map(async (plan) => {
              const { count } = await supabase
                .from("subscribers")
                .select("*", { count: "exact", head: true })
                .eq("plan_id", plan.id)
                .not("status", "in", "(cancelled,canceled,expired,paused,non-renewing,attention)");
              
              return {
                name: plan.name,
                value: count || 0,
              };
            })
          );
          setPlanDistribution(planDist.filter(p => p.value > 0));
        }
        const totalRevenue = analyticsData.totalRevenue || 0;
        const activeSubscribers = analyticsData.activeSubscribers || 0;
        
        // Set revenue trend from Paystack data (yearly - 12 months)
        if (analyticsData.revenueTrend) {
          setRevenueData(analyticsData.revenueTrend);
        }

        // Set subscriber trend from Paystack data
        if (analyticsData.subscriberTrend) {
          setSubscriberTrend(analyticsData.subscriberTrend);
        }

        // Calculate revenue growth rate from last two months
        const revenueTrendLength = analyticsData.revenueTrend?.length || 0;
        const previousMonthRevenue = analyticsData.revenueTrend?.[revenueTrendLength - 2]?.revenue || 0;
        const currentMonthRevenue = analyticsData.revenueTrend?.[revenueTrendLength - 1]?.revenue || totalRevenue;
        const revenueGrowth = previousMonthRevenue > 0 
          ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100)
          : 0;

        setStats({
          totalRevenue,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          activeSubscribers,
          subscriberGrowth: analyticsData.subscriberGrowthRate || 0,
          averageRevenue: analyticsData.arpu || 0,
          churnRate: analyticsData.churnRate || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading analytics...</p>
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
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <BackButton />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container py-8 px-6 space-y-8">
              <div>
                <p className="text-muted-foreground">Track your business performance and growth</p>
              </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs flex items-center text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{stats.revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
            <p className="text-xs flex items-center text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +{stats.subscriberGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue per User</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{Math.round(stats.averageRevenue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per active subscriber</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate}%</div>
            <p className="text-xs flex items-center text-red-600 mt-1">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Monthly churn rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
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
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>Active subscribers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subscriberTrend}>
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
                <Bar dataKey="subscribers" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
          <CardDescription>Active subscribers by plan (count & percentage)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value} subscribers`, "Active"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <AIInsightsCard 
        analyticsData={{
          totalRevenue: stats.totalRevenue,
          revenueGrowth: stats.revenueGrowth,
          activeSubscribers: stats.activeSubscribers,
          subscriberGrowth: stats.subscriberGrowth,
          averageRevenue: stats.averageRevenue,
          churnRate: stats.churnRate,
          revenueData,
          planDistribution,
        }}
      />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
