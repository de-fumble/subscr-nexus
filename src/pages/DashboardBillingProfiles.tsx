import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, Search, RefreshCw, Loader2, Eye, Copy, CheckCircle, Download } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
import { SubscriberAvatar } from "@/components/SubscriberAvatar";
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

interface BillingProfile {
  id: string;
  profile_number: string | null;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
  total_paid: number;
  active_plans_count: number;
  latest_payment_status: string | null;
  latest_payment_date: string | null;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

export default function DashboardBillingProfiles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<BillingProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<BillingProfile[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { role, canAccessSettings } = useOrgRole();

  useEffect(() => {
    fetchBillingProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchQuery, statusFilter, profiles]);

  const filterProfiles = () => {
    let filtered = [...profiles];

    // Apply search filter
     if (searchQuery) {
       const query = searchQuery.toLowerCase();
       filtered = filtered.filter(
         (p) =>
           p.email.toLowerCase().includes(query) ||
           (p.profile_number && p.profile_number.includes(query)) ||
           (p.full_name && p.full_name.toLowerCase().includes(query))
       );
     }

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((p) => p.active_plans_count > 0);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((p) => p.active_plans_count === 0);
    }

    setFilteredProfiles(filtered);
  };

  const fetchBillingProfiles = async (isRefresh = false) => {
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

      if (!orgId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch billing profiles linked to this organization
       const { data: profileLinks, error: linksError } = await supabase
         .from("billing_profile_organizations")
         .select(`
           billing_profile_id,
           total_paid,
           billing_profiles!inner (
             id,
             profile_number,
             email,
             full_name,
             phone_number,
             created_at
           )
         `)
         .eq("org_id", orgId);

      if (linksError) throw linksError;

      // Pre-fetch all required data to prevent N+1 queries
      const emails = profileLinks?.map(link => (link.billing_profiles as any).email) || [];

      // 1. All subscribers for this org
      const { data: allSubscribers } = await supabase
        .from("subscribers")
        .select("id, status, email, amount, created_at, paystack_subscription_code, subscription_plans!inner(org_id)")
        .eq("subscription_plans.org_id", orgId);

      const subscriberIds = allSubscribers?.map(s => s.id) || [];

      // 2. All transactions for these subscribers
      const { data: allSubTxns } = subscriberIds.length > 0 
        ? await supabase.from("transactions").select("*").in("subscriber_id", subscriberIds)
        : { data: [] };

      // 3. All one_time_payment_transactions for these emails
      const { data: allOtpTxns } = emails.length > 0 
        ? await supabase.from("one_time_payment_transactions").select("*").in("payer_email", emails)
        : { data: [] };

      // 4. All direct one_time_payments for these emails
      const { data: allDirectOtp } = emails.length > 0
        ? await supabase.from("one_time_payments").select("*").eq("org_id", orgId).eq("is_paid", true).in("paid_by_email", emails)
        : { data: [] };

      const enrichedProfiles: BillingProfile[] = [];

      for (const link of profileLinks || []) {
        const profile = link.billing_profiles as any;
        let totalSpend = 0;
        let latestTx: any = null;
        const profileTxns: any[] = [];

        // Find matching subscribers
        const profileSubscribers = allSubscribers?.filter(s => s.email === profile.email) || [];
        const activePlans = profileSubscribers.filter(s => s.status === "active").length;

        // Map subscription transactions
        profileSubscribers.forEach(sub => {
          // Find standard webhook transactions
          const txns = allSubTxns?.filter(tx => tx.subscriber_id === sub.id) || [];
          
          txns.forEach(tx => {
            const amount = Number(tx.amount) / 100;
            profileTxns.push({
              ...tx,
              amount,
              normalized_date: new Date(tx.paid_at || tx.created_at).getTime()
            });
            if (tx.status === "success" || tx.status === "Successful") {
              totalSpend += amount;
            }
          });

          // Fix webhook race condition: inject initial subscription payment if skipped
          const planCreatedAt = new Date(sub.created_at).getTime();
          const hasInitialTx = txns.some(t => Math.abs(new Date(t.created_at).getTime() - planCreatedAt) < 86400000);

          if (!hasInitialTx && (sub.status === "active" || sub.status === "cancelled")) {
            const initAmount = Number(sub.amount) / 100; // Sub amount in Kobo too
            profileTxns.push({
              id: `init-${sub.id}`,
              status: "success",
              amount: initAmount,
              paid_at: sub.created_at,
              created_at: sub.created_at,
              normalized_date: planCreatedAt
            });
            totalSpend += initAmount;
          }
        });

        // Map one time payment transactions
        const otpTxns = allOtpTxns?.filter(tx => tx.payer_email === profile.email) || [];
        otpTxns.forEach(tx => {
          const amount = Number(tx.amount);
          profileTxns.push({
            ...tx,
            amount,
            status: "success",
            normalized_date: new Date(tx.paid_at || tx.created_at).getTime()
          });
          totalSpend += amount;
        });

        // Map direct one time payments
        const directOtp = allDirectOtp?.filter(tx => tx.paid_by_email === profile.email) || [];
        directOtp.forEach(tx => {
          // Avoid duplicates by reference
          if (!profileTxns.some(t => t.paystack_reference === tx.paystack_reference)) {
            const amount = Number(tx.amount);
            profileTxns.push({
              ...tx,
              amount,
              status: "success",
              normalized_date: new Date(tx.paid_at || tx.created_at).getTime()
            });
            totalSpend += amount;
          }
        });

        // Sort to find the latest payment
        profileTxns.sort((a, b) => b.normalized_date - a.normalized_date);
        
        if (profileTxns.length > 0) {
          latestTx = profileTxns[0];
        }

         enrichedProfiles.push({
           id: profile.id,
           profile_number: profile.profile_number,
           email: profile.email,
           full_name: profile.full_name,
           phone_number: profile.phone_number,
           created_at: profile.created_at,
           total_paid: totalSpend,
           active_plans_count: activePlans,
           latest_payment_status: latestTx ? latestTx.status : null,
           latest_payment_date: latestTx ? (latestTx.paid_at || latestTx.created_at) : null,
         });
      }

      setProfiles(enrichedProfiles);
    } catch (error: any) {
      console.error("Error fetching billing profiles:", error);
      toast.error(error.message || "Failed to load billing profiles");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Billing Profile ID copied!");
  };

   const formatCurrency = (amount: number) => {
     return `₦${amount.toLocaleString()}`;
   };

   const handleSyncFromPaystack = async () => {
     setSyncing(true);
     try {
       // Refresh session to ensure JWT is not expired before calling edge function
       const { data: refreshData, error: sessionError } = await supabase.auth.refreshSession();
       if (sessionError || !refreshData.session) {
         toast.error("Your session has expired. Please sign in again.");
         return;
       }

       const { data, error } = await supabase.functions.invoke("sync-billing-profiles");

       if (error) throw error;
       if (data?.error) throw new Error(data.error);

       const summary = data?.summary;
       toast.success(
         `Synced! ${summary?.profiles_created || 0} profiles created, ${summary?.unique_emails || 0} subscribers found.`
       );

       // Refresh the list
       await fetchBillingProfiles(true);
     } catch (error: any) {
       console.error("Error syncing billing profiles:", error);
       toast.error(error.message || "Failed to sync from Paystack");
     } finally {
       setSyncing(false);
     }
   };

  if (loading) {
    return (
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">Billing Profiles</h1>
        </header>
        <PremiumLoader message="Loading billing profiles..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
        <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
        <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
          <Users className="h-4 w-4 text-black/40 dark:text-white/40" />
          Billing Profiles
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleSyncFromPaystack} disabled={syncing} className={pillBtn}>
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <button onClick={() => fetchBillingProfiles(true)} disabled={refreshing} className={pillBtn}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">

          {/* Summary stat strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Profiles", value: profiles.length, sub: `${filteredProfiles.length} filtered` },
              { label: "Active Subscriptions", value: filteredProfiles.filter(p => p.active_plans_count > 0).length, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Inactive Profiles", value: filteredProfiles.filter(p => p.active_plans_count === 0).length },
            ].map((s) => (
              <div key={s.label} className={`${card} px-5 py-4 flex flex-col justify-between`}>
                <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em] mb-1.5">{s.label}</p>
                <p className={`${statValue} ${s.color || ""}`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-black/25 dark:text-white/25 mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Inline filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
              <input
                placeholder="Search name, email, profile ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-full text-[13px] bg-white dark:bg-[#1c1c1e] rounded-[8px] border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-8 text-[12px] bg-white dark:bg-[#1c1c1e] border-black/5 dark:border-white/5 rounded-[8px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value="active">Has Active Plans</SelectItem>
                <SelectItem value="inactive">No Active Plans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table card */}
          <div className={card}>
            {filteredProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center mb-4">
                  <Users className="h-5 w-5 text-black/40 dark:text-white/40" />
                </div>
                <p className="font-semibold text-xs text-black dark:text-white">No billing profiles found</p>
                <p className="text-[11px] text-black/30 dark:text-white/30 mt-1">Profiles are created automatically when customers make payments</p>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className={`sm:hidden ${tableDivider}`}>
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="p-4 space-y-1.5 flex items-center gap-3 hover:bg-black/[0.015] transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}>
                      <SubscriberAvatar className="h-9 w-9 rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[13px] font-medium text-black dark:text-white truncate">{profile.full_name || "—"}</p>
                            <p className="text-[11px] text-black/35 dark:text-white/35 truncate">{profile.email}</p>
                          </div>
                          <span className="text-[10px] text-black/40 dark:text-white/40 border border-black/8 dark:border-white/8 rounded-full px-2 py-0.5 shrink-0">
                            {profile.active_plans_count} plan{profile.active_plans_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <code className="text-[10px] font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">#{profile.profile_number || "—"}</code>
                          <span className="text-[13px] font-semibold text-black dark:text-white">{formatCurrency(profile.total_paid)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <th className={thCell}>Customer</th>
                        <th className={thCell}>Profile ID</th>
                        <th className={thCell}>Active Plans</th>
                        <th className={`${thCell} text-right`}>Total Paid</th>
                        <th className={thCell}>Latest Payment</th>
                        <th className={`${thCell} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody className={tableDivider}>
                      {filteredProfiles.map((profile) => (
                        <tr key={profile.id} className={trRow} onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}>
                          <td className={tdCell}>
                            <div className="flex items-center gap-3">
                              <SubscriberAvatar className="h-8 w-8 rounded-xl shrink-0" />
                              <div>
                                <p className="text-[13px] font-medium text-black dark:text-white">{profile.full_name || "—"}</p>
                                <p className="text-[11px] text-black/35 dark:text-white/35">{profile.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className={tdCell}>
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <code className="text-[11px] font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">#{profile.profile_number || "—"}</code>
                              <button
                                onClick={() => copyToClipboard(profile.profile_number || profile.id)}
                                className="text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 transition-opacity"
                              >
                                {copiedId === (profile.profile_number || profile.id)
                                  ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                                  : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                          <td className={tdCell}>
                            <span className="text-[12px] text-black/60 dark:text-white/60">
                              {profile.active_plans_count}
                            </span>
                          </td>
                          <td className={`${tdCell} text-right text-[13px] font-semibold text-black dark:text-white`}>{formatCurrency(profile.total_paid)}</td>
                          <td className={tdCell}>
                            {profile.latest_payment_date ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[12px] font-semibold ${
                                  profile.latest_payment_status === "success"
                                    ? "text-emerald-500"
                                    : "text-red-500"
                                }`}>
                                  {profile.latest_payment_status === "success" ? "Paid" : profile.latest_payment_status}
                                </span>
                                <span className="text-[10px] text-black/30 dark:text-white/30">
                                  {new Date(profile.latest_payment_date).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-black/25 dark:text-white/25 text-[11px]">—</span>
                            )}
                          </td>
                          <td className={`${tdCell} text-right`}>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/billing-profiles/${profile.id}`); }} className="flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70 transition-colors ml-auto">
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
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}