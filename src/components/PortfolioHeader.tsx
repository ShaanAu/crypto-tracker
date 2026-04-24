import { RefreshCw } from 'lucide-react'
import type { Holding, PriceMap } from '../types'
import { formatPct } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

interface Props {
  holdings: Holding[]
  prices: PriceMap
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  onAddCoin: () => void
}

export function PortfolioHeader({ holdings, prices, loading, lastUpdated, onRefresh, onAddCoin }: Props) {
  const { format, currency, toggle, gbpRate } = useCurrency()

  const totalValue = holdings.reduce((sum, h) => sum + h.amount * (prices[h.id]?.usd ?? 0), 0)
  const totalValue24hAgo = holdings.reduce((sum, h) => {
    const price = prices[h.id]?.usd ?? 0
    const change = prices[h.id]?.usd_24h_change ?? 0
    return sum + h.amount * (price / (1 + change / 100))
  }, 0)
  const change24h = totalValue - totalValue24hAgo
  const changePct24h = totalValue24hAgo > 0 ? (change24h / totalValue24hAgo) * 100 : 0

  const totalPnl = holdings.reduce((sum, h) => {
    if (h.costBasisUsd == null) return sum
    return sum + (( prices[h.id]?.usd ?? 0) - h.costBasisUsd) * h.amount
  }, 0)
  const costBasisTotal = holdings.reduce((sum, h) => h.costBasisUsd != null ? sum + h.costBasisUsd * h.amount : sum, 0)
  const hasCostBasis = holdings.some(h => h.costBasisUsd != null)

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-gray-300 text-sm font-medium tracking-wide uppercase">My Portfolio</h1>
        <div className="flex gap-2">
          <button
            onClick={toggle}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              currency === 'gbp'
                ? 'bg-blue-900/40 border-blue-500 text-blue-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
            title={gbpRate ? `1 USD = £${gbpRate.toFixed(4)}` : 'Loading rate...'}
          >
            {currency === 'gbp' ? '£ GBP' : '$ USD'}
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onAddCoin}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            + Add Coin
          </button>
        </div>
      </div>

      <div className="text-3xl font-bold text-white mb-2">
        {totalValue > 0 ? format(totalValue) : '—'}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className={change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
          {change24h >= 0 ? '▲' : '▼'} {format(Math.abs(change24h))}{'  '}
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${change24h >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
            {formatPct(changePct24h)}
          </span>
          <span className="text-gray-500 ml-1">24h</span>
        </span>
      </div>

      {hasCostBasis && (
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            P&L {totalPnl >= 0 ? '▲' : '▼'} {format(Math.abs(totalPnl))}
          </span>
          {costBasisTotal > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${totalPnl >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {formatPct((totalPnl / costBasisTotal) * 100)}
            </span>
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="text-gray-600 text-xs mt-2">
          Updated {lastUpdated.toLocaleTimeString()}
          {currency === 'gbp' && gbpRate && <span className="ml-2">· £1 = ${(1 / gbpRate).toFixed(4)}</span>}
        </p>
      )}
    </div>
  )
}
