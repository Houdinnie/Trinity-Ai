import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocFromServer, doc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { analyzeChart } from './services/gemini';
import { cn } from './lib/utils';
import { 
  Upload, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  History, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Target,
  ArrowRightLeft,
  BookOpen,
  X,
  Bell,
  BellOff,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Power,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Brain,
  Gauge,
  Radar,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { LiveChart } from './components/LiveChart';
import { updateDoc, deleteDoc } from 'firebase/firestore';
import type { AnalysisResult, AnalysisRecord, PriceAlert } from './types';

// Error Boundary Component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('{"error":')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-2xl font-bold">System Error</h1>
          </div>
          <p className="text-gray-600 mb-6 font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-40">
            {errorInfo}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ChartOverlay({ result, imageUrl, pair }: { result: AnalysisResult; imageUrl: string; pair: string }) {
  const [mode, setMode] = useState<'static' | 'live'>('static');
  const coords = result.sniperEntry.visualCoordinates;
  if (!coords) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setMode('static')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              mode === 'static' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-gray-400 hover:text-white"
            )}
          >
            Static Analysis
          </button>
          <button
            onClick={() => setMode('live')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              mode === 'live' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-gray-400 hover:text-white"
            )}
          >
            Live Execution
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", mode === 'live' ? "bg-green-500" : "bg-orange-500")} />
          {mode === 'live' ? 'Real-time Feed' : 'AI Snapshot'}
        </div>
      </div>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/50">
        {mode === 'static' ? (
          <TransformWrapper
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            centerOnInit={true}
            minScale={0.5}
            maxScale={5}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                  <button 
                    onClick={() => zoomIn()}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/10 backdrop-blur-md transition-all"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => zoomOut()}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/10 backdrop-blur-md transition-all"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => resetTransform()}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/10 backdrop-blur-md transition-all"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Hint */}
                <div className="absolute bottom-4 left-4 z-20 px-3 py-1 bg-black/60 text-white/60 text-[10px] rounded-full border border-white/10 backdrop-blur-md pointer-events-none">
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    Scroll to zoom • Drag to pan
                  </div>
                </div>

                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  <div className="relative w-full h-full cursor-grab active:cursor-grabbing">
                    <img src={imageUrl} className="w-full h-full object-contain" alt="Analyzed chart" />
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* Entry Level */}
                      <line 
                        x1="0" y1={`${coords.entryY * 100}%`} 
                        x2="100%" y2={`${coords.entryY * 100}%`} 
                        stroke="#f97316" strokeWidth="2" strokeDasharray="4 4"
                      />
                      <text 
                        x="10" y={`${coords.entryY * 100 - 1}%`} 
                        fill="#f97316" fontSize="12" fontWeight="bold" className="drop-shadow-md"
                      >
                        ENTRY: {result.sniperEntry.entry}
                      </text>

                      {/* Stop Loss */}
                      <line 
                        x1="0" y1={`${coords.stopLossY * 100}%`} 
                        x2="100%" y2={`${coords.stopLossY * 100}%`} 
                        stroke="#ef4444" strokeWidth="2"
                      />
                      <text 
                        x="10" y={`${coords.stopLossY * 100 - 1}%`} 
                        fill="#ef4444" fontSize="12" fontWeight="bold" className="drop-shadow-md"
                      >
                        SL: {result.sniperEntry.stopLoss}
                      </text>

                      {/* Take Profits */}
                      {result.sniperEntry.takeProfits.map((tp, i) => (
                        <React.Fragment key={i}>
                          <line 
                            x1="0" y1={`${tp.visualY! * 100}%`} 
                            x2="100%" y2={`${tp.visualY! * 100}%`} 
                            stroke="#22c55e" strokeWidth="2"
                            strokeOpacity={1 - i * 0.2}
                          />
                          <text 
                            x="10" y={`${tp.visualY! * 100 - 1}%`} 
                            fill="#22c55e" fontSize="12" fontWeight="bold" className="drop-shadow-md"
                            fillOpacity={1 - i * 0.2}
                          >
                            TP{i + 1}: {tp.price}
                          </text>
                          <text 
                            x="100%" dx="-10" y={`${tp.visualY! * 100 - 1}%`} 
                            fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="end" className="drop-shadow-md"
                            fillOpacity={1 - i * 0.2}
                          >
                            RR: {tp.rrRatio}
                          </text>
                          {/* Risk/Reward Zone for each TP */}
                          <rect 
                            x="0" 
                            y={`${Math.min(coords.entryY, tp.visualY!) * 100}%`} 
                            width="100%" 
                            height={`${Math.abs(coords.entryY - tp.visualY!) * 100}%`} 
                            fill="#22c55e" fillOpacity={0.05}
                          />
                        </React.Fragment>
                      ))}

                      {/* Stop Loss Zone */}
                      <rect 
                        x="0" 
                        y={`${Math.min(coords.entryY, coords.stopLossY) * 100}%`} 
                        width="100%" 
                        height={`${Math.abs(coords.entryY - coords.stopLossY) * 100}%`} 
                        fill="#ef4444" fillOpacity="0.1"
                      />

                      {/* Candlestick Patterns */}
                      {result.candlestickPatterns?.map((pattern, i) => (
                        <g key={`pattern-${i}`}>
                          <circle 
                            cx={`${pattern.visualX * 100}%`} 
                            cy={`${pattern.visualY * 100}%`} 
                            r="6" 
                            fill={pattern.type === 'BULLISH' ? '#22c55e' : pattern.type === 'BEARISH' ? '#ef4444' : '#94a3b8'} 
                            className="animate-pulse"
                          />
                          <rect 
                            x={`${pattern.visualX * 100}%`} 
                            y={`${pattern.visualY * 100 - 25}%`} 
                            width="80" 
                            height="20" 
                            rx="4" 
                            fill="black" 
                            fillOpacity="0.8"
                            transform="translate(-40, 0)"
                          />
                          <text 
                            x={`${pattern.visualX * 100}%`} 
                            y={`${pattern.visualY * 100 - 11}%`} 
                            fill="white" 
                            fontSize="10" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {pattern.name}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
          <LiveChart result={result} pair={pair} />
        )}
      </div>
    </div>
  );
}

function PriceAlerts({ user, currentPrices }: { user: any; currentPrices: Record<string, number> }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newAlert, setNewAlert] = useState<{ pair: string; condition: 'ABOVE' | 'BELOW'; value: string }>({
    pair: 'BTCUSD',
    condition: 'ABOVE',
    value: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceAlert[];
      setAlerts(records);
    });
    return () => unsubscribe();
  }, [user]);

  // Check for triggered alerts
  useEffect(() => {
    alerts.forEach(async (alert) => {
      if (!alert.isActive || alert.isTriggered) return;
      const currentPrice = currentPrices[alert.pair];
      if (!currentPrice) return;

      let triggered = false;
      if (alert.condition === 'ABOVE' && currentPrice >= alert.value) triggered = true;
      if (alert.condition === 'BELOW' && currentPrice <= alert.value) triggered = true;

      if (triggered) {
        // Update alert in Firestore
        try {
          await updateDoc(doc(db, 'alerts', alert.id!), {
            isTriggered: true,
            isActive: false
          });
          // Show notification
          toast.success(`ALERT TRIGGERED: ${alert.pair} is ${alert.condition.toLowerCase()} ${alert.value}!`, {
            duration: 10000,
            icon: <Bell className="w-5 h-5 text-orange-500" />
          });
        } catch (err) {
          console.error("Failed to trigger alert:", err);
        }
      }
    });
  }, [currentPrices, alerts]);

  const handleAddAlert = async () => {
    if (!user || !newAlert.value) return;
    try {
      await addDoc(collection(db, 'alerts'), {
        userId: user.uid,
        pair: newAlert.pair,
        condition: newAlert.condition,
        value: parseFloat(newAlert.value),
        isActive: true,
        isTriggered: false,
        createdAt: serverTimestamp()
      });
      setNewAlert({ ...newAlert, value: '' });
      setIsAdding(false);
      toast.success("Alert created successfully!");
    } catch (err) {
      console.error("Failed to create alert:", err);
      toast.error("Failed to create alert.");
    }
  };

  const toggleAlert = async (alert: PriceAlert) => {
    try {
      await updateDoc(doc(db, 'alerts', alert.id!), {
        isActive: !alert.isActive,
        isTriggered: false // Reset trigger if re-activating
      });
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast.success("Alert deleted.");
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          Price Alerts
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <select 
              value={newAlert.pair}
              onChange={(e) => setNewAlert({ ...newAlert, pair: e.target.value })}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
            >
              {['XAUUSD', 'GBPJPY', 'GBPUSD', 'EURUSD', 'BTCUSD', 'ETHUSD'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select 
              value={newAlert.condition}
              onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as 'ABOVE' | 'BELOW' })}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="ABOVE">Price Above</option>
              <option value="BELOW">Price Below</option>
            </select>
          </div>
          <input 
            type="number"
            placeholder="Target Price"
            value={newAlert.value}
            onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
          />
          <button 
            onClick={handleAddAlert}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors"
          >
            Create Alert
          </button>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
            <BellOff className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id}
              className={cn(
                "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                alert.isTriggered ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"
              )}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase text-gray-400">{alert.pair}</span>
                  {alert.isTriggered && (
                    <span className="px-2 py-0.5 bg-orange-500 text-[10px] font-bold rounded-full uppercase">Triggered</span>
                  )}
                </div>
                <p className="font-bold flex items-center gap-2">
                  {alert.condition === 'ABOVE' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                  {alert.value.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleAlert(alert)}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    alert.isActive ? "bg-orange-500 text-white" : "bg-white/10 text-gray-400 hover:text-white"
                  )}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteAlert(alert.id!)}
                  className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PriceTicker({ onPriceUpdate }: { onPriceUpdate: (prices: Record<string, number>) => void }) {
  const [prices, setPrices] = useState<Record<string, { price: string; change: string }>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch Crypto from Binance
        const cryptoSymbols = ['BTCUSDT', 'ETHUSDT'];
        const cryptoData = await Promise.all(
          cryptoSymbols.map(s => fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`).then(r => r.json()))
        );

        // Fetch Forex from Coinbase (as a proxy for real-time rates)
        const forexResponse = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
        const forexData = await forexResponse.json();
        const rates = forexData.data.rates;

        const newPrices: Record<string, { price: string; change: string }> = {};

        // Crypto
        cryptoData.forEach(d => {
          const symbol = d.symbol.replace('USDT', 'USD');
          newPrices[symbol] = {
            price: parseFloat(d.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: parseFloat(d.priceChangePercent).toFixed(2)
          };
        });

        // Forex (Coinbase rates are 1 USD = X Currency, so we need 1 / X for USD pairs)
        const forexPairs = [
          { name: 'EURUSD', rate: 1 / parseFloat(rates.EUR) },
          { name: 'GBPUSD', rate: 1 / parseFloat(rates.GBP) },
          { name: 'GBPJPY', rate: (1 / parseFloat(rates.GBP)) * parseFloat(rates.JPY) },
          { name: 'XAUUSD', rate: 1 / parseFloat(rates.XAU) }
        ];

        forexPairs.forEach(p => {
          newPrices[p.name] = {
            price: p.rate.toLocaleString(undefined, { minimumFractionDigits: p.name === 'GBPJPY' ? 3 : 2, maximumFractionDigits: p.name === 'GBPJPY' ? 3 : 5 }),
            change: (Math.random() * 0.4 - 0.2).toFixed(2) // Simulated change since Coinbase rates are spot
          };
        });

        setPrices(newPrices);

        // Notify parent with raw numeric prices for alert checking
        const rawPrices: Record<string, number> = {};
        Object.entries(newPrices).forEach(([symbol, data]) => {
          rawPrices[symbol] = parseFloat(data.price.replace(/,/g, ''));
        });
        onPriceUpdate(rawPrices);
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex items-center flex-1 px-6 border-x border-white/10 overflow-hidden">
      <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
        {[...Object.entries(prices), ...Object.entries(prices)].map(([symbol, data], i) => {
          const priceData = data as { price: string; change: string };
          return (
            <div key={`${symbol}-${i}`} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">{symbol}</span>
              <span className="text-sm font-mono font-bold">{priceData.price}</span>
              <span className={cn(
                "text-[10px] font-bold",
                parseFloat(priceData.change) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {parseFloat(priceData.change) >= 0 ? '+' : ''}{priceData.change}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState('AUTO');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEducation, setShowEducation] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pairs = ['AUTO', 'XAUUSD', 'GBPJPY', 'GBPUSD', 'EURUSD', 'BTCUSD', 'ETHUSD'];

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Check API Key
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success per guidelines
    }
  };

  // Fetch History
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisRecord[];
      setHistory(records);
    }, (error) => {
      console.error('Firestore Error: ', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB limit for base64 storage
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
      const result = await analyzeChart(selectedImage, selectedPair, selectedTimeframe);
      setAnalysisResult(result);

      // Save to Firestore
      await addDoc(collection(db, 'analyses'), {
        userId: user.uid,
        imageUrl: selectedImage, // Storing base64 for now, ideally use Storage
        pair: result.identifiedPair || selectedPair,
        timeframe: result.timeframe || selectedTimeframe,
        result: JSON.stringify(result),
        timestamp: serverTimestamp()
      });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" theme="dark" richColors />
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
        {/* Navigation */}
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tighter uppercase italic">Trinity</span>
            </div>

            <PriceTicker onPriceUpdate={setCurrentPrices} />
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowEducation(!showEducation)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all",
                  showEducation ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Learn</span>
              </button>
              
              {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-gray-400">Welcome back</span>
                  <span className="text-sm font-medium">{user.displayName || user.email}</span>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all transform active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {showEducation ? (
              <motion.div
                key="education"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h1 className="text-5xl font-black mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                    TRINITY TRADING ACADEMY
                  </h1>
                  <p className="text-xl text-gray-400">
                    Master the core concepts behind our AI's sniper entry logic. 
                    Understand the institutional flow and market structure.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Liquidity Engineering */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 hover:border-orange-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Liquidity Engineering</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      Institutional manipulation where retail traders are induced into the wrong direction before a reversal. 
                      The market creates a "false signal" to sweep early participants.
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Example</p>
                        <p className="text-xs text-gray-300">Price turns just past a clear level (Level Overthrow) or a momentum candle breaks but closes back inside (Thrust Candlestick).</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Sniper Relation</p>
                        <p className="text-xs text-gray-300">Entering after the "trap" is sprung ensures you are on the side of institutional money, not the retail exit liquidity.</p>
                      </div>
                    </div>
                  </div>

                  {/* Market Structure Shifts */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 hover:border-orange-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <ArrowRightLeft className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Market Shifts (CHoCH)</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      The exact moment a trend flips. We identify the technical "Shift Point" and "Reclaim Point" to catch the exact moment dominance reasserts itself.
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Example</p>
                        <p className="text-xs text-gray-300">A close below a significant support level (Shift Point) followed by a return to close above the previous highest point (Reclaim Point).</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Sniper Relation</p>
                        <p className="text-xs text-gray-300">Catching the trend at its earliest reversal point allows for tight stop-losses and massive risk-to-reward ratios.</p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Timeframe Coordination */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 hover:border-orange-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">MTF Coordination</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      The "Power of Timeframes." Higher timeframes dictate the direction, while lower timeframes provide the precision entry trigger.
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Example</p>
                        <p className="text-xs text-gray-300">Weekly is Bullish -{'>'} Daily/H4 hits an Area of Liquidity (AOL) -{'>'} H1/M15 shows a Market Shift within that AOL.</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Sniper Relation</p>
                        <p className="text-xs text-gray-300">Only trigger an entry when at least two timeframes "talk the same language," ensuring high-probability alignment.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500/10 to-red-600/10 rounded-3xl border border-orange-500/20 p-8 text-center">
                  <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                    <Zap className="w-6 h-6 text-orange-500" />
                    The Trinity Edge
                  </h3>
                  <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                    By combining these three pillars, Trinity identifies "Sniper Entries" where the risk is minimal and the potential reward is maximized. 
                    We don't just look for patterns; we look for the institutional logic behind the price.
                  </p>
                  <button 
                    onClick={() => setShowEducation(false)}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Back to Analysis
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {!user ? (
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
                      <button 
                        onClick={signInWithGoogle}
                        className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 flex items-center gap-3 mx-auto"
                      >
                        Get Started Now
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                  </div>
                ) : (
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
                                This analysis uses the Gemini Pro model which requires a valid API key from a paid Google Cloud project.
                              </p>
                              <button
                                onClick={handleSelectKey}
                                className="w-full py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all"
                              >
                                Select API Key
                              </button>
                              <p className="text-[10px] text-center text-gray-500">
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">Learn about billing</a>
                              </p>
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
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
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
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Target className="w-32 h-32" />
                              </div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">Sniper Entry Triggered</span>
                                </div>
                                <h3 className="text-4xl font-black mb-8">
                                  {analysisResult.identifiedPair || selectedPair} SETUP
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                    <p className="text-xs text-white/60 uppercase font-bold mb-1">Entry Zone</p>
                                    <p className="text-2xl font-black">{analysisResult.sniperEntry.entry}</p>
                                  </div>
                                  <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                    <p className="text-xs text-white/60 uppercase font-bold mb-1">Stop Loss</p>
                                    <p className="text-2xl font-black text-red-200">{analysisResult.sniperEntry.stopLoss}</p>
                                  </div>
                                  {analysisResult.sniperEntry.takeProfits.map((tp, i) => (
                                    <div key={i} className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs text-white/60 uppercase font-bold">Take Profit {i + 1}</p>
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">RR {tp.rrRatio}</span>
                                      </div>
                                      <p className="text-2xl font-black text-green-200">{tp.price}</p>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="mt-8 p-4 bg-black/20 rounded-2xl border border-white/10">
                                  <p className="text-sm font-medium leading-relaxed italic">
                                    "{analysisResult.sniperEntry.reasoning}"
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Visual Chart Setup */}
                            <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                              <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                                <Zap className="w-5 h-5" />
                                Visual Execution Map
                              </h4>
                              <ChartOverlay result={analysisResult} imageUrl={selectedImage || ''} pair={analysisResult.identifiedPair || selectedPair} />
                            </div>

                            {/* Detailed Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Key Levels</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {analysisResult.supportResistance.map((level, i) => (
                                        <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-xs font-mono border border-white/10">
                                          {level}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                                  <BookOpen className="w-5 h-5" />
                                  Candlestick Patterns
                                </h4>
                                <div className="space-y-4">
                                  {analysisResult.candlestickPatterns?.map((pattern, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-bold">{pattern.name}</p>
                                        <span className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                          pattern.type === 'BULLISH' ? "bg-green-500/20 text-green-400" :
                                          pattern.type === 'BEARISH' ? "bg-red-500/20 text-red-400" :
                                          "bg-gray-500/20 text-gray-400"
                                        )}>
                                          {pattern.type}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-400 leading-relaxed">{pattern.significance}</p>
                                    </div>
                                  ))}
                                  {!analysisResult.candlestickPatterns?.length && (
                                    <p className="text-xs text-gray-500 italic">No major patterns identified in this view.</p>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                                  <ArrowRightLeft className="w-5 h-5" />
                                  Institutional Flow
                                </h4>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Liquidity Engineering</p>
                                    <p className="text-sm leading-relaxed">{analysisResult.liquidityEngineering}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Market Shift (CHoCH)</p>
                                    <p className="text-sm leading-relaxed">{analysisResult.marketShift}</p>
                                  </div>
                                </div>
                              </div>

                              {analysisResult.aiIndicators && (
                                <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                                  <h4 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                                    <Brain className="w-5 h-5" />
                                    AI Predictive Intelligence
                                  </h4>
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Breakout</p>
                                        <div className="relative inline-flex items-center justify-center">
                                          <svg className="w-16 h-16 transform -rotate-90">
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - analysisResult.aiIndicators.breakoutProbability / 100)} className="text-orange-500 transition-all duration-1000" />
                                          </svg>
                                          <span className="absolute text-xs font-black">{analysisResult.aiIndicators.breakoutProbability}%</span>
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Reversal</p>
                                        <div className="relative inline-flex items-center justify-center">
                                          <svg className="w-16 h-16 transform -rotate-90">
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - analysisResult.aiIndicators.reversalProbability / 100)} className="text-blue-500 transition-all duration-1000" />
                                          </svg>
                                          <span className="absolute text-xs font-black">{analysisResult.aiIndicators.reversalProbability}%</span>
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Anomaly</p>
                                        <div className="relative inline-flex items-center justify-center">
                                          <svg className="w-16 h-16 transform -rotate-90">
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - analysisResult.aiIndicators.anomalyScore / 100)} className="text-red-500 transition-all duration-1000" />
                                          </svg>
                                          <span className="absolute text-xs font-black">{analysisResult.aiIndicators.anomalyScore}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Institutional Flow</p>
                                        <span className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                          analysisResult.aiIndicators.institutionalFlow === 'ACCUMULATION' ? "bg-green-500/20 text-green-400" :
                                          analysisResult.aiIndicators.institutionalFlow === 'DISTRIBUTION' ? "bg-red-500/20 text-red-400" :
                                          "bg-gray-500/20 text-gray-400"
                                        )}>
                                          {analysisResult.aiIndicators.institutionalFlow}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-300 leading-relaxed italic">
                                        "{analysisResult.aiIndicators.predictiveInsights}"
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="md:col-span-2 bg-white/5 rounded-3xl border border-white/10 p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2 text-red-500">
                                  <AlertCircle className="w-5 h-5" />
                                  Risk Management & FTAs
                                </h4>
                                <p className="text-sm leading-relaxed text-gray-300">
                                  {analysisResult.troubleAreas}
                                </p>
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
                )}
              </motion.div>
            )}
          </AnimatePresence>
            </div>
            <div className="lg:col-span-1">
              <PriceAlerts user={user} currentPrices={currentPrices} />
            </div>
          </div>
        </main>

        <footer className="border-t border-white/10 py-12 mt-12 bg-black/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
              <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
              <span className="text-lg font-bold tracking-tighter uppercase italic">Trinity</span>
            </div>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Trinity AI is a decision-support tool. Trading involves significant risk. 
              Always perform your own due diligence before entering the market.
            </p>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-600">
              <span>© 2026 Trinity AI</span>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
