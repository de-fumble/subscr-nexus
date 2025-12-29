import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Repeat, Building2 } from "lucide-react";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  currency: string;
  category: string | null;
}

interface OneTimePayment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
}

const Store = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      fetchStoreData();
    }
  }, [orgId]);

  const fetchStoreData = async () => {
    try {
      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("id", orgId)
        .single();

      if (orgError || !orgData) {
        setError("Organization not found");
        setLoading(false);
        return;
      }

      setOrganization(orgData);

      // Fetch active subscription plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, interval, currency, category")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      setPlans(plansData || []);

      // Fetch one-time payments
      const { data: paymentsData } = await supabase
        .from("one_time_payments")
        .select("id, name, description, amount, currency")
        .eq("org_id", orgId)
        .order("amount", { ascending: true });

      setOneTimePayments(paymentsData || []);
    } catch (err) {
      console.error("Error fetching store data:", err);
      setError("Failed to load store");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (planId: string) => {
    navigate(`/subscribe/${planId}`);
  };

  const handlePay = (paymentId: string) => {
    navigate(`/pay/${paymentId}`);
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case "daily": return "day";
      case "weekly": return "week";
      case "monthly": return "month";
      case "quarterly": return "quarter";
      case "annually": return "year";
      default: return interval;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Store Not Found</CardTitle>
            <CardDescription>
              {error || "This organization's store could not be found."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate("/")} variant="outline">
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const hasPlans = plans.length > 0;
  const hasPayments = oneTimePayments.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header with branding */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.org_name}
                className="h-16 w-16 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
                <Building2 className="h-8 w-8 text-accent-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{organization.org_name}</h1>
              <p className="text-muted-foreground">Choose a plan or make a payment</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {!hasPlans && !hasPayments ? (
          <Card className="text-center py-16">
            <CardContent>
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Products Available</h2>
              <p className="text-muted-foreground">
                This organization hasn't set up any plans or payments yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={hasPlans ? "subscriptions" : "payments"} className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="subscriptions" className="gap-2" disabled={!hasPlans}>
                <Repeat className="h-4 w-4" />
                Subscriptions
                {hasPlans && <Badge variant="secondary" className="ml-1">{plans.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2" disabled={!hasPayments}>
                <CreditCard className="h-4 w-4" />
                One-Time
                {hasPayments && <Badge variant="secondary" className="ml-1">{oneTimePayments.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Subscription Plans</h2>
                <p className="text-muted-foreground">Choose a plan that fits your needs</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan, index) => (
                  <Card 
                    key={plan.id} 
                    className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 ${
                      index === 1 ? 'border-accent shadow-lg scale-105 z-10' : ''
                    }`}
                  >
                    {index === 1 && (
                      <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                        Popular
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        {plan.category && (
                          <Badge variant="outline">{plan.category}</Badge>
                        )}
                      </div>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-foreground">
                          {plan.currency === "NGN" ? "₦" : plan.currency}
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">/{getIntervalLabel(plan.interval)}</span>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          Billed {plan.interval}
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          Cancel anytime
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          Secure payment via Paystack
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => handleSubscribe(plan.id)} 
                        className={`w-full ${index === 1 ? 'bg-accent hover:bg-accent/90' : ''}`}
                        variant={index === 1 ? 'default' : 'outline'}
                      >
                        Subscribe Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">One-Time Payments</h2>
                <p className="text-muted-foreground">Make a single payment - no recurring charges</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {oneTimePayments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl">{payment.name}</CardTitle>
                      {payment.description && (
                        <CardDescription>{payment.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-foreground">
                          {payment.currency === "NGN" ? "₦" : payment.currency}
                          {payment.amount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground ml-2">one-time</span>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          Single payment only
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          No recurring charges
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          Secure payment via Paystack
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => handlePay(payment.id)} 
                        className="w-full"
                        variant="outline"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>Powered by SecurePayments</p>
        </div>
      </footer>
    </div>
  );
};

export default Store;
