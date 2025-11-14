import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyAccountSectionProps {
  organization: {
    id: string;
    org_name: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
  };
  onUpdate: () => void;
}

export function CompanyAccountSection({ organization, onUpdate }: CompanyAccountSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    account_number: organization.account_number || "",
    account_name: organization.account_name || "",
    bank_name: organization.bank_name || "",
  });
  const [saving, setSaving] = useState(false);

  const hasAccountDetails = organization.account_number && organization.account_name && organization.bank_name;

  const handleSave = async () => {
    if (!formData.account_number || !formData.account_name || !formData.bank_name) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          account_number: formData.account_number,
          account_name: formData.account_name,
          bank_name: formData.bank_name,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast.success("Company account details updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating account details:", error);
      toast.error("Failed to update account details");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      account_number: organization.account_number || "",
      account_name: organization.account_name || "",
      bank_name: organization.bank_name || "",
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Bank Account</CardTitle>
          </div>
          {hasAccountDetails && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {hasAccountDetails
            ? "Your registered bank account for receiving payments"
            : "Add your bank account details to receive payments from subscribers"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAccountDetails && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No bank account details added yet
            </p>
            <Button onClick={() => setIsEditing(true)}>
              Add Bank Account
            </Button>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g., First Bank"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                placeholder="Account holder name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                placeholder="0123456789"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Bank Name</span>
              <span className="text-sm font-medium">{organization.bank_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Account Name</span>
              <span className="text-sm font-medium">{organization.account_name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Account Number</span>
              <span className="text-sm font-medium">{organization.account_number}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
