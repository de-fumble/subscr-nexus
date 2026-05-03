import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Download, AlertTriangle, Trash2, Upload, FileSpreadsheet, X } from "lucide-react";
import * as XLSX from "xlsx";

interface EphemeralAIDialogProps {
  analyticsData: {
    totalRevenue: number;
    revenueGrowth: number;
    activeSubscribers: number;
    subscriberGrowth: number;
    averageRevenue: number;
    churnRate: number;
    revenueData: Array<{ month: string; revenue: number }>;
    planDistribution: Array<{ name: string; value: number }>;
  };
  children: React.ReactNode;
}

interface UploadedFile {
  name: string;
  data: Record<string, unknown>[];
  sheetName: string;
}

const AI_ACTIONS = [
  { 
    id: "revenue_forecast", 
    name: "Revenue Forecast", 
    description: "Predict future revenue based on current trends" 
  },
  { 
    id: "churn_analysis", 
    name: "Churn Analysis", 
    description: "Analyze subscriber churn patterns and causes" 
  },
  { 
    id: "growth_recommendations", 
    name: "Growth Recommendations", 
    description: "Get AI-powered growth strategies" 
  },
  { 
    id: "pricing_optimization", 
    name: "Pricing Optimization", 
    description: "Optimize your subscription pricing" 
  },
  { 
    id: "subscriber_segmentation", 
    name: "Subscriber Segmentation", 
    description: "Segment subscribers by behavior" 
  },
];

export function EphemeralAIDialog({ analyticsData, children }: EphemeralAIDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast.error(`${file.name} is not a valid Excel/CSV file`);
        continue;
      }

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setUploadedFiles(prev => [...prev, {
          name: file.name,
          data: jsonData as Record<string, unknown>[],
          sheetName
        }]);

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error(`Failed to parse ${file.name}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!selectedAction) {
      toast.error("Please select an analysis type");
      return;
    }

    setShowWarning(false);
    setLoading(true);
    setResult(null);

    try {
      // Prepare uploaded file data for AI analysis
      const uploadedData = uploadedFiles.length > 0 
        ? uploadedFiles.map(f => ({
            fileName: f.name,
            sheetName: f.sheetName,
            rowCount: f.data.length,
            columns: f.data.length > 0 ? Object.keys(f.data[0]) : [],
            sampleData: f.data.slice(0, 10) // Send first 10 rows as sample
          }))
        : null;

      const { data, error } = await supabase.functions.invoke("ephemeral-ai-analysis", {
        body: {
          action: selectedAction,
          analyticsData,
          uploadedData,
        },
      });

      if (error) throw error;

      if (data?.analysis) {
        setResult(data.analysis);
        toast.success("Analysis complete");
      } else {
        toast.error("No analysis generated");
      }
    } catch (error) {
      console.error("AI Analysis error:", error);
      toast.error("Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const action = AI_ACTIONS.find(a => a.id === selectedAction);
    const filename = `${action?.name.toLowerCase().replace(/\s+/g, '-') || 'analysis'}-${Date.now()}.txt`;
    
    const content = `
AI ANALYSIS REPORT
==================
Type: ${action?.name || selectedAction}
Generated: ${new Date().toLocaleString()}

${result}

---
Note: This analysis was generated by AI and is not stored.
Powered by Recurra
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Report downloaded");
  };

  const handleClear = () => {
    setResult(null);
    setSelectedAction("");
    setShowWarning(true);
    setUploadedFiles([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Clear data when closing
      setResult(null);
      setSelectedAction("");
      setShowWarning(true);
      setUploadedFiles([]);
    }
    setOpen(isOpen);
  };

  const formatMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h2>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-muted-foreground">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-muted-foreground">')
      .replace(/\n/g, '<br/>');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="
        sm:max-w-2xl
        max-h-[92vh] sm:max-h-[85vh]
        flex flex-col
        max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-none
        max-sm:rounded-t-2xl sm:rounded-2xl
        max-sm:border-t max-sm:border-x sm:border border-border/60
        bg-background/95 backdrop-blur-xl
        shadow-2xl
        p-0 gap-0
        overflow-hidden
      ">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background to-accent/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                AI Analytics
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border border-primary/30 text-primary/80 bg-primary/10">Beta</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Run AI-powered analysis on your business data
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {showWarning && !result && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                <strong>Important:</strong> This analysis is ephemeral. Your data and results are NOT saved or stored anywhere.
                Download the result if you want to keep it.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Analysis Type</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an analysis..." />
              </SelectTrigger>
              <SelectContent>
                {AI_ACTIONS.map((action) => (
                  <SelectItem key={action.id} value={action.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{action.name}</span>
                      <span className="text-xs text-muted-foreground">{action.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Section */}
          {!result && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Excel/CSV Files (Optional)</label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Excel/CSV
                </Button>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {uploadedFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.data.length} rows • Sheet: {file.sheetName}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && (
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !selectedAction}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download Result
                </Button>
                <Button variant="outline" className="gap-2 sm:w-auto" onClick={handleClear}>
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>

              <div 
                className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 rounded-lg p-4 max-h-96 overflow-auto"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }}
              />
            </div>
          )}
        </div>

        {/* Bottom drag handle on mobile */}
        <div className="sm:hidden shrink-0 flex justify-center pb-3 pt-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
