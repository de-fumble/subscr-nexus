import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analyticsData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Recurra AI, an expert financial analyst specialized in subscription business analytics. Your role is to analyze business metrics and explain the mathematical formulas used in a clear, educational way.

When analyzing data, you should:
1. Provide clear insights about the business performance
2. Explain the mathematical formulas used for each metric
3. Give actionable recommendations based on the data
4. Use simple language that non-technical business owners can understand

Format your response in markdown with clear sections:
- **Key Insights**: Main observations from the data
- **Formula Breakdown**: Explain each metric's formula
- **Recommendations**: Actionable steps to improve

Keep responses concise but informative (max 500 words).`;

    const userPrompt = `Analyze this subscription business data and explain the formulas:

**Current Metrics:**
- Total Revenue: ₦${analyticsData.totalRevenue?.toLocaleString() || 0}
- Revenue Growth: ${analyticsData.revenueGrowth || 0}%
- Active Subscribers: ${analyticsData.activeSubscribers || 0}
- Subscriber Growth Rate: ${analyticsData.subscriberGrowth || 0}%
- Average Revenue Per User (ARPU): ₦${Math.round(analyticsData.averageRevenue || 0).toLocaleString()}
- Churn Rate: ${analyticsData.churnRate || 0}%

**Revenue Trend (Last 6 months):**
${analyticsData.revenueData?.map((d: {month: string, revenue: number}) => `- ${d.month}: ₦${d.revenue?.toLocaleString() || 0}`).join('\n') || 'No data available'}

**Plan Distribution:**
${analyticsData.planDistribution?.map((p: {name: string, value: number}) => `- ${p.name}: ${p.value} subscribers`).join('\n') || 'No data available'}

Please:
1. Analyze these metrics and provide insights
2. Explain the formula for each key metric (Churn Rate, ARPU, Revenue Growth, Subscriber Growth)
3. Identify any concerns or positive trends
4. Give 2-3 specific recommendations to improve performance`;

    console.log("Calling Lovable AI Gateway...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content;

    console.log("AI insights generated successfully");

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analytics-ai-insights:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
