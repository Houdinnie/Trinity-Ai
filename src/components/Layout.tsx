import React from 'react';
import { Navbar } from './Navbar';
import { Zap } from 'lucide-react';

export function Layout({ children, user, onPriceUpdate }: { children: React.ReactNode, user: any, onPriceUpdate: (prices: Record<string, number>) => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      <Navbar user={user} onPriceUpdate={onPriceUpdate} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
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
  );
}
