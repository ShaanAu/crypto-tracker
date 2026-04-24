import { useState, useEffect } from 'react'
import type { StockSignal, MarketStock, StockPriceData } from '../types'

export type StockCategory = 'All' | 'Crypto' | 'AI' | 'Semi' | 'ETF' | 'Growth'

const CURATED: { id: string; symbol: string; name: string; category: Exclude<StockCategory, 'All'> }[] = [
  // Crypto stocks
  { id: 'COIN',   symbol: 'COIN',  name: 'Coinbase',                   category: 'Crypto' },
  { id: 'MSTR',   symbol: 'MSTR',  name: 'Strategy',                   category: 'Crypto' },
  { id: 'GLXY',   symbol: 'GLXY',  name: 'Galaxy Digital',             category: 'Crypto' },
  { id: 'HOOD',   symbol: 'HOOD',  name: 'Robinhood',                  category: 'Crypto' },
  { id: 'RIOT',   symbol: 'RIOT',  name: 'Riot Platforms',             category: 'Crypto' },
  { id: 'MARA',   symbol: 'MARA',  name: 'MARA Holdings',              category: 'Crypto' },
  { id: 'BMNR',   symbol: 'BMNR',  name: 'BitMine Immersion',          category: 'Crypto' },
  // AI/Tech
  { id: 'NVDA',   symbol: 'NVDA',  name: 'NVIDIA',                     category: 'AI' },
  { id: 'AMD',    symbol: 'AMD',   name: 'AMD',                        category: 'AI' },
  { id: 'ARM',    symbol: 'ARM',   name: 'Arm Holdings',               category: 'AI' },
  { id: 'PLTR',   symbol: 'PLTR',  name: 'Palantir',                   category: 'AI' },
  { id: 'META',   symbol: 'META',  name: 'Meta',                       category: 'AI' },
  { id: 'GOOGL',  symbol: 'GOOGL', name: 'Alphabet',                   category: 'AI' },
  { id: 'MSFT',   symbol: 'MSFT',  name: 'Microsoft',                  category: 'AI' },
  // Semiconductors
  { id: 'TSM',    symbol: 'TSM',   name: 'TSMC',                       category: 'Semi' },
  { id: 'ASML',   symbol: 'ASML',  name: 'ASML Holding',               category: 'Semi' },
  { id: 'QCOM',   symbol: 'QCOM',  name: 'Qualcomm',                   category: 'Semi' },
  { id: 'INTC',   symbol: 'INTC',  name: 'Intel',                      category: 'Semi' },
  { id: 'AMAT',   symbol: 'AMAT',  name: 'Applied Materials',          category: 'Semi' },
  // UK ETFs (LSE, GBP)
  { id: 'DAGB.L', symbol: 'DAGB',  name: 'VanEck Crypto & Blockchain', category: 'ETF' },
  { id: 'SMGB.L', symbol: 'SMGB',  name: 'VanEck Semiconductor',       category: 'ETF' },
  { id: 'VUSA.L', symbol: 'VUSA',  name: 'Vanguard S&P 500',           category: 'ETF' },
  { id: 'VWRL.L', symbol: 'VWRL',  name: 'Vanguard FTSE All-World',    category: 'ETF' },
  { id: 'SUAG.L', symbol: 'SUAG',  name: 'SPDR US Agg Bond',           category: 'ETF' },
  // Growth / Fintech
  { id: 'TSLA',   symbol: 'TSLA',  name: 'Tesla',                      category: 'Growth' },
  { id: 'RBLX',   symbol: 'RBLX',  name: 'Roblox',                     category: 'Growth' },
  { id: 'SOFI',   symbol: 'SOFI',  name: 'SoFi Technologies',          category: 'Growth' },
  { id: 'SQ',     symbol: 'SQ',    name: 'Block (Square)',              category: 'Growth' },
  { id: 'PYPL',   symbol: 'PYPL',  name: 'PayPal',                     category: 'Growth' },
  { id: 'NFLX',   symbol: 'NFLX',  name: 'Netflix',                    category: 'Growth' },
]

function computeSignal(price: StockPriceData): { signal: StockSignal; score: number } {
  let score = 0

  // 24h momentum
  const c = price.change24hPct
  if (c > 5) score += 2
  else if (c > 2) score += 1
  else if (c < -5) score -= 2
  else if (c < -2) score -= 1

  // 52-week position (0 = at low, 1 = at high)
  if (price.high52w && price.low52w && price.high52w > price.low52w) {
    const pos = (price.priceNative - price.low52w) / (price.high52w - price.low52w)
    if (pos > 0.85) score -= 2
    else if (pos > 0.65) score -= 1
    else if (pos < 0.15) score += 2
    else if (pos < 0.35) score += 1
  }

  let signal: StockSignal
  if      (score >= 4)  signal = 'Strong Buy'
  else if (score >= 2)  signal = 'Buy'
  else if (score >= -1) signal = 'Hold'
  else if (score >= -3) signal = 'Sell'
  else                  signal = 'Strong Sell'

  return { signal, score }
}

async function fetchMarketPrices(ids: string[]): Promise<Record<string, StockPriceData>> {
  const fields = 'symbol,regularMarketPrice,regularMarketChangePercent,currency,fiftyTwoWeekHigh,fiftyTwoWeekLow'
  const res = await fetch(
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${ids.join(',')}&fields=${fields}`
  )
  if (!res.ok) throw new Error(`Yahoo ${res.status}`)
  const json = await res.json()
  const result: Record<string, StockPriceData> = {}
  for (const q of json.quoteResponse?.result ?? []) {
    if (!q.regularMarketPrice) continue
    const isGbx = q.currency === 'GBp'
    const div = isGbx ? 100 : 1
    result[q.symbol] = {
      priceNative: q.regularMarketPrice / div,
      change24hPct: q.regularMarketChangePercent ?? 0,
      nativeCurrency: (q.currency === 'GBP' || isGbx) ? 'GBP' : 'USD',
      high52w: q.fiftyTwoWeekHigh != null ? q.fiftyTwoWeekHigh / div : undefined,
      low52w:  q.fiftyTwoWeekLow  != null ? q.fiftyTwoWeekLow  / div : undefined,
    }
  }
  return result
}

export function useStockMarket() {
  const [coins, setCoins] = useState<MarketStock[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const ids = CURATED.map(c => c.id)
      const priceMap = await fetchMarketPrices(ids)
      const enriched: MarketStock[] = CURATED.map(c => {
        const price = priceMap[c.id] ?? null
        const { signal, score } = price ? computeSignal(price) : { signal: 'Hold' as StockSignal, score: 0 }
        return { ...c, price, signal, signalScore: score }
      })
      setCoins(enriched)
      setLastUpdated(new Date())
    } catch (e) {
      console.warn('Stock market fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(t)
  }, [])

  return { coins, loading, lastUpdated, refresh: load }
}
