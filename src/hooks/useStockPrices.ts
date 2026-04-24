import { useState, useEffect, useRef, useCallback } from 'react'
import type { StockHolding, StockPriceData, StockPriceMap } from '../types'

const REFRESH_MS = 60_000


async function fetchV8(symbols: string[]): Promise<StockPriceMap> {
  const settled = await Promise.allSettled(
    symbols.map(sym =>
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
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
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice
    result[symbols[i]] = {
      priceNative: meta.regularMarketPrice / divisor,
      change24hPct: prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
      nativeCurrency,
      high52w: meta.fiftyTwoWeekHigh != null ? meta.fiftyTwoWeekHigh / divisor : undefined,
      low52w:  meta.fiftyTwoWeekLow  != null ? meta.fiftyTwoWeekLow  / divisor : undefined,
    }
  })
  if (Object.keys(result).length === 0) throw new Error('No data from Yahoo Finance')
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
        data = await fetchV8(ids)
      } catch {
        throw new Error('Failed to fetch stock prices')
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
