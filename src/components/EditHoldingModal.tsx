import { useState, useEffect } from 'react'
import { X, Search, Loader } from 'lucide-react'
import type { Holding } from '../types'

interface Props {
  holding?: Holding
  onSave: (holding: Holding) => void
  onClose: () => void
}

interface CoinResult {
  id: string
  symbol: string
  name: string
  thumb: string
}

export function EditHoldingModal({ holding, onSave, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<{ id: string; symbol: string; name: string } | null>(
    holding ? { id: holding.id, symbol: holding.symbol, name: holding.name } : null
  )
  const [amount, setAmount] = useState(holding ? String(holding.amount) : '')
  const [costBasis, setCostBasis] = useState(holding?.costBasisUsd ? String(holding.costBasisUsd) : '')

  useEffect(() => {
    if (!query || holding) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults((data.coins ?? []).slice(0, 5))
      } catch {}
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const handleSave = () => {
    if (!selected || !amount) return
    onSave({
      id: selected.id,
      symbol: selected.symbol.toUpperCase(),
      name: selected.name,
      amount: parseFloat(amount),
      costBasisUsd: costBasis ? parseFloat(costBasis) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-gray-200 font-semibold">{holding ? `Edit ${holding.symbol}` : 'Add Coin'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {!holding && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Search Coin</label>
            {selected ? (
              <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-gray-200 font-medium">{selected.symbol} <span className="text-gray-500 font-normal">— {selected.name}</span></span>
                <button onClick={() => { setSelected(null); setResults([]) }} className="text-gray-500 hover:text-gray-300">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  {searching ? <Loader size={14} className="text-gray-500 animate-spin" /> : <Search size={14} className="text-gray-500" />}
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or symbol..."
                    className="bg-transparent text-gray-200 text-sm flex-1 outline-none placeholder:text-gray-600"
                  />
                </div>
                {results.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-10">
                    {results.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setSelected(r); setResults([]); setQuery('') }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 text-left transition-colors"
                      >
                        {r.thumb && <img src={r.thumb} alt="" className="w-5 h-5 rounded-full" />}
                        <span className="text-gray-200 text-sm font-medium">{r.symbol.toUpperCase()}</span>
                        <span className="text-gray-500 text-sm">{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
              Avg Buy Price (USD) <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <input
              type="number"
              value={costBasis}
              onChange={e => setCostBasis(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || !amount}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
