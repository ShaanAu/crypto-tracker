import type { Holding, PriceMap, HistorySnapshot } from '../types'
import { formatPct } from '../utils/format'
import { useCurrency } from '../contexts/CurrencyContext'

interface Props {
  holdings: Holding[]
  prices: PriceMap
  history: HistorySnapshot[]
}

interface PeriodResult {
  change: number
  pct: number
  available: boolean
}

function findClosest(history: HistorySnapshot[], targetMs: number): HistorySnapshot | null {
  if (history.length === 0) return null
  return history.reduce((best, s) =>
    Math.abs(s.timestamp - targetMs) < Math.abs(best.timestamp - targetMs) ? s : best
  )
}

function usePeriod(currentValue: number, history: HistorySnapshot[], daysAgo: number): PeriodResult {
  const targetMs = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  const snapshot = findClosest(history, targetMs)

  // Require the snapshot to be within 25% of the target window to count as valid
  const toleranceMs = daysAgo * 24 * 60 * 60 * 1000 * 0.25
  if (!snapshot || Math.abs(snapshot.timestamp - targetMs) > toleranceMs) {
    return { change: 0, pct: 0, available: false }
  }

  const change = currentValue - snapshot.totalValueUsd
  const pct = snapshot.totalValueUsd > 0 ? (change / snapshot.totalValueUsd) * 100 : 0
  return { change, pct, available: true }
}

function PeriodCard({ label, result }: { label: string; result: PeriodResult }) {
  const { format } = useCurrency()
  const positive = result.change >= 0

  return (
    <div className="flex-1 bg-gray-800/50 rounded-xl p-3 min-w-0">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      {result.available ? (
        <>
          <div className={`text-sm font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {positive ? '+' : ''}{format(result.change)}
          </div>
          <div className={`text-xs mt-0.5 px-1.5 py-0.5 rounded inline-block font-medium ${positive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            {formatPct(result.pct)}
          </div>
        </>
      ) : (
        <div className="text-xs text-gray-600 mt-1">Not enough data yet</div>
      )}
    </div>
  )
}

export function PerformanceSummary({ holdings, prices, history }: Props) {
  const currentValue = holdings.reduce((sum, h) => sum + h.amount * (prices[h.id]?.usd ?? 0), 0)

  // Daily: derive from CoinGecko's 24h change data (more accurate than snapshots)
  const value24hAgo = holdings.reduce((sum, h) => {
    const price = prices[h.id]?.usd ?? 0
    const change = prices[h.id]?.usd_24h_change ?? 0
    return sum + h.amount * (price / (1 + change / 100))
  }, 0)
  const daily: PeriodResult = currentValue > 0 && value24hAgo > 0
    ? { change: currentValue - value24hAgo, pct: ((currentValue - value24hAgo) / value24hAgo) * 100, available: true }
    : { change: 0, pct: 0, available: false }

  const weekly = usePeriod(currentValue, history, 7)
  const monthly = usePeriod(currentValue, history, 30)

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex gap-2">
        <PeriodCard label="24H" result={daily} />
        <PeriodCard label="7D" result={weekly} />
        <PeriodCard label="30D" result={monthly} />
      </div>
    </div>
  )
}
