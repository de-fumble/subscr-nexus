import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Edit2, Save, X, CheckCircle2, Loader2, Lock, Edit3 } from "lucide-react";
import { KYCEditRequestDialog } from "./KYCEditRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { card, pillBtn } from "@/lib/appleLayout";

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
      <div className={`${card} overflow-hidden`}>
        <AccordionTrigger className="w-full px-6 py-6 hover:no-underline relative z-10 [&[data-state=open]>div>div>svg]:rotate-180">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-[16px] font-semibold text-black dark:text-white flex items-center gap-2">Company Bank Account</h2>
              <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">
                {hasAccountDetails
                  ? "Your registered bank account for receiving payments"
                  : "Add your bank account details to receive payments from subscribers"}
              </p>
            </div>
            {hasAccountDetails && !isEditing && (
              <div className="shrink-0 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                {organization.kyc_verified ? (
                  <KYCEditRequestDialog orgId={organization.id}>
                    <Button variant="outline" size="sm" className="text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 gap-1.5 rounded-full border-black/10 dark:border-white/10 text-[11px] h-7 px-2.5">
                      <Edit3 className="h-3.5 w-3.5" />
                      Request Edit
                    </Button>
                  </KYCEditRequestDialog>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 gap-1.5 rounded-full border-black/10 dark:border-white/10 text-[11px] h-7 px-2.5">
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-2 relative z-10 border-t border-black/5 dark:border-white/5">
          <div className="pt-4">
            {!hasAccountDetails && !isEditing ? (
              <div className="flex flex-col items-center justify-center py-6 text-center bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                <Building2 className="h-10 w-10 text-black/40 dark:text-white/40 mb-3" />
                <p className="text-[12px] text-black/40 dark:text-white/40 mb-4">
                  No bank account details added yet
                </p>
                {organization.kyc_verified ? (
                  <KYCEditRequestDialog orgId={organization.id}>
                    <Button className={pillBtn}>
                       <Edit3 className="h-3.5 w-3.5" />
                       Request to Add Bank Account
                    </Button>
                  </KYCEditRequestDialog>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className={pillBtn}>
                    Add Bank Account
                  </Button>
                )}
              </div>
            ) : isEditing ? (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="bank_name" className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">Bank Name</Label>
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
                    <SelectTrigger className="h-9 rounded-lg border-black/10 dark:border-white/10 text-[13px] bg-white dark:bg-[#1c1c1e]">
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
                <div className="space-y-1.5">
                  <Label htmlFor="account_number" className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">Account Number</Label>
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
                      className="h-9 px-3 bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 focus-visible:ring-black/10 focus-visible:border-black rounded-lg text-[13px] font-mono transition-all shadow-sm"
                    />
                    <Button 
                      type="button"
                      onClick={verifyAccount} 
                      disabled={verifying || !formData.account_number || !selectedBankCode}
                      variant="outline"
                      className="h-9 px-4 text-[12px] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
                    >
                      {verifying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account_name" className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">Account Name</Label>
                  <Input
                    id="account_name"
                    placeholder="Account holder name"
                    value={formData.account_name}
                    readOnly
                    disabled
                    className={`h-9 px-3 text-[13px] rounded-lg border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black/45 dark:text-white/45 ${isVerified ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium" : ""}`}
                  />
                  {isVerified && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Account verified
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-3">
                  <Button onClick={handleSave} disabled={saving || !isVerified} className={pillBtn}>
                    <Save className="h-3.5 w-3.5" />
                    Save Details
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    disabled={saving} 
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-transparent border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 text-[12px] font-medium transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
                {!isVerified && formData.account_number && selectedBankCode && (
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-1">
                    Please verify your account before saving
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-w-xl">
                <div className="flex justify-between items-center py-2.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[13px] text-black/40 dark:text-white/40">Bank Name</span>
                  <span className="text-[13px] font-medium text-black dark:text-white">{organization.bank_name}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[13px] text-black/40 dark:text-white/40">Account Name</span>
                  <span className="text-[13px] font-medium text-black dark:text-white">{organization.account_name}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[13px] text-black/40 dark:text-white/40">Account Number</span>
                  <span className="text-[13px] font-medium text-black dark:text-white">{organization.account_number}</span>
                </div>
                {organization.kyc_verified && (
                  <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-black/50 dark:text-white/50">
                    <Lock className="h-3.5 w-3.5 text-black/40 dark:text-white/40 shrink-0" />
                    Verified bank details are locked. Request an edit to make changes.
                  </div>
                )}
              </div>
            )}
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}
