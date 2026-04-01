import React, { useState, useRef } from 'react';
import { 
  Upload, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  History, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  Target,
  ArrowRightLeft,
  BookOpen,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Brain,
  Sparkles,
  User,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { analyzeChart } from '../services/gemini';
import { cn } from '../lib/utils';
import { ChartOverlay } from '../components/ChartOverlay';
import { RiskCalculator } from '../components/RiskCalculator';
import { PriceAlerts } from '../components/PriceAlerts';
import type { AnalysisResult, AnalysisRecord, UserProfile } from '../types';

interface DashboardProps {
  user: any;
  profile: UserProfile | null;
  history: AnalysisRecord[];
  currentPrices: Record<string, number>;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onUpdateOutcome: (id: string, outcome: 'WIN' | 'LOSS') => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export function Dashboard({ user, profile, history, currentPrices, onUpdateProfile, onUpdateOutcome, onDeleteRecord }: DashboardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState('AUTO');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pairs = ['AUTO', 'XAUUSD', 'GBPJPY', 'GBPUSD', 'EURUSD', 'BTCUSD', 'ETHUSD', 'V75', 'BOOM1000', 'CRASH500'];

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        setUploadError("Image too large. Please upload an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setUploadError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !user) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeChart(selectedImage, selectedPair, selectedTimeframe, profile || undefined, history);
      setAnalysisResult(result);

      const docRef = await addDoc(collection(db, 'analyses'), {
        userId: user.uid,
        imageUrl: selectedImage,
        pair: result.identifiedPair || selectedPair,
        timeframe: result.timeframe || selectedTimeframe,
        result: JSON.stringify(result),
        timestamp: serverTimestamp()
      });
      setCurrentAnalysisId(docRef.id);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      const errorMessage = err.message || "Analysis failed. Please try again.";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setUploadError("API Key is invalid or not selected. Please select a valid API key.");
      } else {
        setUploadError(`Analysis Error: ${errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDerivUrl = (pair: string) => {
    const p = pair.toUpperCase();
    if (p.includes('VOLATILITY') || p.includes('BOOM') || p.includes('CRASH') || p.includes('STEP') || p.includes('JUMP') || p === 'V75' || p === 'BOOM1000' || p === 'CRASH500') {
      let symbol = '';
      if (p.includes('VOLATILITY 10 (1S)')) symbol = '1HZ10V';
      else if (p.includes('VOLATILITY 10')) symbol = 'R_10';
      else if (p.includes('VOLATILITY 25 (1S)')) symbol = '1HZ25V';
      else if (p.includes('VOLATILITY 25')) symbol = 'R_25';
      else if (p.includes('VOLATILITY 50 (1S)')) symbol = '1HZ50V';
      else if (p.includes('VOLATILITY 50')) symbol = 'R_50';
      else if (p.includes('VOLATILITY 75 (1S)')) symbol = '1HZ75V';
      else if (p.includes('VOLATILITY 75') || p === 'V75') symbol = 'R_75';
      else if (p.includes('VOLATILITY 100 (1S)')) symbol = '1HZ100V';
      else if (p.includes('VOLATILITY 100')) symbol = 'R_100';
      else if (p.includes('BOOM 1000') || p === 'BOOM1000') symbol = 'BOOM1000';
      else if (p.includes('BOOM 500')) symbol = 'BOOM500';
      else if (p.includes('CRASH 1000')) symbol = 'CRASH1000';
      else if (p.includes('CRASH 500') || p === 'CRASH500') symbol = 'CRASH500';
      else if (p.includes('STEP')) symbol = 'RSTP';
      return `https://charts.deriv.com/deriv${symbol ? `?symbol=${symbol}` : ''}`;
    }
    return null;
  };

  const derivUrl = analysisResult ? getDerivUrl(analysisResult.identifiedPair || selectedPair) : null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <h1 className="text-5xl sm:text-7xl font-black mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent leading-tight">
            SNIPER ENTRIES POWERED BY AI
          </h1>
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            The ultimate AI chart analyzer for professional traders. 
            Upload your chart and let Trinity find your next high-probability move.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[
              { icon: TrendingUp, label: "Price Action", desc: "Instant trend analysis" },
              { icon: ShieldCheck, label: "S&R Zones", desc: "Precision levels" },
              { icon: Target, label: "Sniper Entry", desc: "Exact SL & TP" }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-colors group">
                <feature.icon className="w-8 h-8 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold mb-1">{feature.label}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Upload & Controls */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6 text-orange-500" />
            Upload Chart
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Pair</label>
              <div className="grid grid-cols-3 gap-2">
                {pairs.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPair(p)}
                    className={cn(
                      "py-2 rounded-xl text-sm font-bold border transition-all",
                      selectedPair === p 
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Timeframe</label>
              <div className="grid grid-cols-4 gap-2">
                {['15m', '1h', '4h', '1d'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={cn(
                      "py-2 rounded-xl text-sm font-bold border transition-all",
                      selectedTimeframe === tf 
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group",
                selectedImage ? "border-orange-500/50" : "border-white/10 hover:border-white/30"
              )}
            >
              {selectedImage ? (
                <>
                  <img src={selectedImage} className="w-full h-full object-cover" alt="Selected chart" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-sm font-bold">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="font-bold mb-1">Click to upload screenshot</p>
                  <p className="text-xs text-gray-500">TradingView, MetaTrader, etc.</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden" 
                accept="image/*"
              />
            </div>

            {uploadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-2 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
                <button 
                  onClick={() => setUploadError(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!hasApiKey && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-orange-500">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-bold">API Key Required</p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This analysis uses Gemini AI models which require a valid API key from a paid Google Cloud project for the best results.
                </p>
                <button
                  onClick={handleSelectKey}
                  className="w-full py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all"
                >
                  Select API Key
                </button>
              </div>
            )}

            <button
              disabled={!selectedImage || isAnalyzing || !hasApiKey}
              onClick={handleAnalyze}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                !selectedImage || isAnalyzing
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-xl hover:shadow-orange-500/20"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing Market...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 fill-white" />
                  Generate Sniper Entry
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Recent Analyses
          </h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No history yet</p>
            ) : (
              history.map((record) => (
                <button
                  key={record.id}
                  onClick={() => {
                    setAnalysisResult(JSON.parse(record.result));
                    setSelectedImage(record.imageUrl);
                    setSelectedPair(record.pair);
                    setSelectedTimeframe(record.timeframe || '1h');
                  }}
                  className="w-full p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-all flex items-center gap-3 text-left group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                    <img src={record.imageUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="History" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm">{record.pair} • {record.timeframe}</span>
                      <span className="text-[10px] text-gray-500">
                        {record.timestamp?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {JSON.parse(record.result).trend}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOutcome(record.id, 'WIN');
                          }}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1",
                            record.outcome === 'WIN' 
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                              : "text-gray-500 hover:text-green-400 hover:bg-green-500/10"
                          )}
                        >
                          < ShieldCheck className="w-2.5 h-2.5" />
                          WIN
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOutcome(record.id, 'LOSS');
                          }}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1",
                            record.outcome === 'LOSS' 
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                              : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          )}
                        >
                          <X className="w-2.5 h-2.5" />
                          LOSS
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRecord(record.id);
                        }}
                        className="p-2 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <PriceAlerts user={user} currentPrices={currentPrices} />
      </div>

      {/* Right Column: Results */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {analysisResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Sniper Entry Card */}
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Target className="w-24 h-24 sm:w-32 sm:h-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sniper Entry Triggered</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full border border-white/10 backdrop-blur-md">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">AI Confirmation</span>
                      <span className={cn(
                        "text-xs font-black",
                        analysisResult.aiConfirmationScore >= 80 ? "text-green-400" :
                        analysisResult.aiConfirmationScore >= 60 ? "text-yellow-400" :
                        "text-red-400"
                      )}>
                        {analysisResult.aiConfirmationScore}%
                      </span>
                    </div>
                    {history.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30 backdrop-blur-md">
                        <Brain className="w-3 h-3 text-blue-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Trinity Learning Active</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h3 className="text-2xl sm:text-4xl font-black">
                      {analysisResult.identifiedPair || selectedPair} SETUP
                    </h3>
                    {derivUrl && (
                      <a 
                        href={derivUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-fit px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold flex items-center gap-2 transition-all backdrop-blur-md border border-white/10"
                      >
                        <Maximize2 className="w-4 h-4" />
                        Trade on Deriv
                      </a>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] sm:text-xs text-white/60 uppercase font-bold mb-1">Entry Zone</p>
                      <p className="text-xl sm:text-2xl font-black">{analysisResult.sniperEntry.entry}</p>
                    </div>
                    <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <p className="text-[10px] sm:text-xs text-white/60 uppercase font-bold mb-1">Stop Loss</p>
                      <p className="text-xl sm:text-2xl font-black text-red-200">{analysisResult.sniperEntry.stopLoss}</p>
                    </div>
                    {analysisResult.sniperEntry.takeProfits.map((tp, i) => (
                      <div key={i} className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] sm:text-xs text-white/60 uppercase font-bold">Take Profit {i + 1}</p>
                          <span className="text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">RR {tp.rrRatio}</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-green-200">{tp.price}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 p-4 bg-black/20 rounded-2xl border border-white/10">
                    <p className="text-sm font-medium leading-relaxed italic">
                      "{analysisResult.sniperEntry.reasoning}"
                    </p>
                  </div>

                  {/* Quick Outcome Feedback */}
                  {currentAnalysisId && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-white/60" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Train Trinity AI</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40 uppercase font-bold">Mark Outcome:</span>
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                            <button 
                              onClick={() => onUpdateOutcome(currentAnalysisId, 'WIN')}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2",
                                history.find(h => h.id === currentAnalysisId)?.outcome === 'WIN'
                                  ? "bg-green-500 text-white shadow-lg shadow-green-500/40"
                                  : "text-white/40 hover:text-green-400 hover:bg-green-500/10"
                              )}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              WIN
                            </button>
                            <button 
                              onClick={() => onUpdateOutcome(currentAnalysisId, 'LOSS')}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2",
                                history.find(h => h.id === currentAnalysisId)?.outcome === 'LOSS'
                                  ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                                  : "text-white/40 hover:text-red-400 hover:bg-red-500/10"
                              )}
                            >
                              <X className="w-3 h-3" />
                              LOSS
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Position Size Calculator */}
              {profile && (
                <RiskCalculator 
                  profile={profile} 
                  analysis={analysisResult} 
                  onUpdateProfile={onUpdateProfile} 
                />
              )}

              {/* Visual Chart Setup */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                  <Zap className="w-5 h-5" />
                  Visual Execution Map
                </h4>
                <ChartOverlay 
                  result={analysisResult} 
                  imageUrl={selectedImage || ''} 
                  pair={analysisResult.identifiedPair || selectedPair}
                  analysisId={currentAnalysisId || undefined}
                  profile={profile || undefined}
                  onUpdateProfile={onUpdateProfile}
                />
              </div>

              {/* Detailed Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                  <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                    <TrendingUp className="w-5 h-5" />
                    Market Context
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Active Session</p>
                        <p className="text-sm font-bold">{analysisResult.marketSession}</p>
                      </div>
                      <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Condition</p>
                        <p className="text-sm font-bold">{analysisResult.marketCondition}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Trend & Momentum</p>
                      <p className="text-sm leading-relaxed">{analysisResult.trend}</p>
                      <p className="text-sm text-gray-400 mt-2">{analysisResult.momentum}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                  <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                    <Brain className="w-5 h-5" />
                    AI Predictive Intelligence
                  </h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-4 border-b border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Overall AI Confirmation</p>
                        <div className="relative inline-flex items-center justify-center">
                          <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90">
                            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/5" sm:cx="48" sm:cy="48" sm:r="42" sm:stroke-width="6" />
                            <circle 
                              cx="40" 
                              cy="40" 
                              r="36" 
                              stroke="currentColor" 
                              strokeWidth="5" 
                              fill="transparent" 
                              strokeDasharray={226.2} 
                              strokeDashoffset={226.2 * (1 - analysisResult.aiConfirmationScore / 100)} 
                              className={cn(
                                "transition-all duration-1000",
                                analysisResult.aiConfirmationScore >= 80 ? "text-green-500" :
                                analysisResult.aiConfirmationScore >= 60 ? "text-yellow-500" :
                                "text-red-500"
                              )} 
                              sm:cx="48" sm:cy="48" sm:r="42" sm:stroke-width="6" sm:stroke-dasharray={263.9} sm:stroke-dashoffset={263.9 * (1 - analysisResult.aiConfirmationScore / 100)}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-xl sm:text-2xl font-black">{analysisResult.aiConfirmationScore}%</span>
                            <span className="text-[8px] font-bold uppercase text-gray-500">Confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-3xl border border-white/10 border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Zap className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ready for Analysis</h3>
              <p className="text-gray-500 max-w-sm">
                Upload a chart screenshot and select your pair to generate a professional AI analysis with sniper entry triggers.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
