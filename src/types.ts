export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  experienceLevel: 'BEGINNER' | 'ADVANCED';
  tradingGoal: 'INCOME' | 'GROWTH' | 'DISCIPLINE';
  favorites?: string[]; // Array of AnalysisRecord IDs
  accountBalance?: number;
  aiSettings?: {
    breakoutSensitivity: number;
    reversalSensitivity: number;
    anomalySensitivity: number;
  };
}

export interface AnalysisResult {
  identifiedPair: string;
  timeframe: string;
  trend: string;
  momentum: string;
  smcConfirmation?: string;
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
  aiConfirmationScore: number;
}

export interface SMCIndicator {
  type: 'OB' | 'FVG' | 'LIQUIDITY' | 'MSS' | 'STOP_HUNT';
  subType: 'BULLISH' | 'BEARISH' | 'EQH' | 'EQL' | 'IRL' | 'ERL' | 'INDUCEMENT' | 'BOS';
  top: number;
  bottom: number;
  time: number;
  significance: string;
  isDisplacement?: boolean;
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
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
  isFavorite?: boolean;
  aiFeedback?: string; // User feedback for the AI
}

export interface JournalEntry {
  id?: string;
  userId: string;
  title: string;
  content: string;
  timestamp: any;
  tags?: string[];
  analysisId?: string; // Optional link to an analysis
}

export interface SimulatedTrade {
  id?: string;
  userId: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: 'OPEN' | 'CLOSED';
  outcome?: 'WIN' | 'LOSS';
  pnl?: number;
  pnlPercentage?: number;
  positionSize?: number;
  analysisId?: string;
  notes?: string;
  timestamp: any;
  closedAt?: any;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
