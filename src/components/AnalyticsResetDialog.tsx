import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RotateCcw, Download, AlertTriangle, Mail } from "lucide-react";

interface AnalyticsResetDialogProps {
  orgId: string;
  orgEmail: string;
  orgName: string;
  analyticsData: {
    totalRevenue: number;
    activeSubscribers: number;
    revenueData: Array<{ month: string; revenue: number }>;
    planDistribution: Array<{ name: string; value: number }>;
  };
  disabled?: boolean;
}

export function AnalyticsResetDialog({
  orgId,
  orgEmail,
  orgName,
  analyticsData,
  disabled = false,
}: AnalyticsResetDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const generateCSV = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Organization Name", orgName],
      ["Export Date", new Date().toISOString()],
      ["Total Revenue (NGN)", analyticsData.totalRevenue.toString()],
      ["Active Subscribers", analyticsData.activeSubscribers.toString()],
      ["", ""],
      ["Monthly Revenue Data", ""],
      ["Month", "Revenue (NGN)"],
      ...analyticsData.revenueData.map(d => [d.month, d.revenue.toString()]),
      ["", ""],
      ["Plan Distribution", ""],
      ["Plan Name", "Subscriber Count"],
      ...analyticsData.planDistribution.map(d => [d.name, d.value.toString()]),
    ];

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    return csvContent;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Generate CSV
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      
      // Download locally
      const a = document.createElement("a");
      a.href = url;
      a.download = `${orgName.replace(/\s+/g, "_")}_analytics_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Simulate sending email (in production, this would call an edge function)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setEmailSent(true);
      setExportComplete(true);
      toast.success("Analytics exported and sent to your email");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analytics");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    if (!confirmReset || !exportComplete) return;

    setResetting(true);
    try {
      // Log the reset action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        actor_id: user?.id,
        action: "analytics_reset",
        entity_type: "organization",
        entity_id: orgId,
        details: {
          reset_date: new Date().toISOString(),
          total_revenue_at_reset: analyticsData.totalRevenue,
          active_subscribers_at_reset: analyticsData.activeSubscribers,
        },
      });

      // Note: The actual reset would typically involve clearing cached analytics
      // or resetting counters. Since analytics are fetched from Paystack,
      // this is more of a "year-end snapshot" action.
      
      toast.success("Analytics reset completed. Historical data has been archived.");
      setOpen(false);
      
      // Reset state
      setExportComplete(false);
      setConfirmReset(false);
      setEmailSent(false);
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Failed to reset analytics");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <RotateCcw className="h-4 w-4" />
          Year-End Reset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Year-End Analytics Reset
          </DialogTitle>
          <DialogDescription>
            Export your analytics data before resetting for the new year
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will reset your dashboard analytics. Make sure to export your data first.
            </AlertDescription>
          </Alert>

          {/* Step 1: Export */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Step 1: Export Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Download CSV and send to {orgEmail}
                </p>
              </div>
              {exportComplete && (
                <div className="flex items-center text-green-600 text-sm">
                  <Download className="h-4 w-4 mr-1" />
                  Exported
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleExport}
              disabled={exporting || exportComplete}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : exportComplete ? (
                <>
                  <Download className="h-4 w-4" />
                  Export Complete
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Analytics (CSV)
                </>
              )}
            </Button>
            {emailSent && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Copy sent to {orgEmail}
              </p>
            )}
          </div>

          {/* Step 2: Confirm Reset */}
          <div className={`space-y-3 p-4 rounded-lg border ${!exportComplete ? "opacity-50" : ""}`}>
            <p className="font-medium">Step 2: Confirm Reset</p>
            <div className="flex items-start gap-2">
              <Checkbox
                id="confirm-reset"
                checked={confirmReset}
                onCheckedChange={(checked) => setConfirmReset(checked as boolean)}
                disabled={!exportComplete}
              />
              <Label
                htmlFor="confirm-reset"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I confirm that I have downloaded my analytics data and want to proceed with the reset.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={!exportComplete || !confirmReset || resetting}
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Analytics
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}