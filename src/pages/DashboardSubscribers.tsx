import { useEffect, useState, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, RefreshCw, Loader2, Eye } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";

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
    return <PremiumLoader message="Loading subscribers..." />;
  }

  const activeCount = deduplicatedSubscribers.filter(s => s.latest_status.toLowerCase() === "active").length;
  const inactiveCount = deduplicatedSubscribers.length - activeCount;

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
        <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
        <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Subscribers
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => fetchSubscribers(true)} variant="outline" disabled={refreshing} size="sm" className="gap-1.5 text-xs h-8">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

          {/* Summary stat strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: deduplicatedSubscribers.length, sub: `${subscribers.length} subscriptions` },
              { label: "Active", value: activeCount, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Inactive", value: inactiveCount },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-lg border px-4 py-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums ${s.color || "text-foreground"}`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            {deduplicatedSubscribers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">No subscribers yet</p>
                <p className="text-xs text-muted-foreground mt-1">Customers will appear here once they subscribe to your plans</p>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-border/50">                   {deduplicatedSubscribers.map((sub) => (
                    <div key={sub.email} className="p-3 flex items-center gap-3">
                      <SubscriberAvatar className="h-10 w-10 rounded-lg border border-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-medium text-sm truncate">{sub.customer_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                          </div>
                          <Badge variant={getStatusVariant(sub.latest_status)} className="shrink-0 text-[10px]">{sub.latest_status}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-wrap gap-1">
                            {sub.plans.map((plan, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">{plan.plan_name}</Badge>
                            ))}
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDetails(sub)}>
                            <Eye className="h-3 w-3" />View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 border-b text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Plans</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Since</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {deduplicatedSubscribers.map((sub) => (
                        <tr key={sub.email} className="hover:bg-muted/25 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <SubscriberAvatar className="h-8 w-8 rounded-lg border border-slate-100 shrink-0" />
                              <div>
                                <p className="font-medium text-foreground">{sub.customer_name || "N/A"}</p>
                                <p className="text-[11px] text-muted-foreground">{sub.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {sub.plans.map((plan, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs font-normal">{plan.plan_name}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusVariant(sub.latest_status)} className="text-xs capitalize">{sub.latest_status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(sub.earliest_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => handleViewDetails(sub)}>
                              <Eye className="h-3.5 w-3.5" />View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
