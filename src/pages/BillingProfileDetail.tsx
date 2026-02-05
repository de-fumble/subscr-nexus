 import { useEffect, useState } from "react";
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
   RefreshCw,
   Loader2,
   Copy,
   CheckCircle,
   AlertTriangle,
   Edit2,
   Save,
   X,
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
 import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
 import { AppSidebar } from "@/components/AppSidebar";
 import { BackButton } from "@/components/BackButton";
 
 interface BillingProfile {
   id: string;
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
         amount: s.amount,
         interval: s.subscription_plans.interval,
         status: s.status,
         created_at: s.created_at,
         next_payment_date: s.next_payment_date,
         paystack_subscription_code: s.paystack_subscription_code,
       }));
 
       setPlans(formattedPlans);
 
       // Fetch transactions for this profile in this org
       const subscriberIds = (subscribers || []).map((s: any) => s.id);
 
       if (subscriberIds.length > 0) {
         const { data: txData, error: txError } = await supabase
           .from("transactions")
           .select(`
             id,
             amount,
             status,
             paystack_reference,
             created_at,
             paid_at,
             subscribers!inner (
               subscription_plans!inner (name)
             )
           `)
           .in("subscriber_id", subscriberIds)
           .order("created_at", { ascending: false });
 
         if (txError) throw txError;
 
         const formattedTx: Transaction[] = (txData || []).map((t: any) => ({
           id: t.id,
           amount: t.amount,
           status: t.status,
           paystack_reference: t.paystack_reference,
           created_at: t.created_at,
           paid_at: t.paid_at,
           plan_name: t.subscribers?.subscription_plans?.name || "Unknown",
         }));
 
         setTransactions(formattedTx);
 
         // Calculate spend
         const successfulTx = formattedTx.filter((t) => t.status === "success");
         const total = successfulTx.reduce((sum, t) => sum + t.amount, 0);
         setTotalSpend(total);
 
         // Spend by plan
         const byPlan: Record<string, number> = {};
         successfulTx.forEach((t) => {
           byPlan[t.plan_name] = (byPlan[t.plan_name] || 0) + t.amount;
         });
         setSpendByPlan(byPlan);
       }
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
       navigator.clipboard.writeText(profile.id);
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
     switch (status.toLowerCase()) {
       case "active":
         return <Badge variant="default">Active</Badge>;
       case "cancelled":
         return <Badge variant="destructive">Cancelled</Badge>;
       case "payment_failed":
         return <Badge variant="destructive">Payment Failed</Badge>;
       case "success":
         return <Badge variant="default">Success</Badge>;
       case "failed":
         return <Badge variant="destructive">Failed</Badge>;
       default:
         return <Badge variant="secondary">{status}</Badge>;
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
                 <p className="text-muted-foreground">Loading billing profile...</p>
               </div>
             </div>
           </SidebarInset>
         </div>
       </SidebarProvider>
     );
   }
 
   if (!profile) {
     return null;
   }
 
   const activePlansCount = plans.filter((p) => p.status === "active").length;
   const failedPlans = plans.filter((p) => p.status === "payment_failed");
 
   return (
     <SidebarProvider defaultOpen={true}>
       <div className="flex min-h-screen w-full bg-background">
         <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
         <SidebarInset className="flex-1">
           <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
             <SidebarTrigger />
             <BackButton />
             <div className="flex-1">
               <h1 className="text-xl font-bold text-foreground">Billing Profile</h1>
             </div>
           </header>
 
           <main className="flex-1 overflow-auto">
             <div className="container mx-auto px-6 py-8 space-y-8">
               {/* Profile Summary Card */}
               <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                         <User className="h-7 w-7 text-accent" />
                       </div>
                       <div>
                         <CardTitle className="text-2xl">
                           {profile.full_name || profile.email}
                         </CardTitle>
                         <CardDescription className="flex items-center gap-2 mt-1">
                           <code className="text-xs bg-muted px-2 py-1 rounded">
                             {profile.id}
                           </code>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6"
                             onClick={copyProfileId}
                           >
                             {copiedId ? (
                               <CheckCircle className="h-3 w-3 text-green-500" />
                             ) : (
                               <Copy className="h-3 w-3" />
                             )}
                           </Button>
                         </CardDescription>
                       </div>
                     </div>
                     {canWrite && !isEditing && (
                       <Button variant="outline" onClick={() => setIsEditing(true)}>
                         <Edit2 className="h-4 w-4 mr-2" />
                         Edit Profile
                       </Button>
                     )}
                   </div>
                 </CardHeader>
                 <CardContent>
                   {isEditing ? (
                     <div className="space-y-4 max-w-md">
                       <div>
                         <Label htmlFor="name">Full Name</Label>
                         <Input
                           id="name"
                           value={editName}
                           onChange={(e) => setEditName(e.target.value)}
                           placeholder="Enter full name"
                         />
                       </div>
                       <div>
                         <Label htmlFor="phone">Phone Number</Label>
                         <Input
                           id="phone"
                           value={editPhone}
                           onChange={(e) => setEditPhone(e.target.value)}
                           placeholder="Enter phone number"
                         />
                       </div>
                       <div className="flex gap-2">
                         <Button onClick={handleSaveProfile} disabled={saving}>
                           {saving ? (
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           ) : (
                             <Save className="h-4 w-4 mr-2" />
                           )}
                           Save Changes
                         </Button>
                         <Button
                           variant="outline"
                           onClick={() => {
                             setIsEditing(false);
                             setEditName(profile.full_name || "");
                             setEditPhone(profile.phone_number || "");
                           }}
                         >
                           <X className="h-4 w-4 mr-2" />
                           Cancel
                         </Button>
                       </div>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="flex items-center gap-3">
                         <Mail className="h-5 w-5 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Email</p>
                           <p className="font-medium">{profile.email}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <Phone className="h-5 w-5 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Phone</p>
                           <p className="font-medium">{profile.phone_number || "—"}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <Calendar className="h-5 w-5 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Created</p>
                           <p className="font-medium">
                             {new Date(profile.created_at).toLocaleDateString()}
                           </p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <CreditCard className="h-5 w-5 text-muted-foreground" />
                         <div>
                           <p className="text-sm text-muted-foreground">Active Plans</p>
                           <p className="font-medium">{activePlansCount}</p>
                         </div>
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
 
               {/* Spend Summary */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="glass-card border-0">
                   <CardContent className="pt-6">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                         <DollarSign className="h-5 w-5 text-green-500" />
                       </div>
                       <div>
                         <p className="text-sm text-muted-foreground">Total Lifetime Spend</p>
                         <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
                 <Card className="glass-card border-0">
                   <CardContent className="pt-6">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                         <CreditCard className="h-5 w-5 text-blue-500" />
                       </div>
                       <div>
                         <p className="text-sm text-muted-foreground">Total Plans</p>
                         <p className="text-2xl font-bold">{plans.length}</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
                 <Card className="glass-card border-0">
                   <CardContent className="pt-6">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                         <History className="h-5 w-5 text-purple-500" />
                       </div>
                       <div>
                         <p className="text-sm text-muted-foreground">Total Transactions</p>
                         <p className="text-2xl font-bold">{transactions.length}</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>
 
               {/* Staff Actions */}
               {canWrite && (
                 <Card className="glass-card border-0 border-l-4 border-l-orange-500">
                   <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                       <AlertTriangle className="h-5 w-5 text-orange-500" />
                       Staff Actions
                     </CardTitle>
                     <CardDescription>
                       Manage subscriptions for this billing profile
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="flex flex-wrap gap-3">
                     {activePlansCount > 1 && (
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button variant="destructive">
                             <XCircle className="h-4 w-4 mr-2" />
                             Cancel All Subscriptions
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Cancel All Subscriptions?</AlertDialogTitle>
                             <AlertDialogDescription>
                               This will cancel all {activePlansCount} active subscriptions for this
                               billing profile. This action cannot be undone.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Keep Subscriptions</AlertDialogCancel>
                             <AlertDialogAction onClick={handleCancelAllSubscriptions}>
                               Cancel All
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     )}
                     {failedPlans.length > 0 && (
                       <div className="text-sm text-muted-foreground">
                         {failedPlans.length} plan(s) have failed payments - retry from the Plans
                         tab below
                       </div>
                     )}
                   </CardContent>
                 </Card>
               )}
 
               {/* Tabs for Plans and Transactions */}
               <Tabs defaultValue="plans" className="space-y-4">
                 <TabsList>
                   <TabsTrigger value="plans">Plan History ({plans.length})</TabsTrigger>
                   <TabsTrigger value="transactions">
                     Payment History ({transactions.length})
                   </TabsTrigger>
                   <TabsTrigger value="spend">Spend by Plan</TabsTrigger>
                 </TabsList>
 
                 <TabsContent value="plans">
                   <Card className="glass-card border-0">
                     <CardContent className="pt-6">
                       {plans.length === 0 ? (
                         <div className="text-center py-8">
                           <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                           <p className="text-muted-foreground">No plans found</p>
                         </div>
                       ) : (
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Plan Name</TableHead>
                               <TableHead>Amount</TableHead>
                               <TableHead>Interval</TableHead>
                               <TableHead>Status</TableHead>
                               <TableHead>Start Date</TableHead>
                               <TableHead>Next Charge</TableHead>
                               {canWrite && <TableHead className="text-right">Actions</TableHead>}
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {plans.map((plan) => (
                               <TableRow key={plan.subscriber_id}>
                                 <TableCell className="font-medium">{plan.name}</TableCell>
                                 <TableCell>{formatCurrency(plan.amount)}</TableCell>
                                 <TableCell className="capitalize">{plan.interval}</TableCell>
                                 <TableCell>{getStatusBadge(plan.status)}</TableCell>
                                 <TableCell>
                                   {new Date(plan.created_at).toLocaleDateString()}
                                 </TableCell>
                                 <TableCell>
                                   {plan.next_payment_date
                                     ? new Date(plan.next_payment_date).toLocaleDateString()
                                     : "—"}
                                 </TableCell>
                                 {canWrite && (
                                   <TableCell className="text-right space-x-2">
                                     {plan.status === "payment_failed" && (
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         disabled={retryingPayment === plan.subscriber_id}
                                         onClick={() => handleRetryPayment(plan.subscriber_id)}
                                       >
                                         {retryingPayment === plan.subscriber_id ? (
                                           <Loader2 className="h-4 w-4 animate-spin" />
                                         ) : (
                                           <RefreshCw className="h-4 w-4 mr-1" />
                                         )}
                                         Retry
                                       </Button>
                                     )}
                                     {plan.status === "active" && plan.paystack_subscription_code && (
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <Button
                                             variant="destructive"
                                             size="sm"
                                             disabled={cancellingSubscription === plan.subscriber_id}
                                           >
                                             {cancellingSubscription === plan.subscriber_id ? (
                                               <Loader2 className="h-4 w-4 animate-spin" />
                                             ) : (
                                               <XCircle className="h-4 w-4 mr-1" />
                                             )}
                                             Cancel
                                           </Button>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                           <AlertDialogHeader>
                                             <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                             <AlertDialogDescription>
                                               This will cancel the subscription to "{plan.name}".
                                               The customer will no longer be charged.
                                             </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                             <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                             <AlertDialogAction
                                               onClick={() =>
                                                 handleCancelSubscription(
                                                   plan.subscriber_id,
                                                   plan.paystack_subscription_code
                                                 )
                                               }
                                             >
                                               Cancel Subscription
                                             </AlertDialogAction>
                                           </AlertDialogFooter>
                                         </AlertDialogContent>
                                       </AlertDialog>
                                     )}
                                   </TableCell>
                                 )}
                               </TableRow>
                             ))}
                           </TableBody>
                         </Table>
                       )}
                     </CardContent>
                   </Card>
                 </TabsContent>
 
                 <TabsContent value="transactions">
                   <Card className="glass-card border-0">
                     <CardContent className="pt-6">
                       {transactions.length === 0 ? (
                         <div className="text-center py-8">
                           <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                           <p className="text-muted-foreground">No transactions found</p>
                         </div>
                       ) : (
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Date</TableHead>
                               <TableHead>Plan</TableHead>
                               <TableHead>Amount</TableHead>
                               <TableHead>Status</TableHead>
                               <TableHead>Reference</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {transactions.map((tx) => (
                               <TableRow key={tx.id}>
                                 <TableCell>
                                   {new Date(tx.paid_at || tx.created_at).toLocaleDateString()}
                                 </TableCell>
                                 <TableCell>{tx.plan_name}</TableCell>
                                 <TableCell>{formatCurrency(tx.amount)}</TableCell>
                                 <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                 <TableCell>
                                   <code className="text-xs bg-muted px-2 py-1 rounded">
                                     {tx.paystack_reference}
                                   </code>
                                 </TableCell>
                               </TableRow>
                             ))}
                           </TableBody>
                         </Table>
                       )}
                     </CardContent>
                   </Card>
                 </TabsContent>
 
                 <TabsContent value="spend">
                   <Card className="glass-card border-0">
                     <CardContent className="pt-6">
                       {Object.keys(spendByPlan).length === 0 ? (
                         <div className="text-center py-8">
                           <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                           <p className="text-muted-foreground">No spend data yet</p>
                         </div>
                       ) : (
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Plan Name</TableHead>
                               <TableHead className="text-right">Total Spent</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {Object.entries(spendByPlan).map(([planName, amount]) => (
                               <TableRow key={planName}>
                                 <TableCell className="font-medium">{planName}</TableCell>
                                 <TableCell className="text-right font-medium">
                                   {formatCurrency(amount)}
                                 </TableCell>
                               </TableRow>
                             ))}
                             <TableRow className="bg-muted/50">
                               <TableCell className="font-bold">Total</TableCell>
                               <TableCell className="text-right font-bold">
                                 {formatCurrency(totalSpend)}
                               </TableCell>
                             </TableRow>
                           </TableBody>
                         </Table>
                       )}
                     </CardContent>
                   </Card>
                 </TabsContent>
               </Tabs>
             </div>
           </main>
         </SidebarInset>
       </div>
     </SidebarProvider>
   );
 }