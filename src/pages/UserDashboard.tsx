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
  Menu,
  X,
  RotateCcw
} from "lucide-react";
import logoImage from "@/assets/logo.png";
import { RefundRequestDialog } from "@/components/RefundRequestDialog";

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
  paid_at: string | null;
  plan_name?: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Transaction verification state
  const [transactionRef, setTransactionRef] = useState("");
  const [verifyingTransaction, setVerifyingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if this is a user account (has user_type metadata)
      const userType = session.user.user_metadata?.user_type;
      if (userType !== "user") {
        // If they're an institution, redirect to institution dashboard
        navigate("/dashboard");
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

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

      if (data.status === "success") {
        setTransactionResult({
          reference: data.data.reference,
          amount: data.data.amount / 100,
          status: data.data.status,
          customer_email: data.data.customer?.email || "N/A",
          paid_at: data.data.paid_at,
          plan_name: data.data.plan?.name,
        });
      } else {
        toast.error(data.message || "Transaction not found");
      }
    } catch (error: any) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setVerifyingTransaction(false);
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
    if (status === "failed") return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="Recurra" 
                className="h-10 w-10 object-cover rounded-xl"
              />
              <span className="text-xl font-bold">Recurra</span>
            </div>
            
            <div className="flex items-center gap-4">
              <RefundRequestDialog userEmail={user?.email || ""}>
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Request Refund
                </Button>
              </RefundRequestDialog>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="max-w-[200px] truncate">{user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="Recurra" 
                className="h-8 w-8 object-cover rounded-lg"
              />
              <span className="text-lg font-bold">Recurra</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-2 space-y-3 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <RefundRequestDialog userEmail={user?.email || ""}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Request Refund
                </Button>
              </RefundRequestDialog>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome to Recurra</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Search for organizations and subscribe to their plans, or verify your transactions.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Organization Search Section */}
          <div className="space-y-6">
            <Card className="p-4 md:p-6 glass-card">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                Find Organizations
              </h2>
              
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by organization name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchOrganizations()}
                  className="flex-1"
                />
                <Button onClick={searchOrganizations} disabled={searchingOrgs}>
                  {searchingOrgs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {organizations.length > 0 && (
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => fetchOrgPlans(org)}
                      className={`w-full p-3 md:p-4 rounded-lg border transition-all text-left ${
                        selectedOrg?.id === org.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.org_name}
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
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

              {searchQuery && organizations.length === 0 && !searchingOrgs && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No organizations found matching "{searchQuery}"
                </p>
              )}
            </Card>

            {/* Plans Section */}
            {selectedOrg && (
              <Card className="p-4 md:p-6 glass-card">
                <div className="flex items-center gap-3 mb-4">
                  {selectedOrg.logo_url ? (
                    <img
                      src={selectedOrg.logo_url}
                      alt={selectedOrg.org_name}
                      className="h-10 md:h-12 w-10 md:w-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 md:h-12 w-10 md:w-12 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 md:h-6 w-5 md:w-6 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{selectedOrg.org_name}</h3>
                    <p className="text-sm text-muted-foreground">Available Plans</p>
                  </div>
                </div>

                {loadingPlans ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : plans.length > 0 ? (
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 md:p-4 rounded-lg border border-border bg-card/50"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{plan.name}</h4>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {plan.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">{plan.interval}</Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                          <p className="text-lg font-bold">
                            {plan.currency} {plan.price.toLocaleString()}
                            <span className="text-sm font-normal text-muted-foreground">
                              {getIntervalLabel(plan.interval)}
                            </span>
                          </p>
                          <Link to={`/subscribe/${plan.id}`} className="w-full sm:w-auto">
                            <Button size="sm" className="gap-2 w-full sm:w-auto">
                              <CreditCard className="h-4 w-4" />
                              Subscribe
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No active plans available
                  </p>
                )}
              </Card>
            )}
          </div>

          {/* Transaction Verification Section */}
          <div className="space-y-6">
            <Card className="p-4 md:p-6 glass-card">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent" />
                Verify Transaction
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your transaction reference to check the status of your payment.
              </p>

              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Enter transaction reference..."
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyTransaction()}
                  className="flex-1"
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
                <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    {getStatusIcon(transactionResult.status)}
                    <span className="font-medium capitalize">
                      {transactionResult.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reference</p>
                      <p className="font-mono text-xs md:text-sm break-all">{transactionResult.reference}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold">
                        ₦{transactionResult.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="truncate">{transactionResult.customer_email}</p>
                    </div>
                    {transactionResult.paid_at && (
                      <div>
                        <p className="text-muted-foreground">Paid At</p>
                        <p>{new Date(transactionResult.paid_at).toLocaleString()}</p>
                      </div>
                    )}
                    {transactionResult.plan_name && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-muted-foreground">Plan</p>
                        <p>{transactionResult.plan_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Tips */}
            <Card className="p-4 md:p-6 glass-card">
              <h3 className="font-semibold mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Search for organizations by their name to find available subscription plans.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Use your transaction reference from Paystack to verify payment status.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  All payments are securely processed through Paystack.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Need a refund? Click "Request Refund" to submit a complaint.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
