import { useEffect, useState, useMemo } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { SubscriberAvatar } from "@/components/SubscriberAvatar";
 import { useParams, useNavigate } from "react-router-dom";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import {
   User,
   Mail,
   Phone,
   Calendar,
   CreditCard,
   DollarSign,
   History,
   XCircle,
   Shield,
   Activity,
   Wallet,
   Info,
   ArrowUpRight,
   Search,
   Filter,
   RefreshCw,
   Loader2,
   Copy,
   CheckCircle,
   AlertTriangle,
   Edit2,
   Save,
   X,
   ArrowLeft,
 } from "lucide-react";
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
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from "@/components/ui/alert-dialog";
 import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
 
 
interface BillingProfile {
  id: string;
  profile_number: string | null;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
}
 
 interface Plan {
   id: string;
   subscriber_id: string;
   name: string;
   amount: number;
   interval: string;
   status: string;
   created_at: string;
   next_payment_date: string | null;
   paystack_subscription_code: string | null;
 }
 
 interface Transaction {
   id: string;
   amount: number;
   status: string;
   paystack_reference: string;
   created_at: string;
   paid_at: string | null;
   plan_name: string;
 }
 
 interface Organization {
   id: string;
   org_name: string;
   email: string;
   logo_url?: string | null;
   paystack_secret_key?: string | null;
 }
 
 export default function BillingProfileDetail() {
   const { profileId } = useParams<{ profileId: string }>();
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [profile, setProfile] = useState<BillingProfile | null>(null);
   const [plans, setPlans] = useState<Plan[]>([]);
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [organization, setOrganization] = useState<Organization | null>(null);
   const [userEmail, setUserEmail] = useState<string | undefined>();
   const [totalSpend, setTotalSpend] = useState(0);
   const [spendByPlan, setSpendByPlan] = useState<Record<string, number>>({});
   const [copiedId, setCopiedId] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editName, setEditName] = useState("");
   const [editPhone, setEditPhone] = useState("");
   const [saving, setSaving] = useState(false);
   const [cancellingSubscription, setCancellingSubscription] = useState<string | null>(null);
   const [retryingPayment, setRetryingPayment] = useState<string | null>(null);
   const { role, canAccessSettings, canWrite } = useOrgRole();

   const successRate = useMemo(() => {
     if (transactions.length === 0) return 100;
     const successful = transactions.filter(tx => tx.status.toLowerCase() === "success" || tx.status.toLowerCase() === "successful").length;
     return Math.round((successful / transactions.length) * 100);
   }, [transactions]);
 
   useEffect(() => {
     if (profileId) {
       fetchProfileData();
     }
   }, [profileId]);
 
   const fetchProfileData = async () => {
     setLoading(true);
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
         .select("id, org_name, email, logo_url, paystack_secret_key")
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
             .select("id, org_name, email, logo_url, paystack_secret_key")
             .eq("id", membership.org_id)
             .maybeSingle();
 
           orgData = memberOrg;
         }
       }
 
       setOrganization(orgData);
 
       if (!orgId) {
         toast.error("Organization not found");
         navigate("/dashboard");
         return;
       }
 
       // Fetch billing profile
       const { data: profileData, error: profileError } = await supabase
         .from("billing_profiles")
         .select("*")
         .eq("id", profileId)
         .single();
 
       if (profileError) throw profileError;
       setProfile(profileData);
       setEditName(profileData.full_name || "");
       setEditPhone(profileData.phone_number || "");
 
       // Fetch plans (subscribers) for this email in this org
       const { data: subscribers, error: subError } = await supabase
         .from("subscribers")
         .select(`
           id,
           status,
           amount,
           created_at,
           next_payment_date,
           paystack_subscription_code,
           subscription_plans!inner (
             id,
             name,
             interval,
             org_id
           )
         `)
         .eq("email", profileData.email)
         .eq("subscription_plans.org_id", orgId);
 
       if (subError) throw subError;
 
        const formattedPlans: Plan[] = (subscribers || []).map((s: any) => ({
          id: s.subscription_plans.id,
          subscriber_id: s.id,
          name: s.subscription_plans.name,
          amount: s.amount / 100,
          interval: s.subscription_plans.interval,
         status: s.status,
         created_at: s.created_at,
         next_payment_date: s.next_payment_date,
         paystack_subscription_code: s.paystack_subscription_code,
       }));
 
       setPlans(formattedPlans);
 
        // Fetch transactions from local database instead of relying on external API
        let localTxns: Transaction[] = [];
        let calcTotalSpend = 0;
        const calcSpendByPlan: Record<string, number> = {};

        // 1. Fetch subscription transactions
        const subscriberIds = formattedPlans.map((p) => p.subscriber_id);
        if (subscriberIds.length > 0) {
          const { data: subTxns, error: subTxError } = await supabase
            .from("transactions")
            .select("*")
            .in("subscriber_id", subscriberIds);

          if (!subTxError && subTxns) {
            subTxns.forEach((tx) => {
              const plan = formattedPlans.find((p) => p.subscriber_id === tx.subscriber_id);
              const planName = plan?.name || "Subscription Payment";
              const amount = Number(tx.amount) / 100; // transactions from paystack are in Kobo
              
              localTxns.push({
                id: tx.id,
                amount,
                status: tx.status,
                paystack_reference: tx.paystack_reference || tx.id,
                created_at: tx.created_at,
                paid_at: tx.paid_at || tx.created_at,
                plan_name: planName,
              });

              if (tx.status === "success" || tx.status === "Successful") {
                calcTotalSpend += amount;
                calcSpendByPlan[planName] = (calcSpendByPlan[planName] || 0) + amount;
              }
            });
            
            // Fix webhook race condition: inject the initial subscription payment if missing
            formattedPlans.forEach((plan) => {
              // Check if there is already a transaction for this plan near its creation date
              const planCreatedAt = new Date(plan.created_at).getTime();
              const hasInitialTransaction = localTxns.some(t => 
                t.plan_name === plan.name && 
                Math.abs(new Date(t.created_at).getTime() - planCreatedAt) < 86400000 // within 24 hours
              );

              if (!hasInitialTransaction && (plan.status === "active" || plan.status === "cancelled")) {
                 // The initial payment is confirmed by the active subscriber state
                 const amount = plan.amount; // Already in Naira in formattedPlans
                 localTxns.push({
                   id: `init-${plan.subscriber_id}`,
                   amount,
                   status: "success",
                   paystack_reference: plan.paystack_subscription_code || `sub-${plan.subscriber_id}`,
                   created_at: plan.created_at,
                   paid_at: plan.created_at,
                   plan_name: plan.name,
                 });
                 calcTotalSpend += amount;
                 calcSpendByPlan[plan.name] = (calcSpendByPlan[plan.name] || 0) + amount;
              }
            });
          }
        }

        // 2. Fetch one-time payment transactions (Already in Naira)
        const { data: otpTxns, error: otpTxError } = await supabase
          .from("one_time_payment_transactions")
          .select("*, one_time_payments(name)")
          .eq("payer_email", profileData.email);

        if (!otpTxError && otpTxns) {
          otpTxns.forEach((tx) => {
            const planName = tx.one_time_payments?.name || "Standard Payment";
            const amount = Number(tx.amount); // Already Naira
            
            localTxns.push({
              id: tx.id,
              amount,
              status: "success",
              paystack_reference: tx.paystack_reference || tx.id,
              created_at: tx.created_at,
              paid_at: tx.paid_at || tx.created_at,
              plan_name: planName,
            });

            calcTotalSpend += amount;
            calcSpendByPlan[planName] = (calcSpendByPlan[planName] || 0) + amount;
          });
        }

        // 3. Fetch direct one-time payments (Already in Naira)
        const { data: directOtp, error: directOtpError } = await supabase
          .from("one_time_payments")
          .select("*")
          .eq("org_id", orgId)
          .eq("is_paid", true)
          .eq("paid_by_email", profileData.email);

        if (!directOtpError && directOtp) {
          directOtp.forEach((tx) => {
            // Avoid duplicates
            if (!localTxns.find((t) => t.paystack_reference === tx.paystack_reference)) {
              const planName = tx.name || "Standard Payment";
              const amount = Number(tx.amount); // Already Naira
              
              localTxns.push({
                id: tx.id,
                amount,
                status: "success",
                paystack_reference: tx.paystack_reference || tx.id,
                created_at: tx.created_at,
                paid_at: tx.paid_at || tx.created_at,
                plan_name: planName,
              });

              calcTotalSpend += amount;
              calcSpendByPlan[planName] = (calcSpendByPlan[planName] || 0) + amount;
            }
          });
        }

        // Sort by date descending
        localTxns.sort(
          (a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime()
        );

        setTransactions(localTxns);
        setTotalSpend(calcTotalSpend);
        setSpendByPlan(calcSpendByPlan);
        
     } catch (error: any) {
       console.error("Error fetching profile data:", error);
       toast.error(error.message || "Failed to load profile");
       navigate("/dashboard/billing-profiles");
     } finally {
       setLoading(false);
     }
   };
 
    const copyProfileId = () => {
      if (profile) {
        navigator.clipboard.writeText(profile.profile_number || profile.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
        toast.success("Profile ID copied!");
      }
    };
 
   const handleSaveProfile = async () => {
     if (!profile) return;
     setSaving(true);
 
     try {
       const { error } = await supabase
         .from("billing_profiles")
         .update({
           full_name: editName || null,
           phone_number: editPhone || null,
         })
         .eq("id", profile.id);
 
       if (error) throw error;
 
       setProfile({ ...profile, full_name: editName || null, phone_number: editPhone || null });
       setIsEditing(false);
       toast.success("Profile updated successfully");
     } catch (error: any) {
       console.error("Error updating profile:", error);
       toast.error(error.message || "Failed to update profile");
     } finally {
       setSaving(false);
     }
   };
 
   const handleCancelSubscription = async (subscriberId: string, subscriptionCode: string | null) => {
     if (!subscriptionCode) {
       toast.error("No subscription code found");
       return;
     }
 
     setCancellingSubscription(subscriberId);
 
     try {
       const { data, error } = await supabase.functions.invoke("cancel-subscription", {
         body: { subscription_code: subscriptionCode },
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       toast.success("Subscription cancelled successfully");
       fetchProfileData();
     } catch (error: any) {
       console.error("Error cancelling subscription:", error);
       toast.error(error.message || "Failed to cancel subscription");
     } finally {
       setCancellingSubscription(null);
     }
   };
 
   const handleCancelAllSubscriptions = async () => {
     const activePlans = plans.filter((p) => p.status === "active" && p.paystack_subscription_code);
 
     for (const plan of activePlans) {
       await handleCancelSubscription(plan.subscriber_id, plan.paystack_subscription_code);
     }
   };
 
   const handleRetryPayment = async (subscriberId: string) => {
     setRetryingPayment(subscriberId);
 
     try {
       const { data, error } = await supabase.functions.invoke("retry-failed-payments", {
         body: { subscriber_id: subscriberId },
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       toast.success("Payment retry initiated");
       fetchProfileData();
     } catch (error: any) {
       console.error("Error retrying payment:", error);
       toast.error(error.message || "Failed to retry payment");
     } finally {
       setRetryingPayment(null);
     }
   };
 
   const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
 
   const getStatusBadge = (status: string) => {
     const s = status.toLowerCase();
     if (s === "active" || s === "success" || s === "successful") {
       return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5 font-medium px-2.5">
         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
         {status === "active" ? "Active" : "Success"}
       </Badge>;
     }
     if (s === "cancelled" || s === "failed" || s === "payment_failed") {
       return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-50/50 border-red-500/20 gap-1.5 font-medium px-2.5">
         <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
         {s === "cancelled" ? "Cancelled" : "Failed"}
       </Badge>;
     }
     return <Badge variant="secondary" className="font-medium px-2.5 capitalize">{status}</Badge>;
   };
 
    if (loading) {
      return (
        <SidebarInset>
          <PremiumLoader message="Loading billing profile..." />
        </SidebarInset>
      );
    }
 
   if (!profile) {
     return null;
   }
 
   const activePlansCount = plans.filter((p) => p.status === "active").length;
   const failedPlans = plans.filter((p) => p.status === "payment_failed");
 
    return (
      <SidebarInset className="flex-1 bg-[#F8FAFC]">
           <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b border-border/40 bg-white/80 backdrop-blur-md px-6">
             <SidebarTrigger className="-ml-1" />
             <div className="h-4 w-[1px] bg-border/60 mx-2" />
             <div className="flex-1 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => navigate("/dashboard/billing-profiles")}
                   className="h-8 w-8 rounded-full hover:bg-slate-100"
                 >
                   <ArrowLeft className="h-4 w-4 text-slate-600" />
                 </Button>
                 <div>
                   <h1 className="text-sm font-semibold text-slate-900 leading-none">Billing Profile</h1>
                   <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase tracking-wider">
                     {profile.profile_number || profile.id.slice(0, 8)}
                   </p>
                 </div>
               </div>

               <div className="flex items-center gap-3">
                 <div className="hidden md:flex flex-col items-end mr-4">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Revenue</p>
                   <p className="text-sm font-semibold text-slate-900">{formatCurrency(totalSpend)}</p>
                 </div>
                 {canWrite && !isEditing && (
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => setIsEditing(true)}
                     className="h-9 px-4 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
                   >
                     <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-400" />
                     Manage Profile
                   </Button>
                 )}
               </div>
             </div>
           </header>
 
           <main className="flex-1 overflow-auto bg-slate-50/50">
             <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
               
               {/* Header Profile Section */}
               <div className="flex flex-col md:flex-row gap-6 items-start">
                 <div className="relative group">
                   <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white flex items-center justify-center border-2 border-slate-100 shadow-premium overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
                      <SubscriberAvatar className="h-full w-full" />
                   </div>
                   <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-2xl bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                   </div>
                 </div>

                 <div className="flex-1 min-w-0 pt-2">
                   <div className="flex flex-wrap items-center gap-3 mb-2">
                     <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                       {profile.full_name || "Unknown Customer"}
                     </h2>
                     <Badge className="bg-slate-900 text-white border-0 hover:bg-slate-800 font-mono text-[10px] px-2 py-0.5">
                       CUSTOMER
                     </Badge>
                   </div>
                   <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                     <div className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors cursor-pointer group" onClick={copyProfileId}>
                       <Mail className="h-4 w-4 opacity-70" />
                       <span className="text-sm font-medium">{profile.email}</span>
                       <Copy className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${copiedId ? 'text-emerald-500 opacity-100' : ''}`} />
                     </div>
                     {profile.phone_number && (
                       <div className="flex items-center gap-2 text-slate-500">
                         <Phone className="h-4 w-4 opacity-70" />
                         <span className="text-sm font-medium">{profile.phone_number}</span>
                       </div>
                     )}
                     <div className="flex items-center gap-2 text-slate-500">
                       <Calendar className="h-4 w-4 opacity-70" />
                       <span className="text-sm font-medium">Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                     </div>
                   </div>
                 </div>
               </div>
 
               {/* Stats Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                 <Card className="glass-card border-white/40 shadow-premium">
                   <CardContent className="p-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 border border-slate-100">
                       <Wallet className="h-5 w-5" />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Lifetime Value</p>
                       <p className="text-xl font-bold text-slate-900 leading-none">{formatCurrency(totalSpend)}</p>
                     </div>
                   </CardContent>
                 </Card>
 
                 <Card className="glass-card border-white/40 shadow-premium">
                   <CardContent className="p-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 border border-slate-100">
                       <CreditCard className="h-5 w-5" />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Subscriptions</p>
                       <p className="text-xl font-bold text-slate-900 leading-none">{plans.length}</p>
                     </div>
                   </CardContent>
                 </Card>
 
                 <Card className="glass-card border-white/40 shadow-premium">
                   <CardContent className="p-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 border border-slate-100">
                       <Activity className="h-5 w-5" />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Success Rate</p>
                       <div className="flex items-center gap-2">
                         <p className="text-xl font-bold text-slate-900">{successRate}%</p>
                         <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successRate}%` }} />
                         </div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
 
                 <Card className="glass-card border-white/40 shadow-premium">
                   <CardContent className="p-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 border border-slate-100">
                       <History className="h-5 w-5" />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Total Payments</p>
                       <p className="text-xl font-bold text-slate-900 leading-none">{transactions.length}</p>
                     </div>
                   </CardContent>
                 </Card>
               </div>
 
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Left Column: Details & Actions */}
                 <div className="lg:col-span-1 space-y-6">
                   {/* Information Card */}
                   <Card className="glass-card border-white/40 shadow-premium overflow-hidden">
                     <CardHeader className="p-6 pb-2">
                       <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                         <Info className="h-4 w-4 text-slate-400" />
                         Profile Information
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="p-6 pt-2 space-y-5">
                       {isEditing ? (
                         <div className="space-y-4">
                           <div>
                             <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Full Name</Label>
                             <Input
                               value={editName}
                               onChange={(e) => setEditName(e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 focus:ring-primary/20"
                             />
                           </div>
                           <div>
                             <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Phone Number</Label>
                             <Input
                               value={editPhone}
                               onChange={(e) => setEditPhone(e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 focus:ring-primary/20"
                             />
                           </div>
                           <div className="flex gap-2 pt-2">
                             <Button onClick={handleSaveProfile} disabled={saving} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                               {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                               Save
                             </Button>
                             <Button
                               variant="outline"
                               onClick={() => setIsEditing(false)}
                               className="flex-1"
                             >
                               Cancel
                             </Button>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-4 pt-2">
                            <div className="group cursor-default">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Display Name</p>
                               <p className="text-sm font-semibold text-slate-700">{profile.full_name || "—"}</p>
                            </div>
                            <div className="group cursor-default">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Contact Email</p>
                               <p className="text-sm font-semibold text-slate-700">{profile.email}</p>
                            </div>
                            <div className="group cursor-default">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Phone</p>
                               <p className="text-sm font-semibold text-slate-700">{profile.phone_number || "—"}</p>
                            </div>
                            <div className="group cursor-default pt-2 border-t border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Profile Reference</p>
                               <code className="text-[11px] font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                                 {profile.id}
                               </code>
                            </div>
                         </div>
                       )}
                     </CardContent>
                   </Card>

                   {/* Actions Card */}
                   {canWrite && (
                     <Card className="glass-card border-white/40 shadow-premium overflow-hidden">
                       <CardHeader className="p-6 pb-2">
                         <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                           <Shield className="h-4 w-4 text-slate-400" />
                           Internal Controls
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="p-6 pt-4 space-y-3">
                         <Button 
                           variant="outline" 
                           className="w-full justify-start h-11 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 gap-3 group transition-all"
                           onClick={() => {
                             toast.success("Synchronizing audit trails...");
                             setTimeout(() => fetchProfileData(), 1500);
                           }}
                         >
                           <RefreshCw className="h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                           Force Data Sync
                         </Button>
                         
                         <Button 
                           variant="outline" 
                           className="w-full justify-start h-11 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 gap-3 transition-all"
                           onClick={() => {
                             toast.info("Statement generator is preparing...");
                           }}
                         >
                           <Mail className="h-4 w-4 text-slate-900" />
                           Send Financial Statement
                         </Button>

                         {activePlansCount > 0 && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button 
                                 variant="ghost" 
                                 className="w-full justify-start h-11 text-xs font-semibold hover:bg-red-50 text-red-600 gap-3 transition-all"
                               >
                                 <XCircle className="h-4 w-4 text-red-500" />
                                 Terminate All Subscriptions
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent className="rounded-2xl border-red-100 shadow-2xl">
                               <AlertDialogHeader>
                                 <AlertDialogTitle className="text-xl font-bold text-slate-900">Immediate Termination?</AlertDialogTitle>
                                 <AlertDialogDescription className="text-slate-500">
                                   You are about to cancel <strong>{activePlansCount} active subscriptions</strong>. This will stop all future billing immediately. This action is logged for compliance.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter className="mt-4">
                                 <AlertDialogCancel className="rounded-xl border-slate-200">Abandon Action</AlertDialogCancel>
                                 <AlertDialogAction onClick={handleCancelAllSubscriptions} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
                                   Confirm Termination
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                       </CardContent>
                     </Card>
                   )}
                 </div>

                 {/* Right Column: Dynamic Data Tabs */}
                 <div className="lg:col-span-2 space-y-6">
                   <Tabs defaultValue="plans" className="w-full">
                     <div className="flex items-center justify-between mb-4 border-b border-slate-200">
                       <TabsList className="bg-transparent h-auto p-0 gap-8">
                         <TabsTrigger 
                           value="plans" 
                           className="bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-slate-900 transition-all"
                         >
                           Subscription Ledger
                         </TabsTrigger>
                         <TabsTrigger 
                           value="transactions" 
                           className="bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-slate-900 transition-all"
                         >
                           Payment History
                         </TabsTrigger>
                         <TabsTrigger 
                           value="spend" 
                           className="bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-slate-900 transition-all"
                         >
                           Revenue Analysis
                         </TabsTrigger>
                       </TabsList>
                     </div>
 
                     <TabsContent value="plans" className="mt-0 focus-visible:outline-none">
                       <Card className="glass-card border-white/40 shadow-premium overflow-hidden">
                         <CardContent className="p-0">
                           {plans.length === 0 ? (
                             <div className="text-center py-16 px-6">
                               <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                 <CreditCard className="h-8 w-8 text-slate-200" />
                               </div>
                               <h3 className="text-sm font-semibold text-slate-900 mb-1">No Subscription Activity</h3>
                               <p className="text-xs text-slate-500">This customer hasn't enrolled in any plans yet.</p>
                             </div>
                           ) : (
                             <div className="premium-table-container">
                               <Table className="premium-table">
                                 <TableHeader>
                                   <TableRow className="hover:bg-transparent border-0">
                                     <TableHead className="w-[200px]">Product / Plan</TableHead>
                                     <TableHead>Amount</TableHead>
                                     <TableHead>Status</TableHead>
                                     <TableHead>Next Bill</TableHead>
                                     {canWrite && <TableHead className="text-right">Actions</TableHead>}
                                   </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                   {plans.map((plan) => (
                                     <TableRow key={plan.subscriber_id} className="border-b border-slate-50 last:border-0 group">
                                       <TableCell className="py-4">
                                         <div>
                                           <p className="font-semibold text-slate-800 text-sm">{plan.name}</p>
                                           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{plan.interval}</p>
                                         </div>
                                       </TableCell>
                                       <TableCell className="font-semibold text-slate-900 py-4">
                                         {formatCurrency(plan.amount)}
                                       </TableCell>
                                       <TableCell className="py-4">
                                         {getStatusBadge(plan.status)}
                                       </TableCell>
                                       <TableCell className="text-slate-500 text-xs py-4">
                                         {plan.next_payment_date
                                           ? new Date(plan.next_payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                           : "Manual"}
                                       </TableCell>
                                       {canWrite && (
                                         <TableCell className="text-right py-4">
                                           <div className="flex justify-end gap-1.5">
                                             {plan.status === "payment_failed" && (
                                               <Button
                                                 variant="outline"
                                                 size="sm"
                                                 disabled={retryingPayment === plan.subscriber_id}
                                                 onClick={() => handleRetryPayment(plan.subscriber_id)}
                                                 className="h-8 text-[11px] font-bold border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all"
                                               >
                                                 {retryingPayment === plan.subscriber_id ? (
                                                   <Loader2 className="h-3 w-3 animate-spin" />
                                                 ) : (
                                                   <RefreshCw className="h-3 w-3 mr-1.5" />
                                                 )}
                                                 Retry
                                               </Button>
                                             )}
                                             {plan.status === "active" && plan.paystack_subscription_code && (
                                               <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                   <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     disabled={cancellingSubscription === plan.subscriber_id}
                                                     className="h-8 text-[11px] font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                   >
                                                     {cancellingSubscription === plan.subscriber_id ? (
                                                       <Loader2 className="h-3 w-3 animate-spin" />
                                                     ) : (
                                                       <XCircle className="h-3 w-3 mr-1.5" />
                                                     )}
                                                     Cancel
                                                   </Button>
                                                 </AlertDialogTrigger>
                                                 <AlertDialogContent className="rounded-2xl shadow-2xl">
                                                   <AlertDialogHeader>
                                                     <AlertDialogTitle className="text-xl font-extrabold">End Subscription?</AlertDialogTitle>
                                                     <AlertDialogDescription className="text-slate-500">
                                                       You are cancelling "{plan.name}". Service access will be revoked at the end of the billing cycle.
                                                     </AlertDialogDescription>
                                                   </AlertDialogHeader>
                                                   <AlertDialogFooter className="mt-4">
                                                     <AlertDialogCancel className="rounded-xl">Keep it Active</AlertDialogCancel>
                                                     <AlertDialogAction
                                                       onClick={() =>
                                                         handleCancelSubscription(
                                                           plan.subscriber_id,
                                                           plan.paystack_subscription_code
                                                         )
                                                        }
                                                       className="rounded-xl bg-red-600 hover:bg-red-700"
                                                     >
                                                       Confirm Cancellation
                                                     </AlertDialogAction>
                                                   </AlertDialogFooter>
                                                 </AlertDialogContent>
                                               </AlertDialog>
                                             )}
                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                               <ArrowUpRight className="h-3.5 w-3.5" />
                                             </Button>
                                           </div>
                                         </TableCell>
                                       )}
                                     </TableRow>
                                   ))}
                                 </TableBody>
                               </Table>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     </TabsContent>
 
                     <TabsContent value="transactions" className="mt-0 focus-visible:outline-none">
                       <Card className="glass-card border-white/40 shadow-premium overflow-hidden">
                         <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                           <div>
                              <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Verified History</CardTitle>
                           </div>
                           <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-slate-500">
                                <Filter className="h-3 w-3 mr-1.5" /> Filter
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-slate-500">
                                <Search className="h-3 w-3 mr-1.5" /> Search
                              </Button>
                           </div>
                         </CardHeader>
                         <CardContent className="p-0">
                           {transactions.length === 0 ? (
                             <div className="text-center py-16 px-6">
                               <History className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                               <h3 className="text-sm font-semibold text-slate-900 mb-1">No Transaction Logs</h3>
                               <p className="text-xs text-slate-500">All payment records for this profile will appear here.</p>
                             </div>
                           ) : (
                             <div className="premium-table-container">
                               <Table className="premium-table">
                                 <TableHeader>
                                   <TableRow className="hover:bg-transparent border-0">
                                     <TableHead>Execution Date</TableHead>
                                     <TableHead>Amount</TableHead>
                                     <TableHead>Status</TableHead>
                                     <TableHead>Ref / Trace ID</TableHead>
                                   </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                   {transactions.map((tx) => (
                                     <TableRow key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                       <TableCell className="py-4">
                                         <div>
                                           <p className="text-sm font-semibold text-slate-700 leading-none">
                                             {new Date(tx.paid_at || tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                           </p>
                                           <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                                             {new Date(tx.paid_at || tx.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                           </p>
                                         </div>
                                       </TableCell>
                                       <TableCell className="font-semibold text-slate-900 py-4">
                                         {formatCurrency(tx.amount)}
                                       </TableCell>
                                       <TableCell className="py-4">
                                         {getStatusBadge(tx.status)}
                                       </TableCell>
                                       <TableCell className="py-4">
                                         <div className="flex items-center gap-2">
                                           <code className="text-[10px] font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                                             {tx.paystack_reference?.slice(0, 12)}...
                                           </code>
                                           <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-slate-500">
                                             <Copy className="h-3 w-3" />
                                           </Button>
                                         </div>
                                       </TableCell>
                                     </TableRow>
                                   ))}
                                 </TableBody>
                               </Table>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     </TabsContent>
 
                     <TabsContent value="spend" className="mt-0 focus-visible:outline-none">
                       <Card className="glass-card border-white/40 shadow-premium overflow-hidden">
                         <CardContent className="p-0">
                           {Object.keys(spendByPlan).length === 0 ? (
                             <div className="text-center py-16 px-6">
                               <DollarSign className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                               <h3 className="text-sm font-semibold text-slate-900 mb-1">No Revenue Data</h3>
                               <p className="text-xs text-slate-500">Payment analysis will populate once transactions occur.</p>
                             </div>
                           ) : (
                             <div className="premium-table-container">
                               <Table className="premium-table">
                                 <TableHeader>
                                   <TableRow className="hover:bg-transparent border-0">
                                     <TableHead>Revenue Stream</TableHead>
                                     <TableHead className="text-right">Lifetime Attribution</TableHead>
                                   </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                   {Object.entries(spendByPlan).map(([planName, amount]) => (
                                     <TableRow key={planName} className="border-b border-slate-50 last:border-0">
                                       <TableCell className="py-4">
                                         <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                               <Wallet className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <span className="font-semibold text-slate-700 text-sm">{planName}</span>
                                         </div>
                                       </TableCell>
                                       <TableCell className="text-right font-bold text-slate-900 py-4">
                                         {formatCurrency(amount)}
                                       </TableCell>
                                     </TableRow>
                                   ))}
                                   <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 transition-none">
                                     <TableCell className="py-4 font-bold text-slate-900">Aggregate Total</TableCell>
                                     <TableCell className="text-right font-bold text-slate-900 py-4 text-lg">
                                       {formatCurrency(totalSpend)}
                                     </TableCell>
                                   </TableRow>
                                 </TableBody>
                               </Table>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     </TabsContent>
                   </Tabs>
                 </div>
               </div>
             </div>
           </main>
      </SidebarInset>
    );
 }