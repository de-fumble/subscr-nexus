import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, X, Pencil } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  features?: string[] | null;
}

interface EditPlanFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  onFeaturesUpdated?: () => void;
}

export function EditPlanFeaturesDialog({
  open,
  onOpenChange,
  plan,
  onFeaturesUpdated,
}: EditPlanFeaturesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (open && plan.id) {
      fetchFeatures();
    }
  }, [open, plan.id]);

  const fetchFeatures = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("features")
        .eq("id", plan.id)
        .single();

      if (error) throw error;
      
      const planFeatures = data.features || [];
      setFeatures(planFeatures.length > 0 ? planFeatures : [""]);
    } catch (error) {
      console.error("Error fetching plan features:", error);
      toast.error("Failed to load plan features");
      setFeatures([""]);
    } finally {
      setFetching(false);
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

  const handleSave = async () => {
    setLoading(true);
    try {
      // Filter out empty strings
      const validFeatures = features.filter((f) => f.trim().length > 0);

      const { error } = await supabase
        .from("subscription_plans")
        .update({ features: validFeatures })
        .eq("id", plan.id);

      if (error) throw error;

      toast.success("Plan features updated successfully!");
      onFeaturesUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating features:", error);
      toast.error("Failed to update features");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent" />
            Edit Features: {plan.name}
          </DialogTitle>
          <DialogDescription>
            Add or remove custom features that will be displayed on the public Plans Hub for this plan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Features List</Label>
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
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
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
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || fetching}
            className="bg-accent hover:bg-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Features"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
