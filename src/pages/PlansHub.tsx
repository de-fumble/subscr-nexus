import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Repeat, Building2 } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/DashboardSkeleton";

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

const PlansHub = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      fetchPlansHubData();
    }
  }, [orgId]);

  const fetchPlansHubData = async () => {
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
        .eq("is_active", true)
        .eq("is_quick_payment", false)
        .order("amount", { ascending: true });

      setOneTimePayments(paymentsData || []);
    } catch (err) {
      console.error("Error fetching Plans Hub data:", err);
      setError("Failed to load Plans Hub");
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
    return <PageLoadingSkeleton />;
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Plans Hub Not Found</CardTitle>
            <CardDescription>
              {error || "This organization's Plans Hub could not be found."}
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
    <div className="fixed inset-0 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/30 via-background to-background overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 inset-x-0 h-64 bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Header with branding */}
      <header className="shrink-0 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-20 transition-all duration-300">
        <div className="container mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center gap-5">
            {organization.logo_url ? (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <img
                  src={organization.logo_url}
                  alt={organization.org_name}
                  className="relative h-14 w-14 md:h-16 md:w-16 rounded-full object-cover shadow-sm bg-background border border-border/50"
                />
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-background to-muted border border-border/50 flex items-center justify-center shadow-sm p-3 md:p-3.5">
                  <img src="/recurra-logo.svg" alt="Recurra Placeholder" className="h-full w-full rounded-full object-contain transition-all duration-300" />
                </div>
              </div>
            )}
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-foreground">{organization.org_name}</h1>
              <p className="text-sm md:text-base text-muted-foreground">Select a plan to continue</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 z-10 w-full flex flex-col">
        <div className="container mx-auto px-4 md:px-8 py-4 md:py-6 flex-1 flex flex-col">
          {!hasPlans && !hasPayments ? (
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-full max-w-md text-center py-12 border-border/40 bg-card/40 backdrop-blur-md shadow-2xl shadow-black/5">
                <CardContent className="pt-6">
                  <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6 transform rotate-3">
                    <Building2 className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">No Products Available</h2>
                  <p className="text-muted-foreground">
                    This organization hasn't configured any subscription plans or one-time payments yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
              <Tabs defaultValue={hasPlans ? "subscriptions" : "payments"} className="w-full">
                <div className="flex justify-center mb-6 md:mb-8">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
                    <TabsTrigger 
                      value="subscriptions" 
                      className="gap-2.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all" 
                      disabled={!hasPlans}
                    >
                      <Repeat className="h-4 w-4" />
                      Subscriptions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="payments" 
                      className="gap-2.5 rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all" 
                      disabled={!hasPayments}
                    >
                      <CreditCard className="h-4 w-4" />
                      One-Time
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="relative flex-1">
                  <TabsContent value="subscriptions" className="m-0 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-4 duration-500">
                    <div className="w-full pb-12 md:pb-16">
                      <div className="w-full mx-auto grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl items-stretch">
                        {plans.map((plan) => (
                          <Card 
                            key={plan.id} 
                            className="group relative flex flex-col overflow-visible bg-card/60 backdrop-blur-xl hover:bg-card/90 border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1.5 rounded-2xl"
                          >
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <CardHeader className="flex-none pb-3 relative z-10 px-6 md:px-8 pt-6">
                              <div className="flex items-start justify-between gap-4 mb-1">
                                <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{plan.name}</CardTitle>
                                {plan.category && (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                                    {plan.category}
                                  </Badge>
                                )}
                              </div>
                              {plan.description && (
                                <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 mt-2">{plan.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col relative z-10 px-6 md:px-8">
                              <div className="mb-5 flex items-baseline gap-1.5 mt-2">
                                <span className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground">
                                  {plan.currency === "NGN" ? "₦" : plan.currency}
                                  {plan.price.toLocaleString()}
                                </span>
                                <span className="text-sm md:text-base font-medium text-muted-foreground">/{getIntervalLabel(plan.interval)}</span>
                              </div>
                              <ul className="space-y-3 mb-4 flex-1">
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Billed automatically every {plan.interval}</span>
                                </li>
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Cancel at your convenience</span>
                                </li>
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Secure, encrypted payment processing</span>
                                </li>
                              </ul>
                            </CardContent>
                            <CardFooter className="flex-none pb-5 pt-3 px-6 md:px-8 relative z-10">
                              <Button 
                                onClick={() => handleSubscribe(plan.id)} 
                                className="w-full h-11 md:h-12 text-base font-bold transition-all shadow-md hover:shadow-xl group-hover:bg-primary/90 rounded-xl"
                              >
                                Subscribe Now
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="payments" className="m-0 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-4 duration-500">
                    <div className="w-full pb-12 md:pb-16">
                      <div className="w-full mx-auto grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl items-stretch">
                        {oneTimePayments.map((payment) => (
                          <Card 
                            key={payment.id} 
                            className="group relative flex flex-col overflow-visible bg-card/60 backdrop-blur-xl hover:bg-card/90 border-border/40 shadow-sm hover:shadow-2xl hover:shadow-accent/10 transition-all duration-500 hover:-translate-y-1.5 rounded-2xl"
                          >
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-accent/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <CardHeader className="flex-none pb-3 relative z-10 px-6 md:px-8 pt-6">
                              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{payment.name}</CardTitle>
                              {payment.description && (
                                <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 mt-2">{payment.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col relative z-10 px-6 md:px-8">
                              <div className="mb-5 flex items-baseline gap-2 mt-2">
                                <span className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground">
                                  {payment.currency === "NGN" ? "₦" : payment.currency}
                                  {payment.amount.toLocaleString()}
                                </span>
                                <Badge variant="outline" className="text-xs font-semibold border-border/60 text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  One-Time
                                </Badge>
                              </div>
                              <ul className="space-y-3 mb-4 flex-1">
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Single payment with no renewal</span>
                                </li>
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Zero recurring charges</span>
                                </li>
                                <li className="flex items-start gap-3.5 text-sm md:text-base text-foreground/80 font-medium">
                                  <div className="mt-0.5 rounded-full p-1 bg-green-500/10 text-green-500 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span>Secure checkout experience</span>
                                </li>
                              </ul>
                            </CardContent>
                            <CardFooter className="flex-none pb-5 pt-3 px-6 md:px-8 relative z-10">
                              <Button 
                                onClick={() => handlePay(payment.id)} 
                                variant="outline"
                                className="w-full h-11 md:h-12 text-base font-bold border-border/60 hover:bg-accent/10 hover:text-accent-foreground hover:border-accent/30 transition-all shadow-sm rounded-xl"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Checkout
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border/20 bg-background/40 backdrop-blur-xl z-20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/60 font-semibold tracking-wider flex items-center gap-1.5 uppercase">
            Powered by <span className="text-foreground/80">Recurra</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PlansHub;