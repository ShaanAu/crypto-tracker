import { useState, useCallback } from 'react'
import type { PriceAlert, PriceMap } from '../types'

const KEY = 'ct_alerts'

function load(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(load)

  const save = (next: PriceAlert[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setAlerts(next)
  }

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'triggered'>) => {
    const next = [...alerts, { ...alert, id: crypto.randomUUID(), triggered: false }]
    save(next)
  }, [alerts])

  const toggleAlert = useCallback((id: string) => {
    const next = alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled, triggered: false } : a)
    save(next)
  }, [alerts])

  const removeAlert = useCallback((id: string) => {
    save(alerts.filter(a => a.id !== id))
  }, [alerts])

  const checkAlerts = useCallback((prices: PriceMap) => {
    let changed = false
    const next = alerts.map(alert => {
      if (!alert.enabled || alert.triggered) return alert
      const price = prices[alert.coinId]?.usd
      if (price == null) return alert

      const triggered =
        (alert.direction === 'above' && price >= alert.targetPrice) ||
        (alert.direction === 'below' && price <= alert.targetPrice)

      if (triggered) {
        changed = true
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

    if (changed) save(next)
  }, [alerts])

  const requestPermission = useCallback(async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return { alerts, addAlert, toggleAlert, removeAlert, checkAlerts, requestPermission }
}
