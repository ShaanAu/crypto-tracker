import { useState, useMemo } from 'react'
import type { MarketCoin, Signal } from '../hooks/useMarket'
import type { Holding } from '../types'
import { formatPct } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

type SortKey = 'rank' | 'price' | 'change24h' | 'change7d' | 'signal' | 'marketCap'
type FilterSignal = 'all' | Signal

const SIGNAL_ORDER: Signal[] = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']

const SIGNAL_STYLE: Record<Signal, { badge: string; text: string }> = {
  'Strong Buy':  { badge: 'bg-green-900/60 text-green-300',  text: '🟢🟢' },
  'Buy':         { badge: 'bg-green-900/40 text-green-400',  text: '🟢' },
  'Hold':        { badge: 'bg-yellow-900/40 text-yellow-400', text: '🟡' },
  'Sell':        { badge: 'bg-red-900/40 text-red-400',      text: '🔴' },
  'Strong Sell': { badge: 'bg-red-900/60 text-red-300',      text: '🔴🔴' },
}

interface Props {
  coins: MarketCoin[]
  holdings: Holding[]
  loading: boolean
  lastUpdated: Date | null
}

export function MarketOverview({ coins, holdings, loading, lastUpdated }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState<FilterSignal>('all')
  const [showHeld, setShowHeld] = useState(false)
  const { format } = useCurrency()

  const heldIds = new Set(holdings.map(h => h.id))

  const filtered = useMemo(() => {
    let list = filter === 'all' ? coins : coins.filter(c => c.signal === filter)
    if (showHeld) list = list.filter(c => heldIds.has(c.id))
    return [...list].sort((a, b) => {
      let diff = 0
      if (sortKey === 'rank')      diff = a.rank - b.rank
      if (sortKey === 'price')     diff = b.price - a.price
      if (sortKey === 'change24h') diff = b.change24h - a.change24h
      if (sortKey === 'change7d')  diff = (b.change7d ?? -999) - (a.change7d ?? -999)
      if (sortKey === 'marketCap') diff = b.marketCap - a.marketCap
      if (sortKey === 'signal')    diff = a.signalScore - b.signalScore
      return sortAsc ? diff : -diff
    })
  }, [coins, filter, showHeld, sortKey, sortAsc])

  const signalCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of coins) counts[c.signal] = (counts[c.signal] ?? 0) + 1
    return counts
  }, [coins])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setShowHeld(false)
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(key === 'rank') }
  }

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ''

  const fmtCap = (v: number) => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`
    if (v >= 1e9)  return `${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6)  return `${(v / 1e6).toFixed(0)}M`
    return format(v)
  }

  return (
    <div>
      {/* Signal summary bar */}
      <div className="px-4 pt-4 pb-2 flex flex-wrap gap-2">
        {SIGNAL_ORDER.map(sig => (
          <button
            key={sig}
            onClick={() => setFilter(f => f === sig ? 'all' : sig)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              filter === sig
                ? SIGNAL_STYLE[sig].badge + ' border-current'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {SIGNAL_STYLE[sig].text} {sig} <span className="opacity-60">({signalCounts[sig] ?? 0})</span>
          </button>
        ))}
        <button
          onClick={() => setShowHeld(p => !p)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ml-auto ${
            showHeld ? 'border-blue-500 text-blue-400 bg-blue-900/30' : 'border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
        >
          My holdings only
        </button>
      </div>

      {lastUpdated && (
        <p className="text-gray-600 text-xs px-4 pb-2">Updated {lastUpdated.toLocaleTimeString()}{loading ? ' · refreshing…' : ''}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium w-8">
                <button onClick={() => handleSort('rank')} className="hover:text-gray-300">#{ sortIcon('rank')}</button>
              </th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Coin</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">
                <button onClick={() => handleSort('price')} className="hover:text-gray-300">Price{sortIcon('price')}</button>
              </th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">
                <button onClick={() => handleSort('change24h')} className="hover:text-gray-300">24H{sortIcon('change24h')}</button>
              </th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">
                <button onClick={() => handleSort('change7d')} className="hover:text-gray-300">7D{sortIcon('change7d')}</button>
              </th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">
                <button onClick={() => handleSort('marketCap')} className="hover:text-gray-300">Mkt Cap{sortIcon('marketCap')}</button>
              </th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">
                <button onClick={() => handleSort('signal')} className="hover:text-gray-300">Signal{sortIcon('signal')}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const held = heldIds.has(c.id)
              const style = SIGNAL_STYLE[c.signal]
              return (
                <tr
                  key={c.id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${held ? 'bg-blue-900/10' : ''}`}
                >
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{c.rank}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <img src={c.image} alt={c.symbol} className="w-6 h-6 rounded-full" />
                      <div>
                        <span className="text-gray-200 font-medium text-sm">{c.symbol}</span>
                        {held && <span className="ml-1.5 text-xs text-blue-400 font-medium">held</span>}
                        <div className="text-xs text-gray-600 leading-none mt-0.5">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-200 text-sm">
                    {format(c.price, c.price < 1 ? 4 : 2)}
                  </td>
                  <td className={`py-2.5 px-3 text-right text-xs font-medium ${c.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`px-1.5 py-0.5 rounded ${c.change24h >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                      {formatPct(c.change24h)}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 text-right text-xs font-medium ${(c.change7d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.change7d != null ? formatPct(c.change7d) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-400 text-xs">{fmtCap(c.marketCap)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                      {c.signal}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">No coins match this filter.</div>
        )}
      </div>
    </div>
  )
}
