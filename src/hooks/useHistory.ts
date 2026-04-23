import { useState, useCallback } from 'react'
import type { HistorySnapshot, PriceMap, Holding } from '../types'

const KEY = 'ct_history'
const MAX_SNAPSHOTS = 2000

function load(): HistorySnapshot[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function useHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>(load)

  const addSnapshot = useCallback((holdings: Holding[], prices: PriceMap) => {
    const totalValueUsd = holdings.reduce((sum, h) => {
      const price = prices[h.id]?.usd ?? 0
      return sum + h.amount * price
    }, 0)

    if (totalValueUsd === 0) return

    const snapshot: HistorySnapshot = { timestamp: Date.now(), totalValueUsd }

    setHistory(prev => {
      const next = [...prev, snapshot].slice(-MAX_SNAPSHOTS)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { history, addSnapshot }
}
