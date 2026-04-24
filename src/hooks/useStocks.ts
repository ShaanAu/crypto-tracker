import { useState, useEffect, useRef, useCallback } from 'react'
import type { StockHolding } from '../types'
import { getFile, putFile } from '../lib/github'
import { SEED_STOCKS } from '../utils/seed-stocks'

const PATH = 'data/stocks.json'

export function useStocks() {
  const [stocks, setStocks] = useState<StockHolding[]>([])
  const [ready, setReady] = useState(false)
  const shaRef = useRef<string | null>(null)

  useEffect(() => {
    getFile<StockHolding[]>(PATH)
      .then(({ data, sha }) => {
        shaRef.current = sha
        setStocks(data ?? SEED_STOCKS)
      })
      .catch(() => {
        setStocks(SEED_STOCKS)
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (next: StockHolding[], message: string) => {
    const newSha = await putFile(PATH, next, shaRef.current, message)
    shaRef.current = newSha
  }, [])

  const addStock = useCallback((s: StockHolding) => {
    setStocks(prev => {
      const next = [...prev.filter(x => x.id !== s.id), s]
      persist(next, `add ${s.symbol}`)
      return next
    })
  }, [persist])

  const updateStock = useCallback((id: string, updates: Partial<StockHolding>) => {
    setStocks(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s)
      persist(next, `update ${id}`)
      return next
    })
  }, [persist])

  const removeStock = useCallback((id: string) => {
    setStocks(prev => {
      const next = prev.filter(s => s.id !== id)
      persist(next, `remove ${id}`)
      return next
    })
  }, [persist])

  const bulkUpdateStocks = useCallback((updates: { id: string; changes: Partial<StockHolding> }[]) => {
    setStocks(prev => {
      const next = prev.map(s => {
        const upd = updates.find(u => u.id === s.id)
        return upd ? { ...s, ...upd.changes } : s
      })
      persist(next, 'update cost basis')
      return next
    })
  }, [persist])

  return { stocks, ready, addStock, updateStock, removeStock, bulkUpdateStocks }
}
