import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, Upload, Building, Users, Briefcase, DollarSign, CheckCircle2, Clock } from "lucide-react";

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

  return (
    <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>KYC Verification</CardTitle>
              <CardDescription>Complete your business verification</CardDescription>
            </div>
          </div>
          {kycData.kyc_verified ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : kycData.kyc_submitted_at ? (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Pending Review
            </Badge>
          ) : (
            <Badge variant="outline">Not Submitted</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              Business Name
            </Label>
            <Input
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder="Enter your business name"
              className="glass-card border-border/50"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Business Type
            </Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) => setFormData({ ...formData, business_type: value })}
              disabled={disabled}
            >
              <SelectTrigger className="glass-card border-border/50">
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Number of Staff
            </Label>
            <Select
              value={formData.staff_count}
              onValueChange={(value) => setFormData({ ...formData, staff_count: value })}
              disabled={disabled}
            >
              <SelectTrigger className="glass-card border-border/50">
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Monthly Revenue
            </Label>
            <Select
              value={formData.monthly_revenue}
              onValueChange={(value) => setFormData({ ...formData, monthly_revenue: value })}
              disabled={disabled}
            >
              <SelectTrigger className="glass-card border-border/50">
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

        <div className="space-y-2">
          <Label>Nature of Business</Label>
          <Textarea
            value={formData.business_nature}
            onChange={(e) => setFormData({ ...formData, business_nature: e.target.value })}
            placeholder="Briefly describe what your business does and how you plan to use Recurra..."
            className="glass-card border-border/50 min-h-[100px]"
            disabled={disabled}
          />
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <Label>Is your business registered?</Label>
              <p className="text-sm text-muted-foreground">
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
            <div className="space-y-2">
              <Label>Upload Business Document</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload your CAC certificate or any valid business registration document
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={uploading || disabled}
                  onClick={() => document.getElementById("doc-upload")?.click()}
                >
                  <Upload className="h-4 w-4" />
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
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Document uploaded
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !isComplete || disabled}
            className="bg-accent hover:bg-accent/90 gap-2"
          >
            {saving ? "Saving..." : "Save KYC Information"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
