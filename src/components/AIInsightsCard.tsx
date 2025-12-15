import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AIInsightsCardProps {
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
}

export function AIInsightsCard({ analyticsData }: AIInsightsCardProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-ai-insights", {
        body: { analyticsData },
      });

      if (error) {
        console.error("Error generating insights:", error);
        toast.error("Failed to generate AI insights");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setInsights(data.insights);
      toast.success("AI insights generated successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const formatMarkdown = (text: string) => {
    // Simple markdown to HTML conversion
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-foreground">$2</h2>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-muted-foreground">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-muted-foreground">')
      .replace(/\n/g, '<br/>');
  };

  return (
    <Card className="glass-card border-accent/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Insights
          </CardTitle>
          <CardDescription>
            Get AI-powered analysis of your business metrics and formula explanations
          </CardDescription>
        </div>
        <Button 
          onClick={generateInsights} 
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : insights ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!insights && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate Insights" to get AI-powered analysis of your business metrics.</p>
            <p className="text-sm mt-2">The AI will explain formulas and provide recommendations.</p>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Analyzing your data...</p>
          </div>
        )}
        
        {insights && !loading && (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(insights) }}
          />
        )}
      </CardContent>
    </Card>
  );
}
