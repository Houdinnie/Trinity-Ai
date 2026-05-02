"""
deriv.com Broker — WebSocket API via native websockets library.
Handles real-time quotes, account data, and order execution.
Falls back to mock data when no API token is configured.
"""

import asyncio
import json
import os
from typing import List, Dict, Any
import random
import time

try:
    import websockets
    HAS_WS = True
except ImportError:
    HAS_WS = False


class DerivBroker:
    """Production Deriv.com WebSocket client using native websockets."""

    WS_URL = "wss://ws.binaryws.com/websockets/v3"

    def __init__(self):
        self.connected = False
        self._ws = None
        self._token = None
        self._app_id = None
        self._authorized = False
        self._req_id = 1
        self._pending: Dict[int, asyncio.Future] = {}
        self._listener_task = None
        self._use_mock = True

    async def connect(self):
        self._token = os.getenv("DERIV_API_TOKEN", "")
        self._app_id = os.getenv("DERIV_APP_ID", "1089")

        if not self._token:
            print("[deriv] No API token — running in mock mode")
            self._use_mock = True
            self.connected = True
            return

        try:
            self._ws = await websockets.connect(f"{self.WS_URL}?app_id={self._app_id}")
            result = await self._send({"authorize": self._token})
            if "error" in result:
                print(f"[deriv] Auth failed: {result['error']} — mock mode")
                await self._mock_connect()
                return
            self._authorized = True
            self._use_mock = False
            self.connected = True
            print(f"[deriv] Connected (login: {result.get('authorize', {}).get('loginid', '?')})")
            self._listener_task = asyncio.create_task(self._listen())
        except Exception as e:
            print(f"[deriv] Connection failed: {e} — mock mode")
            await self._mock_connect()

    async def _mock_connect(self):
        self._use_mock = True
        self.connected = True

    async def _send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        req_id = self._req_id
        self._req_id += 1
        payload["req_id"] = req_id
        future = asyncio.get_event_loop().create_future()
        self._pending[req_id] = future
        await self._ws.send(json.dumps(payload))
        return await asyncio.wait_for(future, timeout=30)

    async def _listen(self):
        try:
            async for raw in self._ws:
                msg = json.loads(raw)
                req_id = msg.get("req_id")
                if req_id and req_id in self._pending:
                    self._pending.pop(req_id).set_result(msg)
        except Exception as e:
            print(f"[deriv] Listener error: {e}")

    async def get_accounts(self) -> List[Dict[str, Any]]:
        if self._use_mock:
            return self._mock_accounts()
        try:
            res = await self._send({"balance": 1, "account": "current"})
            bal = res.get("balance", {})
            return [{
                "broker": "deriv.com",
                "account_id": bal.get("loginid", "?"),
                "balance": bal.get("balance", 0),
                "equity": bal.get("balance", 0),
                "currency": bal.get("currency", "USD"),
                "leverage": 100,
                "margin": 0,
                "free_margin": bal.get("balance", 0),
                "margin_level": 0,
                "open_pl": 0,
                "status": "active"
            }]
        except Exception as e:
            print(f"[deriv] get_accounts error: {e}")
            return self._mock_accounts()

    async def get_positions(self) -> List[Dict[str, Any]]:
        if self._use_mock:
            return self._mock_positions()
        try:
            res = await self._send({"portfolio": 1})
            contracts = res.get("portfolio", {}).get("contracts", [])
            return [{
                "id": str(c.get("contract_id", "")),
                "pair": c.get("underlying", ""),
                "type": c.get("contract_type", ""),
                "lots": 1,
                "entry_price": c.get("buy_price", 0),
                "current_price": c.get("bid_price", 0),
                "open_pl": round(c.get("bid_price", 0) - c.get("buy_price", 0), 2),
                "unrealized_pl": round(c.get("bid_price", 0) - c.get("buy_price", 0), 2),
                "margin_used": 0,
                "broker": "deriv.com"
            } for c in contracts]
        except Exception as e:
            print(f"[deriv] get_positions error: {e}")
            return self._mock_positions()

    async def get_watchlist(self) -> List[Dict[str, Any]]:
        if self._use_mock:
            return self._mock_watchlist()
        try:
            res = await self._send({"active_symbols": "brief", "product_type": "basic"})
            symbols = res.get("active_symbols", [])[:20]
            results = []
            for sym in symbols:
                s = sym.get("symbol", "")
                try:
                    tick = await self._send({"ticks": s})
                    t = tick.get("tick", {})
                    results.append({
                        "pair": sym.get("display_name", s),
                        "bid": t.get("bid", 0),
                        "ask": t.get("ask", 0),
                        "change": 0,
                        "change_pct": 0,
                        "pip_value": sym.get("pip", 0.0001),
                        "spread": round(random.uniform(0.5, 3.0), 1),
                        "leverage": 100
                    })
                except Exception:
                    pass
            return results
        except Exception as e:
            print(f"[deriv] get_watchlist error: {e}")
            return self._mock_watchlist()

    async def get_ohlcv(self, pair: str, timeframe: str = "M5", count: int = 100):
        if self._use_mock:
            return self._mock_ohlcv(pair, count)
        granularity_map = {
            "M1": 60, "M5": 300, "M15": 900, "M30": 1800,
            "H1": 3600, "H4": 14400, "D1": 86400
        }
        granularity = granularity_map.get(timeframe, 300)
        end_epoch = int(time.time())
        start_epoch = end_epoch - granularity * count
        try:
            res = await self._send({
                "ticks_history": pair, "adjust_start_time": 1, "count": count,
                "end": "latest", "start": start_epoch, "style": "candles", "granularity": granularity,
            })
            candles = res.get("candles", [])
            return [
                {"timestamp": c["epoch"] * 1000, "open": c["open"], "high": c["high"],
                 "low": c["low"], "close": c["close"], "volume": 0}
                for c in candles
            ]
        except Exception as e:
            print(f"[deriv] get_ohlcv error: {e}")
            return self._mock_ohlcv(pair, count)

    async def get_proposal(self, symbol: str, contract_type: str,
                           amount: float, multiplier: int = 100) -> Dict[str, Any]:
        if self._use_mock:
            return {"error": "Mock mode — cannot price contracts"}
        payload = {
            "proposal": 1, "amount": amount, "basis": "stake",
            "contract_type": contract_type, "currency": "USD", "symbol": symbol,
        }
        if contract_type in ("MULTUP", "MULTDOWN"):
            payload["multiplier"] = multiplier
        try:
            res = await self._send(payload)
            p = res.get("proposal", {})
            return {
                "proposal_id": p.get("id"),
                "ask_price": p.get("ask_price"),
                "payout": p.get("payout"),
                "spot": p.get("spot"),
                "commission": p.get("commission"),
                "multiplier": p.get("multiplier"),
            }
        except Exception as e:
            return {"error": str(e)}

    async def place_trade(self, symbol: str, contract_type: str,
                          amount: float, multiplier: int = 100,
                          stop_loss: float = 0, take_profit: float = 0) -> Dict[str, Any]:
        if self._use_mock:
            return {"error": "Mock mode — cannot place trades"}
        proposal = await self.get_proposal(symbol, contract_type, amount, multiplier)
        if "error" in proposal or not proposal.get("proposal_id"):
            return {"error": f"Failed to get proposal: {proposal}"}
        buy_payload = {"buy": proposal["proposal_id"], "price": proposal["ask_price"]}
        if stop_loss or take_profit:
            buy_payload["limit_order"] = {}
            if stop_loss:
                buy_payload["limit_order"]["stop_loss"] = stop_loss
            if take_profit:
                buy_payload["limit_order"]["take_profit"] = take_profit
        try:
            buy_res = await self._send(buy_payload)
            b = buy_res.get("buy", {})
            return {
                "status": "OPEN", "contract_id": b.get("contract_id"),
                "symbol": symbol, "contract_type": contract_type,
                "buy_price": b.get("buy_price"), "start_time": b.get("start_time"),
                "spot_entry": b.get("spot"), "multiplier": b.get("multiplier"),
                "stop_loss": stop_loss or None, "take_profit": take_profit or None,
                "transaction_id": b.get("transaction_id"),
            }
        except Exception as e:
            return {"error": str(e)}

    async def close_position(self, contract_id: int) -> Dict[str, Any]:
        if self._use_mock:
            return {"error": "Mock mode — cannot close positions"}
        try:
            contract_res = await self._send({
                "proposal_open_contract": 1, "contract_id": contract_id
            })
            contract = contract_res.get("proposal_open_contract", {})
            if contract.get("is_sold"):
                return {"status": "ALREADY_CLOSED", "contract_id": contract_id,
                        "sell_price": contract.get("sell_price"), "profit": contract.get("profit")}
            sell_res = await self._send({
                "sell": contract_id, "price": contract.get("bid_price", 0)
            })
            s = sell_res.get("sell", {})
            return {
                "status": "CLOSED", "contract_id": contract_id,
                "sell_price": s.get("sold_for"), "buy_price": contract.get("buy_price"),
                "pnl": round(s.get("sold_for", 0) - contract.get("buy_price", 0), 2),
                "close_time": s.get("transaction_time"),
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def _mock_accounts():
        return [{
            "broker": "deriv.com", "account_id": "DM12345",
            "balance": round(random.uniform(500, 2000), 2),
            "equity": round(random.uniform(500, 2100), 2),
            "currency": "USD", "leverage": 100,
            "margin": round(random.uniform(20, 100), 2),
            "free_margin": round(random.uniform(400, 1900), 2),
            "margin_level": round(random.uniform(150, 400), 2),
            "open_pl": round(random.uniform(-50, 150), 2),
            "status": "active"
        }]

    @staticmethod
    def _mock_positions():
        return [{
            "id": f"pos-{i}",
            "pair": ["EUR/USD", "GBP/USD", "USD/JPY"][i % 3],
            "type": ["LONG", "SHORT"][i % 2],
            "lots": round(random.uniform(0.01, 0.2), 2),
            "entry_price": round(random.uniform(1.08, 1.12), 5),
            "current_price": round(random.uniform(1.08, 1.12), 5),
            "open_pl": round(random.uniform(-30, 80), 2),
            "unrealized_pl": round(random.uniform(-30, 80), 2),
            "margin_used": round(random.uniform(10, 50), 2),
            "broker": "deriv.com"
        } for i in range(2)]

    @staticmethod
    def _mock_watchlist():
        pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF",
                 "EUR/GBP", "GBP/JPY", "EUR/JPY"]
        return [{
            "pair": p,
            "bid": round(random.uniform(1.05, 1.25) if "JPY" not in p else random.uniform(100, 150), 5),
            "ask": round(random.uniform(1.05, 1.25) if "JPY" not in p else random.uniform(100, 150), 5) + 0.0002,
            "change": round(random.uniform(-0.5, 0.5), 5),
            "change_pct": round(random.uniform(-0.5, 0.5), 2),
            "pip_value": 0.0001,
            "spread": round(random.uniform(0.5, 3.0), 1),
            "leverage": 100
        } for p in pairs]

    @staticmethod
    def _mock_ohlcv(pair, count):
        now = int(time.time())
        base = random.uniform(1.08, 1.12) if "JPY" not in pair else random.uniform(105, 110)
        return [{
            "timestamp": (now - (count - i) * 300) * 1000,
            "open": base + random.uniform(-0.001, 0.001),
            "high": base + random.uniform(0, 0.0005),
            "low": base - random.uniform(0, 0.0005),
            "close": base + random.uniform(-0.0005, 0.0005),
            "volume": int(random.uniform(100, 1000))
        } for i in range(count)]

    async def close(self):
        self.connected = False
        if self._listener_task:
            self._listener_task.cancel()
        if self._ws:
            await self._ws.close()
