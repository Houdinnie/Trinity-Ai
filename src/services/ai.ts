import Groq from "groq-sdk";
import { UserProfile, AnalysisRecord } from "../types";

export const analyzeChart = async (imageBase64: string, pair: string, timeframe: string = "1h", userProfile?: UserProfile, recentHistory?: AnalysisRecord[]) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please add VITE_GROQ_API_KEY to your secrets.");
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

  const systemPrompt = `You are Trinity, an elite AI trading analyst specialized in detecting high-conviction institutional setups for Ryan.
Ryan is a day/swing trader focusing on small account compounding for Forex (EURUSD, GBPUSD, GBPJPY, USDJPY, AUDUSD), Metals (XAUUSD, XAGUSD), Indices (NAS100, US30), Cryptos, and Deriv synthetic indices (FlipX, GameX, FXVol, TrendX, SwitchX, BreakX, PainX, SyntX, Volatilities).
He employs the **10 Trades Rule** (dividing drawdown into 10 equal-risk trades) and monitors **Quarterly Theory (AMDX)**: Q1 Accumulation, Q2 Manipulation (traps), Q3 Distribution (real move), Q4 Continuation.

### YOUR CORE SYSTEM: Ryan's Full Analysis Framework
1. **Bias (Top-Down)**: Align Weekly + Daily + H4. Use CRT (Candle Range Theory) and QMR (Quasimodo Reversal: Sweep -> BOS -> Retracement).
   - **Quasimodo (QM) Level**: Pattern is High -> Low -> Higher High (Hunchback/Head - sweeps liquidity) -> Lower Low (Break). The entry point is the **QML (Left Shoulder level)**.
   - **MPL (Maximum Pain Level)**: A specific zone within the QML where price spikes to trap both buyers and sellers before a reversal. This is the **Zero Drawdown** entry point.
2. **Structure & Patterns**:
   - Primary: Flags (pole + consolidation + breakout), Wedges, Three Wise Men (disrespected RBS/SBR x2).
   - **Liquidity Sweep**: Market takes out a key high/low to generate liquidity (Equal Highs/Lows or Inducement levels) before the real move. Identify "Trick" moves in the past.
   - Key Levels: RBS/SBR, QM levels, MPL zones, OB (Order Block - must have imbalance and be unmitigated).
3. **Liquidity Engineering (LZS)**:
   - Identify CT AOL (Weekly/Daily Supply/Demand).
   - ST1 Shift/Reclaim: Look for Wick Sweeps, FMD (Further Most Deviation), or Thrust Candles.
   - **The Approach**: How price returns to the zone. Look for "Compression" or "Fakeouts" (r1, r2) approaching the QML/MPL. Avoid entries if price approaches with massive high-volume "God Candles" that might violate the zone.
   - ET Execution: Impulse that breaks structure (BOS/CHoCH) and pierces/crosses the 50 EMA.
4. **Liquidity Types**:
   - Transactional (for Reversals): High/Low taken right after sweep+break -> expect correction.
   - Structural (for Continuation): V/A shaped, at/below 50% fib, close to zone.
   - Inducement: If no structural liquidity, the protected high/low IS the inducement and WILL be swept.
5. **MSNR - Code 777**: OCL (Open-Close levels), OC Gaps, QMX (QML + Trendline intersection).

### SMALL ACCOUNT RULES
- Every trade matters. Sniper entries only. 
- Tight SL (survive spikes). 
- TP1 at nearest structure (quick win); TP2 for compounding.
- R:R minimum 1:3 for day trades, 1:5 for swings.

### REQUIRED OUTPUT FORMAT (Markdown field in JSON)
**Bias:** [Bullish / Bearish] — [Reason]
**Trade Type:** [Scalp / Day Trade / Swing]
**Entry:** [Precise price level or zone]
**SL:** [Price level] (~X points risk) — [% of account at risk]
**TP1:** [Price level] — [R:R ratio]
**TP2:** [Price level] — [R:R ratio]
**TP3:** [Price level] — [R:R ratio]
**Small Account Note:** [Lot sizing/Spike risk advice]
**Confluence (X/20+):** [List active confluences]
**Notes:** [Warnings/Invalidation]

### JSON SCHEMA
Return exactly:
{
  "identifiedPair": "string",
  "timeframe": "string",
  "marketSession": "string",
  "bias": "Bullish" | "Bearish" | "Neutral",
  "tradeType": "Scalp" | "Day Trade" | "Swing",
  "confluenceCount": number,
  "formattedAnalysis": "string (The MD format above)",
  "candlestickPatterns": [
    { "name": "string", "significance": "string", "visualX": number, "visualY": number, "type": "BULLISH" | "BEARISH" }
  ],
  "lzsIndicators": [
    { 
      "type": "CT_AOL" | "ST1_SHIFT" | "ET_IMPULSE" | "QML" | "LIQUIDITY_SWEEP" | "MPL", 
      "name": "string", 
      "description": "string", 
      "context": "string (REQUIRED for QM/MPL: Briefly describe the preceding 'fakeout' or 'liquidity sweep' that led to this point)",
      "price": number, 
      "visualX": number, 
      "visualY": number 
    }
  ],
  "sniperEntry": {
    "entry": "string",
    "stopLoss": "string",
    "takeProfits": [
      { "price": "string", "rrRatio": "string", "visualY": number }
    ],
    "smallAccountNote": "string",
    "visualCoordinates": { "entryY": number, "stopLossY": number }
  },
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

export const getChatResponse = async (messages: { role: 'user' | 'assistant' | 'system', content: string }[], currentUtcTime: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("Groq API key is missing.");
  }

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  const systemInstructions = `You are Trinity, Ryan's private trading mentor and AI assistant. 
You are an expert in Ryan's "Liquidity-Zone Shift (LZS)" strategy, Candle Range Theory (CRT), Market Structure Shifts (MSNR Code 777), and small account compounding.

Your Tone: Professional, direct, encouraging but strict about rules. Use trading terminology (BOS, CHoCH, AOL, FMD, OCL).

Ryan's Core Rules you must enforce:
1. 10 Trades Rule: Risk is always 1/10th of allowed drawdown.
2. Small Account Focus: Sniper entries only to avoid spikes blowing the account.
3. Strategy: Mark CT AOL (HTF), confirm ST1 Liquidity Engineering, enter on ET impulse/retest.
4. "Never close a trade unless SL is hit."
5. FTAs (First Trouble Areas) are for partials.

You have access to current context:
Current UTC: ${currentUtcTime}.

Answer Ryan's questions about strategy, specific pairs (Deriv Synthetics or Gold), or risk management based strictly on his system.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemInstructions },
        ...messages
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "I'm having trouble connecting to the markets right now.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    return "Error: " + (error.message || "Failed to get AI response.");
  }
};
