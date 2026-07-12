import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  Lock,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Check,
  Building2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoadingSkeleton } from "@/components/DashboardSkeleton";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  category: string | null;
  paystack_plan_code: string;
  org_id: string;
  currency: string;
  features?: string[] | null;
}

interface Organization {
  org_name: string;
  logo_url: string | null;
  email: string;
}

const INTERVAL_MAP: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  biannually: "6 months",
  annually: "year",
};

const Subscribe = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, interval, category, paystack_plan_code, org_id, currency, features")
        .eq("id", planId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Plan not found or inactive");
        return;
      }

      setPlan(data);

      const { data: orgData } = await supabase
        .from("organizations")
        .select("org_name, logo_url, email")
        .eq("id", data.org_id)
        .single();

      if (orgData) {
        setOrganization(orgData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("initialize-subscription", {
        body: {
          email: formData.email,
          name: formData.name,
          plan_code: plan?.paystack_plan_code,
          plan_id: planId,
        },
      });

      if (error) {
        console.error("Error:", error);
        toast.error(error.message || "Failed to initialize subscription");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to start subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number, currency: string) =>
    `${currency === "NGN" ? "₦" : currency}${val.toLocaleString()}`;

  if (loading) return <PageLoadingSkeleton />;

  if (!plan) {
    return (
      <div className="min-h-[100dvh] bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="text-center bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 max-w-sm w-full">
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">Plan Not Found</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            This subscription plan is no longer available or has been deactivated.
          </p>
          <Button onClick={() => navigate("/")} className="w-full h-11 rounded-xl text-sm font-medium">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const intervalText = INTERVAL_MAP[plan.interval] || plan.interval;

  return (
    <div className="min-h-[100dvh] bg-slate-50/80 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden">
      {/* Subtle ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[50%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[80px]" />
      </div>

      {/* Modal Container */}
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden relative z-10 flex flex-col max-h-[95dvh] sm:max-h-[90dvh]">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.org_name}
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-100"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {organization?.org_name.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
            <h1 className="text-sm font-medium text-slate-900 truncate max-w-[160px] sm:max-w-none">
              {organization?.org_name || "Subscribe"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto premium-scrollbar p-6 sm:p-8">
          {/* Back link */}
          <button
            onClick={() => navigate(`/plans-hub/${plan.org_id}`)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to plans
          </button>

          {/* Heading */}
          <div className="text-center mb-8">
            <Badge className="mb-3 px-3 py-1 bg-accent/10 hover:bg-accent/10 text-accent font-medium uppercase tracking-widest text-[10px] border-none shadow-none rounded-full">
              Subscription
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2 leading-tight">
              {plan.name}
            </h2>
            {plan.description && (
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{plan.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="rounded-3xl bg-slate-50/50 border border-slate-200 p-5 sm:p-6 mb-6 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(plan.price, plan.currency || "NGN")}
              </span>
              <span className="text-sm font-medium text-slate-400">/{intervalText}</span>
            </div>
            {plan.category && (
              <span className="inline-block mt-3 text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-md bg-accent/10 text-accent">
                {plan.category}
              </span>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features?.map((feat, i) => (
              <li key={`custom-${i}`} className="flex items-center gap-3">
                <span className="flex-none flex items-center justify-center h-5 w-5 rounded-full bg-accent/10 text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-900">{feat}</span>
              </li>
            ))}
            {[
              `Billed ${intervalText}ly`,
              "Cancel anytime",
              "Instant activation",
            ].map((feat, i) => (
              <li key={`static-${i}`} className="flex items-center gap-3">
                <span className="flex-none flex items-center justify-center h-5 w-5 rounded-full bg-slate-200/50 text-slate-400">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span className="text-sm font-medium text-slate-700">{feat}</span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="border-t border-slate-100 mb-8" />

          {/* Form */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-4 tracking-tight">
              Complete your subscription
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={submitting}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:ring-0 focus-visible:ring-0 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={submitting}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:ring-0 focus-visible:ring-0 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-all mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe Now
                    <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-[11px] text-slate-400 font-medium mt-4 leading-relaxed">
              You will be redirected to Paystack to complete payment securely.
            </p>
          </div>

          {/* Terms */}
          <p className="text-center text-[11px] text-slate-400 font-medium mt-6 leading-relaxed">
            By subscribing, you agree to our{" "}
            <Link to="/terms" className="text-slate-600 hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-slate-600 hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>Bank-grade Security</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <span>Powered by Paystack</span>
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

export default Subscribe;
