import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Building2, Shield, Zap, Lock, ChevronRight, CheckCircle2 } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/DashboardSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  features?: string[] | null;
}

interface OneTimePayment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  features?: string[] | null;
}

const INTERVAL_MAP: Record<string, string> = {
  daily: "day", weekly: "week", monthly: "month",
  quarterly: "quarter", annually: "year",
};

const PlansHub = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) fetchPlansHubData();
  }, [orgId]);

  const fetchPlansHubData = async () => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations").select("id, org_name, email, logo_url").eq("id", orgId).single();
      if (orgError || !orgData) { setError("Organization not found"); setLoading(false); return; }
      setOrganization(orgData);

      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, interval, currency, category, features")
        .eq("org_id", orgId).eq("is_active", true).order("price", { ascending: true });
      setPlans(plansData || []);

      const { data: paymentsData } = await supabase
        .from("one_time_payments")
        .select("id, name, description, amount, currency, features")
        .eq("org_id", orgId).eq("is_active", true).eq("is_quick_payment", false)
        .order("amount", { ascending: true });
      setOneTimePayments(paymentsData || []);

    } catch {
      setError("Failed to load Plans Hub");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoadingSkeleton />;

  if (error || !organization) {
    return (
      <div className="min-h-[100dvh] bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 max-w-sm w-full">
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">Hub Not Found</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">{error || "This organization's Plans Hub could not be found."}</p>
          <Button onClick={() => navigate("/")} className="w-full h-11 rounded-xl text-sm font-medium">Return Home</Button>
        </div>
      </div>
    );
  }

  const hasPlans = plans.length > 0;
  const hasPayments = oneTimePayments.length > 0;
  const formatCurrency = (val: number, currency: string) =>
    `${currency === "NGN" ? "₦" : currency}${val.toLocaleString()}`;

  const defaultTab = hasPlans ? "subscriptions" : "payments";

  return (
    <div className="min-h-[100dvh] bg-slate-50/80 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden">
      
      {/* Subtle ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[50%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[80px]" />
      </div>

      {/* Modal Container */}
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden relative z-10 flex flex-col max-h-[95dvh] sm:max-h-[90dvh]">
        
        {/* Header - Stays sticky at top of modal */}
        <header className="px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.org_name}
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-100"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {organization.org_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-sm font-medium text-slate-900">{organization.org_name}</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto premium-scrollbar p-6 sm:p-10 relative">
          
          <div className="text-center mb-10 max-w-xl mx-auto">
            <Badge className="mb-4 px-3 py-1 bg-accent/10 hover:bg-accent/10 text-accent font-medium uppercase tracking-widest text-[10px] border-none shadow-none rounded-full">
              {hasPlans && hasPayments ? "Plans & Payments" : hasPlans ? "Subscription Plans" : "One-Time Payments"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-medium text-slate-900 tracking-tight mb-4 leading-tight">
              Choose the perfect plan
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
              Transparent pricing, advanced features, and bank-grade security. Scale effortlessly with zero hidden fees.
            </p>
          </div>

          {!hasPlans && !hasPayments ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center max-w-sm w-full">
                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <CreditCard className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No products available</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  This organization hasn't configured any plans yet.
                </p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="w-full">
              {hasPlans && hasPayments && (
                <div className="flex justify-center mb-10">
                  <div className="inline-flex items-center p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    <TabsList className="bg-transparent h-auto p-0 border-none">
                      <TabsTrigger 
                        value="subscriptions" 
                        className="px-5 py-2 rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all duration-300"
                      >
                        Subscriptions
                      </TabsTrigger>
                      <TabsTrigger 
                        value="payments" 
                        className="px-5 py-2 rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all duration-300"
                      >
                        One-Time
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              )}

              <TabsContent value="subscriptions" className="m-0 focus-visible:outline-none">
                <div className={`grid gap-5 items-start ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {plans.map((plan, index) => {
                    const isFeatured = plans.length >= 3 && index === Math.floor(plans.length / 2);
                    
                    return (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col rounded-3xl transition-all duration-300 group ${
                          isFeatured
                            ? "bg-white border-2 border-accent shadow-xl shadow-accent/5 sm:scale-[1.03] z-10"
                            : "bg-slate-50/50 border border-slate-200 hover:bg-white hover:shadow-lg hover:border-slate-300 z-0"
                        }`}
                      >
                        {isFeatured && (
                          <div className="absolute -top-4 left-0 right-0 flex justify-center">
                            <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                              <Zap className="h-3 w-3 fill-current" />
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="p-6 sm:p-8 flex-1 flex flex-col">
                          <div className="mb-5">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-xl font-medium text-slate-900">{plan.name}</h3>
                              {plan.category && (
                                <span className={`inline-block text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-md ${isFeatured ? 'bg-accent/10 text-accent' : 'bg-slate-200 text-slate-500'}`}>
                                  {plan.category}
                                </span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[36px]">{plan.description}</p>
                            )}
                          </div>

                          <div className="mb-6 flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 tabular-nums">
                              {formatCurrency(plan.price, plan.currency)}
                            </span>
                            <span className="text-sm font-medium text-slate-400">
                              /{INTERVAL_MAP[plan.interval] || plan.interval}
                            </span>
                          </div>

                          <ul className="space-y-3 mb-8 flex-1">
                            {plan.features?.map((feat, i) => (
                              <li key={`custom-${i}`} className="flex items-center gap-3">
                                <span className={`flex-none flex items-center justify-center h-5 w-5 rounded-full ${isFeatured ? "bg-accent/10 text-accent" : "bg-accent/5 text-accent"}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </span>
                                <span className="text-sm font-medium text-slate-900">{feat}</span>
                              </li>
                            ))}
                            {[
                              `Billed ${INTERVAL_MAP[plan.interval] || plan.interval}ly`,
                              "Cancel anytime",
                              "Instant activation"
                            ].map((feat, i) => (
                              <li key={`static-${i}`} className="flex items-center gap-3">
                                <span className={`flex-none flex items-center justify-center h-5 w-5 rounded-full ${isFeatured ? "bg-accent/10 text-accent" : "bg-slate-200/50 text-slate-400"}`}>
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                                <span className="text-sm font-medium text-slate-700">{feat}</span>
                              </li>
                            ))}
                          </ul>

                          <Button
                            onClick={() => navigate(`/subscribe/${plan.id}`)}
                            className={`w-full h-12 rounded-xl text-sm font-medium transition-all ${
                              isFeatured
                                ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            Select Plan
                            <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="payments" className="m-0 focus-visible:outline-none">
                <div className={`grid gap-5 items-start ${oneTimePayments.length === 1 ? "max-w-sm mx-auto" : oneTimePayments.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {oneTimePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col rounded-3xl bg-slate-50/50 border border-slate-200 hover:bg-white hover:shadow-lg hover:border-slate-300 transition-all duration-300"
                    >
                      <div className="p-6 sm:p-8 flex-1 flex flex-col">
                        <div className="mb-5">
                          <span className="inline-block text-[10px] font-medium uppercase tracking-widest mb-3 px-2 py-0.5 rounded-md bg-slate-200 text-slate-500">
                            One-Time
                          </span>
                          <h3 className="text-xl font-medium text-slate-900">{payment.name}</h3>
                          {payment.description && (
                            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed min-h-[36px]">{payment.description}</p>
                          )}
                        </div>

                        <div className="mb-6 flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 tabular-nums">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                          {payment.features?.map((feat, i) => (
                            <li key={`custom-${i}`} className="flex items-center gap-3">
                              <span className="flex-none flex items-center justify-center h-5 w-5 rounded-full bg-accent/10 text-accent">
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-medium text-slate-900">{feat}</span>
                            </li>
                          ))}
                          {[
                            "Single payment",
                            "No recurring charges",
                            "Secure checkout"
                          ].map((feat, i) => (
                            <li key={`static-${i}`} className="flex items-center gap-3">
                              <span className="flex-none flex items-center justify-center h-5 w-5 rounded-full bg-slate-200/50 text-slate-400">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                              <span className="text-sm font-medium text-slate-700">{feat}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => navigate(`/pay/${payment.id}`)}
                          variant="outline"
                          className="w-full h-12 rounded-xl text-sm font-medium border-slate-200 text-slate-900 hover:bg-slate-50 transition-all"
                        >
                          <CreditCard className="h-4 w-4 mr-2 opacity-70" />
                          Checkout
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer - Stays anchored at bottom of modal */}
        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>Bank-grade Security</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest opacity-70">Powered by</span>
            <span className="text-sm font-medium text-slate-900 tracking-tight">Recurra</span>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default PlansHub;