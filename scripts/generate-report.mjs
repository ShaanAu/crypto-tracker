import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const type = process.argv[2] // 'daily' | 'weekly' | 'monthly'
if (!['daily', 'weekly', 'monthly'].includes(type)) {
  console.error('Usage: node generate-report.mjs <daily|weekly|monthly>')
  process.exit(1)
}

// ── Load data ────────────────────────────────────────────────────────────────

const holdings = JSON.parse(readFileSync(join(ROOT, 'data/holdings.json'), 'utf8'))
const history  = JSON.parse(readFileSync(join(ROOT, 'data/history.json'),  'utf8'))

// ── Fetch live prices from CoinGecko ─────────────────────────────────────────

const ids = holdings.map(h => h.id).join(',')
const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`

let prices = {}
try {
  const res = await fetch(url)
  prices = await res.json()
} catch (e) {
  console.error('CoinGecko fetch failed:', e.message)
  process.exit(1)
}

// ── Calculate metrics ────────────────────────────────────────────────────────

const now = Date.now()

function findSnapshot(daysAgo) {
  const target = now - daysAgo * 86400_000
  const tolerance = daysAgo * 86400_000 * 0.3
  const closest = history.reduce((best, s) =>
    Math.abs(s.timestamp - target) < Math.abs(best.timestamp - target) ? s : best
  , history[0])
  if (!closest || Math.abs(closest.timestamp - target) > tolerance) return null
  return closest
}

const enriched = holdings.map(h => {
  const p = prices[h.id] ?? {}
  const price     = p.usd ?? 0
  const change24h = p.usd_24h_change ?? 0
  const change7d  = p.usd_7d_change ?? null
  const value     = h.amount * price
  const prevPrice = price / (1 + change24h / 100)
  const change24hUsd = h.amount * (price - prevPrice)
  const pnl = h.costBasisUsd != null ? (price - h.costBasisUsd) * h.amount : null
  const pnlPct = h.costBasisUsd != null && h.costBasisUsd > 0
    ? ((price - h.costBasisUsd) / h.costBasisUsd) * 100 : null
  return { ...h, price, change24h, change7d, value, change24hUsd, pnl, pnlPct }
}).sort((a, b) => b.value - a.value)

const totalValue    = enriched.reduce((s, h) => s + h.value, 0)
const total24hAgo   = enriched.reduce((s, h) => s + h.amount * (h.price / (1 + h.change24h / 100)), 0)
const change24hUsd  = totalValue - total24hAgo
const change24hPct  = total24hAgo > 0 ? (change24hUsd / total24hAgo) * 100 : 0

const snap7d  = findSnapshot(7)
const snap30d = findSnapshot(30)
const snap90d = findSnapshot(90)

const change7dUsd  = snap7d  ? totalValue - snap7d.totalValueUsd  : null
const change7dPct  = snap7d  ? (change7dUsd  / snap7d.totalValueUsd)  * 100 : null
const change30dUsd = snap30d ? totalValue - snap30d.totalValueUsd : null
const change30dPct = snap30d ? (change30dUsd / snap30d.totalValueUsd) * 100 : null
const change90dUsd = snap90d ? totalValue - snap90d.totalValueUsd : null
const change90dPct = snap90d ? (change90dUsd / snap90d.totalValueUsd) * 100 : null

const totalCostBasis = enriched.reduce((s, h) => h.costBasisUsd != null ? s + h.costBasisUsd * h.amount : s, 0)
const totalPnl       = enriched.reduce((s, h) => h.pnl != null ? s + h.pnl : s, 0)
const hasCostBasis   = enriched.some(h => h.pnl != null)

// ── Helpers ──────────────────────────────────────────────────────────────────

const usd = (v, dp = 2) => v == null ? '—'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v)

const pct = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
const arrow = v => v == null ? '' : v >= 0 ? '▲' : '▼'
const sign = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${usd(v)}`
const num = v => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(v)

const date = new Date()
const dateStr = date.toISOString().split('T')[0]
const weekNum = (() => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
})()
const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const titles = { daily: `Daily Report — ${dateStr}`, weekly: `Weekly Report — W${weekNum} ${date.getFullYear()}`, monthly: `Monthly Report — ${monthStr}` }
const filenames = { daily: `reports/daily/${dateStr}.md`, weekly: `reports/weekly/${date.getFullYear()}-W${String(weekNum).padStart(2,'0')}.md`, monthly: `reports/monthly/${monthStr}.md` }

// ── Generate markdown ────────────────────────────────────────────────────────

const topPerformers  = [...enriched].sort((a, b) => b.change24h - a.change24h).slice(0, 3)
const worstPerformers = [...enriched].sort((a, b) => a.change24h - b.change24h).slice(0, 3)

const md = `# Portfolio ${titles[type]}
> Generated ${date.toUTCString()}

## Summary

| Metric | Value |
|--------|-------|
| **Total Value** | **${usd(totalValue)}** |
| 24H Change | ${arrow(change24hUsd)} ${sign(change24hUsd)} (${pct(change24hPct)}) |
| 7D Change | ${snap7d  ? `${arrow(change7dUsd)} ${sign(change7dUsd)} (${pct(change7dPct)})` : '_Not enough data_'} |
| 30D Change | ${snap30d ? `${arrow(change30dUsd)} ${sign(change30dUsd)} (${pct(change30dPct)})` : '_Not enough data_'} |
| 90D Change | ${snap90d ? `${arrow(change90dUsd)} ${sign(change90dUsd)} (${pct(change90dPct)})` : '_Not enough data_'} |${hasCostBasis ? `
| **Total P&L** | **${sign(totalPnl)}** (${pct(totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : null)}) |
| Cost Basis | ${usd(totalCostBasis)} |` : ''}

## Holdings

| # | Coin | Price | 24H | 7D | Holdings | Value | Allocation | P&L |
|---|------|-------|-----|----|----------|-------|------------|-----|
${enriched.map((h, i) => {
  const alloc = totalValue > 0 ? (h.value / totalValue * 100).toFixed(1) : '0.0'
  const pnlStr = h.pnl != null ? `${sign(h.pnl)} (${pct(h.pnlPct)})` : '—'
  const change7dStr = h.change7d != null ? pct(h.change7d) : '—'
  return `| ${i + 1} | **${h.symbol}** | ${usd(h.price, h.price < 1 ? 6 : 2)} | ${pct(h.change24h)} | ${change7dStr} | ${num(h.amount)} | ${usd(h.value)} | ${alloc}% | ${pnlStr} |`
}).join('\n')}

## Allocation Breakdown

\`\`\`
${enriched.map(h => {
  const alloc = totalValue > 0 ? h.value / totalValue : 0
  const bars = Math.round(alloc * 30)
  return `${h.symbol.padEnd(5)} ${'█'.repeat(bars)}${'░'.repeat(30 - bars)} ${(alloc * 100).toFixed(1)}%`
}).join('\n')}
\`\`\`

## 24H Movers

**Top performers**
${topPerformers.map((h, i) => `${i + 1}. ${h.symbol} — ${pct(h.change24h)} (${sign(h.change24hUsd)})`).join('\n')}

**Worst performers**
${worstPerformers.map((h, i) => `${i + 1}. ${h.symbol} — ${pct(h.change24h)} (${sign(h.change24hUsd)})`).join('\n')}
${hasCostBasis ? `
## P&L Breakdown

| Coin | Cost Basis | Current Price | Unrealised P&L | Return |
|------|-----------|---------------|---------------|--------|
${enriched.filter(h => h.pnl != null).sort((a, b) => b.pnl - a.pnl).map(h =>
  `| ${h.symbol} | ${usd(h.costBasisUsd)} | ${usd(h.price)} | ${sign(h.pnl)} | ${pct(h.pnlPct)} |`
).join('\n')}
` : ''}
---
_Prices from CoinGecko. Portfolio data from [ShaanAu/crypto-tracker](https://github.com/ShaanAu/crypto-tracker)._
`

// ── Write file ───────────────────────────────────────────────────────────────

const outPath = join(ROOT, filenames[type])
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, md)
console.log(`Written: ${filenames[type]}`)
