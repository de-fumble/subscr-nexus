import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, analyticsData, uploadedData } = await req.json();

    if (!action || !analyticsData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionPrompts: Record<string, string> = {
      revenue_forecast: `Based on the following analytics data, provide a detailed revenue forecast for the next 6 months. Include growth projections, potential risks, and key drivers.`,
      churn_analysis: `Analyze the churn patterns in the following data. Identify potential causes, at-risk segments, and provide actionable recommendations to reduce churn.`,
      growth_recommendations: `Review the following business metrics and provide 5 specific, actionable growth recommendations. Focus on quick wins and sustainable strategies.`,
      pricing_optimization: `Analyze the current pricing and plan distribution. Suggest pricing optimizations that could increase revenue while maintaining customer satisfaction.`,
      subscriber_segmentation: `Based on the analytics data, identify key subscriber segments. Describe each segment's characteristics and suggest targeted strategies for each.`,
    };

    const systemPrompt = actionPrompts[action] || "Analyze the following business data and provide insights.";

    // Build uploaded data section if files were provided
    let uploadedDataSection = "";
    if (uploadedData && Array.isArray(uploadedData) && uploadedData.length > 0) {
      uploadedDataSection = "\n\nUPLOADED FILE DATA:\n";
      for (const file of uploadedData) {
        uploadedDataSection += `\nFile: ${file.fileName} (Sheet: ${file.sheetName})\n`;
        uploadedDataSection += `Rows: ${file.rowCount}\n`;
        uploadedDataSection += `Columns: ${file.columns?.join(', ') || 'N/A'}\n`;
        if (file.sampleData && file.sampleData.length > 0) {
          uploadedDataSection += `Sample Data (first ${file.sampleData.length} rows):\n`;
          uploadedDataSection += JSON.stringify(file.sampleData, null, 2) + "\n";
        }
      }
      uploadedDataSection += "\nPlease incorporate this uploaded data into your analysis.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a business analytics expert. ${systemPrompt} Be specific, actionable, and use the data provided. Format your response with clear sections and bullet points.`,
          },
          {
            role: "user",
            content: `Here is the analytics data to analyze:
            
Total Revenue: ₦${analyticsData.totalRevenue?.toLocaleString() || 0}
Revenue Growth: ${analyticsData.revenueGrowth || 0}%
Active Subscribers: ${analyticsData.activeSubscribers || 0}
Subscriber Growth: ${analyticsData.subscriberGrowth || 0}%
Average Revenue per User: ₦${analyticsData.averageRevenue?.toLocaleString() || 0}
Churn Rate: ${analyticsData.churnRate || 0}%

Revenue Trend (last months):
${analyticsData.revenueData?.map((d: any) => `- ${d.month}: ₦${d.revenue?.toLocaleString() || 0}`).join('\n') || 'No data'}

Plan Distribution:
${analyticsData.planDistribution?.map((p: any) => `- ${p.name}: ${p.value} subscribers`).join('\n') || 'No data'}${uploadedDataSection}

Provide your analysis:`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const analysis = aiData.choices?.[0]?.message?.content;

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: "Failed to generate analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: We intentionally do NOT store this data anywhere
    // It's ephemeral and only returned to the client

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
