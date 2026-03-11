import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Building2,
  LogOut,
  Loader2,
  Receipt,
  CheckCircle,
  User,
  RotateCcw,
  Home,
  Bell,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  MessageSquarePlus,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";
import { RefundRequestDialog } from "@/components/RefundRequestDialog";
import { AutomatePaymentDialog } from "@/components/AutomatePaymentDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  const [showBalance, setShowBalance] = useState(true);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Feature suggestion state
  const [featureSuggestion, setFeatureSuggestion] = useState("");
  const [submittingFeature, setSubmittingFeature] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);

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

  const submitFeatureSuggestion = async () => {
    if (!featureSuggestion.trim()) {
      toast.error("Please enter your feature suggestion");
      return;
    }

    setSubmittingFeature(true);
    try {
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
    // Reset theme to light mode on sign-out so the next login starts fresh
    localStorage.removeItem("vite-ui-theme");

    await supabase.auth.signOut();
    navigate("/auth");
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

        {/* Quick Actions Grid - 4 columns */}
        <Card className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-4 gap-3">
            {/* Find Organizations */}
            <button
              onClick={() => navigate("/find-organizations")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xs text-center font-medium">Find Orgs</span>
            </button>

            {/* Verify Transaction */}
            <button
              onClick={() => navigate("/verify-transaction")}
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

            {/* Automate Payment */}
            <AutomatePaymentDialog>
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <span className="text-xs text-center font-medium">Automate</span>
              </button>
            </AutomatePaymentDialog>
          </div>
        </Card>

        {/* Services Grid - 2 columns (Report & Suggest only) */}
        <Card className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-2 gap-3">
            {/* Report Issue */}
            <RefundRequestDialog userEmail={user?.email || ""}>
              <button className="flex flex-col items-center gap-1.5 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-xs text-center text-muted-foreground">Report Issue</span>
              </button>
            </RefundRequestDialog>

            {/* Suggest Feature */}
            <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center gap-1.5 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
                    <Lightbulb className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="text-xs text-center text-muted-foreground">Suggest Feature</span>
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
                onClick={() => navigate("/find-organizations")}
              >
                Find Organizations
              </Button>
            </Card>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 md:hidden z-50">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <button
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-accent"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => navigate("/find-organizations")}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </button>
          <button
            onClick={() => navigate("/verify-transaction")}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[10px]">Verify</span>
          </button>
          <button
            onClick={() => navigate("/user-settings")}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground"
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
