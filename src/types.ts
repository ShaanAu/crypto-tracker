export interface Holding {
  id: string
  symbol: string
  name: string
  amount: number
  costBasisUsd?: number
  image?: string
}

export interface PriceAlert {
  id: string
  coinId: string
  symbol: string
  direction: 'above' | 'below'
  targetPrice: number
  enabled: boolean
  triggered: boolean
}

export interface HistorySnapshot {
  timestamp: number
  totalValueUsd: number
}

export interface PriceData {
  usd: number
  usd_24h_change: number
}

export type PriceMap = Record<string, PriceData>

export interface StockHolding {
  id: string              // Yahoo Finance ticker (e.g. "COIN", "DAGB.L")
  symbol: string          // display symbol (e.g. "COIN", "DAGB")
  name: string
  shares: number
  costBasisGbp?: number   // avg cost per share in GBP (ISA is GBP-denominated)
  nativeCurrency: 'USD' | 'GBP'
  image?: string
}

export interface StockPriceData {
  priceNative: number     // in native currency (USD or GBP)
  change24hPct: number
  nativeCurrency: 'USD' | 'GBP'
  high52w?: number        // in native currency
  low52w?: number
}

export type StockPriceMap = Record<string, StockPriceData>

export type StockSignal = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'

export interface MarketStock {
  id: string
  symbol: string
  name: string
  category: 'Crypto' | 'AI' | 'Semi' | 'ETF' | 'Growth'
  price: StockPriceData | null
  signal: StockSignal
  signalScore: number
}
