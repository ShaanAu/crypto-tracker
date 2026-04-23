import { useState, useEffect, useRef, useCallback } from 'react'
import type { Holding } from '../types'
import { getFile, putFile } from '../lib/github'
import { SEED_HOLDINGS } from '../utils/seed'

const PATH = 'data/holdings.json'

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [ready, setReady] = useState(false)
  const shaRef = useRef<string | null>(null)

  useEffect(() => {
    getFile<Holding[]>(PATH).then(({ data, sha }) => {
      shaRef.current = sha
      setHoldings(data ?? SEED_HOLDINGS)
      setReady(true)
    })
  }, [])

  const persist = useCallback(async (next: Holding[], message: string) => {
    const newSha = await putFile(PATH, next, shaRef.current, message)
    shaRef.current = newSha
  }, [])

  const addHolding = useCallback(async (h: Holding) => {
    setHoldings(prev => {
      const next = [...prev.filter(x => x.id !== h.id), h]
      persist(next, `add ${h.symbol}`)
      return next
    })
  }, [persist])

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    setHoldings(prev => {
      const next = prev.map(h => h.id === id ? { ...h, ...updates } : h)
      persist(next, `update ${id}`)
      return next
    })
  }, [persist])

  const removeHolding = useCallback(async (id: string) => {
    setHoldings(prev => {
      const next = prev.filter(h => h.id !== id)
      persist(next, `remove ${id}`)
      return next
    })
  }, [persist])

  return { holdings, ready, addHolding, updateHolding, removeHolding }
}
