import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, Plus, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { z } from "zod";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { useOrgRole } from "@/hooks/useOrgRole";
import { logAuditEvent } from "@/utils/auditLogger";

const planSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  price: z.number().min(1, "Price must be at least ₦1"),
  interval: z.enum(["daily", "weekly", "monthly", "quarterly", "annually"]),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
  features: z.array(z.string().trim().min(1)).optional(),
});

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
  paystack_secret_key?: string | null;
  paystack_public_key?: string | null;
  recurra_handling_request?: boolean | null;
  recurra_keys_managed?: boolean | null;
}

const MAX_PLANS_WITHOUT_PAYSTACK = 3;

const CreatePlan = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [planCount, setPlanCount] = useState(0);
  const [paystackConnected, setPaystackConnected] = useState(false);
  const [isPendingKeys, setIsPendingKeys] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    interval: "monthly",
    description: "",
    category: "",
  });
  const [features, setFeatures] = useState<string[]>([""]);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
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
        .select("id, org_name, email, logo_url, paystack_secret_key, paystack_public_key, recurra_handling_request, recurra_keys_managed")
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
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url, paystack_secret_key, paystack_public_key, recurra_handling_request, recurra_keys_managed")
            .eq("id", membership.org_id)
            .maybeSingle();

          orgData = memberOrg;
          orgId = memberOrg?.id;
        }
      }

      setOrganization(orgData);
      setPaystackConnected(!!(orgData?.paystack_secret_key && orgData?.paystack_public_key));
      setIsPendingKeys(!!(orgData?.recurra_handling_request && !orgData?.recurra_keys_managed));

      // Get plan count
      if (orgId) {
        const { count } = await supabase
          .from("subscription_plans")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("is_active", true);

        setPlanCount(count || 0);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddFeature = () => {
    setFeatures([...features, ""]);
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...features];
    newFeatures.splice(index, 1);
    setFeatures(newFeatures);
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validFeatures = features.filter((f) => f.trim().length > 0);

      // Validate input
      const validated = planSchema.parse({
        name: formData.name,
        price: parseFloat(formData.price),
        interval: formData.interval,
        description: formData.description || undefined,
        category: formData.category || undefined,
        features: validFeatures.length > 0 ? validFeatures : undefined,
      });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("You must be logged in to create a plan");
        navigate("/auth");
        return;
      }

      // Call edge function to create plan on Paystack and save to DB
      const { data, error } = await supabase.functions.invoke("create-plan", {
        body: {
          name: validated.name,
          price: validated.price,
          interval: validated.interval,
          description: validated.description,
          category: validated.category,
          features: validated.features,
        },
      });

      if (error) {
        console.error("Error creating plan:", error);
        toast.error(error.message || "Failed to create plan");
        return;
      }

      if (data.error) {
        if (data.plan_limit_reached) {
          toast.error(data.error, { duration: 6000 });
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (organization) {
        logAuditEvent("create_plan", "organization", organization.id || "", "plans", {
          plan_name: validated.name,
          price: validated.price,
          interval: validated.interval
        }, role || "Owner");
      }

      toast.success("Plan created successfully!");
      navigate("/plans");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        console.error("Error:", error);
        toast.error("Failed to create plan");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 bg-card px-4">
        <SidebarTrigger />

        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Create Subscription Plan</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <p className="text-muted-foreground">Set up a new recurring payment plan for your subscribers</p>
          </div>
          {!paystackConnected && planCount >= MAX_PLANS_WITHOUT_PAYSTACK && !isPendingKeys && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Plan limit reached</AlertTitle>
              <AlertDescription>
                You've reached the maximum of {MAX_PLANS_WITHOUT_PAYSTACK} plans. Connect your own Paystack API keys in{" "}
                <a href="/dashboard/settings" className="underline font-medium">Settings</a>{" "}
                to create unlimited plans.
              </AlertDescription>
            </Alert>
          )}

          {!paystackConnected && planCount < MAX_PLANS_WITHOUT_PAYSTACK && planCount >= MAX_PLANS_WITHOUT_PAYSTACK - 1 && !isPendingKeys && (
            <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-600">Limited plans remaining</AlertTitle>
              <AlertDescription>
                You have {MAX_PLANS_WITHOUT_PAYSTACK - planCount} plan(s) remaining. Connect your Paystack API keys in{" "}
                <a href="/dashboard/settings" className="underline font-medium">Settings</a>{" "}
                for unlimited plans.
              </AlertDescription>
            </Alert>
          )}

          {isPendingKeys ? (
            <Card className="mx-auto max-w-2xl p-8 text-center border-amber-500/20 bg-amber-500/5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto mb-5">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Secure Keys Being Assigned</h2>
              <p className="text-muted-foreground mb-6">
                Plans cannot be created until the system is done assigning secure keys. This usually takes a short while.
              </p>
              <Button onClick={() => navigate("/plans")}>
                Return to Plans
              </Button>
            </Card>
          ) : (
            <Card className="mx-auto max-w-2xl p-8 bg-card border border-border shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Premium Subscription"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="5000"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                      disabled={loading}
                      min="1"
                      step="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interval">Billing Interval *</Label>
                    <Select
                      value={formData.interval}
                      onValueChange={(value) =>
                        setFormData({ ...formData, interval: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Software"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    disabled={loading}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps organize your plans in the Plans Hub
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what subscribers get on this plan..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={loading}
                    className="resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Custom Features (Optional)</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddFeature}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Feature
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., Priority Support"
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveFeature(index)}
                          disabled={loading || features.length === 1 && features[0] === ""}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These features will be displayed on the public Plans Hub card.
                  </p>
                </div>

                <div className="rounded-lg bg-muted/30 p-4 border border-border">
                  <h3 className="mb-2 font-medium text-sm text-foreground">
                    Plan Preview
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Subscribers will be charged{" "}
                      <span className="font-semibold text-foreground">
                        ₦{formData.price || "0"}
                      </span>{" "}
                      {formData.interval}
                    </p>
                    {formData.category && (
                      <p className="text-muted-foreground">
                        Category: {formData.category}
                      </p>
                    )}
                    {features.filter(f => f.trim()).length > 0 && (
                      <p className="text-muted-foreground">
                        {features.filter(f => f.trim()).length} custom features included
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/plans")}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (!paystackConnected && planCount >= MAX_PLANS_WITHOUT_PAYSTACK)}
                    className="flex-1 bg-accent hover:bg-accent/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Plan"
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </main>
    </SidebarInset>
  );
};

export default CreatePlan;