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
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { z } from "zod";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { useOrgRole } from "@/hooks/useOrgRole";
import { logAuditEvent } from "@/utils/auditLogger";

const planSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  price: z.number().min(1, "Price must be at least ₦1"),
  interval: z.enum(["daily", "weekly", "monthly", "quarterly", "annually"]),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
});

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
  paystack_secret_key?: string | null;
  paystack_public_key?: string | null;
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
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    interval: "monthly",
    description: "",
    category: "",
  });

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
        .select("id, org_name, email, logo_url, paystack_secret_key, paystack_public_key")
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
            .select("id, org_name, email, logo_url, paystack_secret_key, paystack_public_key")
            .eq("id", membership.org_id)
            .maybeSingle();

          orgData = memberOrg;
          orgId = memberOrg?.id;
        }
      }

      setOrganization(orgData);
      setPaystackConnected(!!(orgData?.paystack_secret_key && orgData?.paystack_public_key));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = planSchema.parse({
        name: formData.name,
        price: parseFloat(formData.price),
        interval: formData.interval,
        description: formData.description || undefined,
        category: formData.category || undefined,
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
        logAuditEvent("create_plan", "plan", data.plan.id || "new_plan", "plans", {
          name: validated.name,
          price: validated.price,
          interval: validated.interval
        }, role || "User");
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
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

              {/* Plan limit warning for orgs without Paystack */}
              {!paystackConnected && planCount >= MAX_PLANS_WITHOUT_PAYSTACK && (
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

              {!paystackConnected && planCount < MAX_PLANS_WITHOUT_PAYSTACK && planCount >= MAX_PLANS_WITHOUT_PAYSTACK - 1 && (
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

              <Card className="mx-auto max-w-2xl p-8 glass-card border-0 shadow-[var(--shadow-medium)]">
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
                      className="glass-card border-border/50"
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
                        className="glass-card border-border/50"
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
                        <SelectTrigger className="glass-card border-border/50">
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
                      placeholder="e.g., Education, SaaS, Membership"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      disabled={loading}
                      maxLength={50}
                      className="glass-card border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this plan includes..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      disabled={loading}
                      maxLength={500}
                      rows={4}
                      className="glass-card border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  <div className="rounded-lg glass-card p-4 border border-accent/20">
                    <h3 className="mb-2 font-semibold text-foreground">
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
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CreatePlan;