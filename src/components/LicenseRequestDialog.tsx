import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key, CheckCircle2, Loader2, Crown } from "lucide-react";

interface LicenseRequestDialogProps {
  orgId: string;
  children: React.ReactNode;
}

const LICENSE_PLANS = [
  { 
    id: "3_months", 
    name: "3 Months", 
    price: 60000, 
    duration: "3 months",
    savings: null
  },
  { 
    id: "6_months", 
    name: "6 Months", 
    price: 120000, 
    duration: "6 months",
    savings: null
  },
  { 
    id: "1_year", 
    name: "1 Year", 
    price: 240000, 
    duration: "12 months",
    savings: null,
    popular: true
  },
  { 
    id: "2_years", 
    name: "2 Years", 
    price: 400000, 
    duration: "24 months",
    savings: "Save ₦80,000"
  },
];

export function LicenseRequestDialog({ orgId, children }: LicenseRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const plan = LICENSE_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error("Invalid plan");

      const { data, error } = await supabase.functions.invoke("purchase-license", {
        body: {
          org_id: orgId,
          plan_type: planId,
          amount: plan.price,
        },
      });

      if (error) throw error;

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (error) {
      console.error("Error purchasing license:", error);
      toast.error("Failed to process license purchase");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-accent" />
            Request License Key
          </DialogTitle>
          <DialogDescription>
            Choose a license plan to unlock full platform features
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 py-4">
          {LICENSE_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-4 cursor-pointer transition-all hover:border-accent/50 ${
                plan.popular ? "border-accent/50 bg-accent/5" : ""
              }`}
              onClick={() => handlePurchase(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <div className="text-center">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">₦{plan.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.duration}</p>
                {plan.savings && (
                  <Badge variant="secondary" className="mt-2 text-green-600">
                    {plan.savings}
                  </Badge>
                )}
                <ul className="mt-4 space-y-2 text-sm text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    Full platform access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    Advanced analytics
                  </li>
                </ul>
                <Button
                  className="w-full mt-4"
                  disabled={loading}
                >
                  {loading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Get License"
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Paystack. Your license will be activated immediately after payment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
