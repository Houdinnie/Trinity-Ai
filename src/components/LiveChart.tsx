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
import { AnalysisResult } from '../types';
import { Plus, X, BarChart3, Activity, TrendingUp, Hash, MousePointer2 } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface LiveChartProps {
  result: AnalysisResult;
  pair: string;
}

export function LiveChart({ result, pair }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const comparisonSeriesRef = useRef<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [comparisonPrice, setComparisonPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(result.timeframe || '1h');
  const [comparisonPair, setComparisonPair] = useState<string | null>(null);
  const [showComparisonSearch, setShowComparisonSearch] = useState(false);
  const [indicators, setIndicators] = useState({
    volume: true,
    ema20: true,
    ema50: true,
    rsi: false,
    bb: false,
    macd: false,
  });
  const [drawingLines, setDrawingLines] = useState<number[]>([]);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('NEUTRAL');

  const commonPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ARB/USDT'];

  const timeframes = [
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
  ];

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

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const symbol = pair.replace('/', '').toUpperCase();
        let activeMainSymbol = symbol;
        const mainResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
        
        if (mainResponse.ok) {
          const rawData = await mainResponse.json();
          const data = rawData.map((d: any) => ({
            time: (d[0] / 1000) as UTCTimestamp,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
          }));
          candlestickSeries.setData(data);
          
          if (indicators.volume && volumeSeries) {
            volumeSeries.setData(data.map((d: any) => ({
              time: d.time,
              value: d.volume,
              color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            })));
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

          // Calculate Sentiment
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

          // Factor in candlestick patterns if available
          if (result.candlestickPatterns) {
            result.candlestickPatterns.forEach(p => {
              if (p.type === 'BULLISH') score += 0.5;
              else if (p.type === 'BEARISH') score -= 0.5;
            });
          }

          if (score >= 1.5) setSentiment('BULLISH');
          else if (score <= -1.5) setSentiment('BEARISH');
          else setSentiment('NEUTRAL');

          if (data.length > 0) setCurrentPrice(data[data.length - 1].close);
        } else {
          // Fallback for pairs that might need 'T' (e.g. BTC/USD -> BTCUSDT)
          const altResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}T&interval=${timeframe}&limit=500`);
          if (altResponse.ok) {
            activeMainSymbol = symbol + 'T';
            const rawData = await altResponse.json();
            const data = rawData.map((d: any) => ({
              time: (d[0] / 1000) as UTCTimestamp,
              open: parseFloat(d[1]),
              high: parseFloat(d[2]),
              low: parseFloat(d[3]),
              close: parseFloat(d[4]),
            }));
            candlestickSeries.setData(data);
            if (data.length > 0) setCurrentPrice(data[data.length - 1].close);
          } else {
            candlestickSeries.setData(generateMockData());
          }
        }

        // Fetch comparison data if needed
        let activeCompSymbol = comparisonPair?.replace('/', '').toUpperCase();
        if (comparisonPair && comparisonSeries) {
          const compSymbol = comparisonPair.replace('/', '').toUpperCase();
          const compResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${compSymbol}&interval=${timeframe}&limit=500`);
          if (compResponse.ok) {
            const rawCompData = await compResponse.json();
            const compData = rawCompData.map((d: any) => ({
              time: (d[0] / 1000) as UTCTimestamp,
              value: parseFloat(d[4]),
            }));
            comparisonSeries.setData(compData);
            if (compData.length > 0) setComparisonPrice(compData[compData.length - 1].value);
          } else {
            // Try with 'T' for comparison too
            const altCompResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${compSymbol}T&interval=${timeframe}&limit=500`);
            if (altCompResponse.ok) {
              activeCompSymbol = compSymbol + 'T';
              const rawCompData = await altCompResponse.json();
              const compData = rawCompData.map((d: any) => ({
                time: (d[0] / 1000) as UTCTimestamp,
                value: parseFloat(d[4]),
              }));
              comparisonSeries.setData(compData);
              if (compData.length > 0) setComparisonPrice(compData[compData.length - 1].value);
            }
          }
        }

        startWebSocket(activeMainSymbol, activeCompSymbol);
      } catch (e) {
        candlestickSeries.setData(generateMockData());
      } finally {
        setIsLoading(false);
      }
    };

    let ws: WebSocket | null = null;
    const startWebSocket = (mainSymbol: string, compSymbol?: string) => {
      const streams = [`${mainSymbol.toLowerCase()}@kline_${timeframe}`];
      if (compSymbol) {
        streams.push(`${compSymbol.toLowerCase()}@kline_${timeframe}`);
      }
      
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams.join('/')}`);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const k = message.k;
        if (!k) return;

        const isMain = message.s.toUpperCase().startsWith(mainSymbol.toUpperCase());
        const price = parseFloat(k.c);
        const time = (k.t / 1000) as UTCTimestamp;

        if (isMain) {
          setCurrentPrice(price);
          const updateData = {
            time,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: price,
          };
          candlestickSeries.update(updateData);
          
          if (indicators.volume && volumeSeries) {
            volumeSeries.update({
              time,
              value: parseFloat(k.v),
              color: price >= parseFloat(k.o) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            });
          }
          // Note: EMAs and RSI would ideally be recalculated here for the last point, 
          // but for simplicity we'll let them update on next full fetch or just skip live update for indicators
        } else if (comparisonSeries) {
          setComparisonPrice(price);
          comparisonSeries.update({
            time,
            value: price,
          });
        }
      };

      ws.onerror = (err) => console.error('WebSocket error:', err);
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

    // Add Markers for Candlestick Patterns
    if (result.candlestickPatterns) {
      const markers = result.candlestickPatterns.map((pattern, i) => ({
        time: (Math.floor(Date.now() / 1000) - (10 - i) * 3600) as UTCTimestamp, // Mock placement
        position: pattern.type === 'BULLISH' ? 'belowBar' : 'aboveBar' as any,
        color: pattern.type === 'BULLISH' ? '#22c55e' : pattern.type === 'BEARISH' ? '#ef4444' : '#94a3b8',
        shape: 'arrowUp' as any,
        text: pattern.name,
      }));
      candlestickSeries.setMarkers(markers);
    }

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
  }, [result, pair, timeframe, comparisonPair, indicators, drawingLines]);

  return (
    <div className="relative w-full h-full group">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Synchronizing Data...</span>
          </div>
        </div>
      )}

      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            {currentPrice && (
              <div className="flex items-center gap-2 px-3 py-1 bg-black/60 text-white rounded-lg border border-white/10 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold font-mono">{pair}</span>
                <span className="text-xs font-bold font-mono text-green-400">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
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

            {!comparisonPair && (
              <button
                onClick={() => setShowComparisonSearch(!showComparisonSearch)}
                className="flex items-center gap-2 px-3 py-1 bg-black/60 text-gray-400 hover:text-white rounded-lg border border-white/10 backdrop-blur-md transition-all"
              >
                <Plus className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">Compare</span>
              </button>
            )}
          </div>
          
          {showComparisonSearch && !comparisonPair && (
            <div className="flex flex-wrap gap-1 p-2 bg-black/80 rounded-xl border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
              {commonPairs.map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setComparisonPair(p);
                    setShowComparisonSearch(false);
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md w-fit">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  timeframe === tf.value 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Indicators Toggle */}
          <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md w-fit gap-1">
            <button
              onClick={() => setIndicators(prev => ({ ...prev, volume: !prev.volume }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.volume ? "bg-green-500/20 text-green-400" : "text-gray-400 hover:text-white"
              )}
              title="Volume"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIndicators(prev => ({ ...prev, ema20: !prev.ema20 }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.ema20 ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"
              )}
              title="EMA 20"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIndicators(prev => ({ ...prev, ema50: !prev.ema50 }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.ema50 ? "bg-yellow-500/20 text-yellow-400" : "text-gray-400 hover:text-white"
              )}
              title="EMA 50"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIndicators(prev => ({ ...prev, rsi: !prev.rsi }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.rsi ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white"
              )}
              title="RSI"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIndicators(prev => ({ ...prev, bb: !prev.bb }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.bb ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"
              )}
              title="Bollinger Bands"
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIndicators(prev => ({ ...prev, macd: !prev.macd }))}
              className={cn(
                "p-1.5 rounded transition-all",
                indicators.macd ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"
              )}
              title="MACD"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1 self-center" />
            <button
              onClick={() => {
                if (currentPrice) {
                  setDrawingLines(prev => [...prev, currentPrice]);
                }
              }}
              className="p-1.5 rounded text-gray-400 hover:text-white transition-all"
              title="Add Horizontal Line at Current Price"
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
            {drawingLines.length > 0 && (
              <button
                onClick={() => setDrawingLines([])}
                className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-all"
                title="Clear All Lines"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
