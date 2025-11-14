import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Edit2, Save, X, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bank {
  name: string;
  code: string;
}

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
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-banks');
      if (error) throw error;
      setBanks(data.banks || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast.error('Failed to load bank list');
    }
  };

  const verifyAccount = async () => {
    if (!formData.account_number || !selectedBankCode) {
      toast.error('Please enter account number and select a bank');
      return;
    }

    setVerifying(true);
    setIsVerified(false);

    try {
      const { data, error } = await supabase.functions.invoke('resolve-bank-account', {
        body: {
          account_number: formData.account_number,
          bank_code: selectedBankCode,
        },
      });

      if (error) throw error;

      if (data.verified) {
        setFormData(prev => ({ ...prev, account_name: data.account_name }));
        setIsVerified(true);
        toast.success('Account verified successfully');
      } else {
        toast.error(data.error || 'Failed to verify account');
      }
    } catch (error) {
      console.error('Error verifying account:', error);
      toast.error('Failed to verify account');
    } finally {
      setVerifying(false);
    }
  };

  const hasAccountDetails = organization.account_number && organization.account_name && organization.bank_name;

  const handleSave = async () => {
    if (!formData.account_number || !formData.account_name || !formData.bank_name) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isVerified) {
      toast.error("Please verify the account first");
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
    setSelectedBankCode("");
    setIsVerified(false);
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
              <Select
                value={selectedBankCode}
                onValueChange={(value) => {
                  setSelectedBankCode(value);
                  const bank = banks.find(b => b.code === value);
                  if (bank) {
                    setFormData({ ...formData, bank_name: bank.name });
                  }
                  setIsVerified(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <div className="flex gap-2">
                <Input
                  id="account_number"
                  placeholder="0123456789"
                  value={formData.account_number}
                  onChange={(e) => {
                    setFormData({ ...formData, account_number: e.target.value });
                    setIsVerified(false);
                  }}
                  maxLength={10}
                />
                <Button 
                  type="button"
                  onClick={verifyAccount} 
                  disabled={verifying || !formData.account_number || !selectedBankCode}
                  variant="outline"
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                placeholder="Account holder name"
                value={formData.account_name}
                readOnly
                disabled
                className={isVerified ? "bg-green-50 border-green-300" : ""}
              />
              {isVerified && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Account verified
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !isVerified}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            {!isVerified && formData.account_number && selectedBankCode && (
              <p className="text-sm text-muted-foreground">
                Please verify your account before saving
              </p>
            )}
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
