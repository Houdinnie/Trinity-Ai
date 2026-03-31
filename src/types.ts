export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface AnalysisResult {
  identifiedPair: string;
  timeframe: string;
  trend: string;
  momentum: string;
  supportResistance: string[];
  liquidityEngineering: string;
  marketShift: string;
  marketSession: string;
  marketCondition: string;
  candlestickPatterns: {
    name: string;
    significance: string;
    visualX: number;
    visualY: number;
    type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }[];
  sniperEntry: {
    entry: string;
    stopLoss: string;
    takeProfits: {
      price: string;
      rrRatio: string;
      visualY?: number;
    }[];
    reasoning: string;
    visualCoordinates?: {
      entryY: number;
      stopLossY: number;
    };
  };
  troubleAreas: string;
  aiIndicators: {
    breakoutProbability: number;
    reversalProbability: number;
    anomalyScore: number;
    predictiveInsights: string;
    institutionalFlow: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  };
}

export interface PriceAlert {
  id?: string;
  userId: string;
  pair: string;
  condition: 'ABOVE' | 'BELOW';
  value: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: any;
}

export interface AnalysisRecord {
  id?: string;
  userId: string;
  imageUrl: string;
  pair: string;
  timeframe: string;
  result: string; // JSON string of AnalysisResult
  timestamp: any; // Firestore Timestamp
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
