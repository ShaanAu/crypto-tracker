import { useState, useEffect, useRef, useCallback } from 'react'
import type { PriceAlert, PriceMap } from '../types'
import { getFile, putFile } from '../lib/github'

const PATH = 'data/alerts.json'

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const shaRef = useRef<string | null>(null)

  useEffect(() => {
    getFile<PriceAlert[]>(PATH).then(({ data, sha }) => {
      shaRef.current = sha
      setAlerts(data ?? [])
    })
  }, [])

  const persist = useCallback(async (next: PriceAlert[], message: string) => {
    const newSha = await putFile(PATH, next, shaRef.current, message)
    shaRef.current = newSha
  }, [])

  const addAlert = useCallback(async (alert: Omit<PriceAlert, 'id' | 'triggered'>) => {
    setAlerts(prev => {
      const next = [...prev, { ...alert, id: crypto.randomUUID(), triggered: false }]
      persist(next, `add alert ${alert.symbol}`)
      return next
    })
  }, [persist])

  const toggleAlert = useCallback(async (id: string) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, enabled: !a.enabled, triggered: false } : a)
      persist(next, `toggle alert ${id}`)
      return next
    })
  }, [persist])

  const removeAlert = useCallback(async (id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id)
      persist(next, `remove alert ${id}`)
      return next
    })
  }, [persist])

  const checkAlerts = useCallback((prices: PriceMap) => {
    setAlerts(prev => {
      let changed = false
      const next = prev.map(alert => {
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

      if (changed) persist(next, 'alert triggered')
      return next
    })
  }, [persist])

  const requestPermission = useCallback(async () => {
    if (Notification.permission === 'default') await Notification.requestPermission()
  }, [])

  return { alerts, addAlert, toggleAlert, removeAlert, checkAlerts, requestPermission }
}
