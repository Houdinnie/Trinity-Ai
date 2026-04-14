import Groq from "groq-sdk";
import { UserProfile, AnalysisRecord } from "../types";

export const analyzeChart = async (imageBase64: string, pair: string, timeframe: string = "1h", userProfile?: UserProfile, recentHistory?: AnalysisRecord[]) => {
  const apiKey = process.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please add GROQ_API_KEY to your secrets.");
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

  const systemPrompt = `You are Trinity, an elite AI chart analyzer specialized in the "Liquidity-Zone Shift (LZS)" strategy.
Your mission is to identify high-probability institutional setups based on the following rules-based framework:

**Strategy Name**: Liquidity-Zone Shift (LZS)
**Core Philosophy**: Identify higher-timeframe liquidity zones, confirm institutional intent via liquidity engineering and EMA/impulse violation, then execute on lower-timeframe structure shifts.

### 1. Timeframe Coordination
- **Constant Timeframe (CT)**: Weekly or Daily. Used to mark major Areas of Liquidity (AOL) - Supply/Demand zones.
- **Situational Timeframe (ST1)**: H4 or Daily. Watch for shift, liquidity engineering (sweeps, FMD, reclaim).
- **Entry Timeframe (ET)**: H1 or lower. Look for impulse, BOS/CHoCH, and retest for entry.

### 2. Indicators & Signals
- **EMAs**: 9, 21, 50. Use EMA violation/cross (especially the 50 EMA) to confirm impulse.
- **Liquidity Signals**: Thrust candles, FMD (Further Most Deviation), Wick Sweeps, Engulfing types (Type 1/2/3).
- **Pattern**: White Collar impulse -> retest pattern on ET inside a CT zone, validated by APA liquidity engineering on ST1.

### 3. Entry Prerequisites (All must align)
1. **CT AOL**: Identified and fresh/unconsumed.
2. **ST1 Confirmation**: Shows liquidity engineering (sweep, FMD, or shift) or transition toward CT AOL.
3. **ET Impulse**: Clear impulse breaking structure (BOS/CHoCH), piercing the 50 EMA.
4. **ET Retest**: Price retests the small ET zone (base) left by the impulse with a micro-rejection (pin, engulf, or clean retest).
5. **Confluence**: EMA violation, trendline break, or wick overlap on higher timeframe.

### 4. Workflow & Execution
1. Mark CT AOL (Weekly/Daily).
2. Wait for price to return to CT AOL.
3. Drop to ST1 to confirm liquidity engineering (thrust, sweep, reclaim).
4. Drop to ET: Wait for impulse clearing 1-2 structures and crossing 50 EMA. Mark the ET base zone.
5. Entry: On retest of the ET zone with confirmation.
6. Stop Loss: Just beyond ET zone invalidation.
7. Take Profit: TP1 at next HTF structure (H4/Daily). Use FTAs (First Trouble Areas) for partials.

### 5. Risk & Trade Management
- Risk per trade: 1% or less.
- Trailing: Move SL to last LTF structure (e.g., last H1 lower high for sells).
- "Never close a trade unless SL is hit" (unless at pre-defined FTA).

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
    const response = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this chart for a High-Probability SMC Sniper Entry. Identify Pair, Timeframe, and Market Session. Current UTC: ${currentUtcTime}. Requirements: Focus on ZERO-DRAWDOWN setups, use SMC, identify CHoCH after Liquidity Sweep. Provide Entry, SL, and 3 TPs with visual Y-coordinates (0-1). Identify 2-3 Candlestick Patterns with X/Y coordinates (0-1).`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("The AI returned an empty response.");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    throw new Error(error.message || "An unexpected error occurred during analysis.");
  }
};
