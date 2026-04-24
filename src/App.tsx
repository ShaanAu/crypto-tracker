import { useState, useEffect } from 'react'
import { PortfolioHeader } from './components/PortfolioHeader'
import { HoldingsTable } from './components/HoldingsTable'
import { EditHoldingModal } from './components/EditHoldingModal'
import { PortfolioChart } from './components/PortfolioChart'
import { AlertsPanel } from './components/AlertsPanel'
import { PerformanceSummary } from './components/PerformanceSummary'
import { MarketOverview } from './components/MarketOverview'
import { usePortfolio } from './hooks/usePortfolio'
import { usePrices } from './hooks/usePrices'
import { useHistory } from './hooks/useHistory'
import { useAlerts } from './hooks/useAlerts'
import { useMarket } from './hooks/useMarket'
import type { Holding } from './types'

type Tab = 'overview' | 'chart' | 'alerts' | 'market'

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [editTarget, setEditTarget] = useState<Holding | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { holdings, ready, addHolding, updateHolding, removeHolding } = usePortfolio()
  const { prices, loading, error: priceError, lastUpdated, refresh } = usePrices(holdings)
  const { history, addSnapshot } = useHistory()
  const { alerts, addAlert, toggleAlert, removeAlert, checkAlerts, requestPermission } = useAlerts()
  const { coins: marketCoins, loading: marketLoading, lastUpdated: marketUpdated } = useMarket()

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      addSnapshot(holdings, prices)
      checkAlerts(prices)
    }
  }, [prices])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'chart', label: 'Chart' },
    { key: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
    { key: 'market', label: 'Market' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <div className="max-w-2xl mx-auto">
        {priceError && (
          <div className="mx-4 mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-400 text-xs flex items-center justify-between">
            <span>⚠ Price fetch failed ({priceError}) — showing last known values</span>
            <button onClick={refresh} className="underline ml-2">Retry</button>
          </div>
        )}
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
            <>
              <PerformanceSummary holdings={holdings} prices={prices} history={history} />
              <HoldingsTable
                holdings={holdings}
                prices={prices}
                onEdit={h => setEditTarget(h)}
                onDelete={removeHolding}
              />
            </>
          )}
          {tab === 'chart' && <PortfolioChart history={history} />}
          {tab === 'market' && (
            <MarketOverview
              coins={marketCoins}
              holdings={holdings}
              loading={marketLoading}
              lastUpdated={marketUpdated}
            />
          )}
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
        <EditHoldingModal onSave={async h => { await addHolding(h); setAddOpen(false) }} onClose={() => setAddOpen(false)} />
      )}
      {editTarget && (
        <EditHoldingModal holding={editTarget} onSave={async h => { await updateHolding(h.id, { amount: h.amount, costBasisUsd: h.costBasisUsd }); setEditTarget(null) }} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
