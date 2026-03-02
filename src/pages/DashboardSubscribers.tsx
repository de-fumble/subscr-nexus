import { useEffect, useState, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, RefreshCw, Loader2, Eye } from "lucide-react";
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

interface DeduplicatedSubscriber {
  email: string;
  customer_name: string | null;
  plans: { plan_name: string; amount: number; status: string }[];
  total_amount: number;
  latest_status: string;
  earliest_date: string;
  billing_profile_id: string | null;
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
  const [billingProfileMap, setBillingProfileMap] = useState<Map<string, string>>(new Map());
  const { role, canAccessSettings } = useOrgRole();

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

      // Get organization
      let orgData = null;
      let orgId = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
        orgId = ownedOrg.id;
      } else {
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
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);

      // Fetch subscribers from Paystack via edge function
      const { data, error } = await supabase.functions.invoke('list-subscribers');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSubscribers(data.subscribers || []);

      // Fetch billing profiles to map email → profile ID
      if (orgId) {
        const { data: profileLinks } = await supabase
          .from("billing_profile_organizations")
          .select(`
            billing_profiles!inner (
              id,
              email
            )
          `)
          .eq("org_id", orgId);

        const profileMap = new Map<string, string>();
        for (const link of profileLinks || []) {
          const profile = link.billing_profiles as any;
          if (profile?.email) {
            profileMap.set(profile.email.toLowerCase(), profile.id);
          }
        }
        setBillingProfileMap(profileMap);
      }
    } catch (error: any) {
      console.error("Error fetching subscribers:", error);
      toast.error(error.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Deduplicate subscribers by email
  const deduplicatedSubscribers = useMemo(() => {
    const emailMap = new Map<string, DeduplicatedSubscriber>();

    for (const sub of subscribers) {
      const emailKey = sub.email.toLowerCase();
      const existing = emailMap.get(emailKey);

      if (existing) {
        existing.plans.push({
          plan_name: sub.plan_name,
          amount: sub.amount,
          status: sub.status,
        });
        existing.total_amount += sub.amount;
        // Keep earliest date
        if (new Date(sub.created_at) < new Date(existing.earliest_date)) {
          existing.earliest_date = sub.created_at;
        }
        // Update status if any plan is active
        if (sub.status.toLowerCase() === "active") {
          existing.latest_status = "active";
        }
        // Use customer name if available
        if (!existing.customer_name && sub.customer_name) {
          existing.customer_name = sub.customer_name;
        }
      } else {
        emailMap.set(emailKey, {
          email: sub.email,
          customer_name: sub.customer_name,
          plans: [{
            plan_name: sub.plan_name,
            amount: sub.amount,
            status: sub.status,
          }],
          total_amount: sub.amount,
          latest_status: sub.status,
          earliest_date: sub.created_at,
          billing_profile_id: billingProfileMap.get(emailKey) || null,
        });
      }
    }

    return Array.from(emailMap.values());
  }, [subscribers, billingProfileMap]);

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

  const handleViewDetails = (sub: DeduplicatedSubscriber) => {
    if (sub.billing_profile_id) {
      navigate(`/dashboard/billing-profiles/${sub.billing_profile_id}`);
    } else {
      toast.info("No billing profile found for this subscriber. Try syncing from Paystack in the Billing Profiles page.");
    }
  };

  if (loading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <PremiumLoader message="Loading subscribers..." />
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
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
          
           <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
              <div>
                <p className="text-muted-foreground">View your subscription customers from Paystack</p>
              </div>

              <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle>All Subscribers</CardTitle>
                      <CardDescription>
                        {deduplicatedSubscribers.length} unique subscriber{deduplicatedSubscribers.length !== 1 ? 's' : ''} ({subscribers.length} total subscriptions)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {deduplicatedSubscribers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No subscribers yet</p>
                      <p className="text-sm text-muted-foreground">
                        Subscribers will appear here once customers subscribe to your plans
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile card layout */}
                      <div className="sm:hidden space-y-3">
                        {deduplicatedSubscribers.map((sub) => (
                          <div key={sub.email} className="p-4 rounded-lg border border-border/50 bg-card space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{sub.customer_name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                              </div>
                              <Badge variant={getStatusVariant(sub.latest_status)} className="ml-2 shrink-0">
                                {sub.latest_status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {sub.plans.map((plan, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px]">
                                  {plan.plan_name}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-muted-foreground">Since {new Date(sub.earliest_date).toLocaleDateString()}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 h-7 text-xs"
                                onClick={() => handleViewDetails(sub)}
                              >
                                <Eye className="h-3 w-3" />
                                Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop table layout */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Plans</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Since</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deduplicatedSubscribers.map((sub) => (
                              <TableRow key={sub.email}>
                                <TableCell className="font-medium">
                                  {sub.customer_name || "N/A"}
                                </TableCell>
                                <TableCell>{sub.email}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {sub.plans.map((plan, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {plan.plan_name}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusVariant(sub.latest_status)}>
                                    {sub.latest_status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(sub.earliest_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleViewDetails(sub)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
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
