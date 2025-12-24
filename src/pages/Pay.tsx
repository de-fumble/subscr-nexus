import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Lock, CreditCard, CheckCircle2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import logoImage from "@/assets/logo.png";

interface Payment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  is_paid: boolean;
  org_id: string;
}

interface Organization {
  org_name: string;
  logo_url: string | null;
  email: string;
}

const Pay = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const fetchPayment = async () => {
    try {
      const { data, error } = await supabase
        .from("one_time_payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error || !data) {
        toast.error("Payment not found");
        return;
      }

      setPayment(data);

      // Fetch organization details
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
      toast.error("Failed to load payment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("initialize-one-time-payment", {
        body: {
          email: formData.email,
          name: formData.name,
          payment_id: paymentId,
        },
      });

      if (error) {
        console.error("Error:", error);
        toast.error(error.message || "Failed to initialize payment");
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
      toast.error("Failed to start payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <div className="glass-card max-w-md rounded-3xl border border-border/50 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Not Found</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            This payment link is invalid or no longer available.
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (payment.is_paid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="glass-card max-w-md rounded-3xl border border-border/50 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Completed</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            This payment has already been completed. Thank you!
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Premium background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -left-60 -top-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-60 -right-60 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoImage} alt="Recurra" className="h-10 w-10 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Recurra</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="max-w-lg mx-auto">
          <div className="glass-card rounded-3xl border border-border/50 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Organization branding */}
            {organization && (
              <div className="mb-6 flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-border/30">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.org_name}
                    className="h-14 w-14 rounded-2xl object-cover ring-4 ring-primary/20 shadow-xl"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-xl font-bold shadow-xl">
                    {organization.org_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pay to</p>
                  <p className="text-lg font-bold text-foreground">{organization.org_name}</p>
                </div>
              </div>
            )}

            {/* Payment details */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{payment.name}</h1>
              {payment.description && (
                <p className="mt-2 text-muted-foreground">{payment.description}</p>
              )}
            </div>

            {/* Amount */}
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 p-6 border border-primary/20">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  ₦{payment.amount.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground font-medium">
                  one-time
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={submitting}
                  className="h-12 rounded-xl border-border/50 bg-background/50 px-4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={submitting}
                  className="h-12 rounded-xl border-border/50 bg-background/50 px-4"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold text-base shadow-xl shadow-primary/25"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay ₦{payment.amount.toLocaleString()}
                  </>
                )}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30">
                <Lock className="h-4 w-4 text-primary" />
                <span>256-bit SSL encrypted • Your data is secure</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            By paying, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pay;