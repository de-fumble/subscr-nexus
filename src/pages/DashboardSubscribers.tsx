import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, Mail, RefreshCw, Loader2 } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BackButton } from "@/components/BackButton";

interface Subscriber {
  id: string;
  email: string;
  customer_name: string | null;
  amount: number;
  status: string;
  plan_name: string;
  paystack_subscription_code: string;
  paystack_customer_code: string;
  created_at: string;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

export default function DashboardSubscribers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const { canWrite, role, canAccessSettings } = useOrgRole();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      // Get organization - check if owner first, then check membership
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
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
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);

      // Fetch subscribers from Paystack via edge function
      const { data, error } = await supabase.functions.invoke('list-subscribers');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSubscribers(data.subscribers || []);
    } catch (error: any) {
      console.error("Error fetching subscribers:", error);
      toast.error(error.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'attention':
        return 'secondary';
      case 'cancelled':
      case 'non-renewing':
        return 'destructive';
      default:
        return 'outline';
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
                <p className="text-muted-foreground">Loading subscribers...</p>
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
              <h1 className="text-xl font-bold text-foreground">Subscribers</h1>
            </div>
            <Button 
              onClick={() => fetchSubscribers(true)} 
              variant="outline"
              disabled={refreshing}
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </header>
          
          <main className="flex-1 overflow-auto smooth-scroll">
            <div className="container mx-auto px-6 py-8 space-y-8 animate-page-enter">
              <div className="animate-fade-in">
                <p className="text-muted-foreground">View your subscription customers from Paystack</p>
              </div>

              <Card className="glass-card border-0 shadow-[var(--shadow-medium)] hover-lift" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle>All Subscribers</CardTitle>
                      <CardDescription>
                        {subscribers.length} total subscriber{subscribers.length !== 1 ? 's' : ''} from Paystack
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subscribers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No subscribers yet</p>
                      <p className="text-sm text-muted-foreground">
                        Subscribers will appear here once customers subscribe to your plans
                      </p>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Subscribed</TableHead>
                            {canWrite && <TableHead className="text-right">Contact</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscribers.map((sub, index) => (
                            <TableRow key={sub.id} className="table-row-enter transition-colors duration-200" style={{ animationDelay: `${index * 30}ms` }}>
                              <TableCell className="font-medium">
                                {sub.customer_name || "N/A"}
                              </TableCell>
                              <TableCell>{sub.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{sub.plan_name}</Badge>
                              </TableCell>
                              <TableCell>₦{sub.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(sub.status)}>
                                  {sub.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(sub.created_at).toLocaleDateString()}
                              </TableCell>
                              {canWrite && (
                                <TableCell className="text-right">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => window.location.href = `mailto:${sub.email}`}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Email {sub.email}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}