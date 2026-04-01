import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, AnalysisRecord } from "../types";

export const analyzeChart = async (imageBase64: string, pair: string, timeframe: string = "1h", userProfile?: UserProfile, recentHistory?: AnalysisRecord[]) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please configure it in the application settings or select a key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  if (!imageBase64) {
    throw new Error("No image data provided. Please upload a chart screenshot.");
  }

  if (!ai || !ai.models) {
    throw new Error("AI service is not initialized correctly. Please check your configuration.");
  }

  const model = "gemini-3-flash-preview"; 
  const currentUtcTime = new Date().toUTCString();
  const aiSettings = userProfile?.aiSettings || { breakoutSensitivity: 50, reversalSensitivity: 50, anomalySensitivity: 50 };
  
  // Format recent history for AI learning
  let historyContext = "";
  if (recentHistory && recentHistory.length > 0) {
    const feedbackSummary = recentHistory
      .filter(h => h.outcome || h.aiFeedback)
      .slice(0, 5) // Last 5 relevant records
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
The following is a summary of your recent analyses and their outcomes/user feedback. 
Use this to refine your current predictions, avoid past mistakes, and double-down on successful patterns:
${feedbackSummary}
`;
    }
  }

  const systemInstruction = `You are Trinity, an elite AI chart analyzer specialized in "Zero-Drawdown Smart Money Sniper Entries."
Your analysis integrates advanced Smart Money Concepts (SMC), Liquidity Engineering, and Market Structure Shifts (MSS/CHoCH) to protect small accounts.

Current UTC Time: ${currentUtcTime}.
Selected Timeframe: ${timeframe}.

Identify the pair and timeframe from the image. If provided (${pair}), verify it.
${historyContext}

Core Analysis Modules:

1. **SMC Market Structure**:
   - Identify Trend (Bullish/Bearish/Range).
   - Locate Break of Structure (BOS) and Change of Character (CHoCH).
   - Identify Inducement (IDM) levels where retail is trapped.

2. **Liquidity & POIs**:
   - Locate High-Probability Points of Interest (POI): Order Blocks (OB), Breaker Blocks (BB), or Mitigation Blocks (MB).
   - Identify Liquidity Voids / Fair Value Gaps (FVG) that need filling.
   - Detect Liquidity Sweeps (Equal Highs/Lows, Trendline Liquidity).

3. **Zero-Drawdown Entry Logic**:
   - **Trigger**: Price must sweep liquidity, create a CHoCH on lower timeframes, and tap a refined POI (OB/BB).
   - **Precision**: Entry must be at the "Extreme" of the POI to ensure minimal drawdown.

4. **Predictive Indicators**:
   - Breakout/Reversal probabilities.
   - Institutional Flow (Accumulation/Distribution).
   - Anomaly Score for manipulation detection.
   - **AI Confirmation Score**: A value from 0-100 representing the total confluence of signals (SMC, Liquidity, Sentiment, Probability).

   **User Sensitivity Preferences**:
   - Breakout Detection Sensitivity: ${aiSettings.breakoutSensitivity}% (Higher means more aggressive breakout identification).
   - Reversal Detection Sensitivity: ${aiSettings.reversalSensitivity}% (Higher means more aggressive reversal identification).
   - Anomaly Detection Sensitivity: ${aiSettings.anomalySensitivity}% (Higher means more sensitive to market manipulation/anomalies).
   
   Adjust your internal thresholds for these indicators based on these percentages.

Return a structured JSON response.`;

  // Extract mimeType from data URL
  const mimeTypeMatch = imageBase64.match(/data:([^;]+);base64,/);
  const mimeType = mimeTypeMatch?.[1] || "image/jpeg";
  const base64Data = imageBase64.split(",")[1] || imageBase64;

  if (!mimeType.startsWith("image/")) {
    throw new Error("Invalid file format. Please upload an image file (PNG, JPEG, etc.).");
  }

  // Check image size (approximate from base64)
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > 10 * 1024 * 1024) { // 10MB limit for Gemini API
    throw new Error("The image is too large for the AI to process. Please upload a smaller screenshot (under 10MB).");
  }

  const maxRetries = 2;
  let retryCount = 0;

  const executeAnalysis = async (): Promise<any> => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `Analyze this chart for a High-Probability SMC Sniper Entry. 
Identify Pair, Timeframe, and Market Session.
Current UTC: ${currentUtcTime}.

Requirements:
- Focus on ZERO-DRAWDOWN setups for small accounts.
- Use SMC (Order Blocks, Breaker Blocks, FVGs).
- Identify CHoCH after a Liquidity Sweep.
- Provide Entry, SL, and 3 TPs with visual Y-coordinates (0-1).
- Identify 2-3 Candlestick Patterns with X/Y coordinates (0-1).`,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identifiedPair: { type: Type.STRING, description: "The trading pair identified" },
              timeframe: { type: Type.STRING, description: "The chart timeframe" },
              marketSession: { type: Type.STRING, description: "Active session and performance" },
              marketCondition: { type: Type.STRING, description: "Volatility/Consolidation state" },
              trend: { type: Type.STRING, description: "Trend direction" },
              momentum: { type: Type.STRING, description: "Price momentum analysis" },
              smcConfirmation: { type: Type.STRING, description: "SMC factors used (OB, BB, FVG, IDM)" },
              supportResistance: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Key levels"
              },
              candlestickPatterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    significance: { type: Type.STRING },
                    visualX: { type: Type.NUMBER },
                    visualY: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] }
                  },
                  required: ["name", "significance", "visualX", "visualY", "type"]
                }
              },
              liquidityEngineering: { type: Type.STRING, description: "Liquidity traps/sweeps" },
              marketShift: { type: Type.STRING, description: "MSS/CHoCH analysis" },
              aiIndicators: {
                type: Type.OBJECT,
                properties: {
                  breakoutProbability: { type: Type.NUMBER },
                  reversalProbability: { type: Type.NUMBER },
                  anomalyScore: { type: Type.NUMBER },
                  predictiveInsights: { type: Type.STRING },
                  institutionalFlow: { type: Type.STRING, enum: ["ACCUMULATION", "DISTRIBUTION", "NEUTRAL"] }
                },
                required: ["breakoutProbability", "reversalProbability", "anomalyScore", "predictiveInsights", "institutionalFlow"]
              },
              sniperEntry: {
                type: Type.OBJECT,
                properties: {
                  entry: { type: Type.STRING },
                  stopLoss: { type: Type.STRING },
                  takeProfits: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        price: { type: Type.STRING },
                        rrRatio: { type: Type.STRING },
                        visualY: { type: Type.NUMBER }
                      },
                      required: ["price", "rrRatio", "visualY"]
                    }
                  },
                  reasoning: { type: Type.STRING },
                  visualCoordinates: {
                    type: Type.OBJECT,
                    properties: {
                      entryY: { type: Type.NUMBER },
                      stopLossY: { type: Type.NUMBER }
                    },
                    required: ["entryY", "stopLossY"]
                  }
                },
                required: ["entry", "stopLoss", "takeProfits", "reasoning", "visualCoordinates"]
              },
              troubleAreas: { type: Type.STRING, description: "FTAs to watch" },
              aiConfirmationScore: { 
                type: Type.NUMBER, 
                description: "Confluence score (0-100) based on SMC, liquidity, sentiment, and breakout probability" 
              }
            },
            required: ["identifiedPair", "marketSession", "marketCondition", "trend", "momentum", "smcConfirmation", "supportResistance", "candlestickPatterns", "liquidityEngineering", "marketShift", "sniperEntry", "troubleAreas", "aiConfirmationScore"]
          }
        },
      });

      if (!response || !response.text) {
        throw new Error("The AI returned an empty response. This usually happens if the image content is unclear or violates safety guidelines.");
      }

      return JSON.parse(response.text);
    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${retryCount + 1}):`, error);
      
      let message = error.message || "";
      try {
        if (typeof message === 'string' && message.startsWith('{')) {
          const parsed = JSON.parse(message);
          const rawMessage = parsed.error?.message || parsed.error || parsed.message || message;
          message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        }
      } catch (e) {}

      // Ensure message is a string for safe processing
      const msgStr = String(message);

      // Retry on network/proxy errors or overloaded
      const isRetryable = 
        msgStr.toLowerCase().includes("network") || 
        msgStr.toLowerCase().includes("fetch") || 
        msgStr.includes("Proxying failed") || 
        msgStr.includes("Load failed") ||
        msgStr.toLowerCase().includes("overloaded") || 
        msgStr.includes("503");

      if (isRetryable && retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeAnalysis();
      }

      if (msgStr.includes("429") || msgStr.toLowerCase().includes("quota")) {
        throw new Error("API Quota exceeded. Please wait a moment before trying again.");
      }
      if (msgStr.includes("403") || msgStr.toLowerCase().includes("permission") || msgStr.includes("API key not valid")) {
        throw new Error("API key not valid or permission denied. Please check your API key configuration.");
      }
      if (msgStr.toLowerCase().includes("safety")) {
        throw new Error("The analysis was blocked by safety filters. Please ensure the image contains only trading charts.");
      }
      if (msgStr.toLowerCase().includes("network") || msgStr.toLowerCase().includes("fetch") || msgStr.includes("Proxying failed") || msgStr.includes("Load failed")) {
        throw new Error("Network error or AI proxy failure. This might be a temporary issue with the service. Please try again in a moment.");
      }
      if (msgStr.toLowerCase().includes("overloaded") || msgStr.includes("503")) {
        throw new Error("The AI model is currently overloaded. Please try again in a few seconds.");
      }

      throw new Error(msgStr || "An unexpected error occurred during analysis.");
    }
  };

  return executeAnalysis();
};
