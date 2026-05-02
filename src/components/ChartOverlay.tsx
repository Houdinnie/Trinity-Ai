import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search 
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { cn } from '../lib/utils';
import { LiveChart } from './LiveChart';
import type { AnalysisResult, UserProfile } from '../types';

export function ChartOverlay({ result, imageUrl, pair, analysisId, profile, onUpdateProfile }: { 
  result: AnalysisResult; 
  imageUrl: string; 
  pair: string;
  analysisId?: string;
  profile?: UserProfile;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}) {
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

      <div className="relative w-full aspect-video sm:aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden border border-white/10 bg-black/50">
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
                            fill={pattern.type === 'BULLISH' ? '#22c55e' : '#ef4444'} 
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

                      {/* LZS Indicators */}
                      {result.lzsIndicators?.map((indicator, i) => (
                        <g key={`lzs-${i}`}>
                          <rect 
                            x={`${indicator.visualX * 100 - 5}%`} 
                            y={`${indicator.visualY * 100 - 2}%`} 
                            width="10%" 
                            height="4%" 
                            fill={
                              indicator.type === 'CT_AOL' ? '#3b82f6' : 
                              indicator.type === 'ST1_SHIFT' ? '#a855f7' : 
                              indicator.type === 'QML' ? '#d946ef' :
                              indicator.type === 'LIQUIDITY_SWEEP' ? '#ef4444' :
                              indicator.type === 'MPL' ? '#22c55e' :
                              '#f97316'
                            } 
                            fillOpacity="0.2"
                            stroke={
                              indicator.type === 'CT_AOL' ? '#3b82f6' : 
                              indicator.type === 'ST1_SHIFT' ? '#a855f7' : 
                              indicator.type === 'QML' ? '#d946ef' :
                              indicator.type === 'LIQUIDITY_SWEEP' ? '#ef4444' :
                              indicator.type === 'MPL' ? '#22c55e' :
                              '#f97316'
                            }
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            rx="2"
                          />
                          <circle 
                            cx={`${indicator.visualX * 100}%`} 
                            cy={`${indicator.visualY * 100}%`} 
                            r="4" 
                            fill={
                              indicator.type === 'CT_AOL' ? '#3b82f6' : 
                              indicator.type === 'ST1_SHIFT' ? '#a855f7' : 
                              indicator.type === 'QML' ? '#d946ef' :
                              indicator.type === 'LIQUIDITY_SWEEP' ? '#ef4444' :
                              indicator.type === 'MPL' ? '#22c55e' :
                              '#f97316'
                            } 
                          />
                          <text 
                            x={`${indicator.visualX * 100}%`} 
                            y={`${indicator.visualY * 100 + 15}%`} 
                            fill="white" 
                            fontSize="8" 
                            fontWeight="black" 
                            textAnchor="middle"
                            className="uppercase tracking-tighter"
                          >
                            {indicator.name}
                          </text>
                          {indicator.context && (
                            <text 
                              x={`${indicator.visualX * 100}%`} 
                              y={`${indicator.visualY * 100 + 25}%`} 
                              fill="rgba(255,255,255,0.6)" 
                              fontSize="6" 
                              fontWeight="bold" 
                              textAnchor="middle"
                            >
                              {indicator.context}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
          <LiveChart 
            result={result} 
            pair={pair} 
            analysisId={analysisId}
            userProfile={profile} 
            onUpdateProfile={onUpdateProfile} 
          />
        )}
      </div>
    </div>
  );
}
