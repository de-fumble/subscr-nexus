 import { useEffect, useState } from "react";
 import { PremiumLoader } from "@/components/PremiumLoader";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useNavigate } from "react-router-dom";
 import { Users, Search, RefreshCw, Loader2, Eye, Copy, CheckCircle, Download } from "lucide-react";
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
 
   return (
    <SidebarInset className="flex-1">
           <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
             <SidebarTrigger />
             
             <div className="flex-1">
               <h1 className="text-xl font-bold text-foreground">Billing Profiles</h1>
             </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSyncFromPaystack}
                  variant="outline"
                  disabled={syncing}
                  size="sm"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? "Syncing..." : "Sync from Paystack"}
                </Button>
                <Button
                  onClick={() => fetchBillingProfiles(true)}
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
              </div>
           </header>
 
           <main className="flex-1 overflow-auto">
             <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
               <div>
                 <p className="text-muted-foreground">
                   Universal customer identity across all billing and payment history
                 </p>
               </div>
 
               {/* Filters */}
               <div className="flex flex-col sm:flex-row gap-4">
                 <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search by email, name, or profile ID..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-10"
                   />
                 </div>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                   <SelectTrigger className="w-[180px]">
                     <SelectValue placeholder="Filter by status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Profiles</SelectItem>
                     <SelectItem value="active">Has Active Plans</SelectItem>
                     <SelectItem value="inactive">No Active Plans</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                 <CardHeader>
                   <div className="flex items-center gap-2">
                     <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                       <Users className="h-5 w-5 text-accent" />
                     </div>
                     <div>
                       <CardTitle>All Billing Profiles</CardTitle>
                       <CardDescription>
                         {filteredProfiles.length} of {profiles.length} profile
                         {profiles.length !== 1 ? "s" : ""}
                       </CardDescription>
                     </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                   {filteredProfiles.length === 0 ? (
                     <div className="text-center py-12">
                       <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                       <p className="text-muted-foreground mb-2">No billing profiles found</p>
                       <p className="text-sm text-muted-foreground">
                         Billing profiles are created automatically when customers make payments
                       </p>
                     </div>
                   ) : (
                     <>
                       {/* Mobile card layout */}
                       <div className="sm:hidden space-y-3">
                         {filteredProfiles.map((profile) => (
                           <div key={profile.id} className="p-4 rounded-lg border border-border/50 bg-card space-y-2" onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}>
                             <div className="flex items-start justify-between">
                               <div className="min-w-0 flex-1">
                                 <p className="font-medium text-sm truncate">{profile.full_name || "—"}</p>
                                 <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                               </div>
                               <Badge variant={profile.active_plans_count > 0 ? "default" : "secondary"} className="ml-2 shrink-0">
                                 {profile.active_plans_count} plan{profile.active_plans_count !== 1 ? "s" : ""}
                               </Badge>
                             </div>
                             <div className="flex items-center justify-between text-sm">
                               <code className="text-xs font-bold bg-muted px-2 py-0.5 rounded">#{profile.profile_number || "—"}</code>
                               <span className="font-medium">{formatCurrency(profile.total_paid)}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                       {/* Desktop table layout */}
                       <div className="hidden sm:block">
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Name</TableHead>
                               <TableHead>Email</TableHead>
                               <TableHead>Profile ID</TableHead>
                               <TableHead>Active Plans</TableHead>
                               <TableHead>Total Paid</TableHead>
                               <TableHead>Latest Payment</TableHead>
                               <TableHead className="text-right">Actions</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {filteredProfiles.map((profile) => (
                               <TableRow key={profile.id}>
                                 <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>
                                 <TableCell>{profile.email}</TableCell>
                                 <TableCell>
                                   <div className="flex items-center gap-2">
                                     <code className="text-sm font-bold bg-muted px-2 py-1 rounded">#{profile.profile_number || "—"}</code>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(profile.profile_number || profile.id)}>
                                       {copiedId === (profile.profile_number || profile.id) ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                     </Button>
                                   </div>
                                 </TableCell>
                                 <TableCell>
                                   <Badge variant={profile.active_plans_count > 0 ? "default" : "secondary"}>{profile.active_plans_count}</Badge>
                                 </TableCell>
                                 <TableCell>{formatCurrency(profile.total_paid)}</TableCell>
                                 <TableCell>
                                   {profile.latest_payment_date ? (
                                     <div className="flex flex-col">
                                       <Badge variant={profile.latest_payment_status === "success" ? "default" : "destructive"} className="w-fit mb-1">
                                         {profile.latest_payment_status}
                                       </Badge>
                                       <span className="text-xs text-muted-foreground">{new Date(profile.latest_payment_date).toLocaleDateString()}</span>
                                     </div>
                                   ) : (
                                     <span className="text-muted-foreground">—</span>
                                   )}
                                 </TableCell>
                                 <TableCell className="text-right">
                                   <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/billing-profiles/${profile.id}`)}>
                                     <Eye className="h-4 w-4 mr-1" /> View
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
             <FloatingSupport />
           </main>
         </SidebarInset>
   );
 }