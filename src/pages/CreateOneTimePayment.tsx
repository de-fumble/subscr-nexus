import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { useOrgRole } from "@/hooks/useOrgRole";

const paymentSchema = z.object({
  name: z.string().trim().min(1, "Payment name is required").max(100),
  amount: z.number().min(1, "Amount must be at least ₦1"),
  description: z.string().trim().max(500).optional(),
});

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const CreateOneTimePayment = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    description: "",
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

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = paymentSchema.parse({
        name: formData.name,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !organization) {
        toast.error("You must be logged in with an organization");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("one_time_payments")
        .insert({
          org_id: organization.id,
          name: validated.name,
          amount: validated.amount,
          description: validated.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating payment:", error);
        toast.error("Failed to create payment link");
        return;
      }

      toast.success("Standard payment link created!");
      navigate("/payments");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        console.error("Error:", error);
        toast.error("Failed to create payment");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
        <SidebarTrigger />
        
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Create Standard Payment</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <p className="text-muted-foreground">Create a standard payment link that can only be used once</p>
          </div>

          <Card className="mx-auto max-w-2xl p-8 glass-card border-0 shadow-[var(--shadow-medium)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Payment Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Invoice #1234"
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

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="5000"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                  disabled={loading}
                  min="1"
                  step="1"
                  className="glass-card border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this payment is for..."
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
                  Payment Preview
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Amount:{" "}
                    <span className="font-semibold text-foreground">
                      ₦{formData.amount || "0"}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    This link can only be used for a single payment and cannot be edited after creation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/payments")}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Payment Link"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </SidebarInset>
  );
};

export default CreateOneTimePayment;