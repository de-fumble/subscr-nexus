import { useState } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  price: z.number().min(1, "Price must be at least ₦1"),
  interval: z.enum(["daily", "weekly", "monthly", "annually"]),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
});

const CreatePlan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    interval: "monthly",
    description: "",
    category: "",
  });

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
        toast.error(data.error);
        return;
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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Create Subscription Plan
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up a new recurring payment plan for your subscribers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="mx-auto max-w-2xl p-8">
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
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
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
                onClick={() => navigate("/dashboard")}
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
                  "Create Plan"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreatePlan;
