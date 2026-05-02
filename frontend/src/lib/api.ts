import axios from 'axios'

const BASE = '/trinity/api'

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

export const getHealth = () => http.get('/health')
export const getAccounts = () => http.get('/accounts')
export const getPositions = () => http.get('/accounts/positions')
export const getWatchlist = () => http.get('/watchlist')
export const getOHLCV = (symbol: string, timeframe: string, count = 100) =>
  http.get('/chart/ohlcv', { params: { symbol, timeframe, count } })
export const getSignals = (count = 10) => http.get('/signals/daily', { params: { count } })
export const getStrategies = () => http.get('/signals/strategies')
export const runBacktest = (data: object) => http.post('/backtest/run', data)

// Trading (deriv.com real execution via WebSocket)
export const getCandles = (symbol: string, timeframe = 'M5', count = 100) =>
  http.get(`/trading/candles/${symbol}`, { params: { timeframe, count } })
export const getProposal = (data: object) => http.post('/trading/proposal', data)
export const executeTrade = (data: object) => http.post('/trading/execute', data)
export const closeTrade = (data: object) => http.post('/trading/close', data)
