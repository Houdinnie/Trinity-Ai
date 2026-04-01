import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  UTCTimestamp, 
  CandlestickSeries, 
  AreaSeries, 
  LineData, 
  HistogramData, 
  LineSeries,
  HistogramSeries
} from 'lightweight-charts';
import { AnalysisResult, SMCIndicator, UserProfile, SimulatedTrade } from '../types';
import { 
  Plus, X, BarChart3, Activity, TrendingUp, Hash, MousePointer2, 
  Layers, Box, Target, Zap, Settings, Search, Info, Clock, ShieldAlert, ShieldCheck,
  TrendingDown, DollarSign, History, PlayCircle, StopCircle, CheckCircle2, AlertCircle,
  Brain, BookOpen
} from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface LiveChartProps {
  result: AnalysisResult;
  pair: string;
  analysisId?: string;
  userProfile?: UserProfile;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
}

export function LiveChart({ result, pair, analysisId, userProfile, onUpdateProfile }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const lastCandleRef = useRef<CandlestickData | null>(null);
  const comparisonSeriesRef = useRef<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [comparisonPrice, setComparisonPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(result.timeframe || '1h');
  const [comparisonPair, setComparisonPair] = useState<string | null>(null);
  const [showComparisonSearch, setShowComparisonSearch] = useState(false);
  const [hoveredIndicator, setHoveredIndicator] = useState<SMCIndicator | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [allIndicators, setAllIndicators] = useState<SMCIndicator[]>([]);
  const [strategyType, setStrategyType] = useState<'scalp' | 'day' | 'swing' | 'position'>('day');
  const [performanceMode, setPerformanceMode] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ name: 'Off-Peak', weight: 1, color: 'gray' });
  const [simulatedTrades, setSimulatedTrades] = useState<SimulatedTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'chart' | 'history' | 'trades'>('chart');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const tradeLinesRef = useRef<{ [tradeId: string]: any[] }>({});
  const [tradeType, setTradeType] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [positionSize, setPositionSize] = useState(1);
  const [tradeNotes, setTradeNotes] = useState('');
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  useEffect(() => {
    if (currentPrice && entryPrice === 0) {
      setEntryPrice(currentPrice);
      const slDist = currentPrice * 0.01;
      const sl = tradeType === 'LONG' ? currentPrice - slDist : currentPrice + slDist;
      setStopLoss(sl);
      setTakeProfit(tradeType === 'LONG' ? currentPrice + slDist * 2 : currentPrice - slDist * 2);
      
      // Calculate default position size (1% risk)
      if (userProfile?.accountBalance) {
        const riskAmount = userProfile.accountBalance * 0.01;
        const stopLossDistance = Math.abs(currentPrice - sl);
        if (stopLossDistance > 0) {
          setPositionSize(Number((riskAmount / stopLossDistance).toFixed(2)));
        }
      }
    }
  }, [currentPrice, tradeType, userProfile]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'simulated_trades'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimulatedTrade[];
      setSimulatedTrades(trades);
    }, (error) => {
      console.error("Error fetching simulated trades:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    const activeTrades = simulatedTrades.filter(t => t.status === 'OPEN' && t.pair === pair);

    // Remove lines for trades that are no longer open or for this pair
    Object.keys(tradeLinesRef.current).forEach(tradeId => {
      if (!activeTrades.find(t => t.id === tradeId)) {
        const lines = tradeLinesRef.current[tradeId];
        if (Array.isArray(lines)) {
          lines.forEach(line => {
            try {
              seriesRef.current.removePriceLine(line);
            } catch (e) {
              // Line might already be removed
            }
          });
        }
        delete tradeLinesRef.current[tradeId];
      }
    });

    activeTrades.forEach(trade => {
      const { pnl, pnlPerc } = calculatePnl(trade, currentPrice || trade.entryPrice);
      const pnlText = `${pnlPerc >= 0 ? '+' : ''}${pnlPerc.toFixed(2)}%`;
      const dollarPnlText = trade.positionSize ? ` ($${pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '';
      const isWin = pnlPerc >= 0;

      if (tradeLinesRef.current[trade.id!]) {
        // Update existing lines
        const [entryLine] = tradeLinesRef.current[trade.id!];
        if (entryLine) {
          entryLine.applyOptions({
            title: `ENTRY ${trade.type} ${pnlText}${dollarPnlText}`,
            color: isWin ? '#22c55e' : '#ef4444',
          });
        }
      } else {
        // Create new lines
        const entryLine = seriesRef.current.createPriceLine({
          price: trade.entryPrice,
          color: isWin ? '#22c55e' : '#ef4444',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: `ENTRY ${trade.type} ${pnlText}${dollarPnlText}`,
        });

        const slLine = seriesRef.current.createPriceLine({
          price: trade.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        });

        const tpLine = seriesRef.current.createPriceLine({
          price: trade.takeProfit,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        });

        tradeLinesRef.current[trade.id!] = [entryLine, slLine, tpLine];
      }
    });
  }, [simulatedTrades, pair, currentPrice]);

  const placeSimulatedTrade = async (type: 'LONG' | 'SHORT', entry: number, sl: number, tp: number, size: number, notes: string) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'simulated_trades'), {
        userId: auth.currentUser.uid,
        pair,
        type,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        positionSize: size,
        notes,
        analysisId: analysisId || null,
        status: 'OPEN',
        timestamp: serverTimestamp(),
      });
      setTradeNotes('');
    } catch (error) {
      console.error("Error placing simulated trade:", error);
    }
  };

  const closeTrade = async (tradeId: string, outcome: 'WIN' | 'LOSS', finalPnl: number, finalPnlPerc: number, analysisId?: string | null) => {
    try {
      await updateDoc(doc(db, 'simulated_trades', tradeId), {
        status: 'CLOSED',
        outcome,
        pnl: finalPnl,
        pnlPercentage: finalPnlPerc,
        closedAt: serverTimestamp(),
      });

      // Also update the analysis record if it exists to refine AI future predictions
      if (analysisId) {
        await updateDoc(doc(db, 'analyses', analysisId), {
          outcome: outcome,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error closing trade:", error);
    }
  };

  const deleteTrade = async (tradeId: string) => {
    try {
      await deleteDoc(doc(db, 'simulated_trades', tradeId));
    } catch (error) {
      console.error("Error deleting trade:", error);
    }
  };

  useEffect(() => {
    if (!currentPrice || simulatedTrades.length === 0) return;
    
    simulatedTrades.filter(t => t.status === 'OPEN').forEach(trade => {
      let outcome: 'WIN' | 'LOSS' | null = null;
      let exitPrice = 0;
      
      if (trade.type === 'LONG') {
        if (currentPrice >= trade.takeProfit) {
          outcome = 'WIN';
          exitPrice = trade.takeProfit;
        } else if (currentPrice <= trade.stopLoss) {
          outcome = 'LOSS';
          exitPrice = trade.stopLoss;
        }
      } else {
        if (currentPrice <= trade.takeProfit) {
          outcome = 'WIN';
          exitPrice = trade.takeProfit;
        } else if (currentPrice >= trade.stopLoss) {
          outcome = 'LOSS';
          exitPrice = trade.stopLoss;
        }
      }
      
      if (outcome) {
        const diff = trade.type === 'LONG' ? exitPrice - trade.entryPrice : trade.entryPrice - exitPrice;
        const pnlPerc = (diff / trade.entryPrice) * 100;
        closeTrade(trade.id!, outcome, diff, pnlPerc, trade.analysisId);
      }
    });
  }, [currentPrice, simulatedTrades]);

  const calculatePnl = (trade: SimulatedTrade, price: number) => {
    if (trade.status === 'CLOSED') return { pnl: trade.pnl || 0, pnlPerc: trade.pnlPercentage || 0 };
    
    const diff = trade.type === 'LONG' ? price - trade.entryPrice : trade.entryPrice - price;
    const pnlPerc = (diff / trade.entryPrice) * 100;
    
    // Use positionSize if available for absolute P&L
    const pnl = trade.positionSize ? diff * trade.positionSize : diff;
    
    return { pnl, pnlPerc };
  };

  const [indicators, setIndicators] = useState({
    volume: true,
    ema20: true,
    ema50: true,
    rsi: false,
    bb: false,
    macd: false,
    fvg: true,
    ob: true,
    liquidity: true,
    mss: true,
    hunts: true,
    sessions: true
  });

  const getSessionInfo = (timestamp: number) => {
    const hour = new Date(timestamp * 1000).getUTCHours();
    if (hour >= 8 && hour < 16) return { name: 'London Session', weight: 1.5, color: 'blue' };
    if (hour >= 13 && hour < 21) return { name: 'New York Session', weight: 1.5, color: 'orange' };
    if (hour >= 0 && hour < 8) return { name: 'Asian Session', weight: 1.0, color: 'green' };
    return { name: 'Off-Peak', weight: 0.8, color: 'gray' };
  };

  const calculateFVG = (data: CandlestickData[]) => {
    const fvgs: SMCIndicator[] = [];
    for (let i = 2; i < data.length; i++) {
      const c1 = data[i - 2];
      const c2 = data[i - 1];
      const c3 = data[i];

      const session = getSessionInfo(c2.time as number);

      if (c3.low > c1.high) {
        fvgs.push({
          type: 'FVG',
          subType: 'BULLISH',
          top: c3.low,
          bottom: c1.high,
          time: c2.time as number,
          significance: `Bullish Fair Value Gap identified during ${session.name}. Price inefficiency created by strong upward momentum. Often acts as a magnetic zone for retests.`
        });
      }
      else if (c3.high < c1.low) {
        fvgs.push({
          type: 'FVG',
          subType: 'BEARISH',
          top: c1.low,
          bottom: c3.high,
          time: c2.time as number,
          significance: `Bearish Fair Value Gap identified during ${session.name}. Price inefficiency created by strong downward momentum. Expect resistance when price returns to this zone.`
        });
      }
    }
    return fvgs;
  };

  const calculateMSS = (data: CandlestickData[]) => {
    const shifts: SMCIndicator[] = [];
    const lookback = tradeType === 'scalp' ? 5 : tradeType === 'day' ? 10 : 20;

    for (let i = lookback; i < data.length - 1; i++) {
      const prevHigh = Math.max(...data.slice(i - lookback, i).map(d => d.high));
      const prevLow = Math.min(...data.slice(i - lookback, i).map(d => d.low));
      const current = data[i];
      
      const avgBody = data.slice(i - 5, i).reduce((acc, d) => acc + Math.abs(d.close - d.open), 0) / 5;
      const currentBody = Math.abs(current.close - current.open);
      const isDisplacement = currentBody > avgBody * 2.0;

      if (current.close > prevHigh) {
        const isBOS = shifts.length > 0 && shifts[shifts.length - 1].subType === 'BULLISH';
        shifts.push({
          type: 'MSS',
          subType: isDisplacement ? (isBOS ? 'BOS' : 'BULLISH') : 'INDUCEMENT',
          top: current.high,
          bottom: current.low,
          time: current.time as number,
          significance: isDisplacement 
            ? `${isBOS ? 'Break of Structure (BOS)' : 'Market Structure Shift (MSS)'}: Strong bullish break confirming trend continuation.` 
            : 'Inducement (IDM): Price swept a minor high without displacement. This is likely a trap for retail buyers.',
          isDisplacement
        });
      } else if (current.close < prevLow) {
        const isBOS = shifts.length > 0 && shifts[shifts.length - 1].subType === 'BEARISH';
        shifts.push({
          type: 'MSS',
          subType: isDisplacement ? (isBOS ? 'BOS' : 'BEARISH') : 'INDUCEMENT',
          top: current.high,
          bottom: current.low,
          time: current.time as number,
          significance: isDisplacement 
            ? `${isBOS ? 'Break of Structure (BOS)' : 'Market Structure Shift (MSS)'}: Strong bearish break confirming trend continuation.` 
            : 'Inducement (IDM): Price swept a minor low without displacement. This is likely a trap for retail sellers.',
          isDisplacement
        });
      }
    }
    return shifts.slice(-8);
  };

  const calculateOB = (data: CandlestickData[], fvgs: SMCIndicator[], mss: SMCIndicator[]) => {
    const obs: SMCIndicator[] = [];
    for (let i = 5; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      
      const isBullishMove = next.close > next.open && (next.close - next.open) > (current.open - current.close) * 2;
      const isBearishMove = next.close < next.open && (next.open - next.close) > (current.close - current.open) * 2;

      // Validation: Must have FVG or MSS nearby
      const hasFVG = fvgs.some(f => Math.abs(f.time - (next.time as number)) < 7200);
      const hasMSS = mss.some(m => Math.abs(m.time - (next.time as number)) < 14400 && m.isDisplacement);

      if (current.close < current.open && isBullishMove && (hasFVG || hasMSS)) {
        obs.push({
          type: 'OB',
          subType: 'BULLISH',
          top: current.high,
          bottom: current.low,
          time: current.time as number,
          significance: 'Validated Bullish Order Block: Institutional accumulation zone confirmed by ' + (hasFVG ? 'FVG' : 'MSS') + '. High probability support.'
        });
      }
      else if (current.close > current.open && isBearishMove && (hasFVG || hasMSS)) {
        obs.push({
          type: 'OB',
          subType: 'BEARISH',
          top: current.high,
          bottom: current.low,
          time: current.time as number,
          significance: 'Validated Bearish Order Block: Institutional distribution zone confirmed by ' + (hasFVG ? 'FVG' : 'MSS') + '. High probability resistance.'
        });
      }
    }
    return obs.slice(-5);
  };

  const calculateStopHunts = (data: CandlestickData[]) => {
    const hunts: SMCIndicator[] = [];
    const avgBody = data.slice(-20).reduce((acc, d) => acc + Math.abs(d.close - d.open), 0) / 20;

    for (let i = 15; i < data.length; i++) {
      const current = data[i];
      const prevHigh = Math.max(...data.slice(i-15, i).map(d => d.high));
      const prevLow = Math.min(...data.slice(i-15, i).map(d => d.low));

      // Case 1: Single candle sweep and reversal (Pin Bar style)
      const isPinBarBearish = current.high > prevHigh && current.close < prevHigh && (current.high - Math.max(current.open, current.close)) > (Math.abs(current.open - current.close) * 1.5);
      const isPinBarBullish = current.low < prevLow && current.close > prevLow && (Math.min(current.open, current.close) - current.low) > (Math.abs(current.open - current.close) * 1.5);

      // Case 2: Sweep followed by displacement
      const prev = data[i-1];
      const isSweepBearish = prev && prev.high > prevHigh && prev.close < prevHigh;
      const isDisplacementBearish = Math.abs(current.close - current.open) > avgBody * 1.5 && current.close < current.open;
      
      const isSweepBullish = prev && prev.low < prevLow && prev.close > prevLow;
      const isDisplacementBullish = Math.abs(current.close - current.open) > avgBody * 1.5 && current.close > current.open;

      if (isPinBarBearish || (isSweepBearish && isDisplacementBearish)) {
        hunts.push({
          type: 'STOP_HUNT',
          subType: 'BEARISH',
          top: current.high,
          bottom: prevHigh,
          time: current.time as number,
          significance: 'Bearish Stop Hunt: Price swept liquidity above previous highs and reversed with displacement. This indicates institutional distribution and a high-probability reversal zone.'
        });
      }
      else if (isPinBarBullish || (isSweepBullish && isDisplacementBullish)) {
        hunts.push({
          type: 'STOP_HUNT',
          subType: 'BULLISH',
          top: prevLow,
          bottom: current.low,
          time: current.time as number,
          significance: 'Bullish Stop Hunt: Price swept liquidity below previous lows and reversed with displacement. This indicates institutional accumulation and a high-probability reversal zone.'
        });
      }
    }
    return hunts.slice(-5);
  };

  const calculateLiquidity = (data: CandlestickData[]) => {
    const levels: SMCIndicator[] = [];
    const threshold = 0.0005;

    const majorHigh = Math.max(...data.map(d => d.high));
    const majorLow = Math.min(...data.map(d => d.low));

    levels.push({
      type: 'LIQUIDITY',
      subType: 'ERL',
      top: majorHigh,
      bottom: majorHigh,
      time: data[data.length-1].time as number,
      significance: 'External Range Liquidity (ERL): Major structural high where significant buy-side liquidity resides. Target for long positions.'
    });

    levels.push({
      type: 'LIQUIDITY',
      subType: 'ERL',
      top: majorLow,
      bottom: majorLow,
      time: data[data.length-1].time as number,
      significance: 'External Range Liquidity (ERL): Major structural low where significant sell-side liquidity resides. Target for short positions.'
    });

    for (let i = 20; i < data.length; i++) {
      const currentHigh = data[i].high;
      const currentLow = data[i].low;

      for (let j = i - 20; j < i; j++) {
        const prevHigh = data[j].high;
        const prevLow = data[j].low;

        if (Math.abs(currentHigh - prevHigh) / prevHigh < threshold) {
          levels.push({
            type: 'LIQUIDITY',
            subType: 'EQH',
            top: currentHigh,
            bottom: currentHigh,
            time: data[i].time as number,
            significance: 'Equal Highs (EQH): Internal Range Liquidity (IRL). Price often sweeps these clean highs before a major reversal.'
          });
        }
        if (Math.abs(currentLow - prevLow) / prevLow < threshold) {
          levels.push({
            type: 'LIQUIDITY',
            subType: 'EQL',
            top: currentLow,
            bottom: currentLow,
            time: data[i].time as number,
            significance: 'Equal Lows (EQL): Internal Range Liquidity (IRL). Price often sweeps these clean lows before a major reversal.'
          });
        }
      }
    }
    return levels.slice(-10);
  };
  const [drawingLines, setDrawingLines] = useState<number[]>([]);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('NEUTRAL');
  const [showSettings, setShowSettings] = useState(false);
  const [comparisonSearch, setComparisonSearch] = useState('');

  const commonPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ARB/USDT'];

  const timeframes = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
  ];

  useEffect(() => {
    if (tradeType === 'scalp') setTimeframe('5m');
    else if (tradeType === 'day') setTimeframe('1h');
    else if (tradeType === 'swing') setTimeframe('4h');
    else if (tradeType === 'position') setTimeframe('1d');
  }, [tradeType]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      leftPriceScale: {
        visible: comparisonPair !== null,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      crosshair: {
        vertLine: {
          color: '#94a3b8',
          width: 1,
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#94a3b8',
          width: 1,
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 6,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    }) as any;

    const volumeSeries = indicators.volume ? chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    }) : null;

    if (volumeSeries) {
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    }

    const ema20Series = indicators.ema20 ? chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      title: 'EMA 20',
    }) : null;

    const ema50Series = indicators.ema50 ? chart.addSeries(LineSeries, {
      color: '#eab308',
      lineWidth: 1,
      title: 'EMA 50',
    }) : null;

    const rsiSeries = indicators.rsi ? chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 1,
      priceScaleId: 'rsi',
      title: 'RSI',
    }) : null;

    const bbUpperSeries = indicators.bb ? chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.4)',
      lineWidth: 1,
      title: 'BB Upper',
    }) : null;

    const bbLowerSeries = indicators.bb ? chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.4)',
      lineWidth: 1,
      title: 'BB Lower',
    }) : null;

    const sessionsSeries = indicators.sessions ? chart.addSeries(HistogramSeries, {
      priceScaleId: 'sessions',
      title: 'Sessions',
      base: 0,
    }) : null;

    if (indicators.sessions) {
      chart.priceScale('sessions').applyOptions({
        scaleMargins: { top: 0, bottom: 0 },
        visible: false,
      });
    }

    const bbMainSeries = indicators.bb ? chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.2)',
      lineWidth: 1,
      title: 'BB Basis',
    }) : null;

    if (indicators.rsi) {
      chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0.05 },
        visible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      });
      if (rsiSeries) {
        rsiSeries.createPriceLine({
          price: 70,
          color: 'rgba(239, 68, 68, 0.2)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '70',
        });
        rsiSeries.createPriceLine({
          price: 30,
          color: 'rgba(34, 197, 94, 0.2)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '30',
        });
      }
    }

    const macdMainSeries = indicators.macd ? chart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 1,
      priceScaleId: 'macd',
      title: 'MACD',
    }) : null;

    const macdSignalSeries = indicators.macd ? chart.addSeries(LineSeries, {
      color: '#FF6D00',
      lineWidth: 1,
      priceScaleId: 'macd',
      title: 'Signal',
    }) : null;

    const macdHistogramSeries = indicators.macd ? chart.addSeries(HistogramSeries, {
      priceScaleId: 'macd',
      title: 'Histogram',
    }) : null;

    if (indicators.macd) {
      chart.priceScale('macd').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
        visible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      });
    }

    const comparisonSeries = comparisonPair ? chart.addSeries(AreaSeries, {
      priceScaleId: 'left',
      lineColor: 'rgba(59, 130, 246, 0.8)',
      topColor: 'rgba(59, 130, 246, 0.2)',
      bottomColor: 'rgba(59, 130, 246, 0)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    }) : null;

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    comparisonSeriesRef.current = comparisonSeries;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    // Generate mock data based on current price if real data fails
    const generateMockData = (count = 500, basePrice?: number) => {
      const data: CandlestickData[] = [];
      const intervalMap: Record<string, number> = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
      const seconds = intervalMap[timeframe] || 3600;
      
      let time = Math.floor(Date.now() / 1000) - count * seconds;
      let lastPrice = basePrice || parseFloat(result.sniperEntry.entry) || 100;
      
      for (let i = 0; i < count; i++) {
        const open = lastPrice;
        const close = open + (Math.random() - 0.5) * (lastPrice * 0.01);
        const high = Math.max(open, close) + Math.random() * (lastPrice * 0.005);
        const low = Math.min(open, close) - Math.random() * (lastPrice * 0.005);
        
        data.push({
          time: time as UTCTimestamp,
          open,
          high,
          low,
          close,
        });
        
        time += seconds;
        lastPrice = close;
      }
      return data;
    };

    const calculateSessions = (data: any[]) => {
      const sessionData: HistogramData[] = [];
      data.forEach(d => {
        const date = new Date((d.time as number) * 1000);
        const hour = date.getUTCHours();
        
        let color = 'rgba(0,0,0,0)';
        
        // London: 08:00 - 16:00 UTC
        if (hour >= 8 && hour < 16) {
          color = 'rgba(59, 130, 246, 0.08)'; // Blue
        }
        // New York: 13:00 - 21:00 UTC
        else if (hour >= 13 && hour < 21) {
          // Overlap NY/London
          if (hour >= 13 && hour < 16) {
            color = 'rgba(139, 92, 246, 0.1)'; // Purple overlap
          } else {
            color = 'rgba(249, 115, 22, 0.08)'; // Orange
          }
        }
        // Asia: 00:00 - 08:00 UTC
        else if (hour >= 0 && hour < 8) {
          color = 'rgba(34, 197, 94, 0.08)'; // Green
        }
        
        sessionData.push({
          time: d.time,
          value: 1000000000, // Large value to fill height
          color,
        });
      });
      return sessionData;
    };

    const calculateEMA = (data: any[], period: number) => {
      const k = 2 / (period + 1);
      let emaData: LineData[] = [];
      let prevEma = data[0].close;
      
      data.forEach((d, i) => {
        const ema = i === 0 ? d.close : (d.close * k) + (prevEma * (1 - k));
        emaData.push({ time: d.time, value: ema });
        prevEma = ema;
      });
      return emaData;
    };

    const calculateRSI = (data: any[], period: number = 14) => {
      let rsiData: LineData[] = [];
      let gains = 0;
      let losses = 0;

      for (let i = 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (i <= period) {
          if (diff > 0) gains += diff;
          else losses -= diff;
          if (i === period) {
            const rs = (gains / period) / (losses / period || 1);
            rsiData.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
          }
        } else {
          const gain = diff > 0 ? diff : 0;
          const loss = diff < 0 ? -diff : 0;
          gains = (gains * (period - 1) + gain) / period;
          losses = (losses * (period - 1) + loss) / period;
          const rs = gains / (losses || 1);
          rsiData.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
        }
      }
      return rsiData;
    };

    const calculateBB = (data: any[], period: number = 20, stdDev: number = 2) => {
      let bbData: { upper: LineData[], lower: LineData[], basis: LineData[] } = { upper: [], lower: [], basis: [] };
      
      for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, d) => acc + d.close, 0);
        const basis = sum / period;
        
        const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - basis, 2), 0) / period;
        const dev = Math.sqrt(variance);
        
        bbData.upper.push({ time: data[i].time, value: basis + stdDev * dev });
        bbData.lower.push({ time: data[i].time, value: basis - stdDev * dev });
        bbData.basis.push({ time: data[i].time, value: basis });
      }
      return bbData;
    };

    const calculateMACD = (data: any[]) => {
      const ema12 = calculateEMA(data, 12);
      const ema26 = calculateEMA(data, 26);
      
      let macdLine: LineData[] = [];
      for (let i = 0; i < ema12.length; i++) {
        const val12 = ema12[i].value;
        const val26 = ema26.find(d => d.time === ema12[i].time)?.value || val12;
        macdLine.push({ time: ema12[i].time, value: val12 - val26 });
      }

      const k = 2 / (9 + 1);
      let signalLine: LineData[] = [];
      let prevEma = macdLine[0].value;
      macdLine.forEach((d, i) => {
        const ema = i === 0 ? d.value : (d.value * k) + (prevEma * (1 - k));
        signalLine.push({ time: d.time, value: ema });
        prevEma = ema;
      });

      let histogram: HistogramData[] = [];
      macdLine.forEach((d, i) => {
        const sig = signalLine[i].value;
        const val = d.value - sig;
        histogram.push({
          time: d.time,
          value: val,
          color: val >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
        });
      });

      return { macdLine, signalLine, histogram };
    };

    const lastCandleRef = useRef<CandlestickData | null>(null);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const symbol = pair.replace('/', '').toUpperCase();
        const isDeriv = ['V75', 'BOOM1000', 'CRASH500', 'XAUUSD', 'GBPJPY', 'GBPUSD', 'EURUSD'].includes(symbol);
        
        let data: CandlestickData[] = [];
        let activeMainSymbol = symbol;

        if (isDeriv) {
          const derivMap: Record<string, string> = {
            'V75': 'R_75',
            'BOOM1000': 'BOOM1000',
            'CRASH500': 'CRASH500',
            'EURUSD': 'frxEURUSD',
            'GBPUSD': 'frxGBPUSD',
            'GBPJPY': 'frxGBPJPY',
            'XAUUSD': 'frxXAUUSD',
          };
          const derivSymbol = derivMap[symbol] || symbol;
          activeMainSymbol = derivSymbol;

          const intervalMap: Record<string, number> = { 
            '1m': 60, 
            '5m': 300, 
            '15m': 900, 
            '1h': 3600, 
            '4h': 14400, 
            '1d': 86400 
          };
          const granularity = intervalMap[timeframe] || 3600;

          // Deriv API for historical data
          const derivWs = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
          const dataLimit = performanceMode ? 200 : 500;
          
          const historyData = await new Promise<any[]>((resolve, reject) => {
            derivWs.onopen = () => {
              derivWs.send(JSON.stringify({
                ticks_history: derivSymbol,
                adjust_start_time: 1,
                count: dataLimit,
                end: 'latest',
                start: 1,
                style: 'candles',
                granularity: granularity
              }));
            };
            derivWs.onmessage = (msg) => {
              const res = JSON.parse(msg.data);
              if (res.candles) {
                resolve(res.candles);
                derivWs.close();
              } else if (res.error) {
                reject(res.error);
                derivWs.close();
              }
            };
            derivWs.onerror = (err) => reject(err);
            setTimeout(() => reject('Deriv timeout'), 10000);
          });

          data = historyData.map((d: any) => ({
            time: d.epoch as UTCTimestamp,
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
          }));
        } else {
          // Binance for Crypto
          const binanceSymbol = symbol.endsWith('USD') ? symbol + 'T' : symbol;
          activeMainSymbol = binanceSymbol;
          const dataLimit = performanceMode ? 200 : 500;
          const mainResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=${dataLimit}`);
          
          if (mainResponse.ok) {
            const rawData = await mainResponse.json();
            data = rawData.map((d: any) => ({
              time: (d[0] / 1000) as UTCTimestamp,
              open: parseFloat(d[1]),
              high: parseFloat(d[2]),
              low: parseFloat(d[3]),
              close: parseFloat(d[4]),
              volume: parseFloat(d[5]),
            }));
          }
        }

        if (data.length > 0) {
          candlestickSeries.setData(data);
          lastCandleRef.current = data[data.length - 1];
          setCurrentPrice(data[data.length - 1].close);
          
          if (indicators.volume && volumeSeries && !isDeriv) {
            volumeSeries.setData(data.map((d: any) => ({
              time: d.time,
              value: (d as any).volume || 0,
              color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            })));
          }

          // Update Indicators
          if (indicators.sessions && sessionsSeries) {
            sessionsSeries.setData(calculateSessions(data));
            setSessionInfo(getSessionInfo(data[data.length - 1].time as number));
          }

          if (indicators.ema20 && ema20Series) ema20Series.setData(calculateEMA(data, 20));
          if (indicators.ema50 && ema50Series) ema50Series.setData(calculateEMA(data, 50));
          if (indicators.rsi && rsiSeries) rsiSeries.setData(calculateRSI(data, 14));

          if (indicators.bb && bbUpperSeries && bbLowerSeries && bbMainSeries) {
            const bb = calculateBB(data);
            bbUpperSeries.setData(bb.upper);
            bbLowerSeries.setData(bb.lower);
            bbMainSeries.setData(bb.basis);
          }

          if (indicators.macd && macdMainSeries && macdSignalSeries && macdHistogramSeries) {
            const macd = calculateMACD(data);
            macdMainSeries.setData(macd.macdLine);
            macdSignalSeries.setData(macd.signalLine);
            macdHistogramSeries.setData(macd.histogram);
          }

          // SMC Indicators
          const currentIndicators: SMCIndicator[] = [];
          
          // Strategy-based lookback and sensitivity
          const smcData = performanceMode ? data.slice(-150) : data;
          const strategyMultiplier = 
            tradeType === 'scalp' ? 0.5 : 
            tradeType === 'day' ? 1.0 : 
            tradeType === 'swing' ? 2.0 : 3.0;

          const fvgs = calculateFVG(smcData);
          const mss = calculateMSS(smcData);
          const obs = calculateOB(smcData, fvgs, mss);
          const levels = calculateLiquidity(smcData);
          const hunts = calculateStopHunts(smcData);

          if (indicators.fvg) {
            currentIndicators.push(...fvgs);
            const displayCount = tradeType === 'scalp' ? 2 : tradeType === 'position' ? 10 : 5;
            fvgs.slice(-displayCount).forEach(fvg => {
              candlestickSeries.createPriceLine({
                price: fvg.top,
                color: fvg.subType === 'BULLISH' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `FVG ${fvg.subType === 'BULLISH' ? 'Top' : 'Bottom'}`,
              });
              candlestickSeries.createPriceLine({
                price: fvg.bottom,
                color: fvg.subType === 'BULLISH' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `FVG ${fvg.subType === 'BULLISH' ? 'Bottom' : 'Top'}`,
              });
            });
          }

          if (indicators.mss) {
            currentIndicators.push(...mss);
            mss.forEach(shift => {
              const isIDM = shift.subType === 'INDUCEMENT';
              candlestickSeries.createPriceLine({
                price: shift.top,
                color: isIDM ? '#94a3b8' : (shift.subType === 'BOS' ? '#f59e0b' : '#f97316'),
                lineWidth: isIDM ? 1 : 2,
                lineStyle: isIDM ? 1 : 0,
                axisLabelVisible: true,
                title: shift.subType,
              });
            });
          }

          if (indicators.ob) {
            currentIndicators.push(...obs);
            const displayCount = tradeType === 'scalp' ? 1 : tradeType === 'position' ? 5 : 2;
            obs.slice(-displayCount).forEach(ob => {
              candlestickSeries.createPriceLine({
                price: ob.top,
                color: ob.subType === 'BULLISH' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `${ob.subType} OB Top`,
              });
              candlestickSeries.createPriceLine({
                price: ob.bottom,
                color: ob.subType === 'BULLISH' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `${ob.subType} OB Bottom`,
              });
            });
          }

          if (indicators.liquidity) {
            currentIndicators.push(...levels);
            levels.forEach(level => {
              candlestickSeries.createPriceLine({
                price: level.top,
                color: level.subType === 'ERL' ? '#a855f7' : '#6366f1',
                lineWidth: 1,
                lineStyle: 1,
                axisLabelVisible: true,
                title: level.subType,
              });
            });
          }

          if (indicators.hunts) {
            currentIndicators.push(...hunts);
            hunts.forEach(hunt => {
              candlestickSeries.createPriceLine({
                price: hunt.top,
                color: '#ef4444',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: 'STOP HUNT',
              });
            });
          }

          setAllIndicators(currentIndicators);

          // Add Markers for Candlestick Patterns and Stop Hunts
          const markers: any[] = [];
          if (result.candlestickPatterns) {
            result.candlestickPatterns.forEach((pattern, i) => {
              markers.push({
                time: (Math.floor(Date.now() / 1000) - (10 - i) * 3600) as UTCTimestamp, // Mock placement
                position: pattern.type === 'BULLISH' ? 'belowBar' : 'aboveBar' as any,
                color: pattern.type === 'BULLISH' ? '#22c55e' : pattern.type === 'BEARISH' ? '#ef4444' : '#94a3b8',
                shape: 'arrowUp' as any,
                text: pattern.name,
              });
            });
          }

          if (indicators.hunts) {
            hunts.forEach(hunt => {
              markers.push({
                time: hunt.time as UTCTimestamp,
                position: hunt.subType === 'BULLISH' ? 'belowBar' : 'aboveBar' as any,
                color: hunt.subType === 'BULLISH' ? '#22c55e' : '#ef4444',
                shape: hunt.subType === 'BULLISH' ? 'arrowUp' : 'arrowDown' as any,
                text: 'STOP HUNT',
              });
            });
          }
          
          if (markers.length > 0) {
            candlestickSeries.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
          }

          chart.subscribeCrosshairMove((param) => {
            if (!param.point || !param.time) {
              setHoveredIndicator(null);
              return;
            }

            const price = candlestickSeries.coordinateToPrice(param.point.y);
            if (!price) return;

            const found = currentIndicators.find(ind => {
              const mid = (ind.top + ind.bottom) / 2;
              const range = Math.abs(ind.top - ind.bottom) || (price * 0.001);
              return Math.abs(price - mid) < range;
            });

            if (found) {
              setHoveredIndicator(found);
              setTooltipPos({ x: param.point.x, y: param.point.y });
            } else {
              setHoveredIndicator(null);
            }
          });

          // Sentiment Calculation
          const ema20 = calculateEMA(data, 20);
          const ema50 = calculateEMA(data, 50);
          const rsi = calculateRSI(data, 14);
          const macd = calculateMACD(data);
          
          const last = data[data.length - 1];
          const lastEma20 = ema20[ema20.length - 1].value;
          const lastEma50 = ema50[ema50.length - 1].value;
          const lastRsi = rsi.length > 0 ? rsi[rsi.length - 1].value : 50;
          const lastMacd = macd.macdLine[macd.macdLine.length - 1].value;
          const lastSignal = macd.signalLine[macd.signalLine.length - 1].value;

          let score = 0;
          if (last.close > lastEma20) score += 1; else score -= 1;
          if (lastEma20 > lastEma50) score += 1; else score -= 1;
          if (lastRsi > 55) score += 1; else if (lastRsi < 45) score -= 1;
          if (lastMacd > lastSignal) score += 1; else score -= 1;

          if (result.candlestickPatterns) {
            result.candlestickPatterns.forEach(p => {
              if (p.type === 'BULLISH') score += 0.5;
              else if (p.type === 'BEARISH') score -= 0.5;
            });
          }

          if (score >= 1.5) setSentiment('BULLISH');
          else if (score <= -1.5) setSentiment('BEARISH');
          else setSentiment('NEUTRAL');
        } else {
          candlestickSeries.setData(generateMockData());
        }

        startWebSocket(activeMainSymbol, isDeriv);
      } catch (e) {
        console.error("Fetch data error:", e);
        candlestickSeries.setData(generateMockData());
      } finally {
        setIsLoading(false);
      }
    };

    let ws: WebSocket | null = null;
    const startWebSocket = (mainSymbol: string, isDeriv: boolean) => {
      setWsStatus('connecting');
      if (isDeriv) {
        ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        ws.onopen = () => {
          setWsStatus('connected');
          ws?.send(JSON.stringify({
            ticks: mainSymbol,
            subscribe: 1
          }));
        };
        const intervalMap: Record<string, number> = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
        const granularity = intervalMap[timeframe] || 3600;

        ws.onmessage = (msg) => {
          const res = JSON.parse(msg.data);
          if (res.tick) {
            const price = parseFloat(res.tick.quote);
            const time = res.tick.epoch as number;
            setCurrentPrice(price);
            
            // Calculate the start time of the candle this tick belongs to
            const candleStartTime = Math.floor(time / granularity) * granularity;
            
            if (lastCandleRef.current) {
              const isNewCandle = candleStartTime > (lastCandleRef.current.time as number);
              
              const updatedCandle = {
                time: candleStartTime as UTCTimestamp,
                open: isNewCandle ? price : lastCandleRef.current.open,
                high: isNewCandle ? price : Math.max(lastCandleRef.current.high, price),
                low: isNewCandle ? price : Math.min(lastCandleRef.current.low, price),
                close: price,
              };
              candlestickSeries.update(updatedCandle);
              lastCandleRef.current = updatedCandle;
            }
          }
        };
        ws.onclose = () => setWsStatus('disconnected');
        ws.onerror = () => setWsStatus('disconnected');
      } else {
        // Binance WS
        const streams = [`${mainSymbol.toLowerCase()}@kline_${timeframe}`];
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams.join('/')}`);
        
        ws.onopen = () => setWsStatus('connected');
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const k = message.k;
          if (!k) return;

          const price = parseFloat(k.c);
          const time = (k.t / 1000) as UTCTimestamp;

          setCurrentPrice(price);
          const candle = {
            time,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: price,
          };
          candlestickSeries.update(candle);
          lastCandleRef.current = candle;
          
          if (indicators.volume && volumeSeries) {
            volumeSeries.update({
              time,
              value: parseFloat(k.v),
              color: price >= parseFloat(k.o) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            });
          }
        };
        ws.onclose = () => setWsStatus('disconnected');
        ws.onerror = () => setWsStatus('disconnected');
      }
    };

    fetchData();

    // Add Price Lines for Entry, SL, TP
    const entryPrice = parseFloat(result.sniperEntry.entry);
    if (!isNaN(entryPrice)) {
      candlestickSeries.createPriceLine({
        price: entryPrice,
        color: '#f97316',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }

    const slPrice = parseFloat(result.sniperEntry.stopLoss);
    if (!isNaN(slPrice)) {
      candlestickSeries.createPriceLine({
        price: slPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: 'SL',
      });
    }

    result.sniperEntry.takeProfits.forEach((tp, i) => {
      const tpPrice = parseFloat(tp.price);
      if (!isNaN(tpPrice)) {
        candlestickSeries.createPriceLine({
          price: tpPrice,
          color: '#22c55e',
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `TP${i + 1} (${tp.rrRatio})`,
        });
      }
    });

    // Add Drawing Lines
    drawingLines.forEach((price, index) => {
      candlestickSeries.createPriceLine({
        price: price,
        color: '#94a3b8',
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: `L${index + 1}`,
      });
    });

    return () => {
      resizeObserver.disconnect();
      if (ws) ws.close();
      chart.remove();
    };
  }, [result, pair, timeframe, comparisonPair, indicators, drawingLines, tradeType, performanceMode]);

  return (
    <div className="relative w-full h-full group">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Tooltip */}
      {hoveredIndicator && (
        <div 
          className="absolute z-50 p-4 bg-black/90 border border-white/20 rounded-xl backdrop-blur-xl shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{ 
            left: tooltipPos.x + 20, 
            top: tooltipPos.y - 40,
            maxWidth: '280px'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "p-1.5 rounded-lg",
              hoveredIndicator.subType === 'BULLISH' ? "bg-green-500/20 text-green-400" :
              hoveredIndicator.subType === 'BEARISH' ? "bg-red-500/20 text-red-400" :
              "bg-purple-500/20 text-purple-400"
            )}>
              {hoveredIndicator.type === 'OB' ? <Box className="w-4 h-4" /> :
               hoveredIndicator.type === 'FVG' ? <Layers className="w-4 h-4" /> :
               hoveredIndicator.type === 'MSS' ? <Zap className="w-4 h-4" /> :
               hoveredIndicator.type === 'STOP_HUNT' ? <Target className="w-4 h-4" /> :
               <MousePointer2 className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tighter text-white">
                {hoveredIndicator.subType} {hoveredIndicator.type.replace('_', ' ')}
              </h4>
              <p className="text-[10px] text-white/40 font-mono">
                Price: {hoveredIndicator.top.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-white/70 italic">
            "{hoveredIndicator.significance}"
          </p>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Trinity Analysis</span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
              <Zap className="w-2.5 h-2.5" />
              <span className="text-[9px] font-black tracking-tighter">CONFIRMED</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredIndicator && (
        <div 
          className="absolute z-50 p-4 bg-black/90 border border-white/20 rounded-xl backdrop-blur-xl shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{ 
            left: tooltipPos.x + 20, 
            top: tooltipPos.y - 40,
            maxWidth: '280px'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "p-1.5 rounded-lg",
              hoveredIndicator.subType === 'BULLISH' || hoveredIndicator.subType === 'ERL' ? "bg-green-500/20 text-green-400" :
              hoveredIndicator.subType === 'BEARISH' || hoveredIndicator.subType === 'INDUCEMENT' ? "bg-red-500/20 text-red-400" :
              "bg-purple-500/20 text-purple-400"
            )}>
              {hoveredIndicator.type === 'OB' ? <Box className="w-4 h-4" /> :
               hoveredIndicator.type === 'FVG' ? <Layers className="w-4 h-4" /> :
               hoveredIndicator.type === 'MSS' ? <Zap className="w-4 h-4" /> :
               hoveredIndicator.type === 'STOP_HUNT' ? <Target className="w-4 h-4" /> :
               <MousePointer2 className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tighter text-white">
                {hoveredIndicator.subType} {hoveredIndicator.type.replace('_', ' ')}
              </h4>
              <p className="text-[10px] text-white/40 font-mono">
                Price: {hoveredIndicator.top.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-white/70 italic">
            "{hoveredIndicator.significance}"
          </p>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Trinity Analysis</span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
              <Zap className="w-2.5 h-2.5" />
              <span className="text-[9px] font-black tracking-tighter">CONFIRMED</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Synchronizing Data...</span>
          </div>
        </div>
      )}

      {/* Trade Placement Modal */}
      {showTradeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Simulate Trade</h3>
              </div>
              <button 
                onClick={() => setShowTradeModal(false)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeType('LONG')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    tradeType === 'LONG' 
                      ? "bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/10" 
                      : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                  )}
                >
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Long</span>
                </button>
                <button
                  onClick={() => setTradeType('SHORT')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    tradeType === 'SHORT' 
                      ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10" 
                      : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                  )}
                >
                  <TrendingUp className="w-6 h-6 rotate-180" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Short</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Entry Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="number"
                      step="0.00000001"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Position Size (Units)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="number"
                      value={positionSize}
                      onChange={(e) => setPositionSize(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-400/60">Stop Loss</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="w-full bg-red-500/5 border border-red-500/20 rounded-xl py-3 px-4 text-sm font-mono text-red-400 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-green-400/60">Take Profit</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(Number(e.target.value))}
                      className="w-full bg-green-500/5 border border-green-500/20 rounded-xl py-3 px-4 text-sm font-mono text-green-400 focus:outline-none focus:border-green-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Trade Notes (Journal)</label>
                  <textarea
                    value={tradeNotes}
                    onChange={(e) => setTradeNotes(e.target.value)}
                    placeholder="Why are you taking this trade? What's the context?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  await placeSimulatedTrade(tradeType, entryPrice, stopLoss, takeProfit, positionSize, tradeNotes);
                  setShowTradeModal(false);
                }}
                className={cn(
                  "w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl",
                  tradeType === 'LONG' 
                    ? "bg-green-500 hover:bg-green-400 text-white shadow-green-500/20" 
                    : "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                )}
              >
                Place {tradeType} Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trades History Panel */}
      {activeTab === 'trades' && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <History className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Trade History</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Simulated Performance</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('chart')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {simulatedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                <div className="p-4 bg-white/5 rounded-full">
                  <TrendingUp className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No trades recorded yet</p>
              </div>
            ) : (
              simulatedTrades.map((trade) => {
                const { pnl, pnlPerc } = calculatePnl(trade, currentPrice || 0);
                const isWin = trade.status === 'CLOSED' ? trade.outcome === 'WIN' : pnl >= 0;
                
                return (
                  <div 
                    key={trade.id}
                    className={cn(
                      "group relative p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
                      trade.status === 'OPEN' 
                        ? "bg-white/5 border-white/10" 
                        : isWin 
                          ? "bg-green-500/5 border-green-500/20" 
                          : "bg-red-500/5 border-red-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                          trade.type === 'LONG' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {trade.type}
                        </div>
                        <span className="text-[10px] font-black text-white/60">{trade.pair}</span>
                        {trade.status === 'OPEN' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-xs font-black font-mono",
                            isWin ? "text-green-400" : "text-red-400"
                          )}>
                            {pnlPerc >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold font-mono",
                            isWin ? "text-green-500/60" : "text-red-500/60"
                          )}>
                            {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTrade(trade.id!)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Entry</span>
                        <p className="text-[10px] font-black font-mono text-white/60">{trade.entryPrice.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Current/Exit</span>
                        <p className="text-[10px] font-black font-mono text-white/60">
                          {(trade.status === 'CLOSED' ? (trade.type === 'LONG' ? trade.entryPrice + (trade.pnl || 0) : trade.entryPrice - (trade.pnl || 0)) : currentPrice)?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Trade Notes / Journal */}
                    <div className="mb-4 p-3 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1">
                          <BookOpen className="w-2 h-2" />
                          Trade Journal
                        </span>
                        {editingTradeId === trade.id ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                await updateDoc(doc(db, 'simulated_trades', trade.id!), { notes: editingNotes });
                                setEditingTradeId(null);
                              }}
                              className="text-[8px] font-black text-blue-400 uppercase hover:text-blue-300"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingTradeId(null)}
                              className="text-[8px] font-black text-white/40 uppercase hover:text-white/60"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingTradeId(trade.id!);
                              setEditingNotes(trade.notes || '');
                            }}
                            className="text-[8px] font-black text-white/20 uppercase hover:text-white/40"
                          >
                            Edit Notes
                          </button>
                        )}
                      </div>
                      {editingTradeId === trade.id ? (
                        <textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-blue-500/50 resize-none min-h-[60px]"
                          autoFocus
                        />
                      ) : (
                        <p className="text-[10px] text-white/60 leading-relaxed italic">
                          {trade.notes || "No notes added for this trade."}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-red-400/40 leading-none">SL</span>
                          <span className="text-[10px] font-black font-mono text-red-400/60">{trade.stopLoss.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-green-400/40 leading-none">TP</span>
                          <span className="text-[10px] font-black font-mono text-green-400/60">{trade.takeProfit.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            const { pnl, pnlPerc } = calculatePnl(trade, currentPrice || 0);
                            closeTrade(trade.id!, pnl >= 0 ? 'WIN' : 'LOSS', pnl, pnlPerc);
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Close Trade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start justify-between gap-4 pointer-events-none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            {currentPrice && (
              <div className="flex items-center gap-2 px-3 py-1 bg-black/60 text-white rounded-lg border border-white/10 backdrop-blur-md">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  wsStatus === 'connected' ? "bg-green-500 animate-pulse" : 
                  wsStatus === 'connecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-xs font-bold font-mono">{pair}</span>
                <span className="text-xs font-bold font-mono text-green-400">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
              </div>
            )}

            {indicators.sessions && (
              <div className="flex items-center gap-3 px-3 py-1 bg-black/60 text-white rounded-lg border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    sessionInfo.color === 'blue' ? "bg-blue-500" :
                    sessionInfo.color === 'orange' ? "bg-orange-500" :
                    sessionInfo.color === 'green' ? "bg-green-500" : "bg-gray-500"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{sessionInfo.name}</span>
                </div>
              </div>
            )}

            {performanceMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 backdrop-blur-md">
                <Zap className="w-3 h-3 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Fast Mode</span>
              </div>
            )}

            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-md transition-all shadow-lg",
              sentiment === 'BULLISH' ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-green-500/10" :
              sentiment === 'BEARISH' ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/10" :
              "bg-gray-500/20 text-gray-400 border-gray-500/30 shadow-gray-500/10"
            )}>
              <TrendingUp className={cn("w-3.5 h-3.5", sentiment === 'BEARISH' && "rotate-180")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Sentiment: {sentiment}</span>
            </div>

            {result.aiConfirmationScore !== undefined && (
              <div className="flex items-center gap-3 px-3 py-1 bg-black/60 text-white rounded-lg border border-white/10 backdrop-blur-md shadow-lg group/gauge">
                <div className="relative w-6 h-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-white/10"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      strokeDasharray="100, 100"
                      strokeDashoffset={100 - result.aiConfirmationScore}
                      strokeLinecap="round"
                      strokeWidth="4"
                      className={cn(
                        "transition-all duration-1000 ease-out",
                        result.aiConfirmationScore >= 70 ? "stroke-green-500" :
                        result.aiConfirmationScore >= 40 ? "stroke-yellow-500" : "stroke-red-500"
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-black tracking-tighter">
                      {result.aiConfirmationScore}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 leading-none">AI Confidence</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter leading-none mt-0.5",
                    result.aiConfirmationScore >= 70 ? "text-green-400" :
                    result.aiConfirmationScore >= 40 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {result.aiConfirmationScore >= 70 ? "High" :
                     result.aiConfirmationScore >= 40 ? "Medium" : "Low"}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowTradeModal(true)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 backdrop-blur-md hover:bg-blue-500/30 transition-all pointer-events-auto shadow-lg"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Simulate Trade</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'trades' ? 'chart' : 'trades')}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-md transition-all shadow-lg pointer-events-auto",
                activeTab === 'trades' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-black/60 text-gray-400 hover:text-white border-white/10"
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Trades</span>
              {simulatedTrades.filter(t => t.status === 'OPEN').length > 0 && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>

            {comparisonPair && comparisonPrice && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold font-mono">{comparisonPair}</span>
                <span className="text-xs font-bold font-mono">{comparisonPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                <button 
                  onClick={() => setComparisonPair(null)}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-md transition-all shadow-lg",
                showSettings ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-black/60 text-gray-400 hover:text-white border-white/10"
              )}
            >
              <Settings className={cn("w-3.5 h-3.5", showSettings && "animate-spin-slow")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Chart Settings</span>
            </button>
          </div>
          
          {showSettings && (
            <>
              <div 
                className="fixed inset-0 z-10 pointer-events-auto" 
                onClick={() => setShowSettings(false)}
              />
              <div className="relative z-20 w-80 p-4 bg-black/80 rounded-2xl border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl space-y-6">
              {/* Risk Guidelines Section */}
              {userProfile && (
                <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-orange-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Risk Guidelines</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Tolerance</span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                        userProfile.riskTolerance === 'CONSERVATIVE' ? "bg-green-500/20 text-green-400" :
                        userProfile.riskTolerance === 'MODERATE' ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {userProfile.riskTolerance}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">
                      {userProfile.riskTolerance === 'CONSERVATIVE' ? "Focus on high-probability setups with tight stop losses. Avoid trading during high-impact news." :
                       userProfile.riskTolerance === 'MODERATE' ? "Balanced approach. Look for confluence across multiple timeframes. Standard position sizing." :
                       "Aggressive strategy. Willing to take higher risk for potentially larger returns. Monitor volatility closely."}
                    </p>
                  </div>
                </div>
              )}

              {/* Timeframe Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/40">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Timeframe</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {timeframes.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                        timeframe === tf.value 
                          ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Strategy Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40">
                    <Zap className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Trade Strategy</span>
                  </div>
                  <button 
                    onClick={() => setPerformanceMode(!performanceMode)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all",
                      performanceMode 
                        ? "bg-orange-500/20 border-orange-500/30 text-orange-400" 
                        : "bg-white/5 border-white/10 text-white/40"
                    )}
                  >
                    <Activity className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Fast Mode</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'scalp', label: 'Quick Scalp', icon: Zap, color: 'orange' },
                      { id: 'day', label: 'Day Trade', icon: Clock, color: 'blue' },
                      { id: 'swing', label: 'Swing Trade', icon: TrendingUp, color: 'purple' },
                      { id: 'position', label: 'Position Trade', icon: Target, color: 'emerald' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setStrategyType(type.id as any)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                          strategyType === type.id
                            ? `bg-${type.color}-500/20 border-${type.color}-500/30 text-${type.color}-400`
                            : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <type.icon className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase truncate">{type.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Profile Settings Section */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Trinity Profile</span>
                </div>
                
                <div className="space-y-4">
                  {/* Risk Tolerance */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Risk Management</span>
                    <div className="grid grid-cols-3 gap-1">
                      {['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'].map(r => (
                        <button
                          key={r}
                          onClick={() => onUpdateProfile?.({ riskTolerance: r as any })}
                          className={cn(
                            "py-1.5 text-[8px] font-black rounded-md border transition-all",
                            userProfile?.riskTolerance === r
                              ? "bg-orange-500 border-orange-400 text-white"
                              : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Experience Level</span>
                    <div className="grid grid-cols-2 gap-1">
                      {['BEGINNER', 'ADVANCED'].map(e => (
                        <button
                          key={e}
                          onClick={() => onUpdateProfile?.({ experienceLevel: e as any })}
                          className={cn(
                            "py-1.5 text-[8px] font-black rounded-md border transition-all",
                            userProfile?.experienceLevel === e
                              ? "bg-blue-500 border-blue-400 text-white"
                              : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trading Goal */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Trading Goal</span>
                    <div className="grid grid-cols-3 gap-1">
                      {['INCOME', 'GROWTH', 'DISCIPLINE'].map(g => (
                        <button
                          key={g}
                          onClick={() => onUpdateProfile?.({ tradingGoal: g as any })}
                          className={cn(
                            "py-1.5 text-[8px] font-black rounded-md border transition-all",
                            userProfile?.tradingGoal === g
                              ? "bg-emerald-500 border-emerald-400 text-white"
                              : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Predictive Parameters Section */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                  <Brain className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">AI Predictive Parameters</span>
                </div>
                
                <div className="space-y-4">
                  {/* Breakout Sensitivity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Breakout Sensitivity</span>
                      <span className="text-[10px] font-mono text-orange-400 font-black">{userProfile?.aiSettings?.breakoutSensitivity || 50}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={userProfile?.aiSettings?.breakoutSensitivity || 50}
                      onChange={(e) => onUpdateProfile?.({ 
                        aiSettings: { 
                          ...(userProfile?.aiSettings || { breakoutSensitivity: 50, reversalSensitivity: 50, anomalySensitivity: 50 }),
                          breakoutSensitivity: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Reversal Sensitivity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Reversal Sensitivity</span>
                      <span className="text-[10px] font-mono text-blue-400 font-black">{userProfile?.aiSettings?.reversalSensitivity || 50}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={userProfile?.aiSettings?.reversalSensitivity || 50}
                      onChange={(e) => onUpdateProfile?.({ 
                        aiSettings: { 
                          ...(userProfile?.aiSettings || { breakoutSensitivity: 50, reversalSensitivity: 50, anomalySensitivity: 50 }),
                          reversalSensitivity: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Anomaly Sensitivity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Anomaly Sensitivity</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-black">{userProfile?.aiSettings?.anomalySensitivity || 50}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={userProfile?.aiSettings?.anomalySensitivity || 50}
                      onChange={(e) => onUpdateProfile?.({ 
                        aiSettings: { 
                          ...(userProfile?.aiSettings || { breakoutSensitivity: 50, reversalSensitivity: 50, anomalySensitivity: 50 }),
                          anomalySensitivity: parseInt(e.target.value) 
                        } 
                      })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Indicators Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/40">
                  <BarChart3 className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Indicators</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'volume', label: 'Volume', icon: BarChart3, color: 'green' },
                    { key: 'ema20', label: 'EMA 20', icon: TrendingUp, color: 'blue' },
                    { key: 'ema50', label: 'EMA 50', icon: TrendingUp, color: 'yellow' },
                    { key: 'rsi', label: 'RSI', icon: Activity, color: 'purple' },
                    { key: 'bb', label: 'Bollinger', icon: Hash, color: 'blue' },
                    { key: 'macd', label: 'MACD', icon: BarChart3, color: 'orange' },
                    { key: 'fvg', label: 'FVG', icon: Layers, color: 'cyan' },
                    { key: 'ob', label: 'Order Blocks', icon: Box, color: 'emerald' },
                    { key: 'liquidity', label: 'Liquidity', icon: Target, color: 'pink' },
                    { key: 'mss', label: 'Market Shift', icon: Zap, color: 'orange' },
                    { key: 'hunts', label: 'Stop Hunts', icon: Target, color: 'red' },
                    { key: 'sessions', label: 'Sessions', icon: Clock, color: 'amber' },
                  ].map((ind) => (
                    <button
                      key={ind.key}
                      onClick={() => setIndicators(prev => ({ ...prev, [ind.key]: !prev[ind.key as keyof typeof indicators] }))}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                        indicators[ind.key as keyof typeof indicators]
                          ? `bg-${ind.color}-500/20 border-${ind.color}-500/30 text-${ind.color}-400`
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ind.icon className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase truncate">{ind.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comparison Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40">
                    <Search className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Compare Pair</span>
                  </div>
                  {comparisonPair && (
                    <button
                      onClick={() => setComparisonPair(null)}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                  <input
                    type="text"
                    placeholder="Search pair (e.g. BTC/USDT)..."
                    value={comparisonSearch}
                    onChange={(e) => setComparisonSearch(e.target.value.toUpperCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {(comparisonSearch ? [comparisonSearch] : commonPairs).map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        setComparisonPair(p);
                        setComparisonSearch('');
                      }}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-md border transition-all",
                        comparisonPair === p
                          ? "bg-blue-500 border-blue-400 text-white"
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drawing Tools Section */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40">
                    <MousePointer2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Drawings</span>
                  </div>
                  {drawingLines.length > 0 && (
                    <button
                      onClick={() => setDrawingLines([])}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (currentPrice) {
                      setDrawingLines(prev => [...prev, currentPrice]);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <Hash className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">Add Line at Current Price</span>
                </button>
              </div>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
