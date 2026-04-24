import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import type { StockHolding } from '../types'

interface SearchResult {
  symbol: string
  shortname: string
  exchange: string
  quoteType: string
}

interface Props {
  holding?: StockHolding
  onSave: (s: StockHolding) => void
  onClose: () => void
}

export function AddStockModal({ holding, onSave, onClose }: Props) {
  const [query, setQuery] = useState(holding?.name ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<{ id: string; symbol: string; name: string; nativeCurrency: 'USD' | 'GBP' } | null>(
    holding ? { id: holding.id, symbol: holding.symbol, name: holding.name, nativeCurrency: holding.nativeCurrency } : null
  )
  const [shares, setShares] = useState(holding ? String(holding.shares) : '')
  const [costBasis, setCostBasis] = useState(holding?.costBasisGbp != null ? String(holding.costBasisGbp) : '')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim() || selected) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=7&newsCount=0`
        )
        if (!res.ok) return
        const json = await res.json()
        setResults((json.quotes ?? []).filter((q: SearchResult) => ['EQUITY', 'ETF'].includes(q.quoteType)))
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [query, selected])

  const handleSelect = (r: SearchResult) => {
    const isUk = r.exchange === 'LSE' || r.symbol.endsWith('.L')
    setSelected({
      id: r.symbol,
      symbol: r.symbol.replace('.L', ''),
      name: r.shortname,
      nativeCurrency: isUk ? 'GBP' : 'USD',
    })
    setQuery(r.shortname)
    setResults([])
  }

  const handleSave = () => {
    if (!selected || !shares) return
    const s: StockHolding = {
      id: selected.id,
      symbol: selected.symbol,
      name: selected.name,
      shares: parseFloat(shares),
      nativeCurrency: selected.nativeCurrency,
      costBasisGbp: costBasis ? parseFloat(costBasis) : undefined,
    }
    onSave(s)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1f] border border-gray-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">{holding ? 'Edit Position' : 'Add Stock'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ticker search */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Stock / ETF</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or ticker..."
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
              />
            </div>
            {searching && <p className="text-xs text-gray-600 mt-1">Searching...</p>}
            {results.length > 0 && (
              <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                {results.map(r => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-700 border-b border-gray-700/50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{r.symbol}</span>
                      <span className="text-xs text-gray-500">{r.exchange}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{r.shortname}</div>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <p className="text-xs text-blue-400 mt-1">
                ✓ {selected.name} ({selected.id}) · {selected.nativeCurrency}
              </p>
            )}
          </div>

          {/* Shares */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Number of shares</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={shares}
              onChange={e => setShares(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
            />
          </div>

          {/* Cost basis */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Avg cost per share (£ GBP) <span className="text-gray-600">— optional</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={costBasis}
                onChange={e => setCostBasis(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || !shares}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {holding ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
