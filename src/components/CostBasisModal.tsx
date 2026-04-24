import { useState } from 'react'
import { X } from 'lucide-react'
import type { Holding } from '../types'

interface Update {
  id: string
  costBasisUsd: number | undefined
}

interface Props {
  holdings: Holding[]
  onSave: (updates: Update[]) => void
  onClose: () => void
}

export function CostBasisModal({ holdings, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const h of holdings) {
      init[h.id] = h.costBasisUsd != null ? String(h.costBasisUsd) : ''
    }
    return init
  })

  const handleSave = () => {
    const updates: Update[] = holdings.map(h => ({
      id: h.id,
      costBasisUsd: values[h.id] !== '' ? parseFloat(values[h.id]) : undefined,
    }))
    onSave(updates)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1f] border border-gray-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Set Cost Basis</h2>
            <p className="text-xs text-gray-500 mt-0.5">Average price paid per coin (USD)</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {holdings.map(h => (
            <div key={h.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28 shrink-0">
                {h.image
                  ? <img src={h.image} alt={h.symbol} className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">{h.symbol.slice(0, 2)}</div>
                }
                <span className="text-sm font-medium text-gray-200">{h.symbol}</span>
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={values[h.id]}
                  onChange={e => setValues(prev => ({ ...prev, [h.id]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  )
}
