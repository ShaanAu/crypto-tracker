import { useState, useEffect, useCallback } from 'react'
import type { Holding } from '../types'
import { supabase } from '../lib/supabase'
import { SEED_HOLDINGS } from '../utils/seed'

export function usePortfolio(userId: string) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHoldings(data.map(row => ({
            id: row.coin_id,
            symbol: row.symbol,
            name: row.name,
            amount: Number(row.amount),
            costBasisUsd: row.cost_basis_usd != null ? Number(row.cost_basis_usd) : undefined,
          })))
        } else {
          // Seed with portfolio from screenshot on first login
          const rows = SEED_HOLDINGS.map(h => ({
            user_id: userId,
            coin_id: h.id,
            symbol: h.symbol,
            name: h.name,
            amount: h.amount,
            cost_basis_usd: h.costBasisUsd ?? null,
          }))
          supabase.from('holdings').insert(rows).then(() => setHoldings(SEED_HOLDINGS))
        }
        setReady(true)
      })
  }, [userId])

  const addHolding = useCallback(async (h: Holding) => {
    await supabase.from('holdings').upsert({
      user_id: userId,
      coin_id: h.id,
      symbol: h.symbol,
      name: h.name,
      amount: h.amount,
      cost_basis_usd: h.costBasisUsd ?? null,
    }, { onConflict: 'user_id,coin_id' })
    setHoldings(prev => [...prev.filter(x => x.id !== h.id), h])
  }, [userId])

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.amount != null) dbUpdates.amount = updates.amount
    if ('costBasisUsd' in updates) dbUpdates.cost_basis_usd = updates.costBasisUsd ?? null
    await supabase.from('holdings').update(dbUpdates).eq('user_id', userId).eq('coin_id', id)
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [userId])

  const removeHolding = useCallback(async (id: string) => {
    await supabase.from('holdings').delete().eq('user_id', userId).eq('coin_id', id)
    setHoldings(prev => prev.filter(h => h.id !== id))
  }, [userId])

  return { holdings, ready, addHolding, updateHolding, removeHolding }
}
