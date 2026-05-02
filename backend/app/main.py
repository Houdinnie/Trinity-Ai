from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.accounts import router as accounts_router
from app.api.watchlist import router as watchlist_router
from app.api.chart import router as chart_router
from app.api.signals import router as signals_router
from app.api.backtest import router as backtest_router
from app.api.trading import router as trading_router

from app.services.broker_manager import BrokerManager

broker_manager = BrokerManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Trinity AI] Starting backend services...")
    await broker_manager.connect_all()
    print(f"[Trinity AI] Exness: {broker_manager.exness.connected} | deriv.com: {broker_manager.deriv.connected}")
    app.state.broker_manager = broker_manager
    yield
    print("[Trinity AI] Shutting down...")
    await broker_manager.close_all()


app = FastAPI(
    title="Trinity AI Backend",
    version="0.1.0",
    description="Multi-strategy forex trading signal generator + real trading execution",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(accounts_router, prefix="/api")
app.include_router(watchlist_router, prefix="/api")
app.include_router(chart_router, prefix="/api")
app.include_router(signals_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(trading_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "Trinity AI Backend",
        "version": "0.1.0",
        "strategies_loaded": 6,
        "exness_connected": broker_manager.exness.connected,
        "deriv_connected": broker_manager.deriv.connected,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
