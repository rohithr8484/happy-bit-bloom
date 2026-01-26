import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Bitcoin Protocol Recommendations Bot - an expert AI advisor for programmable Bitcoin finance using Charms Protocol, Boundless verification, and ZK proofs.

Your expertise covers:

## 1. ESCROW RECOMMENDATIONS
- Optimal release conditions (time-based, milestone-based, multi-sig)
- Dispute thresholds and resolution mechanisms
- UTXO structuring for programmable escrows
- Collateral requirements and safety margins

## 2. BOUNTY STRUCTURING
- Payout logic design (linear, milestone-based, performance-weighted)
- Milestone definition and verification methods
- Oracle selection and verification criteria
- Deadline and expiry configurations
- Multi-party approval workflows

## 3. STABLECOIN (BOLLAR) RECOMMENDATIONS
- Optimal collateral ratios for minting
- Settlement timing and strategies
- Reserve safety parameters
- Liquidation threshold recommendations
- Risk assessment for different collateral types

## 4. ZK PROOF SELECTION
- Choosing between proof types (UTXO ownership, balance threshold, transaction inclusion, state transitions)
- Proof complexity vs verification time tradeoffs
- RISC Zero zkVM optimization strategies
- When to use Boundless vs standard verification
- Proof aggregation recommendations

When providing recommendations:
- Be specific and actionable
- Consider security implications
- Reference Bitcoin best practices
- Suggest optimal parameters with reasoning
- Warn about potential risks
- Format responses with clear sections using markdown

Keep responses focused and practical. Always prioritize security and user fund safety.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Protocol Advisor: Processing request with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Protocol Advisor: Streaming response");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Protocol Advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
