"""
Trading API — real-time trade execution via deriv.com WebSocket.
POST /api/trading/proposal  → price a contract
POST /api/trading/execute   → place a trade
POST /api/trading/close    → close a position
GET  /api/trading/candles/:symbol → OHLC + APA structure summary
"""
from pydantic import BaseModel
from fastapi import APIRouter, Request

router = APIRouter(prefix="/trading", tags=["trading"])


class ProposalRequest(BaseModel):
    symbol: str
    contract_type: str  # MULTUP | MULTDOWN | CALL | PUT
    amount: float
    multiplier: int = 100


class ExecuteRequest(BaseModel):
    symbol: str
    contract_type: str
    amount: float
    multiplier: int = 100
    stop_loss: float = 0
    take_profit: float = 0


class CloseRequest(BaseModel):
    contract_id: int


@router.post("/proposal")
async def get_proposal(req: ProposalRequest, request: Request):
    bm = request.app.state.broker_manager
    result = await bm.get_proposal(req.symbol, req.contract_type, req.amount, req.multiplier)
    if "error" in result:
        return {"success": False, "error": result["error"]}
    return {"success": True, "proposal": result}


@router.post("/execute")
async def execute_trade(req: ExecuteRequest, request: Request):
    bm = request.app.state.broker_manager
    result = await bm.place_trade(
        req.symbol, req.contract_type, req.amount, req.multiplier,
        req.stop_loss, req.take_profit
    )
    if "error" in result:
        return {"success": False, "error": result["error"]}
    return {"success": True, "trade": result}


@router.post("/close")
async def close_trade(req: CloseRequest, request: Request):
    bm = request.app.state.broker_manager
    result = await bm.close_trade(contract_id=req.contract_id)
    if "error" in result:
        return {"success": False, "error": result["error"]}
    return {"success": True, "result": result}


@router.get("/candles/{symbol}")
async def get_candles(symbol: str, timeframe: str = "M5", count: int = 100,
                      request: Request = None):
    bm = request.app.state.broker_manager
    candles = await bm.get_candles(symbol, timeframe, count)

    if candles and len(candles) > 0:
        closes = [c["close"] for c in candles]
        highs = [c["high"] for c in candles]
        lows = [c["low"] for c in candles]
        recent_high = max(highs[-20:])
        recent_low = min(lows[-20:])
        current_price = closes[-1]
        range_ = recent_high - recent_low
        price_position = ((current_price - recent_low) / range_ * 100) if range_ > 0 else 50

        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "candle_count": len(candles),
            "structure_summary": {
                "recent_high": round(recent_high, 5),
                "recent_low": round(recent_low, 5),
                "current_price": round(current_price, 5),
                "price_position_pct": round(price_position, 1),
                "zone": "PREMIUM (sell bias)" if price_position > 50 else "DISCOUNT (buy bias)",
            },
            "candles": candles,
        }
    return {"symbol": symbol, "timeframe": timeframe, "candles": [], "structure_summary": {}}
