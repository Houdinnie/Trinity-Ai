import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Percent, Target, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, AnalysisResult } from '../types';

interface RiskCalculatorProps {
  profile: UserProfile;
  analysis: AnalysisResult;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export function RiskCalculator({ profile, analysis, onUpdateProfile }: RiskCalculatorProps) {
  const [balance, setBalance] = useState(profile.accountBalance || 10000);
  const [riskPercent, setRiskPercent] = useState(
    profile.riskTolerance === 'CONSERVATIVE' ? 1 :
    profile.riskTolerance === 'MODERATE' ? 2 : 3
  );
  const [isEditingBalance, setIsEditingBalance] = useState(false);

  useEffect(() => {
    if (profile.accountBalance !== undefined) {
      setBalance(profile.accountBalance);
    }
  }, [profile.accountBalance]);

  // Parse entry and stop loss
  const entry = parseFloat(analysis.sniperEntry.entry.replace(/[^0-9.]/g, ''));
  const stopLoss = parseFloat(analysis.sniperEntry.stopLoss.replace(/[^0-9.]/g, ''));
  
  const stopLossDistance = Math.abs(entry - stopLoss);
  const riskAmount = (balance * riskPercent) / 100;
  
  // Position size calculation
  // For forex/indices, this is often (Risk Amount) / (Stop Loss Distance)
  // We'll assume standard lot sizing for now or just raw units
  const positionSize = stopLossDistance > 0 ? (riskAmount / stopLossDistance) : 0;

  const handleSaveBalance = async () => {
    await onUpdateProfile({ accountBalance: balance });
    setIsEditingBalance(false);
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          Position Size Calculator
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
          <AlertTriangle className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Risk Management</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Account Balance */}
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              Account Balance
            </label>
            <div className="flex gap-2">
              {isEditingBalance ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(parseFloat(e.target.value))}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleSaveBalance}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingBalance(true)}
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <span>${balance.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-500">Edit</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Percentage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                <Percent className="w-3 h-3" />
                Risk Per Trade
              </label>
              <span className="text-xs font-bold text-blue-400">{riskPercent}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[8px] text-gray-600 font-bold uppercase">
              <span>Conservative (1%)</span>
              <span>Aggressive (5%)</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/5 rounded-2xl border border-blue-500/10 p-6 flex flex-col justify-center">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Risk Amount</span>
              <span className="text-sm font-bold text-red-400">-${riskAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">SL Distance</span>
              <span className="text-sm font-bold text-gray-300">{stopLossDistance.toFixed(5)}</span>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Recommended Position Size</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{positionSize.toFixed(2)}</span>
                <span className="text-xs text-gray-500 mb-1 font-bold uppercase">Units / Lots</span>
              </div>
              <p className="text-[9px] text-gray-600 mt-2 leading-relaxed">
                *Calculation based on raw units. Adjust for your broker's specific lot sizing (e.g., divide by 100,000 for standard forex lots).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
