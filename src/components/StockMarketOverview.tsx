import { useState } from 'react'
import type { MarketStock, StockHolding, StockSignal } from '../types'
import { formatPct } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'
import type { StockCategory } from '../hooks/useStockMarket'

interface Props {
  coins: MarketStock[]
  holdings: StockHolding[]
  loading: boolean
  lastUpdated: Date | null
}

const SIGNAL_COLORS: Record<StockSignal, string> = {
  'Strong Buy':  'text-emerald-400',
  'Buy':         'text-green-400',
  'Hold':        'text-yellow-400',
  'Sell':        'text-orange-400',
  'Strong Sell': 'text-red-400',
}

const CATEGORIES: StockCategory[] = ['All', 'Crypto', 'AI', 'Semi', 'ETF', 'Growth']
const CATEGORY_LABELS: Record<StockCategory, string> = {
  All: 'All', Crypto: 'Crypto', AI: 'AI/Tech', Semi: 'Semiconductors', ETF: 'ETFs', Growth: 'Growth',
}

const fmt = (v: number, currency: 'USD' | 'GBP') => {
  const sym = currency === 'GBP' ? '£' : '$'
  if (v >= 1) return `${sym}${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${sym}${v.toFixed(4)}`
}

export function StockMarketOverview({ coins, holdings, loading, lastUpdated }: Props) {
  const [category, setCategory] = useState<StockCategory>('All')
  const [signalFilter, setSignalFilter] = useState<StockSignal | null>(null)
  const { gbpRate } = useCurrency()
  const rate = gbpRate ?? 0.79

  const heldIds = new Set(holdings.map(h => h.id))

  const filtered = coins
    .filter(c => category === 'All' || c.category === category)
    .filter(c => !signalFilter || c.signal === signalFilter)

  const signalCounts: Partial<Record<StockSignal, number>> = {}
  for (const c of coins) {
    signalCounts[c.signal] = (signalCounts[c.signal] ?? 0) + 1
  }

  const SIGNAL_CHIPS: { key: StockSignal; label: string; color: string }[] = [
    { key: 'Strong Buy',  label: '🟢🟢 Strong Buy',  color: 'border-emerald-500/60 text-emerald-400' },
    { key: 'Buy',         label: '🟢 Buy',           color: 'border-green-500/60 text-green-400' },
    { key: 'Hold',        label: '🟡 Hold',          color: 'border-yellow-500/60 text-yellow-400' },
    { key: 'Sell',        label: '🔴 Sell',          color: 'border-orange-500/60 text-orange-400' },
    { key: 'Strong Sell', label: '🔴🔴 Strong Sell', color: 'border-red-500/60 text-red-400' },
  ]

  return (
    <div className="pt-2">
      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              category === cat
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Signal filter */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {SIGNAL_CHIPS.filter(s => signalCounts[s.key]).map(s => (
          <button
            key={s.key}
            onClick={() => setSignalFilter(signalFilter === s.key ? null : s.key)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              signalFilter === s.key ? s.color + ' bg-gray-800' : 'border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.label} <span className="opacity-60">({signalCounts[s.key]})</span>
          </button>
        ))}
      </div>

      {loading && coins.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">24H</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Signal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
                      {c.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-200">{c.symbol}</span>
                        {heldIds.has(c.id) && (
                          <span className="px-1 py-0.5 bg-blue-900/40 text-blue-400 text-xs rounded">held</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{c.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-200 text-xs">
                  {c.price ? fmt(c.price.nativeCurrency === 'USD' ? c.price.priceNative * rate : c.price.priceNative, 'GBP') : '—'}
                </td>
                <td className={`py-3 px-4 text-right text-xs font-medium ${(c.price?.change24hPct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {c.price ? (
                    <span className={`px-1.5 py-0.5 rounded ${(c.price.change24hPct ?? 0) >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                      {formatPct(c.price.change24hPct)}
                    </span>
                  ) : '—'}
                </td>
                <td className={`py-3 px-4 text-right text-xs font-medium ${SIGNAL_COLORS[c.signal]}`}>
                  {c.signal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 text-sm">No stocks match this filter.</div>
        )}
      </div>

      {lastUpdated && (
        <p className="text-gray-600 text-xs px-4 py-3">Updated {lastUpdated.toLocaleTimeString()} · Signals based on 24h momentum & 52-week range · Not financial advice</p>
      )}
    </div>
  )
}
