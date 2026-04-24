import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { StockHolding, StockPriceMap } from '../types'
import { formatPct, formatAmount } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

type SortKey = 'value' | 'price' | 'change' | 'pnl'

interface Props {
  stocks: StockHolding[]
  prices: StockPriceMap
  onEdit: (s: StockHolding) => void
  onDelete: (id: string) => void
}

function toGbp(priceNative: number, currency: 'USD' | 'GBP', rate: number) {
  return currency === 'GBP' ? priceNative : priceNative * rate
}

const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function StocksTable({ stocks, prices, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const { gbpRate } = useCurrency()
  const rate = gbpRate ?? 0.79

  const enriched = stocks.map(s => {
    const p = prices[s.id]
    const priceGbp = p ? toGbp(p.priceNative, p.nativeCurrency, rate) : 0
    const change = p?.change24hPct ?? 0
    const valueGbp = s.shares * priceGbp
    const pnl = s.costBasisGbp != null && priceGbp > 0
      ? (priceGbp - s.costBasisGbp) * s.shares
      : null
    return { ...s, priceGbp, change, valueGbp, pnl }
  })

  const sorted = [...enriched].sort((a, b) => {
    if (sortKey === 'value')  return b.valueGbp - a.valueGbp
    if (sortKey === 'price')  return b.priceGbp - a.priceGbp
    if (sortKey === 'change') return b.change - a.change
    if (sortKey === 'pnl')    return (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity)
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
            <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
            <th className="text-right py-2 px-4">{sortBtn('price', 'Price')}</th>
            <th className="text-right py-2 px-4">{sortBtn('change', '24H')}</th>
            <th className="text-right py-2 px-4">{sortBtn('value', 'Value')}</th>
            <th className="text-right py-2 px-4">{sortBtn('pnl', 'P&L')}</th>
            <th className="py-2 px-4 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(s => (
            <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {s.image
                    ? <img src={s.image} alt={s.symbol} className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">{s.symbol.slice(0, 3)}</div>
                  }
                  <div>
                    <div className="font-medium text-gray-200">{s.symbol}</div>
                    <div className="text-xs text-gray-500">{s.name}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-gray-200">
                {s.priceGbp > 0 ? fmt(s.priceGbp) : '—'}
              </td>
              <td className={`py-3 px-4 text-right text-xs font-medium ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`px-1.5 py-0.5 rounded ${s.change >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                  {s.change !== 0 ? formatPct(s.change) : '—'}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="text-gray-200">{s.valueGbp > 0 ? fmt(s.valueGbp) : '—'}</div>
                <div className="text-xs text-gray-500">{formatAmount(s.shares)} {s.symbol}</div>
              </td>
              <td className="py-3 px-4 text-right">
                {s.pnl != null ? (
                  <span className={`text-xs font-medium ${s.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.pnl >= 0 ? '+' : '−'}{fmt(Math.abs(s.pnl))}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">no basis</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button onClick={() => onEdit(s)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(s.id)} className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {stocks.length === 0 && (
        <div className="text-center py-12 text-gray-500">No stocks yet. Add a position to get started.</div>
      )}
    </div>
  )
}
