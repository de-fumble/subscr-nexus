import { useEffect, useState, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, RefreshCw, Loader2, Eye, ChevronRight } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import { SubscriberAvatar } from "@/components/SubscriberAvatar";
import { APPLE_FONT, card, sectionLabel, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

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

  useEffect(() => { fetchSubscribers(); }, []);

  const fetchSubscribers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email);

      let orgData = null;
      let orgId = null;
      const { data: ownedOrg } = await supabase.from("organizations").select("id, org_name, email, logo_url").eq("user_id", user.id).maybeSingle();
      if (ownedOrg) { orgData = ownedOrg; orgId = ownedOrg.id; }
      else {
        const { data: membership } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase.from("organizations").select("id, org_name, email, logo_url").eq("id", membership.org_id).maybeSingle();
          orgData = memberOrg;
        }
      }
      setOrganization(orgData);

      const { data, error } = await supabase.functions.invoke('list-subscribers');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setSubscribers(data.subscribers || []);

      if (orgId) {
        const { data: profileLinks } = await supabase.from("billing_profile_organizations").select(`billing_profiles!inner (id, email)`).eq("org_id", orgId);
        const profileMap = new Map<string, string>();
        for (const link of profileLinks || []) {
          const profile = link.billing_profiles as any;
          if (profile?.email) profileMap.set(profile.email.toLowerCase(), profile.id);
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

  const deduplicatedSubscribers = useMemo(() => {
    const emailMap = new Map<string, DeduplicatedSubscriber>();
    for (const sub of subscribers) {
      const emailKey = sub.email.toLowerCase();
      const existing = emailMap.get(emailKey);
      if (existing) {
        existing.plans.push({ plan_name: sub.plan_name, amount: sub.amount, status: sub.status });
        existing.total_amount += sub.amount;
        if (new Date(sub.created_at) < new Date(existing.earliest_date)) existing.earliest_date = sub.created_at;
        if (sub.status.toLowerCase() === "active") existing.latest_status = "active";
        if (!existing.customer_name && sub.customer_name) existing.customer_name = sub.customer_name;
      } else {
        emailMap.set(emailKey, {
          email: sub.email,
          customer_name: sub.customer_name,
          plans: [{ plan_name: sub.plan_name, amount: sub.amount, status: sub.status }],
          total_amount: sub.amount,
          latest_status: sub.status,
          earliest_date: sub.created_at,
          billing_profile_id: billingProfileMap.get(emailKey) || null,
        });
      }
    }
    return Array.from(emailMap.values());
  }, [subscribers, billingProfileMap]);

  const handleViewDetails = (sub: DeduplicatedSubscriber) => {
    if (sub.billing_profile_id) navigate(`/dashboard/billing-profiles/${sub.billing_profile_id}`);
    else toast.info("No billing profile found. Try syncing from Paystack in Billing Profiles.");
  };

  if (loading) return <PremiumLoader message="Loading subscribers..." />;

  const activeCount = deduplicatedSubscribers.filter(s => s.latest_status.toLowerCase() === "active").length;
  const inactiveCount = deduplicatedSubscribers.length - activeCount;

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "active") return "text-black/60 dark:text-white/60";
    if (s === "cancelled" || s === "non-renewing") return "text-red-500";
    return "text-black/35 dark:text-white/35";
  };

  return (
    <SidebarInset className="flex-1 flex flex-col">
      <header
        className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4"
        style={{ fontFamily: APPLE_FONT }}
      >
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Subscribers</h1>
        <div className="ml-auto">
          <button onClick={() => fetchSubscribers(true)} disabled={refreshing} className={pillBtn}>
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

          <div>
            <p className={sectionLabel}>At a Glance</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: deduplicatedSubscribers.length, sub: `${subscribers.length} subscriptions` },
                { label: "Active", value: activeCount },
                { label: "Inactive", value: inactiveCount },
              ].map((s) => (
                <div key={s.label} className={`${card} px-5 py-4`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-black/30 dark:text-white/30 mb-2">{s.label}</p>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white tabular-nums leading-none">{s.value}</p>
                  {s.sub && <p className="text-[11px] text-black/25 dark:text-white/25 mt-1">{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={sectionLabel}>All Subscribers</p>
            <div className={`${card} overflow-hidden`}>
              {deduplicatedSubscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-10 h-10 rounded-full bg-black/4 dark:bg-white/6 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-black/20 dark:text-white/20" />
                  </div>
                  <p className="text-[13px] font-medium text-black/50 dark:text-white/50">No subscribers yet</p>
                  <p className="text-[11px] text-black/25 dark:text-white/25 mt-1">Customers appear here once they subscribe</p>
                </div>
              ) : (
                <>
                  <div className={`sm:hidden ${tableDivider}`}>
                    {deduplicatedSubscribers.map((sub) => (
                      <div key={sub.email} className="px-4 py-3 flex items-center gap-3 hover:bg-black/[0.015] transition-colors cursor-pointer" onClick={() => handleViewDetails(sub)}>
                        <SubscriberAvatar className="h-9 w-9 rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-black dark:text-white truncate">{sub.customer_name || "N/A"}</p>
                            <span className={`text-[11px] font-medium capitalize ${statusColor(sub.latest_status)}`}>{sub.latest_status}</span>
                          </div>
                          <p className="text-[11px] text-black/35 dark:text-white/35 truncate">{sub.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sub.plans.map((p, i) => (
                              <span key={i} className="text-[10px] text-black/30 dark:text-white/30 border border-black/8 dark:border-white/8 rounded-full px-2 py-0.5">{p.plan_name}</span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-black/20 shrink-0" />
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <th className={thCell}>Customer</th>
                          <th className={thCell}>Plans</th>
                          <th className={thCell}>Status</th>
                          <th className={thCell}>Since</th>
                          <th className={`${thCell} text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody className={tableDivider}>
                        {deduplicatedSubscribers.map((sub) => (
                          <tr key={sub.email} className={trRow}>
                            <td className={tdCell}>
                              <div className="flex items-center gap-3">
                                <SubscriberAvatar className="h-8 w-8 rounded-xl shrink-0" />
                                <div>
                                  <p className="text-[13px] font-medium text-black dark:text-white">{sub.customer_name || "N/A"}</p>
                                  <p className="text-[11px] text-black/35 dark:text-white/35">{sub.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className={tdCell}>
                              <div className="flex flex-wrap gap-1">
                                {sub.plans.map((p, i) => (
                                  <span key={i} className="text-[10px] text-black/40 border border-black/8 dark:border-white/8 rounded-full px-2 py-0.5">{p.plan_name}</span>
                                ))}
                              </div>
                            </td>
                            <td className={tdCell}>
                              <span className={`text-[12px] font-medium capitalize ${statusColor(sub.latest_status)}`}>{sub.latest_status}</span>
                            </td>
                            <td className={`${tdCell} text-[12px] text-black/35 dark:text-white/35`}>{new Date(sub.earliest_date).toLocaleDateString()}</td>
                            <td className={`${tdCell} text-right`}>
                              <button onClick={() => handleViewDetails(sub)} className="flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70 transition-colors ml-auto">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
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

        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
