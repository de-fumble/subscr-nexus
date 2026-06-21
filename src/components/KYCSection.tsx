import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, Upload, Building, Users, Briefcase, DollarSign, CheckCircle2, Clock, Lock, Edit3 } from "lucide-react";
import { KYCEditRequestDialog } from "./KYCEditRequestDialog";
import { card, pillBtn } from "@/lib/appleLayout";


interface KYCData {
  business_nature: string | null;
  business_name: string | null;
  staff_count: string | null;
  business_type: string | null;
  is_registered: boolean;
  registration_document_url: string | null;
  monthly_revenue: string | null;
  kyc_verified: boolean;
  kyc_submitted_at: string | null;
}

interface KYCSectionProps {
  orgId: string;
  kycData: KYCData;
  onUpdate: () => void;
  disabled?: boolean;
}

const BUSINESS_TYPES = [
  { value: "school", label: "School / Educational Institution" },
  { value: "church", label: "Church / Religious Organization" },
  { value: "cooperative", label: "Cooperative Society" },
  { value: "finance", label: "Finance / Microfinance" },
  { value: "healthcare", label: "Healthcare Institution" },
  { value: "ngo", label: "NGO / Non-Profit" },
  { value: "retail", label: "Retail / E-commerce" },
  { value: "saas", label: "SaaS / Technology" },
  { value: "membership", label: "Membership Organization" },
  { value: "other", label: "Other" },
];

const STAFF_COUNTS = [
  { value: "1-5", label: "1-5 employees" },
  { value: "6-20", label: "6-20 employees" },
  { value: "21-50", label: "21-50 employees" },
  { value: "51-100", label: "51-100 employees" },
  { value: "100+", label: "100+ employees" },
];

const REVENUE_RANGES = [
  { value: "0-100k", label: "₦0 - ₦100,000" },
  { value: "100k-500k", label: "₦100,000 - ₦500,000" },
  { value: "500k-1m", label: "₦500,000 - ₦1,000,000" },
  { value: "1m-5m", label: "₦1,000,000 - ₦5,000,000" },
  { value: "5m-10m", label: "₦5,000,000 - ₦10,000,000" },
  { value: "10m+", label: "₦10,000,000+" },
];

export function KYCSection({ orgId, kycData, onUpdate, disabled = false }: KYCSectionProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    business_nature: kycData.business_nature || "",
    business_name: kycData.business_name || "",
    staff_count: kycData.staff_count || "",
    business_type: kycData.business_type || "",
    is_registered: kycData.is_registered || false,
    monthly_revenue: kycData.monthly_revenue || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          ...formData,
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      if (error) throw error;

      toast.success("KYC information saved successfully");
      onUpdate();
    } catch (error) {
      console.error("Error saving KYC:", error);
      toast.error("Failed to save KYC information");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPG, PNG, WebP) or PDF file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-documents')
        .getPublicUrl(filePath);

      // Update organization with document URL
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ registration_document_url: publicUrl })
        .eq("id", orgId);

      if (updateError) throw updateError;

      toast.success("Document uploaded successfully");
      onUpdate();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const isComplete = formData.business_name && formData.business_type && formData.staff_count && formData.monthly_revenue;
  const isVerified = kycData.kyc_verified;

  return (
    <div className={card}>
      <div className="px-6 pt-6 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 text-black/70 dark:text-white/70">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-black dark:text-white">KYC Verification</h2>
              <p className="text-[12px] text-black/40 dark:text-white/40 mt-1 font-normal">Complete your business verification</p>
            </div>
          </div>
          {kycData.kyc_verified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : kycData.kyc_submitted_at ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
              <Clock className="h-3.5 w-3.5" />
              Pending Review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50">
              Not Submitted
            </span>
          )}
        </div>
      </div>
      <div className="px-6 py-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
              <Building className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              Business Name
            </Label>
            <Input
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder="Enter your business name"
              className="h-9 px-3 bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-lg text-[13px] transition-all"
              disabled={disabled || isVerified}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
              <Briefcase className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              Business Type
            </Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) => setFormData({ ...formData, business_type: value })}
              disabled={disabled || isVerified}
            >
              <SelectTrigger className="h-9 text-[13px] bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-lg">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
              <Users className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              Number of Staff
            </Label>
            <Select
              value={formData.staff_count}
              onValueChange={(value) => setFormData({ ...formData, staff_count: value })}
              disabled={disabled || isVerified}
            >
              <SelectTrigger className="h-9 text-[13px] bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-lg">
                <SelectValue placeholder="Select staff count" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_COUNTS.map((count) => (
                  <SelectItem key={count.value} value={count.value}>
                    {count.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">
              <DollarSign className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              Monthly Revenue
            </Label>
            <Select
              value={formData.monthly_revenue}
              onValueChange={(value) => setFormData({ ...formData, monthly_revenue: value })}
              disabled={disabled || isVerified}
            >
              <SelectTrigger className="h-9 text-[13px] bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-lg">
                <SelectValue placeholder="Select revenue range" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-black/45 dark:text-white/45 tracking-wide uppercase">Nature of Business</Label>
          <Textarea
            value={formData.business_nature}
            onChange={(e) => setFormData({ ...formData, business_nature: e.target.value })}
            placeholder="Briefly describe what your business does and how you plan to use Recurra..."
            className="bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-lg text-[13px] min-h-[90px]"
            disabled={disabled || isVerified}
          />
        </div>

        <div className="space-y-3.5 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[13px] font-medium text-black dark:text-white">Is your business registered?</Label>
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                Do you have a CAC certificate or equivalent?
              </p>
            </div>
            <Switch
              checked={formData.is_registered}
              onCheckedChange={(checked) => setFormData({ ...formData, is_registered: checked })}
              disabled={disabled}
            />
          </div>

          {formData.is_registered && (
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
              <Label className="text-[12px] font-medium text-black dark:text-white">Upload Business Document</Label>
              <p className="text-[11px] text-black/40 dark:text-white/40 mb-2">
                Upload your CAC certificate or any valid business registration document (Max 5MB)
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="h-8 px-3.5 text-[11px] gap-1.5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
                  disabled={uploading || disabled || isVerified}
                  onClick={() => document.getElementById("doc-upload")?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading..." : "Upload Document"}
                </Button>
                <input
                  id="doc-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleDocumentUpload}
                />
                {kycData.registration_document_url && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Document uploaded
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
          {isVerified ? (
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-black/50 dark:text-white/50 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                <Lock className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                This profile is verified and locked. Contact admin for changes.
              </div>
              <KYCEditRequestDialog orgId={orgId}>
                <Button variant="outline" className="text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 gap-1.5 rounded-full border-black/10 dark:border-white/10 text-[11px] h-8 px-3">
                  <Edit3 className="h-3.5 w-3.5" />
                  Request Edit
                </Button>
              </KYCEditRequestDialog>
            </div>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !isComplete || disabled}
              className={pillBtn + " w-full sm:w-auto"}
            >
              {saving ? "Saving..." : "Save KYC Information"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
