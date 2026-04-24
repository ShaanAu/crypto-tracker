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
