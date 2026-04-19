import { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Edit2, Save, X, CheckCircle2, Loader2, Lock, Edit3 } from "lucide-react";
import { KYCEditRequestDialog } from "./KYCEditRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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
    kyc_verified?: boolean;
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
    <AccordionItem value="company-account" className="border-none">
      <Card className="glass-card border-0 shadow-[var(--shadow-medium)] border-l-4 border-l-indigo-500 group hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5">
              <Building2 className="h-7 w-7 text-indigo-500 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <CardTitle className="text-xl flex items-center gap-2">Company Bank Account</CardTitle>
              <CardDescription className="text-sm mt-1">
                {hasAccountDetails
                  ? "Your registered bank account for receiving payments"
                  : "Add your bank account details to receive payments from subscribers"}
              </CardDescription>
            </div>
            {hasAccountDetails && !isEditing && (
              <div className="shrink-0 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                {organization.kyc_verified ? (
                  <KYCEditRequestDialog orgId={organization.id}>
                    <Button variant="outline" size="sm" className="text-accent hover:text-accent hover:bg-accent/5 gap-2 rounded-full border-accent/20">
                      <Edit3 className="h-4 w-4" />
                      Request Edit
                    </Button>
                  </KYCEditRequestDialog>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-full">
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-border/10">
          <div className="pt-4">
            {!hasAccountDetails && !isEditing ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-border/50">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No bank account details added yet
                </p>
                {organization.kyc_verified ? (
                  <KYCEditRequestDialog orgId={organization.id}>
                    <Button className="gap-2 rounded-full">
                       <Edit3 className="h-4 w-4" />
                       Request to Add Bank Account
                    </Button>
                  </KYCEditRequestDialog>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="rounded-full px-6">
                    Add Bank Account
                  </Button>
                )}
              </div>
            ) : isEditing ? (
              <div className="space-y-4 max-w-xl">
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
                    <SelectTrigger className="h-12 rounded-xl">
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
                      className="h-12 rounded-xl"
                    />
                    <Button 
                      type="button"
                      onClick={verifyAccount} 
                      disabled={verifying || !formData.account_number || !selectedBankCode}
                      variant="outline"
                      className="h-12 rounded-xl px-6"
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
                    className={`h-12 rounded-xl ${isVerified ? "bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30 text-green-700 dark:text-green-400 font-medium" : ""}`}
                  />
                  {isVerified && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Account verified
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saving || !isVerified} className="rounded-full px-8">
                    <Save className="h-4 w-4 mr-2" />
                    Save Details
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={saving} className="rounded-full px-8">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
                {!isVerified && formData.account_number && selectedBankCode && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Please verify your account before saving
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-xl">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Bank Name</span>
                  <span className="text-base font-medium">{organization.bank_name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Account Name</span>
                  <span className="text-base font-medium">{organization.account_name}</span>
                </div>
                {organization.kyc_verified && (
                  <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-accent/5 border border-accent/10 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 text-accent shrink-0" />
                    Verified bank details are locked. Request an edit to make changes.
                  </div>
                )}
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <span className="text-base font-medium">{organization.account_number}</span>
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
