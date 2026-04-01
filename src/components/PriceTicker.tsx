import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export function PriceTicker({ onPriceUpdate }: { onPriceUpdate: (prices: Record<string, number>) => void }) {
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

        // Forex
        const forexPairs = [
          { name: 'EURUSD', rate: 1 / parseFloat(rates.EUR) },
          { name: 'GBPUSD', rate: 1 / parseFloat(rates.GBP) },
          { name: 'GBPJPY', rate: (1 / parseFloat(rates.GBP)) * parseFloat(rates.JPY) },
          { name: 'XAUUSD', rate: 1 / parseFloat(rates.XAU) }
        ];

        forexPairs.forEach(p => {
          newPrices[p.name] = {
            price: p.rate.toLocaleString(undefined, { minimumFractionDigits: p.name === 'GBPJPY' ? 3 : 2, maximumFractionDigits: p.name === 'GBPJPY' ? 3 : 5 }),
            change: (Math.random() * 0.4 - 0.2).toFixed(2)
          };
        });

        setPrices(newPrices);

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
    const interval = setInterval(fetchPrices, 30000);
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
