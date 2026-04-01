import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowRightLeft, 
  TrendingUp, 
  Zap, 
  ChevronRight, 
  BookOpen, 
  Target, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TutorialStep {
  title: string;
  content: string;
  image?: string;
  tip?: string;
}

interface CaseStudy {
  title: string;
  description: string;
  outcome: string;
  image: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: any;
  steps: TutorialStep[];
  caseStudy: CaseStudy;
}

const tutorials: Tutorial[] = [
  {
    id: 'liquidity-pois',
    title: 'Liquidity & POIs',
    description: 'Master Order Blocks, Breakers, and Liquidity Pools for high-precision zones.',
    icon: Layers,
    steps: [
      {
        title: 'Order Blocks (OB)',
        content: 'An Order Block is the last candle before an impulsive move that breaks structure. It represents institutional buying or selling. High-probability OBs MUST sweep liquidity and leave an imbalance (FVG) behind.',
        tip: 'The most powerful OB is the "Extreme" block at the very start of a swing.'
      },
      {
        title: 'Breaker & Mitigation Blocks',
        content: 'A Breaker Block is a failed Order Block that was broken impulsively; it now acts as the opposite (Supply becomes Demand). A Mitigation Block is a failed OB that price returns to after a CHoCH to mitigate institutional losses.',
        image: 'https://images.unsplash.com/photo-1611974717482-480051675c4a?auto=format&fit=crop&q=80&w=800',
        tip: 'Breakers are often found during high-volatility news events.'
      },
      {
        title: 'Liquidity Pools (EQH/EQL)',
        content: 'Equal Highs (EQH) and Equal Lows (EQL) are retail "Double Tops/Bottoms". Institutions view these as pools of money (Stop Losses). Price will often sweep these levels before reversing.',
        tip: 'Always look for EQH/EQL above or below your POI as "fuel" for the move.'
      },
      {
        title: 'POI Refinement',
        content: 'To achieve "Sniper Entries," refine your Higher Timeframe (HTF) zone. If you have a 4H Order Block, look inside it on the 15m or 5m chart to find a smaller, unmitigated OB. This reduces your Stop Loss significantly.',
        image: 'https://images.unsplash.com/photo-1642790103517-18129f1443c2?auto=format&fit=crop&q=80&w=800',
        tip: 'Refining to the "Extreme" of a zone often yields the best RR ratio.'
      }
    ],
    caseStudy: {
      title: 'EURUSD 1:15 RR Refinement',
      description: 'A 4H Supply Zone was identified. Instead of entering on the 4H touch, we waited for price to reach the 5m "Extreme" Order Block within that zone.',
      outcome: 'Price tapped the 5m OB with 1.5 pips of drawdown and dropped 100 pips, providing a massive Risk-to-Reward ratio.',
      image: 'https://images.unsplash.com/photo-1611974717482-480051675c4a?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    id: 'market-structure',
    title: 'SMC Market Structure',
    description: 'Go beyond basic trends. Master Inducement, BOS, and CHoCH for true bias.',
    icon: ArrowRightLeft,
    steps: [
      {
        title: 'BOS vs CHoCH',
        content: 'Break of Structure (BOS) continues the trend. Change of Character (CHoCH) is the first sign of reversal. For a valid BOS, we require a body close, not just a wick sweep.',
        tip: 'A wick sweep without a body close is often just liquidity engineering.'
      },
      {
        title: 'Inducement (IDM)',
        content: 'Inducement is the first internal pullback after a BOS. Price MUST sweep the IDM to confirm a new Higher High or Lower Low. Without an IDM sweep, the structure is not yet confirmed.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
        tip: 'IDM is the "trap" that lures retail traders into early entries.'
      },
      {
        title: 'Internal vs Swing Structure',
        content: 'Swing structure is your major trend (Daily/4H). Internal structure is the minor movement within that swing. Trading internal CHoCHs back into swing POIs is the key to sniper entries.',
        tip: 'Always align your internal CHoCH with the higher timeframe swing bias.'
      }
    ],
    caseStudy: {
      title: 'Nasdaq (NAS100) IDM Sweep',
      description: 'NAS100 was in a clear uptrend. Price created a new high but hadn\'t swept IDM. Most traders bought the first FVG, but Trinity waited for the IDM sweep into the Extreme OB.',
      outcome: 'Price swept the IDM, tapped the Extreme OB, and rallied 300 points. Those who bought early were stopped out.',
      image: 'https://images.unsplash.com/photo-1611974717482-480051675c4a?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    id: 'mtf-analysis',
    title: 'Multi-Timeframe Mastery',
    description: 'Coordinate timeframes to find high-precision sniper entries.',
    icon: TrendingUp,
    steps: [
      {
        title: 'The Top-Down Approach',
        content: 'Start with the Daily or Weekly timeframe to establish the "Directional Bias." Are the big players buying or selling? Never trade against the higher timeframe flow.',
        tip: 'The Weekly trend is your best friend.'
      },
      {
        title: 'Finding the Zone',
        content: 'Move down to the 4H or 1H timeframe to identify "Areas of Liquidity" (AOL). These are zones where price is likely to react based on the higher timeframe bias.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800'
      },
      {
        title: 'The Sniper Trigger',
        content: 'Finally, use the 15m or 5m timeframe to wait for a CHoCH within your 1H/4H zone. This "nesting" of timeframes is what creates a sniper entry.',
        tip: 'Patience is key. Wait for the lower timeframe to "talk the same language" as the higher timeframe.'
      }
    ],
    caseStudy: {
      title: 'BTCUSD Sniper Entry',
      description: 'Daily bias was bullish. Price retraced into a 4H bullish order block. On the 5m chart, a clear CHoCH formed after sweeping the Asian session low.',
      outcome: 'Entering on the 5m CHoCH allowed for a stop-loss of only $100 on BTC, resulting in a 1:12 RR trade as price hit the Daily target.',
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800'
    }
  }
];

export function EducationModule({ onBack }: { onBack: () => void }) {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleTutorialClick = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (selectedTutorial && currentStep < selectedTutorial.steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-widest mb-6"
        >
          <BookOpen className="w-4 h-4" />
          Interactive Academy
        </motion.div>
        <h1 className="text-5xl font-black mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          TRINITY TRADING ACADEMY
        </h1>
        <p className="text-xl text-gray-400">
          Master the core concepts behind our AI's sniper entry logic. 
          Interactive tutorials designed for professional growth.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedTutorial ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {tutorials.map((tutorial) => (
              <button
                key={tutorial.id}
                onClick={() => handleTutorialClick(tutorial)}
                className="bg-white/5 rounded-3xl border border-white/10 p-8 hover:border-orange-500/50 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-6 h-6 text-orange-500" />
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <tutorial.icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{tutorial.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {tutorial.description}
                </p>
                <div className="flex items-center gap-2 text-orange-500 text-sm font-bold">
                  Start Tutorial
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="tutorial-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-sm">
              {/* Tutorial Header */}
              <div className="p-6 border-bottom border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <selectedTutorial.icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedTutorial.title}</h3>
                    <div className="flex gap-1 mt-1">
                      {selectedTutorial.steps.map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "h-1 rounded-full transition-all",
                            i === currentStep ? "w-8 bg-orange-500" : i < currentStep ? "w-4 bg-orange-500/50" : "w-4 bg-white/10"
                          )}
                        />
                      ))}
                      <div className={cn(
                        "h-1 rounded-full transition-all",
                        currentStep === selectedTutorial.steps.length ? "w-8 bg-green-500" : "w-4 bg-white/10"
                      )} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTutorial(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Tutorial Body */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {currentStep < selectedTutorial.steps.length ? (
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                          <h4 className="text-3xl font-black text-white">
                            {selectedTutorial.steps[currentStep].title}
                          </h4>
                          <p className="text-gray-400 leading-relaxed text-lg">
                            {selectedTutorial.steps[currentStep].content}
                          </p>
                          {selectedTutorial.steps[currentStep].tip && (
                            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex gap-3">
                              <Info className="w-5 h-5 text-orange-500 shrink-0" />
                              <p className="text-sm text-orange-200 italic">
                                <span className="font-bold not-italic mr-1">Pro Tip:</span>
                                {selectedTutorial.steps[currentStep].tip}
                              </p>
                            </div>
                          )}
                        </div>
                        {selectedTutorial.steps[currentStep].image && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                            <img 
                              src={selectedTutorial.steps[currentStep].image} 
                              alt="Tutorial visual"
                              className="w-full h-full object-cover aspect-video"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="case-study"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-8"
                    >
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 text-green-500 text-xs font-bold uppercase mb-4">
                          <Zap className="w-3 h-3" />
                          Case Study
                        </div>
                        <h4 className="text-4xl font-black text-white">
                          {selectedTutorial.caseStudy.title}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-full">
                          <img 
                            src={selectedTutorial.caseStudy.image} 
                            alt="Case study chart"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-6 flex flex-col justify-center">
                          <div className="space-y-2">
                            <h5 className="text-orange-500 font-bold uppercase text-sm tracking-wider">The Setup</h5>
                            <p className="text-gray-300 leading-relaxed">
                              {selectedTutorial.caseStudy.description}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-green-500 font-bold uppercase text-sm tracking-wider">The Outcome</h5>
                            <p className="text-gray-300 leading-relaxed">
                              {selectedTutorial.caseStudy.outcome}
                            </p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Tutorial Complete</p>
                              <p className="text-xs text-gray-500">You've mastered {selectedTutorial.title}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tutorial Footer */}
              <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-6 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {currentStep < selectedTutorial.steps.length ? (
                    <button
                      onClick={nextStep}
                      className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedTutorial(null)}
                      className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      Finish Academy
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedTutorial && (
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
            onClick={onBack}
            className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all"
          >
            Back to Analysis
          </button>
        </div>
      )}
    </div>
  );
}
