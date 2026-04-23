import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { HistorySnapshot } from '../types'
import { formatUsd, formatDate } from '../utils/format'

interface Props {
  history: HistorySnapshot[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">{formatUsd(payload[0].value)}</p>
    </div>
  )
}

export function PortfolioChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Chart will appear after {Math.max(0, 2 - history.length)} more price refresh{history.length === 1 ? '' : 'es'}.
        <br />
        Prices refresh every 60 seconds.
      </div>
    )
  }

  const data = history.map(s => ({
    date: formatDate(s.timestamp),
    value: s.totalValueUsd,
    timestamp: s.timestamp,
  }))

  const minVal = Math.min(...data.map(d => d.value))
  const maxVal = Math.max(...data.map(d => d.value))
  const padding = (maxVal - minVal) * 0.1 || maxVal * 0.05

  return (
    <div className="px-4 py-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            domain={[minVal - padding, maxVal + padding]}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
