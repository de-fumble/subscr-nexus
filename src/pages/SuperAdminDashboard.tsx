import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/PremiumLoader";
import { 
  Building2, Users, DollarSign, 
  TrendingUp, RefreshCw 
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  paystack_connected: boolean;
  total_plans: number;
  active_plans: number;
  active_subscribers: number;
  total_subscribers: number;
  total_revenue: number;
  transaction_count: number;
  mrr: number;
  arr: number;
  defaulted_subscribers: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const statsData = await invokeSuperadmin('get_platform_stats');
      setStats(statsData);
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

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading dashboard data..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor platform metrics and manage organizations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)} 
            disabled={refreshing}
            className="hidden sm:flex"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <SendNotificationDialog />
        </div>
      </div>

      {/* Main Stats Tiers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tier 1: Growth & Scale */}
        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{stats?.total_organizations || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-blue-500 font-medium mr-1">{stats?.active_organizations || 0}</span> active
              <span className="mx-1.5 text-border">•</span>
              <span className="text-destructive font-medium mr-1">{stats?.suspended_organizations || 0}</span> suspended
            </div>
          </CardContent>
        </Card>

        {/* Tier 2: Users */}
        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Platform Subscribers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{stats?.total_subscribers || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-violet-500 font-medium mr-1">{stats?.active_subscribers || 0}</span> active across all
            </div>
          </CardContent>
        </Card>

        {/* Tier 3: Revenue */}
        <Card className="relative overflow-hidden border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium">Processing Volume</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">₦{(stats?.total_revenue || 0).toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium mr-1">{stats?.transaction_count || 0}</span> successful txns
            </div>
          </CardContent>
        </Card>

        {/* Tier 4: Platform Revenue */}
        <Card className="relative overflow-hidden bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all border-none">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Platform Earnings</CardTitle>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">₦{(stats?.platform_earnings || 0).toLocaleString()}</div>
            <div className="flex items-center text-xs text-primary-foreground/70 mt-1">
              Total generated collected fees
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics & Visualizations */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* MRR / ARR Card */}
        <Card className="col-span-1 bg-card/50 backdrop-blur-sm shadow-sm hover:bg-card/80 transition-colors flex flex-col justify-between">
           <CardHeader className="pb-2">
             <CardTitle className="text-xl">Revenue Projection</CardTitle>
             <CardDescription>Current MRR vs Projected ARR</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Recurring (MRR)</p>
                <div className="text-3xl font-bold tracking-tight text-emerald-500">₦{Math.round(stats?.mrr || 0).toLocaleString()}</div>
              </div>
              <div className="h-px bg-border/50 w-full" />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Annual Projected (ARR)</p>
                <div className="text-3xl font-bold tracking-tight text-blue-500">₦{Math.round((stats?.mrr || 0) * 12).toLocaleString()}</div>
              </div>
           </CardContent>
        </Card>

        {/* Mock Chart Area (Will normally map real historical data here) */}
        <Card className="col-span-1 md:col-span-2 border-black/5 dark:border-white/5 shadow-sm">
           <CardHeader className="pb-2">
             <CardTitle className="text-xl">Platform Growth Overview</CardTitle>
             <CardDescription>Organizations vs Subscribers over Time</CardDescription>
           </CardHeader>
           <CardContent className="h-[250px] w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                 data={[
                   { name: 'Jan', orgs: Math.max(0, (stats?.active_organizations || 0) - 20), subs: Math.max(0, (stats?.active_subscribers || 0) - 50) },
                   { name: 'Feb', orgs: Math.max(0, (stats?.active_organizations || 0) - 10), subs: Math.max(0, (stats?.active_subscribers || 0) - 20) },
                   { name: 'Mar', orgs: (stats?.active_organizations || 0), subs: (stats?.active_subscribers || 0) },
                 ]}
                 margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
               >
                 <defs>
                   <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ color: 'hsl(var(--foreground))' }}
                 />
                 <Area type="monotone" dataKey="subs" name="Subscribers" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSubs)" />
                 <Area type="monotone" dataKey="orgs" name="Organizations" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrgs)" />
               </AreaChart>
             </ResponsiveContainer>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
