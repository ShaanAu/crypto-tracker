import { useState } from 'react'
import { Bell, BellOff, Trash2, Plus } from 'lucide-react'
import type { PriceAlert, Holding, PriceMap } from '../types'
import { formatUsd } from '../utils/format'

interface Props {
  alerts: PriceAlert[]
  holdings: Holding[]
  prices: PriceMap
  onAdd: (alert: Omit<PriceAlert, 'id' | 'triggered'>) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onRequestPermission: () => void
}

export function AlertsPanel({ alerts, holdings, prices, onAdd, onToggle, onRemove, onRequestPermission }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [coinId, setCoinId] = useState(holdings[0]?.id ?? '')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState('')

  const handleAdd = () => {
    if (!coinId || !targetPrice) return
    const holding = holdings.find(h => h.id === coinId)
    if (!holding) return
    onAdd({ coinId, symbol: holding.symbol, direction, targetPrice: parseFloat(targetPrice), enabled: true })
    setTargetPrice('')
    setShowForm(false)
    onRequestPermission()
  }

  const notifBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied'

  return (
    <div className="px-4 py-4">
      {notifBlocked && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-400 text-xs">
          Browser notifications are blocked. Enable them in browser settings to receive price alerts.
        </div>
      )}

      {alerts.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No price alerts set. Add one to get notified when a coin hits your target.
        </div>
      )}

      <div className="space-y-2 mb-4">
        {alerts.map(alert => {
          const currentPrice = prices[alert.coinId]?.usd
          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.triggered
                  ? 'border-yellow-700/50 bg-yellow-900/20'
                  : alert.enabled
                  ? 'border-gray-700 bg-gray-800/50'
                  : 'border-gray-800 bg-gray-800/20 opacity-60'
              }`}
            >
              <div>
                <span className="text-gray-200 text-sm font-medium">{alert.symbol}</span>
                <span className="text-gray-500 text-sm"> {alert.direction} </span>
                <span className="text-gray-200 text-sm">{formatUsd(alert.targetPrice)}</span>
                {currentPrice != null && (
                  <span className="text-gray-600 text-xs ml-2">(now {formatUsd(currentPrice)})</span>
                )}
                {alert.triggered && (
                  <span className="ml-2 text-xs text-yellow-400">triggered</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onToggle(alert.id)}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                  title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                >
                  {alert.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  onClick={() => onRemove(alert.id)}
                  className="p-1.5 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm ? (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Coin</label>
              <select
                value={coinId}
                onChange={e => setCoinId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500"
              >
                {holdings.map(h => (
                  <option key={h.id} value={h.id}>{h.symbol}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Condition</label>
              <select
                value={direction}
                onChange={e => setDirection(e.target.value as 'above' | 'below')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Target Price (USD)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!coinId || !targetPrice}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              Add Alert
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus size={15} /> Add Alert
        </button>
      )}
    </div>
  )
}
