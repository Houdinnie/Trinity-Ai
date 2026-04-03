import Groq from "groq-sdk";
import { UserProfile, AnalysisRecord } from "../types";

export const analyzeChart = async (imageBase64: string, pair: string, timeframe: string = "1h", userProfile?: UserProfile, recentHistory?: AnalysisRecord[]) => {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please configure it in the application settings.");
  }

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  if (!imageBase64) {
    throw new Error("No image data provided. Please upload a chart screenshot.");
  }

  const currentUtcTime = new Date().toUTCString();
  const aiSettings = userProfile?.aiSettings || { breakoutSensitivity: 50, reversalSensitivity: 50, anomalySensitivity: 50 };
  
  // Format recent history for AI learning
  let historyContext = "";
  if (recentHistory && recentHistory.length > 0) {
    const feedbackSummary = recentHistory
      .filter(h => h.outcome || h.aiFeedback)
      .slice(0, 5)
      .map(h => {
        let result;
        try {
          result = JSON.parse(h.result);
        } catch (e) {
          result = { trend: 'N/A', sniperEntry: { reasoning: 'N/A' } };
        }
        return `- Pair: ${h.pair}, Outcome: ${h.outcome || 'N/A'}, User Feedback: ${h.aiFeedback || 'None'}, Previous Analysis: ${result.trend} ${result.sniperEntry?.reasoning?.substring(0, 100) || ''}...`;
      })
      .join("\n");
    
    if (feedbackSummary) {
      historyContext = `
**Past Performance & User Feedback (Learning Context)**:
${feedbackSummary}
`;
    }
  }

  const systemPrompt = `You are Trinity, an elite AI chart analyzer specialized in "Zero-Drawdown Smart Money Sniper Entries."
Your analysis integrates advanced Smart Money Concepts (SMC), Liquidity Engineering, and Market Structure Shifts (MSS/CHoCH) to protect small accounts.

Current UTC Time: ${currentUtcTime}.
Selected Timeframe: ${timeframe}.
${historyContext}

Core Analysis Modules:
1. SMC Market Structure (Trend, BOS, CHoCH, IDM)
2. Liquidity & POIs (OB, BB, MB, FVG, Sweeps)
3. Zero-Drawdown Entry Logic (Trigger, Precision)
4. Predictive Indicators (Breakout/Reversal probabilities, Institutional Flow, Anomaly Score)

User Sensitivity Preferences:
- Breakout Detection: ${aiSettings.breakoutSensitivity}%
- Reversal Detection: ${aiSettings.reversalSensitivity}%
- Anomaly Detection: ${aiSettings.anomalySensitivity}%

Return a structured JSON response exactly matching this schema:
{
  "identifiedPair": "string",
  "timeframe": "string",
  "marketSession": "string",
  "marketCondition": "string",
  "trend": "string",
  "momentum": "string",
  "smcConfirmation": "string",
  "supportResistance": ["string"],
  "candlestickPatterns": [
    { "name": "string", "significance": "string", "visualX": number, "visualY": number, "type": "BULLISH" | "BEARISH" | "NEUTRAL" }
  ],
  "liquidityEngineering": "string",
  "marketShift": "string",
  "aiIndicators": {
    "breakoutProbability": number,
    "reversalProbability": number,
    "anomalyScore": number,
    "predictiveInsights": "string",
    "institutionalFlow": "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL"
  },
  "sniperEntry": {
    "entry": "string",
    "stopLoss": "string",
    "takeProfits": [
      { "price": "string", "rrRatio": "string", "visualY": number }
    ],
    "reasoning": "string",
    "visualCoordinates": { "entryY": number, "stopLossY": number }
  },
  "troubleAreas": "string",
  "aiConfirmationScore": number
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this chart for a High-Probability SMC Sniper Entry. Identify Pair, Timeframe, and Market Session. Current UTC: ${currentUtcTime}. Requirements: Focus on ZERO-DRAWDOWN setups, use SMC, identify CHoCH after Liquidity Sweep. Provide Entry, SL, and 3 TPs with visual Y-coordinates (0-1). Identify 2-3 Candlestick Patterns with X/Y coordinates (0-1). System Instructions: ${systemPrompt}` },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.2,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
      response_format: { type: "json_object" },
      stop: null,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The AI returned an empty response.");
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error(error.message || "An unexpected error occurred during analysis.");
  }
};
