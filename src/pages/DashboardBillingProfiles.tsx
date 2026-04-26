 import { useEffect, useState } from "react";
 import { PremiumLoader } from "@/components/PremiumLoader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useNavigate } from "react-router-dom";
 import { Users, Search, RefreshCw, Loader2, Eye, Copy, CheckCircle, Download } from "lucide-react";
 import { useOrgRole } from "@/hooks/useOrgRole";
 import { Badge } from "@/components/ui/badge";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingSupport } from "@/components/FloatingSupport";
 
 
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
        <PremiumLoader message="Loading billing profiles..." />
        <FloatingSupport />
      </SidebarInset>
    );
  }

  const activeCount = filteredProfiles.filter(p => p.active_plans_count > 0).length;
  const inactiveCount = filteredProfiles.length - activeCount;

  return (
    <SidebarInset className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 sm:px-4">
        <SidebarTrigger className="opacity-60 hover:opacity-100 transition-opacity shrink-0" />
        <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Billing Profiles
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleSyncFromPaystack} variant="outline" disabled={syncing} size="sm" className="gap-1.5 text-xs h-8">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {syncing ? "Syncing..." : "Sync"}
          </Button>
          <Button onClick={() => fetchBillingProfiles(true)} variant="outline" disabled={refreshing} size="sm" className="gap-1.5 text-xs h-8">
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
              { label: "Total", value: profiles.length, sub: `${filteredProfiles.length} shown` },
              { label: "Active", value: filteredProfiles.filter(p => p.active_plans_count > 0).length, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Inactive", value: filteredProfiles.filter(p => p.active_plans_count === 0).length },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-lg border px-4 py-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums ${s.color || "text-foreground"}`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Inline filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name, email, profile ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
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
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            {filteredProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">No billing profiles found</p>
                <p className="text-xs text-muted-foreground mt-1">Profiles are created automatically when customers make payments</p>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-border/50">
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="p-3 space-y-1.5 flex items-center gap-3" onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}>
                      <SubscriberAvatar className="h-10 w-10 rounded-lg border border-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-medium text-sm truncate">{profile.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                          </div>
                          <Badge variant={profile.active_plans_count > 0 ? "default" : "secondary"} className="shrink-0 text-[10px]">
                            {profile.active_plans_count} plan{profile.active_plans_count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">#{profile.profile_number || "—"}</code>
                          <span className="text-xs font-semibold">{formatCurrency(profile.total_paid)}</span>
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
                        <th className="py-3 px-4">Profile ID</th>
                        <th className="py-3 px-4">Active Plans</th>
                        <th className="py-3 px-4 text-right">Total Paid</th>
                        <th className="py-3 px-4">Latest Payment</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-muted/25 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}
                          onClickCapture={(e) => { if ((e.target as HTMLElement).closest('button')) e.stopPropagation(); }}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <SubscriberAvatar className="h-8 w-8 rounded-lg border border-slate-100 shrink-0" />
                              <div>
                                <p className="font-medium text-foreground">{profile.full_name || "—"}</p>
                                <p className="text-[11px] text-muted-foreground">{profile.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{profile.profile_number || "—"}</code>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(profile.profile_number || profile.id); }}
                                className="opacity-50 hover:opacity-100 transition-opacity"
                              >
                                {copiedId === (profile.profile_number || profile.id)
                                  ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                                  : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={profile.active_plans_count > 0 ? "default" : "secondary"} className="text-xs">
                              {profile.active_plans_count}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(profile.total_paid)}</td>
                          <td className="py-3 px-4">
                            {profile.latest_payment_date ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-xs font-medium ${
                                  profile.latest_payment_status === "success"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                }`}>
                                  {profile.latest_payment_status === "success" ? "Paid" : profile.latest_payment_status}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(profile.latest_payment_date).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/billing-profiles/${profile.id}`); }}>
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