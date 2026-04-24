import { useState } from 'react'
import type { StockHolding } from '../types'
import { StocksHeader } from './StocksHeader'
import { StocksTable } from './StocksTable'
import { StockMarketOverview } from './StockMarketOverview'
import { AddStockModal } from './AddStockModal'
import { useStocks } from '../hooks/useStocks'
import { useStockPrices } from '../hooks/useStockPrices'
import { useStockMarket } from '../hooks/useStockMarket'

type Tab = 'overview' | 'market'

export function StocksView() {
  const [tab, setTab] = useState<Tab>('overview')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StockHolding | null>(null)

  const { stocks, ready, addStock, updateStock, removeStock } = useStocks()
  const { prices, loading, error, lastUpdated, refresh } = useStockPrices(stocks)
  const { coins: marketCoins, loading: marketLoading, lastUpdated: marketUpdated } = useStockMarket()

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'market', label: 'Market' },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-400 text-xs flex items-center justify-between">
          <span>⚠ Price fetch failed ({error}) — showing last known values</span>
          <button onClick={refresh} className="underline ml-2">Retry</button>
        </div>
      )}

      <StocksHeader
        stocks={stocks}
        prices={prices}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        onAddStock={() => setAddOpen(true)}
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
            <StocksTable
              stocks={stocks}
              prices={prices}
              onEdit={s => setEditTarget(s)}
              onDelete={removeStock}
            />
          </>
        )}
        {tab === 'market' && (
          <StockMarketOverview
            coins={marketCoins}
            holdings={stocks}
            loading={marketLoading}
            lastUpdated={marketUpdated}
          />
        )}
      </div>

      {addOpen && (
        <AddStockModal
          onSave={s => { addStock(s); setAddOpen(false) }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editTarget && (
        <AddStockModal
          holding={editTarget}
          onSave={s => { updateStock(s.id, { shares: s.shares, costBasisGbp: s.costBasisGbp }); setEditTarget(null) }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
