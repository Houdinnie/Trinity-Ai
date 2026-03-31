import { GoogleGenAI, Type } from "@google/genai";

export const analyzeChart = async (imageBase64: string, pair: string, timeframe: string = "1h") => {
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

  const model = "gemini-3.1-pro-preview"; // Using Pro for complex trading analysis
  const currentUtcTime = new Date().toUTCString();
  
  const systemInstruction = `You are Trinity, an ultimate AI chart analyzer specialized in "sniper entries" for trading. 
Your analysis is based on Liquidity Engineering, Market Structure Shifts, and Multi-Timeframe Coordination.

Current UTC Time: ${currentUtcTime}.
Selected Timeframe: ${timeframe}.

First, identify the trading pair from the provided candlestick chart image (look for text, symbols, or watermarks like XAUUSD, GBPJPY, etc.). 
If the user provided a pair (${pair}), verify if it matches the image. If not, use the pair identified in the image.
Assume the chart is in the ${timeframe} timeframe unless clearly stated otherwise in the image.

Follow these specific modules for your analysis:

1. **Market Session & Condition**:
   - Determine which market session is currently active (Asian, London, New York) based on the identified pair and the provided UTC time.
   - Analyze if the current market is volatile or consolidating.
   - Provide a brief performance summary for the active session.

2. **Candlestick Pattern Recognition**:
   - Identify 2-3 prominent candlestick patterns (e.g., Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing, Morning/Evening Star).
   - For each pattern, provide its name, its significance in the current context, and its estimated visual coordinates (X and Y, from 0 to 1).

3. **Liquidity Engineering (The "Trap" Detection)**:
   - Look for institutional manipulation at key Support/Resistance levels.
   - Identify 'false signals' (Level Overthrow, Thrust Candlestick).
   - Check for CHoCH (Change of Character) following a sweep.
   - Only validate a signal after engineering has occurred.

4. **Market Shift & Reclaim Module (Trend Reversal)**:
   - Identify the Shift Point (previous trend's invalidation point).
   - Check the Reclaim Point (dominance reassertion).
   - Entry Trigger: Only when the Reclaim Point is secured.

5. **Multi-Timeframe "Cycle" Coordination**:
   - Establish directional bias (Weekly/Monthly).
   - Refine on Daily/H4 (Area of Liquidity - AOL).
   - Sniper Entry on H1/M15 (Market Shift within higher timeframe AOL).

6. **Type 1 Engulfing Entry**:
   - Scan for Type 1 Engulfing AOL.
   - For Bearish: Two bearish candles, second has a Large Wick sweeping first, second closes below first's range.

7. **Managing "Trouble Areas" (FTAs)**:
   - Identify First Trouble Areas (FTAs) that could oppose the trade.
   - Suggest partial profits or stop-loss adjustments.

8. **AI Predictive Indicators**:
   - Calculate the Probability of a Breakout (0-100%) based on consolidation patterns and volume.
   - Calculate the Probability of a Trend Reversal (0-100%) based on exhaustion signals and divergence.
   - Determine an Anomaly Score (0-100) for unusual price action or volume spikes.
   - Identify the current Institutional Flow phase (ACCUMULATION, DISTRIBUTION, or NEUTRAL).

Return your analysis in a structured JSON format.`;

  // Extract mimeType from data URL
  const mimeTypeMatch = imageBase64.match(/data:([^;]+);base64,/);
  const mimeType = mimeTypeMatch?.[1] || "image/jpeg";
  const base64Data = imageBase64.split(",")[1] || imageBase64;

  if (!mimeType.startsWith("image/")) {
    throw new Error("Invalid file format. Please upload an image file (PNG, JPEG, etc.).");
  }

  // Check image size (approximate from base64)
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > 4 * 1024 * 1024) { // 4MB limit for Gemini API
    throw new Error("The image is too large for the AI to process. Please upload a smaller screenshot (under 4MB).");
  }

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
            text: `Identify the trading pair in this screenshot and analyze it for a sniper entry. 
Current UTC Time is ${currentUtcTime}. 
Provide trend direction, support/resistance levels, market session performance, candlestick patterns, and potential trading opportunities (Entry, SL, multiple TPs).

IMPORTANT: Identify 2-3 key candlestick patterns and their significance.
Suggest 2-3 Take Profit (TP) levels with their corresponding Risk-Reward (RR) ratios. 
Estimate the normalized Y-coordinates (0 to 1, where 0 is the top of the image and 1 is the bottom) for the Entry, Stop Loss, and each Take Profit level based on the price axis visible in the chart.
For candlestick patterns, estimate both X and Y coordinates (0 to 1).`,
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedPair: { type: Type.STRING, description: "The trading pair identified from the screenshot" },
            timeframe: { type: Type.STRING, description: "The timeframe of the chart analyzed (e.g., 15m, 1h, 4h, 1d)" },
            marketSession: { type: Type.STRING, description: "Current active market session and its performance" },
            marketCondition: { type: Type.STRING, description: "Whether the market is volatile or consolidating" },
            trend: { type: Type.STRING, description: "Current trend direction and momentum" },
            momentum: { type: Type.STRING, description: "Analysis of price momentum" },
            supportResistance: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Key support and resistance levels identified"
            },
            candlestickPatterns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the candlestick pattern (e.g., Doji, Hammer)" },
                  significance: { type: Type.STRING, description: "The significance of this pattern in the current context" },
                  visualX: { type: Type.NUMBER, description: "Estimated X coordinate (0-1) for the pattern on the image" },
                  visualY: { type: Type.NUMBER, description: "Estimated Y coordinate (0-1) for the pattern on the image" },
                  type: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"], description: "The sentiment of the pattern" }
                },
                required: ["name", "significance", "visualX", "visualY", "type"]
              },
              description: "Identified candlestick patterns on the chart"
            },
            liquidityEngineering: { type: Type.STRING, description: "Analysis of liquidity traps and sweeps" },
            marketShift: { type: Type.STRING, description: "Analysis of market structure shifts" },
            aiIndicators: {
              type: Type.OBJECT,
              properties: {
                breakoutProbability: { type: Type.NUMBER, description: "Probability of a breakout (0-100)" },
                reversalProbability: { type: Type.NUMBER, description: "Probability of a trend reversal (0-100)" },
                anomalyScore: { type: Type.NUMBER, description: "Score representing unusual price action (0-100)" },
                predictiveInsights: { type: Type.STRING, description: "Brief predictive analysis based on current chart state" },
                institutionalFlow: { type: Type.STRING, enum: ["ACCUMULATION", "DISTRIBUTION", "NEUTRAL"], description: "Current institutional flow phase" }
              },
              required: ["breakoutProbability", "reversalProbability", "anomalyScore", "predictiveInsights", "institutionalFlow"]
            },
            sniperEntry: {
              type: Type.OBJECT,
              properties: {
                entry: { type: Type.STRING, description: "Potential entry price or zone" },
                stopLoss: { type: Type.STRING, description: "Suggested stop-loss level" },
                takeProfits: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      price: { type: Type.STRING, description: "Take profit price target" },
                      rrRatio: { type: Type.STRING, description: "Risk-reward ratio for this target (e.g., 1:2.5)" },
                      visualY: { type: Type.NUMBER, description: "Estimated Y coordinate (0-1) for this TP level on the image" }
                    },
                    required: ["price", "rrRatio", "visualY"]
                  },
                  description: "Suggested 2-3 take-profit targets with RR ratios and visual coordinates"
                },
                reasoning: { type: Type.STRING, description: "Detailed reasoning for this entry" },
                visualCoordinates: {
                  type: Type.OBJECT,
                  properties: {
                    entryY: { type: Type.NUMBER, description: "Estimated Y coordinate (0-1) for entry level on the image" },
                    stopLossY: { type: Type.NUMBER, description: "Estimated Y coordinate (0-1) for stop loss level on the image" }
                  },
                  required: ["entryY", "stopLossY"]
                }
              },
              required: ["entry", "stopLoss", "takeProfits", "reasoning", "visualCoordinates"]
            },
            troubleAreas: { type: Type.STRING, description: "First Trouble Areas (FTAs) to watch" }
          },
          required: ["identifiedPair", "marketSession", "marketCondition", "trend", "momentum", "supportResistance", "candlestickPatterns", "liquidityEngineering", "marketShift", "sniperEntry", "troubleAreas"]
        }
      },
    });

    if (!response.text) {
      throw new Error("The AI returned an empty response. This usually happens if the image content is unclear or violates safety guidelines.");
    }

    try {
      return JSON.parse(response.text);
    } catch (parseError) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("Failed to parse the AI analysis. The model might have returned an invalid data format.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Handle specific Gemini error codes/messages
    const message = error.message || "";
    
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new Error("API Quota exceeded. Please wait a moment before trying again.");
    }
    if (message.includes("403") || message.toLowerCase().includes("permission")) {
      throw new Error("API Permission denied. Please check your API key configuration.");
    }
    if (message.toLowerCase().includes("safety")) {
      throw new Error("The analysis was blocked by safety filters. Please ensure the image contains only trading charts.");
    }
    if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    if (message.toLowerCase().includes("overloaded") || message.includes("503")) {
      throw new Error("The AI model is currently overloaded. Please try again in a few seconds.");
    }

    throw new Error(message || "An unexpected error occurred during analysis.");
  }
};
