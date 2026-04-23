import { useState, useEffect, useRef, useCallback } from 'react'
import type { HistorySnapshot, PriceMap, Holding } from '../types'
import { getFile, putFile } from '../lib/github'

const PATH = 'data/history.json'
const WRITE_INTERVAL_MS = 30 * 60 * 1000 // write to GitHub at most every 30 min

export function useHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([])
  const shaRef = useRef<string | null>(null)
  const lastWriteRef = useRef<number>(0)

  useEffect(() => {
    getFile<HistorySnapshot[]>(PATH).then(({ data, sha }) => {
      shaRef.current = sha
      setHistory(data ?? [])
    })
  }, [])

  const addSnapshot = useCallback((holdings: Holding[], prices: PriceMap) => {
    const totalValueUsd = holdings.reduce((sum, h) => sum + h.amount * (prices[h.id]?.usd ?? 0), 0)
    if (totalValueUsd === 0) return

    const snapshot: HistorySnapshot = { timestamp: Date.now(), totalValueUsd }

    setHistory(prev => {
      const next = [...prev, snapshot]
      const now = Date.now()
      if (now - lastWriteRef.current >= WRITE_INTERVAL_MS) {
        lastWriteRef.current = now
        putFile(PATH, next, shaRef.current, 'snapshot').then(sha => { shaRef.current = sha })
      }
      return next
    })
  }, [])

  return { history, addSnapshot }
}
