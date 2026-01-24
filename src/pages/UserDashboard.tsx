import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Building2, 
  CreditCard, 
  LogOut, 
  Loader2,
  ExternalLink,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RotateCcw,
  Download,
  Home,
  Bell,
  Settings,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Lightbulb,
  MessageSquarePlus,
  Eye,
  EyeOff,
  X
} from "lucide-react";
import logoImage from "@/assets/logo.png";
import { RefundRequestDialog } from "@/components/RefundRequestDialog";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFReceiptDocument } from "@/components/PDFReceiptDocument";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Organization {
  id: string;
  org_name: string;
  logo_url: string | null;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  currency: string;
}

interface TransactionResult {
  reference: string;
  amount: number;
  status: string;
  customer_email: string;
  customer_name?: string;
  paid_at: string | null;
  plan_name?: string;
  currency?: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  org_name: string;
  org_logo: string | null;
  amount: number;
  currency: string;
  next_payment_date: string | null;
  status: string;
}

const UserDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "verify" | "profile">("home");
  
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  
  // Transaction verification state
  const [transactionRef, setTransactionRef] = useState("");
  const [verifyingTransaction, setVerifyingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  // Feature suggestion state
  const [featureSuggestion, setFeatureSuggestion] = useState("");
  const [submittingFeature, setSubmittingFeature] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);

  // Search modal
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const userType = session.user.user_metadata?.user_type;
      if (userType !== "user") {
        navigate("/dashboard");
        return;
      }

      setUser(session.user);
      setLoading(false);
      fetchUserSubscriptions(session.user.email);
    };

    checkAuth();
  }, [navigate]);

  const fetchUserSubscriptions = async (email: string) => {
    if (!email) return;
    setLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from("subscribers")
        .select(`
          id,
          amount,
          status,
          next_payment_date,
          subscription_plans (
            name,
            currency,
            organizations (
              org_name,
              logo_url
            )
          )
        `)
        .eq("email", email)
        .in("status", ["active", "non-renewing"]);

      if (error) throw error;

      const mapped = (data || []).map((sub: any) => ({
        id: sub.id,
        plan_name: sub.subscription_plans?.name || "Unknown Plan",
        org_name: sub.subscription_plans?.organizations?.org_name || "Unknown Org",
        org_logo: sub.subscription_plans?.organizations?.logo_url || null,
        amount: sub.amount,
        currency: sub.subscription_plans?.currency || "NGN",
        next_payment_date: sub.next_payment_date,
        status: sub.status,
      }));

      setSubscriptions(mapped);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const searchOrganizations = async () => {
    if (!searchQuery.trim()) {
      setOrganizations([]);
      return;
    }

    setSearchingOrgs(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, org_name, logo_url, email")
        .ilike("org_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error searching organizations:", error);
      toast.error("Failed to search organizations");
    } finally {
      setSearchingOrgs(false);
    }
  };

  const fetchOrgPlans = async (org: Organization) => {
    setSelectedOrg(org);
    setOrganizations([]);
    setSearchQuery("");
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, interval, currency")
        .eq("org_id", org.id)
        .eq("is_active", true);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const verifyTransaction = async () => {
    if (!transactionRef.trim()) {
      toast.error("Please enter a transaction reference");
      return;
    }

    setVerifyingTransaction(true);
    setTransactionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-transaction", {
        body: { reference: transactionRef },
      });

      if (error) throw error;

      if (data.transaction) {
        setTransactionResult({
          reference: data.transaction.reference,
          amount: data.transaction.amount / 100,
          status: data.transaction.status,
          customer_email: data.transaction.customer_email || "N/A",
          customer_name: data.transaction.customer_name || "N/A",
          paid_at: data.transaction.paid_at,
          plan_name: data.transaction.plan,
          currency: data.transaction.currency || "NGN",
        });
      } else {
        toast.error(data.message || data.error || "Transaction not found");
      }
    } catch (error: any) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setVerifyingTransaction(false);
    }
  };

  const submitFeatureSuggestion = async () => {
    if (!featureSuggestion.trim()) {
      toast.error("Please enter your feature suggestion");
      return;
    }

    setSubmittingFeature(true);
    try {
      // For now, we'll just show a success message
      // In the future, this could save to a database table
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Thank you! Your suggestion has been submitted.");
      setFeatureSuggestion("");
      setFeatureDialogOpen(false);
    } catch (error) {
      toast.error("Failed to submit suggestion");
    } finally {
      setSubmittingFeature(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      daily: "/ day",
      weekly: "/ week",
      monthly: "/ month",
      quarterly: "/ quarter",
      biannually: "/ 6 months",
      annually: "/ year",
    };
    return labels[interval] || `/ ${interval}`;
  };

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === "failed") return <XCircle className="h-5 w-5 text-destructive" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getDaysUntilBilling = (nextPaymentDate: string | null) => {
    if (!nextPaymentDate) return null;
    const next = new Date(nextPaymentDate);
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto md:max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hi,</p>
              <p className="font-semibold text-foreground">{userName.toUpperCase()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-[10px] text-destructive-foreground rounded-full flex items-center justify-center">
                {subscriptions.length}
              </span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto md:max-w-4xl space-y-4">
        {/* Summary Card */}
        <Card className="p-4 bg-accent text-accent-foreground rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Active Subscriptions</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent-foreground/10"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent-foreground/10 gap-1 text-sm"
              onClick={() => setActiveTab("home")}
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold tracking-tight">
                {showBalance ? subscriptions.length : "••••"}
              </p>
              <p className="text-sm text-accent-foreground/70 mt-1">
                Organizations
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Actions Grid - 3 columns like reference */}
        <Card className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-3 gap-4">
            {/* Search Organizations */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xs text-center font-medium">Find Orgs</span>
            </button>

            {/* Verify Transaction */}
            <button
              onClick={() => setActiveTab("verify")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xs text-center font-medium">Verify</span>
            </button>

            {/* Request Refund */}
            <RefundRequestDialog userEmail={user?.email || ""}>
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <RotateCcw className="h-6 w-6 text-destructive" />
                </div>
                <span className="text-xs text-center font-medium">Refund</span>
              </button>
            </RefundRequestDialog>
          </div>
        </Card>

        {/* Services Grid - 4 columns like reference */}
        <Card className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-4 gap-3">
            {/* Report Issue */}
            <RefundRequestDialog userEmail={user?.email || ""}>
              <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-foreground" />
                  </div>
                </div>
                <span className="text-[10px] text-center text-muted-foreground">Report</span>
              </button>
            </RefundRequestDialog>

            {/* Transaction History (Verify) */}
            <button
              onClick={() => setActiveTab("verify")}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground">Transactions</span>
            </button>

            {/* Subscriptions */}
            <button
              onClick={() => setActiveTab("home")}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Calendar className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground">Billing</span>
            </button>

            {/* Suggest Feature */}
            <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground">Suggest</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-accent" />
                    Suggest a Feature
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Your Suggestion</Label>
                    <Textarea
                      placeholder="Tell us what feature you'd like to see..."
                      value={featureSuggestion}
                      onChange={(e) => setFeatureSuggestion(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={submitFeatureSuggestion}
                    disabled={submittingFeature || !featureSuggestion.trim()}
                    className="w-full"
                  >
                    {submittingFeature ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Suggestion"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Active Subscriptions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Your Subscriptions</h2>
            <span className="text-xs text-muted-foreground">{subscriptions.length} active</span>
          </div>

          {loadingSubscriptions ? (
            <Card className="p-6 rounded-2xl glass-card flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </Card>
          ) : subscriptions.length > 0 ? (
            <div className="space-y-2">
              {subscriptions.map((sub) => {
                const daysUntil = getDaysUntilBilling(sub.next_payment_date);
                return (
                  <Card key={sub.id} className="p-4 rounded-2xl glass-card">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {sub.org_logo ? (
                          <img src={sub.org_logo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sub.plan_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.org_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">
                          {sub.currency} {sub.amount.toLocaleString()}
                        </p>
                        {daysUntil !== null && (
                          <Badge 
                            variant={daysUntil <= 3 ? "destructive" : "secondary"}
                            className="text-[10px] mt-1"
                          >
                            {daysUntil <= 0 ? "Due today" : `${daysUntil}d left`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 rounded-2xl glass-card text-center">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No active subscriptions</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSearchModalOpen(true)}
              >
                Find Organizations
              </Button>
            </Card>
          )}
        </div>

        {/* Transaction Verification Section (shown when activeTab is verify) */}
        {activeTab === "verify" && (
          <Card className="p-4 rounded-2xl glass-card space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-accent" />
              <h2 className="font-semibold">Verify Transaction</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your transaction reference to check payment status.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Transaction reference..."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyTransaction()}
              />
              <Button onClick={verifyTransaction} disabled={verifyingTransaction}>
                {verifyingTransaction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            {transactionResult && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(transactionResult.status)}
                  <span className="font-medium capitalize">{transactionResult.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Reference</p>
                    <p className="font-mono text-xs break-all">{transactionResult.reference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="font-semibold">₦{transactionResult.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="truncate text-xs">{transactionResult.customer_email}</p>
                  </div>
                  {transactionResult.paid_at && (
                    <div>
                      <p className="text-muted-foreground text-xs">Paid At</p>
                      <p className="text-xs">{new Date(transactionResult.paid_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {transactionResult.status === "success" && transactionResult.paid_at && (
                  <PDFDownloadLink
                    document={
                      <PDFReceiptDocument
                        reference={transactionResult.reference}
                        amount={transactionResult.amount}
                        currency={transactionResult.currency || "NGN"}
                        status={transactionResult.status}
                        customerName={transactionResult.customer_name || "N/A"}
                        customerEmail={transactionResult.customer_email}
                        paidAt={transactionResult.paid_at}
                        plan={transactionResult.plan_name || "N/A"}
                        organizationName="Recurra"
                      />
                    }
                    fileName={`receipt-${transactionResult.reference}.pdf`}
                    className="w-full"
                  >
                    {({ loading }) => (
                      <Button variant="outline" className="w-full gap-2" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Download Receipt
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
              </div>
            )}
          </Card>
        )}
      </main>

      {/* Search Organizations Modal */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Find Organizations
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by organization name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchOrganizations()}
              />
              <Button onClick={searchOrganizations} disabled={searchingOrgs}>
                {searchingOrgs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {organizations.length > 0 && !selectedOrg && (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => fetchOrgPlans(org)}
                    className="w-full p-3 rounded-xl border border-border hover:border-accent/50 hover:bg-muted/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-accent" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{org.org_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{org.email}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedOrg && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10">
                  {selectedOrg.logo_url ? (
                    <img src={selectedOrg.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{selectedOrg.org_name}</p>
                    <p className="text-xs text-muted-foreground">Available Plans</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedOrg(null);
                      setPlans([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {loadingPlans ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : plans.length > 0 ? (
                  <div className="space-y-2">
                    {plans.map((plan) => (
                      <div key={plan.id} className="p-3 rounded-xl border border-border bg-card/50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{plan.name}</h4>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs">{plan.interval}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="font-bold">
                            {plan.currency} {plan.price.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">{getIntervalLabel(plan.interval)}</span>
                          </p>
                          <Link to={`/subscribe/${plan.id}`}>
                            <Button size="sm" className="gap-1.5">
                              <CreditCard className="h-3.5 w-3.5" />
                              Subscribe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">No active plans available</p>
                )}
              </div>
            )}

            {searchQuery && organizations.length === 0 && !searchingOrgs && !selectedOrg && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No organizations found matching "{searchQuery}"
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 md:hidden z-50">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === "home" ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => setSearchModalOpen(true)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === "search" ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === "verify" ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[10px]">Verify</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === "profile" ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Me</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default UserDashboard;
