import { useState, useEffect, useRef, useCallback } from 'react'
import type { StockHolding, StockPriceData, StockPriceMap } from '../types'

const REFRESH_MS = 60_000

function parseYahooQuote(q: {
  symbol: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  currency?: string
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
}): StockPriceData | null {
  if (!q.regularMarketPrice) return null
  const isGbx = q.currency === 'GBp'
  const nativeCurrency: 'USD' | 'GBP' = (q.currency === 'GBP' || isGbx) ? 'GBP' : 'USD'
  const divisor = isGbx ? 100 : 1
  return {
    priceNative: q.regularMarketPrice / divisor,
    change24hPct: q.regularMarketChangePercent ?? 0,
    nativeCurrency,
    high52w: q.fiftyTwoWeekHigh != null ? q.fiftyTwoWeekHigh / divisor : undefined,
    low52w: q.fiftyTwoWeekLow  != null ? q.fiftyTwoWeekLow  / divisor : undefined,
  }
}

async function fetchV7(symbols: string[]): Promise<StockPriceMap> {
  const fields = 'symbol,regularMarketPrice,regularMarketChangePercent,currency,fiftyTwoWeekHigh,fiftyTwoWeekLow'
  const res = await fetch(
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=${fields}`
  )
  if (!res.ok) throw new Error(`Yahoo v7: ${res.status}`)
  const json = await res.json()
  const result: StockPriceMap = {}
  for (const q of json.quoteResponse?.result ?? []) {
    const parsed = parseYahooQuote(q)
    if (parsed) result[q.symbol] = parsed
  }
  if (Object.keys(result).length === 0) throw new Error('No data from v7')
  return result
}

async function fetchV8(symbols: string[]): Promise<StockPriceMap> {
  const settled = await Promise.allSettled(
    symbols.map(sym =>
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`)
        .then(r => r.ok ? r.json() : Promise.reject())
    )
  )
  const result: StockPriceMap = {}
  settled.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    const meta = r.value?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return
    const isGbx = meta.currency === 'GBp'
    const divisor = isGbx ? 100 : 1
    const nativeCurrency: 'USD' | 'GBP' = (meta.currency === 'GBP' || isGbx) ? 'GBP' : 'USD'
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice
    result[symbols[i]] = {
      priceNative: meta.regularMarketPrice / divisor,
      change24hPct: prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
      nativeCurrency,
    }
  })
  return result
}

export function useStockPrices(stocks: StockHolding[]) {
  const [prices, setPrices] = useState<StockPriceMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPrices = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setLoading(true)
    setError(null)
    try {
      let data: StockPriceMap
      try {
        data = await fetchV7(ids)
      } catch {
        data = await fetchV8(ids)
      }
      setPrices(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const idKey = stocks.map(s => s.id).join(',')

  useEffect(() => {
    const ids = stocks.map(s => s.id)
    fetchPrices(ids)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => fetchPrices(ids), REFRESH_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idKey])

  return {
    prices,
    loading,
    error,
    lastUpdated,
    refresh: () => fetchPrices(stocks.map(s => s.id)),
  }
}
