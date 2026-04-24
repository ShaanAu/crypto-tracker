import { useState, useEffect, useRef } from 'react'

export interface MarketCoin {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  marketCap: number
  rank: number
  change24h: number
  change7d: number | null
  volume24h: number
  signal: Signal
  signalScore: number
}

export type Signal = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'

function computeSignal(change24h: number, change7d: number | null): { signal: Signal; score: number } {
  let score = 0

  if (change24h > 5)       score += 2
  else if (change24h > 1)  score += 1
  else if (change24h < -5) score -= 2
  else if (change24h < -1) score -= 1

  if (change7d != null) {
    if (change7d > 15)       score += 3
    else if (change7d > 5)   score += 2
    else if (change7d > 0)   score += 1
    else if (change7d < -15) score -= 3
    else if (change7d < -5)  score -= 2
    else                     score -= 1
  }

  let signal: Signal
  if      (score >= 4)  signal = 'Strong Buy'
  else if (score >= 2)  signal = 'Buy'
  else if (score >= -1) signal = 'Hold'
  else if (score >= -3) signal = 'Sell'
  else                  signal = 'Strong Sell'

  return { signal, score }
}

const REFRESH_MS = 60_000

export function useMarket() {
  const [coins, setCoins] = useState<MarketCoin[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFromCoinGecko = async (): Promise<MarketCoin[]> => {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=7d'
    )
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const data = await res.json()
    return data.map((c: {
      id: string; symbol: string; name: string; image: string;
      current_price: number; market_cap: number; market_cap_rank: number;
      price_change_percentage_24h: number; price_change_percentage_7d_in_currency: number | null;
      total_volume: number;
    }) => {
      const change24h = c.price_change_percentage_24h ?? 0
      const change7d  = c.price_change_percentage_7d_in_currency ?? null
      const { signal, score } = computeSignal(change24h, change7d)
      return {
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image,
        price: c.current_price, marketCap: c.market_cap, rank: c.market_cap_rank,
        change24h, change7d, volume24h: c.total_volume, signal, signalScore: score,
      }
    })
  }

  const fetchFromCoinCap = async (): Promise<MarketCoin[]> => {
    const res = await fetch('https://api.coincap.io/v2/assets?limit=100')
    if (!res.ok) throw new Error(`CoinCap ${res.status}`)
    const json = await res.json()
    return (json.data ?? []).map((c: {
      id: string; symbol: string; name: string;
      priceUsd: string; marketCapUsd: string; rank: string;
      changePercent24Hr: string; volumeUsd24Hr: string;
    }) => {
      const change24h = parseFloat(c.changePercent24Hr ?? '0')
      const { signal, score } = computeSignal(change24h, null)
      return {
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name,
        image: `https://assets.coincap.io/assets/icons/${c.symbol.toLowerCase()}@2x.png`,
        price: parseFloat(c.priceUsd),
        marketCap: parseFloat(c.marketCapUsd),
        rank: parseInt(c.rank),
        change24h, change7d: null,
        volume24h: parseFloat(c.volumeUsd24Hr),
        signal, signalScore: score,
      }
    })
  }

  const fetch100 = async () => {
    setLoading(true)
    try {
      let enriched: MarketCoin[]
      try {
        enriched = await fetchFromCoinGecko()
      } catch {
        enriched = await fetchFromCoinCap()
      }
      setCoins(enriched)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch100()
    timerRef.current = setInterval(fetch100, REFRESH_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return { coins, loading, lastUpdated, refresh: fetch100 }
}
