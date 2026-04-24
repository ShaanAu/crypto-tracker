import { useState, useEffect, useRef } from 'react'
import type { PriceMap, Holding } from '../types'

const REFRESH_MS = 60_000

// CoinGecko ID → CoinCap ID (used as fallback when CoinGecko is rate-limited)
const COINCAP_MAP: Record<string, string> = {
  'dogecoin':    'dogecoin',
  'avalanche-2': 'avalanche',
  'chainlink':   'chainlink',
  'fetch-ai':    'fetch',
  'ripple':      'xrp',
  'sui':         'sui',
  'bittensor':   'bittensor',
  'near':        'near',
  'bitcoin':     'bitcoin',
  'ethereum':    'ethereum',
  'solana':      'solana',
}

async function fetchFromCoinGecko(ids: string[]): Promise<PriceMap> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  return res.json()
}

async function fetchFromCoinCap(ids: string[]): Promise<PriceMap> {
  const mapped = ids
    .map(id => ({ geckoId: id, capId: COINCAP_MAP[id] }))
    .filter(m => m.capId)

  if (mapped.length === 0) throw new Error('No CoinCap IDs available')

  const res = await fetch(
    `https://api.coincap.io/v2/assets?ids=${mapped.map(m => m.capId).join(',')}`
  )
  if (!res.ok) throw new Error(`CoinCap ${res.status}`)
  const json = await res.json()

  const reverseMap: Record<string, string> = {}
  for (const { geckoId, capId } of mapped) reverseMap[capId] = geckoId

  const priceMap: PriceMap = {}
  for (const asset of json.data ?? []) {
    const geckoId = reverseMap[asset.id]
    if (geckoId && asset.priceUsd) {
      priceMap[geckoId] = {
        usd: parseFloat(asset.priceUsd),
        usd_24h_change: parseFloat(asset.changePercent24Hr ?? '0'),
      }
    }
  }
  return priceMap
}

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
      let data: PriceMap
      try {
        data = await fetchFromCoinGecko(ids)
      } catch {
        data = await fetchFromCoinCap(ids)
      }
      setPrices(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
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
