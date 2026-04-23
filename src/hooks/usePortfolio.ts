import { useState, useCallback } from 'react'
import type { Holding } from '../types'
import { SEED_HOLDINGS } from '../utils/seed'

const KEY = 'ct_holdings'

function load(): Holding[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const seeded = SEED_HOLDINGS
  localStorage.setItem(KEY, JSON.stringify(seeded))
  return seeded
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>(load)

  const save = useCallback((next: Holding[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setHoldings(next)
  }, [])

  const addHolding = useCallback((h: Holding) => {
    setHoldings(prev => {
      const next = [...prev, h]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateHolding = useCallback((id: string, updates: Partial<Holding>) => {
    setHoldings(prev => {
      const next = prev.map(h => h.id === id ? { ...h, ...updates } : h)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeHolding = useCallback((id: string) => {
    setHoldings(prev => {
      const next = prev.filter(h => h.id !== id)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { holdings, addHolding, updateHolding, removeHolding, save }
}
