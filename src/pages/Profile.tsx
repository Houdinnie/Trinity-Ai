import React from 'react';
import { User, DollarSign, ShieldCheck, Gauge, Radar, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { UserProfile } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export function Profile({ profile, onUpdateProfile }: ProfileProps) {
  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/20">
          {profile.photoURL ? (
            <img src={profile.photoURL} className="w-full h-full object-cover rounded-3xl" alt="Profile" />
          ) : (
            <User className="w-12 h-12 text-white" />
          )}
        </div>
        <div>
          <h1 className="text-4xl font-black">{profile.displayName || 'Trader'}</h1>
          <p className="text-gray-500">{profile.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-xs font-bold uppercase tracking-wider border border-orange-500/20">
              {profile.experienceLevel}
            </span>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/20">
              {profile.riskTolerance}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            Trading Preferences
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Experience Level</label>
              <div className="grid grid-cols-2 gap-2">
                {['BEGINNER', 'ADVANCED'].map(level => (
                  <button
                    key={level}
                    onClick={() => onUpdateProfile({ experienceLevel: level as any })}
                    className={cn(
                      "py-3 rounded-2xl text-sm font-bold border transition-all",
                      profile.experienceLevel === level 
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Risk Tolerance</label>
              <div className="grid grid-cols-3 gap-2">
                {['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'].map(risk => (
                  <button
                    key={risk}
                    onClick={() => onUpdateProfile({ riskTolerance: risk as any })}
                    className={cn(
                      "py-3 rounded-2xl text-[10px] font-bold border transition-all",
                      profile.riskTolerance === risk 
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    )}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Account Balance</label>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <input
                  type="number"
                  defaultValue={profile.accountBalance || 0}
                  onBlur={(e) => onUpdateProfile({ accountBalance: parseFloat(e.target.value) })}
                  className="bg-transparent border-none focus:outline-none text-lg font-bold w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Sensitivity Settings
          </h2>
          <p className="text-sm text-gray-500">Adjust how Trinity's AI interprets market signals for your analysis.</p>
          
          <div className="space-y-8 py-4">
            {[
              { key: 'breakoutSensitivity', label: 'Breakout Sensitivity', icon: Gauge },
              { key: 'reversalSensitivity', label: 'Reversal Sensitivity', icon: Radar },
              { key: 'anomalySensitivity', label: 'Anomaly Detection', icon: Sparkles }
            ].map((setting) => (
              <div key={setting.key} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <setting.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold">{setting.label}</span>
                  </div>
                  <span className="text-sm font-mono text-blue-500">{(profile.aiSettings as any)[setting.key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(profile.aiSettings as any)[setting.key]}
                  onChange={(e) => onUpdateProfile({
                    aiSettings: {
                      ...profile.aiSettings,
                      [setting.key]: parseInt(e.target.value)
                    }
                  })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
