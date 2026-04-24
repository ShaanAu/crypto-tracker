import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Holding, PriceMap } from '../types'
import { formatPct, formatAmount } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

type SortKey = 'value' | 'price' | 'change' | 'pnl'

interface Props {
  holdings: Holding[]
  prices: PriceMap
  onEdit: (holding: Holding) => void
  onDelete: (id: string) => void
}

export function HoldingsTable({ holdings, prices, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const { format } = useCurrency()

  const enriched = holdings.map(h => {
    const price = prices[h.id]?.usd ?? 0
    const change = prices[h.id]?.usd_24h_change ?? 0
    const value = h.amount * price
    const pnl = h.costBasisUsd != null && price > 0 ? (price - h.costBasisUsd) * h.amount : null
    return { ...h, price, change, value, pnl }
  })

  const sorted = [...enriched].sort((a, b) => {
    if (sortKey === 'value') return b.value - a.value
    if (sortKey === 'price') return b.price - a.price
    if (sortKey === 'change') return b.change - a.change
    if (sortKey === 'pnl') return (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity)
    return 0
  })

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      className={`text-xs font-medium uppercase tracking-wide transition-colors ${sortKey === key ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
      {label} {sortKey === key ? '▼' : ''}
    </button>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Coin</th>
            <th className="text-right py-2 px-4">{sortBtn('price', 'Price')}</th>
            <th className="text-right py-2 px-4">{sortBtn('change', '24H')}</th>
            <th className="text-right py-2 px-4">{sortBtn('value', 'Holdings')}</th>
            <th className="text-right py-2 px-4">{sortBtn('pnl', 'P&L')}</th>
            <th className="py-2 px-4 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(h => (
            <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {h.image
                    ? <img src={h.image} alt={h.symbol} className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">{h.symbol.slice(0, 2)}</div>
                  }
                  <div>
                    <div className="font-medium text-gray-200">{h.symbol}</div>
                    <div className="text-xs text-gray-500">{h.name}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-gray-200">
                {h.price > 0 ? format(h.price) : '—'}
              </td>
              <td className={`py-3 px-4 text-right text-xs font-medium ${h.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`px-1.5 py-0.5 rounded ${h.change >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                  {h.change !== 0 ? formatPct(h.change) : '—'}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="text-gray-200">{h.value > 0 ? format(h.value) : '—'}</div>
                <div className="text-xs text-gray-500">{formatAmount(h.amount)} {h.symbol}</div>
              </td>
              <td className="py-3 px-4 text-right">
                {h.pnl != null ? (
                  <span className={`text-xs font-medium ${h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {h.pnl >= 0 ? '+' : ''}{format(h.pnl)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">no basis</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button
                    onClick={() => onEdit(h)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(h.id)}
                    className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {holdings.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No holdings yet. Add a coin to get started.
        </div>
      )}
    </div>
  )
}
