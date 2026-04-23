import { useState, useEffect, useRef } from 'react'
import type { PriceMap, Holding } from '../types'

const REFRESH_MS = 60_000

export function usePrices(holdings: Holding[]) {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPrices = async (ids: string[]) => {
    if (ids.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const idStr = ids.join(',')
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idStr}&vs_currencies=usd&include_24hr_change=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
      const data = await res.json()
      setPrices(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch prices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const ids = holdings.map(h => h.id)
    fetchPrices(ids)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => fetchPrices(ids), REFRESH_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [holdings.map(h => h.id).join(',')])

  return { prices, loading, error, lastUpdated, refresh: () => fetchPrices(holdings.map(h => h.id)) }
}
