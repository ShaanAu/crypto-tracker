import { useState, useEffect, useCallback } from 'react'
import type { HistorySnapshot, PriceMap, Holding } from '../types'
import { supabase } from '../lib/supabase'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function useHistory(userId: string) {
  const [history, setHistory] = useState<HistorySnapshot[]>([])

  useEffect(() => {
    if (!userId) return
    const since = Date.now() - THIRTY_DAYS_MS
    supabase
      .from('history')
      .select('timestamp, total_value_usd')
      .eq('user_id', userId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true })
      .then(({ data }) => {
        if (data) setHistory(data.map(row => ({
          timestamp: Number(row.timestamp),
          totalValueUsd: Number(row.total_value_usd),
        })))
      })
  }, [userId])

  const addSnapshot = useCallback((holdings: Holding[], prices: PriceMap) => {
    const totalValueUsd = holdings.reduce((sum, h) => sum + h.amount * (prices[h.id]?.usd ?? 0), 0)
    if (totalValueUsd === 0 || !userId) return

    const snapshot: HistorySnapshot = { timestamp: Date.now(), totalValueUsd }
    supabase.from('history').insert({ user_id: userId, timestamp: snapshot.timestamp, total_value_usd: snapshot.totalValueUsd })
    setHistory(prev => [...prev, snapshot])
  }, [userId])

  return { history, addSnapshot }
}
