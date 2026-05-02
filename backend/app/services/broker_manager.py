"""
BrokerManager — Unified interface for Exness (MT5) and deriv.com.
Combines data from both brokers into a single dashboard view.
"""

import asyncio
from typing import List, Dict, Any
from app.services.brokers.exness import ExnessBroker
from app.services.brokers.deriv import DerivBroker


class BrokerManager:
    def __init__(self):
        self.exness = ExnessBroker()
        self.deriv = DerivBroker()

    async def connect_all(self):
        await asyncio.gather(
            self.exness.connect(),
            self.deriv.connect()
        )

    async def get_all_accounts(self) -> List[Dict[str, Any]]:
        results = await asyncio.gather(
            self.exness.get_accounts(),
            self.deriv.get_accounts()
        )
        return results[0] + results[1]

    async def get_all_positions(self) -> List[Dict[str, Any]]:
        results = await asyncio.gather(
            self.exness.get_positions(),
            self.deriv.get_positions()
        )
        return results[0] + results[1]

    async def get_watchlist(self) -> List[Dict[str, Any]]:
        results = await asyncio.gather(
            self.exness.get_watchlist(),
            self.deriv.get_watchlist()
        )
        combined = results[0] + results[1]
        seen = set()
        unique = []
        for item in combined:
            if item["pair"] not in seen:
                seen.add(item["pair"])
                unique.append(item)
        return unique

    async def get_ohlcv(self, pair: str, timeframe: str = "M5", count: int = 100):
        pair_clean = pair.replace("/", "")
        result = await self.exness.get_ohlcv(pair_clean, timeframe, count)
        if not result:
            result = await self.deriv.get_ohlcv(pair.replace("/", ""), timeframe, count)
        return result

    async def get_proposal(self, symbol: str, contract_type: str,
                            amount: float, multiplier: int = 100) -> Dict[str, Any]:
        return await self.deriv.get_proposal(symbol, contract_type, amount, multiplier)

    async def place_trade(self, symbol: str, contract_type: str,
                          amount: float, multiplier: int = 100,
                          stop_loss: float = 0, take_profit: float = 0) -> Dict[str, Any]:
        return await self.deriv.place_trade(
            symbol, contract_type, amount, multiplier, stop_loss, take_profit
        )

    async def close_trade(self, contract_id: int) -> Dict[str, Any]:
        return await self.deriv.close_position(contract_id)

    async def get_candles(self, symbol: str, timeframe: str = "M5",
                          count: int = 100) -> Dict[str, Any]:
        return await self.deriv.get_ohlcv(symbol.replace("/", ""), timeframe, count)

    async def close_all(self):
        await asyncio.gather(
            self.exness.close(),
            self.deriv.close()
        )
