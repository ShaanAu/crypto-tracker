import { useState, useEffect } from 'react'
import { PortfolioHeader } from './components/PortfolioHeader'
import { HoldingsTable } from './components/HoldingsTable'
import { EditHoldingModal } from './components/EditHoldingModal'
import { PortfolioChart } from './components/PortfolioChart'
import { AlertsPanel } from './components/AlertsPanel'
import { usePortfolio } from './hooks/usePortfolio'
import { usePrices } from './hooks/usePrices'
import { useHistory } from './hooks/useHistory'
import { useAlerts } from './hooks/useAlerts'
import type { Holding } from './types'

type Tab = 'overview' | 'chart' | 'alerts'

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [editTarget, setEditTarget] = useState<Holding | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { holdings, addHolding, updateHolding, removeHolding } = usePortfolio()
  const { prices, loading, lastUpdated, refresh } = usePrices(holdings)
  const { history, addSnapshot } = useHistory()
  const { alerts, addAlert, toggleAlert, removeAlert, checkAlerts, requestPermission } = useAlerts()

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      addSnapshot(holdings, prices)
      checkAlerts(prices)
    }
  }, [prices])

  const handleSaveNew = (h: Holding) => {
    addHolding(h)
    setAddOpen(false)
  }

  const handleSaveEdit = (h: Holding) => {
    updateHolding(h.id, { amount: h.amount, costBasisUsd: h.costBasisUsd })
    setEditTarget(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'chart', label: 'Chart' },
    { key: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <div className="max-w-2xl mx-auto">
        <PortfolioHeader
          holdings={holdings}
          prices={prices}
          loading={loading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onAddCoin={() => setAddOpen(true)}
        />

        <div className="flex border-b border-gray-800 px-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {tab === 'overview' && (
            <HoldingsTable
              holdings={holdings}
              prices={prices}
              onEdit={h => setEditTarget(h)}
              onDelete={removeHolding}
            />
          )}
          {tab === 'chart' && <PortfolioChart history={history} />}
          {tab === 'alerts' && (
            <AlertsPanel
              alerts={alerts}
              holdings={holdings}
              prices={prices}
              onAdd={addAlert}
              onToggle={toggleAlert}
              onRemove={removeAlert}
              onRequestPermission={requestPermission}
            />
          )}
        </div>
      </div>

      {addOpen && (
        <EditHoldingModal onSave={handleSaveNew} onClose={() => setAddOpen(false)} />
      )}
      {editTarget && (
        <EditHoldingModal holding={editTarget} onSave={handleSaveEdit} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
