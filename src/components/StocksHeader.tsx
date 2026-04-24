import { RefreshCw } from 'lucide-react'
import type { StockHolding, StockPriceMap } from '../types'
import { formatPct } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

interface Props {
  stocks: StockHolding[]
  prices: StockPriceMap
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  onAddStock: () => void
}

function toGbp(priceNative: number, currency: 'USD' | 'GBP', gbpRate: number): number {
  return currency === 'GBP' ? priceNative : priceNative * gbpRate
}

export function StocksHeader({ stocks, prices, loading, lastUpdated, onRefresh, onAddStock }: Props) {
  const { gbpRate, format } = useCurrency()
  const rate = gbpRate ?? 0.79

  const totalGbp = stocks.reduce((sum, s) => {
    const p = prices[s.id]
    if (!p) return sum
    return sum + s.shares * toGbp(p.priceNative, p.nativeCurrency, rate)
  }, 0)

  const total24hAgoGbp = stocks.reduce((sum, s) => {
    const p = prices[s.id]
    if (!p) return sum
    const prevNative = p.priceNative / (1 + p.change24hPct / 100)
    return sum + s.shares * toGbp(prevNative, p.nativeCurrency, rate)
  }, 0)

  const change24h = totalGbp - total24hAgoGbp
  const change24hPct = total24hAgoGbp > 0 ? (change24h / total24hAgoGbp) * 100 : 0

  const hasCostBasis = stocks.some(s => s.costBasisGbp != null) && totalGbp > 0
  const totalPnl = stocks.reduce((sum, s) => {
    const p = prices[s.id]
    if (!p || s.costBasisGbp == null) return sum
    const currentGbp = toGbp(p.priceNative, p.nativeCurrency, rate)
    return sum + (currentGbp - s.costBasisGbp) * s.shares
  }, 0)
  const costBasisTotal = stocks.reduce((sum, s) => s.costBasisGbp != null ? sum + s.costBasisGbp * s.shares : sum, 0)

  // Always display in GBP (ISA is GBP denominated)
  const fmt = (v: number) => `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-gray-300 text-sm font-medium tracking-wide uppercase">Stocks ISA</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onAddStock}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            + Add Stock
          </button>
        </div>
      </div>

      <div className="text-3xl font-bold text-white mb-2">
        {totalGbp > 0 ? fmt(totalGbp) : '—'}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className={change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
          {change24h >= 0 ? '▲' : '▼'} {fmt(change24h)}{'  '}
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${change24h >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
            {formatPct(change24hPct)}
          </span>
          <span className="text-gray-500 ml-1">24h</span>
        </span>
      </div>

      {hasCostBasis && (
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            P&L {totalPnl >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalPnl))}
          </span>
          {costBasisTotal > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${totalPnl >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {formatPct((totalPnl / costBasisTotal) * 100)}
            </span>
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="text-gray-600 text-xs mt-2">Updated {lastUpdated.toLocaleTimeString()}</p>
      )}
    </div>
  )
}
