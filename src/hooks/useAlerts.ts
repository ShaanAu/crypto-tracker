import { useState, useEffect, useCallback } from 'react'
import type { PriceAlert, PriceMap } from '../types'
import { supabase } from '../lib/supabase'

export function useAlerts(userId: string) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setAlerts(data.map(row => ({
          id: row.id,
          coinId: row.coin_id,
          symbol: row.symbol,
          direction: row.direction,
          targetPrice: Number(row.target_price),
          enabled: row.enabled,
          triggered: row.triggered,
        })))
      })
  }, [userId])

  const addAlert = useCallback(async (alert: Omit<PriceAlert, 'id' | 'triggered'>) => {
    const { data } = await supabase.from('alerts').insert({
      user_id: userId,
      coin_id: alert.coinId,
      symbol: alert.symbol,
      direction: alert.direction,
      target_price: alert.targetPrice,
      enabled: alert.enabled,
      triggered: false,
    }).select().single()
    if (data) {
      setAlerts(prev => [...prev, {
        id: data.id,
        coinId: data.coin_id,
        symbol: data.symbol,
        direction: data.direction,
        targetPrice: Number(data.target_price),
        enabled: data.enabled,
        triggered: data.triggered,
      }])
    }
  }, [userId])

  const toggleAlert = useCallback(async (id: string) => {
    const alert = alerts.find(a => a.id === id)
    if (!alert) return
    const updates = { enabled: !alert.enabled, triggered: false }
    await supabase.from('alerts').update(updates).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [alerts])

  const removeAlert = useCallback(async (id: string) => {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const checkAlerts = useCallback((prices: PriceMap) => {
    const toUpdate: string[] = []
    const next = alerts.map(alert => {
      if (!alert.enabled || alert.triggered) return alert
      const price = prices[alert.coinId]?.usd
      if (price == null) return alert

      const triggered =
        (alert.direction === 'above' && price >= alert.targetPrice) ||
        (alert.direction === 'below' && price <= alert.targetPrice)

      if (triggered) {
        toUpdate.push(alert.id)
        if (Notification.permission === 'granted') {
          new Notification(`${alert.symbol} price alert`, {
            body: `${alert.symbol} is ${alert.direction} $${alert.targetPrice} (now $${price.toFixed(4)})`,
            icon: '/favicon.svg',
          })
        }
        return { ...alert, triggered: true }
      }
      return alert
    })

    if (toUpdate.length > 0) {
      supabase.from('alerts').update({ triggered: true }).in('id', toUpdate)
      setAlerts(next)
    }
  }, [alerts])

  const requestPermission = useCallback(async () => {
    if (Notification.permission === 'default') await Notification.requestPermission()
  }, [])

  return { alerts, addAlert, toggleAlert, removeAlert, checkAlerts, requestPermission }
}
