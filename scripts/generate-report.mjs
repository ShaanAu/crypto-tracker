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

// CoinTelegraph tag names per coin ID
const CT_TAGS = {
  'dogecoin':    'dogecoin',
  'avalanche-2': 'avalanche',
  'chainlink':   'chainlink',
  'fetch-ai':    'fetch-ai',
  'ripple':      'xrp',
  'sui':         'sui',
  'bittensor':   'bittensor',
  'near':        'near-protocol',
  'bitcoin':     'bitcoin',
  'ethereum':    'ethereum',
  'solana':      'solana',
}

// ── Load data ────────────────────────────────────────────────────────────────

const holdings = JSON.parse(readFileSync(join(ROOT, 'data/holdings.json'), 'utf8'))
const history  = JSON.parse(readFileSync(join(ROOT, 'data/history.json'),  'utf8'))

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson(url, label) {
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) { console.warn(`${label}: HTTP ${res.status}`); return null }
    return res.json()
  } catch (e) {
    console.warn(`${label}: ${e.message}`)
    return null
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const usd = (v, dp = 2) => v == null ? '—'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v)
const pct = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
const arrow = v => v == null ? '' : v >= 0 ? '▲' : '▼'
const sign = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${usd(v)}`
const num = v => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(v)

// ── Fetch prices ─────────────────────────────────────────────────────────────

const ids = holdings.map(h => h.id).join(',')
const priceData = await fetchJson(
  `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`,
  'CoinGecko prices'
)
if (!priceData) { console.error('Could not fetch prices'); process.exit(1) }

// ── Fetch detailed coin data (sentiment, ATH, extended changes) ───────────────

const coinDetails = {}
for (const h of holdings) {
  await sleep(1500) // stay within free tier rate limit
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/${h.id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`,
    `CoinGecko details: ${h.symbol}`
  )
  if (data) coinDetails[h.id] = data
}

// ── Fetch Fear & Greed index ─────────────────────────────────────────────────

const fearGreed = await fetchJson('https://api.alternative.me/fng/?limit=7', 'Fear & Greed')

// ── Fetch news from CoinTelegraph RSS (free, no key) ─────────────────────────

function parseRss(xml, max = 3) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < max) {
    const block = match[1]
    const title   = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ?? /<title>(.*?)<\/title>/.exec(block))?.[1]?.trim()
    const link    = (/<link><!\[CDATA\[(.*?)\]\]><\/link>/.exec(block) ?? /<link>(.*?)<\/link>/.exec(block) ?? /<guid[^>]*>(.*?)<\/guid>/.exec(block))?.[1]?.trim()
    const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block))?.[1]?.trim()
    if (title && link) items.push({ title, url: link, published: pubDate ? new Date(pubDate).toISOString().split('T')[0] : '' })
  }
  return items
}

const newsMap = {}
for (const h of holdings) {
  const tag = CT_TAGS[h.id]
  if (!tag) continue
  await sleep(500)
  try {
    const res = await fetch(`https://cointelegraph.com/rss/tag/${tag}`)
    if (!res.ok) continue
    const xml = await res.text()
    const items = parseRss(xml, 3)
    if (items.length > 0) newsMap[h.symbol] = items
  } catch (e) {
    console.warn(`RSS ${h.symbol}: ${e.message}`)
  }
}

// ── Fetch trending coins ──────────────────────────────────────────────────────

const trendingData = await fetchJson('https://api.coingecko.com/api/v3/search/trending', 'CoinGecko trending')
const trendingCoins = trendingData?.coins?.slice(0, 5).map(c => c.item.symbol.toUpperCase()) ?? []

// ── Compute signals ───────────────────────────────────────────────────────────

function computeSignal(h, detail) {
  let score = 0
  const reasons = []

  const change24h = priceData[h.id]?.usd_24h_change ?? 0
  const change7d  = detail?.market_data?.price_change_percentage_7d ?? null
  const change30d = detail?.market_data?.price_change_percentage_30d ?? null
  const sentimentUp = detail?.sentiment_votes_up_percentage ?? null
  const price = priceData[h.id]?.usd ?? 0
  const ath   = detail?.market_data?.ath?.usd ?? null
  const athPct = ath && price ? ((price - ath) / ath) * 100 : null // negative = below ATH

  // 24h momentum
  if (change24h > 5)       { score += 2; reasons.push('strong 24h gain') }
  else if (change24h > 1)  { score += 1; reasons.push('positive 24h') }
  else if (change24h < -5) { score -= 2; reasons.push('sharp 24h drop') }
  else if (change24h < -1) { score -= 1; reasons.push('negative 24h') }

  // 7d momentum
  if (change7d != null) {
    if (change7d > 15)       { score += 3; reasons.push('strong 7d uptrend') }
    else if (change7d > 5)   { score += 2; reasons.push('positive 7d') }
    else if (change7d > 0)   { score += 1 }
    else if (change7d < -15) { score -= 3; reasons.push('sharp 7d downtrend') }
    else if (change7d < -5)  { score -= 2; reasons.push('negative 7d') }
    else                     { score -= 1 }
  }

  // 30d momentum
  if (change30d != null) {
    if (change30d > 20)       { score += 2; reasons.push('strong monthly trend') }
    else if (change30d > 5)   { score += 1 }
    else if (change30d < -20) { score -= 2; reasons.push('weak monthly trend') }
    else if (change30d < -5)  { score -= 1 }
  }

  // Community sentiment
  if (sentimentUp != null) {
    if (sentimentUp > 70)      { score += 2; reasons.push('high community sentiment') }
    else if (sentimentUp > 55) { score += 1 }
    else if (sentimentUp < 30) { score -= 2; reasons.push('low sentiment') }
    else if (sentimentUp < 45) { score -= 1 }
  }

  // ATH distance (deep discount = potential value)
  if (athPct != null) {
    if (athPct < -80) { score += 1; reasons.push('deep ATH discount') }
    if (athPct > -5)  { score -= 1; reasons.push('near ATH') }
  }

  let signal, emoji
  if      (score >= 6)  { signal = 'Strong Buy';  emoji = '🟢🟢' }
  else if (score >= 3)  { signal = 'Buy';          emoji = '🟢' }
  else if (score >= -2) { signal = 'Hold';         emoji = '🟡' }
  else if (score >= -5) { signal = 'Sell';         emoji = '🔴' }
  else                  { signal = 'Strong Sell';  emoji = '🔴🔴' }

  return { signal, emoji, score, reasons: reasons.slice(0, 3), change7d, change30d, sentimentUp, ath, athPct }
}

// ── Enrich holdings ───────────────────────────────────────────────────────────

const now = Date.now()

function findSnapshot(daysAgo) {
  if (history.length === 0) return null
  const target = now - daysAgo * 86400_000
  const tolerance = daysAgo * 86400_000 * 0.3
  const closest = history.reduce((best, s) =>
    Math.abs(s.timestamp - target) < Math.abs(best.timestamp - target) ? s : best
  , history[0])
  if (Math.abs(closest.timestamp - target) > tolerance) return null
  return closest
}

const enriched = holdings.map(h => {
  const p      = priceData[h.id] ?? {}
  const detail = coinDetails[h.id] ?? null
  const price     = p.usd ?? 0
  const change24h = p.usd_24h_change ?? 0
  const value     = h.amount * price
  const prevPrice = price / (1 + change24h / 100)
  const change24hUsd = h.amount * (price - prevPrice)
  const pnl = h.costBasisUsd != null ? (price - h.costBasisUsd) * h.amount : null
  const pnlPct = h.costBasisUsd != null && h.costBasisUsd > 0
    ? ((price - h.costBasisUsd) / h.costBasisUsd) * 100 : null
  const sig = computeSignal(h, detail)
  return { ...h, price, change24h, value, change24hUsd, pnl, pnlPct, sig, detail }
}).sort((a, b) => b.value - a.value)

const totalValue    = enriched.reduce((s, h) => s + h.value, 0)
const total24hAgo   = enriched.reduce((s, h) => s + h.amount * (h.price / (1 + h.change24h / 100)), 0)
const change24hUsd  = totalValue - total24hAgo
const change24hPct  = total24hAgo > 0 ? (change24hUsd / total24hAgo) * 100 : 0

const snap7d   = findSnapshot(7)
const snap30d  = findSnapshot(30)
const snap90d  = findSnapshot(90)
const change7dUsd  = snap7d  ? totalValue - snap7d.totalValueUsd  : null
const change7dPct  = snap7d  ? (change7dUsd  / snap7d.totalValueUsd)  * 100 : null
const change30dUsd = snap30d ? totalValue - snap30d.totalValueUsd : null
const change30dPct = snap30d ? (change30dUsd / snap30d.totalValueUsd) * 100 : null
const change90dUsd = snap90d ? totalValue - snap90d.totalValueUsd : null
const change90dPct = snap90d ? (change90dUsd / snap90d.totalValueUsd) * 100 : null

const hasCostBasis = enriched.some(h => h.pnl != null)
const totalCostBasis = enriched.reduce((s, h) => h.costBasisUsd != null ? s + h.costBasisUsd * h.amount : s, 0)
const totalPnl = enriched.reduce((s, h) => h.pnl != null ? s + h.pnl : s, 0)

// ── Fear & Greed ──────────────────────────────────────────────────────────────

const fgToday   = fearGreed?.data?.[0]
const fgYest    = fearGreed?.data?.[1]
const fgWeekAgo = fearGreed?.data?.[6]

function fgLabel(v) {
  if (!v) return '—'
  const n = Number(v)
  if (n <= 20) return 'Extreme Fear 😱'
  if (n <= 40) return 'Fear 😨'
  if (n <= 60) return 'Neutral 😐'
  if (n <= 80) return 'Greed 😏'
  return 'Extreme Greed 🤑'
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const date    = new Date()
const dateStr = date.toISOString().split('T')[0]
const weekNum = (() => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
})()
const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const titles    = { daily: `Daily Report — ${dateStr}`, weekly: `Weekly Report — W${weekNum} ${date.getFullYear()}`, monthly: `Monthly Report — ${monthStr}` }
const filenames = { daily: `reports/daily/${dateStr}.md`, weekly: `reports/weekly/${date.getFullYear()}-W${String(weekNum).padStart(2,'0')}.md`, monthly: `reports/monthly/${monthStr}.md` }

// ── Generate markdown ─────────────────────────────────────────────────────────

const topPerformers   = [...enriched].sort((a, b) => b.change24h - a.change24h).slice(0, 3)
const worstPerformers = [...enriched].sort((a, b) => a.change24h - b.change24h).slice(0, 3)
const myTrending      = enriched.filter(h => trendingCoins.includes(h.symbol))

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
| **Unrealised P&L** | **${sign(totalPnl)}** (${pct(totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : null)}) |
| Cost Basis | ${usd(totalCostBasis)} |` : ''}

## Market Sentiment

| | Today | Yesterday | 7 Days Ago |
|--|-------|-----------|------------|
| **Fear & Greed** | **${fgToday?.value ?? '—'} — ${fgLabel(fgToday?.value)}** | ${fgYest?.value ?? '—'} — ${fgLabel(fgYest?.value)} | ${fgWeekAgo?.value ?? '—'} — ${fgLabel(fgWeekAgo?.value)} |
${myTrending.length > 0 ? `
> 🔥 **Trending on CoinGecko today:** ${myTrending.map(h => `**${h.symbol}**`).join(', ')} _(you hold these)_
` : ''}
## Holdings & Signals

| # | Coin | Price | 24H | 7D | 30D | Value | Alloc | Signal | Community |
|---|------|-------|-----|----|-----|-------|-------|--------|-----------|
${enriched.map((h, i) => {
  const alloc   = totalValue > 0 ? (h.value / totalValue * 100).toFixed(1) : '0.0'
  const change7d  = h.sig.change7d  != null ? pct(h.sig.change7d)  : '—'
  const change30d = h.sig.change30d != null ? pct(h.sig.change30d) : '—'
  const sentiment = h.sig.sentimentUp != null ? `${h.sig.sentimentUp.toFixed(0)}% 👍` : '—'
  return `| ${i + 1} | **${h.symbol}** | ${usd(h.price, h.price < 1 ? 6 : 2)} | ${pct(h.change24h)} | ${change7d} | ${change30d} | ${usd(h.value)} | ${alloc}% | ${h.sig.emoji} ${h.sig.signal} | ${sentiment} |`
}).join('\n')}

### Signal Rationale

${enriched.map(h => `**${h.symbol}** — ${h.sig.emoji} ${h.sig.signal} _(score: ${h.sig.score > 0 ? '+' : ''}${h.sig.score})_${h.sig.reasons.length ? ': ' + h.sig.reasons.join(', ') : ''}${h.sig.athPct != null ? ` · ${Math.abs(h.sig.athPct).toFixed(0)}% below ATH` : ''}`).join('\n')}

> ⚠️ _Signals are computed from price momentum and community sentiment. Not financial advice._

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

## ATH Distance

| Coin | Current | ATH | Distance |
|------|---------|-----|----------|
${enriched.map(h => {
  const ath = h.detail?.market_data?.ath?.usd
  const athPct = ath && h.price ? ((h.price - ath) / ath * 100) : null
  return `| ${h.symbol} | ${usd(h.price, h.price < 1 ? 6 : 2)} | ${ath ? usd(ath, ath < 1 ? 6 : 2) : '—'} | ${athPct != null ? pct(athPct) : '—'} |`
}).join('\n')}
${hasCostBasis ? `
## P&L Breakdown

| Coin | Avg Buy | Current | Unrealised P&L | Return |
|------|---------|---------|---------------|--------|
${enriched.filter(h => h.pnl != null).sort((a, b) => b.pnl - a.pnl).map(h =>
  `| ${h.symbol} | ${usd(h.costBasisUsd)} | ${usd(h.price)} | ${sign(h.pnl)} | ${pct(h.pnlPct)} |`
).join('\n')}
` : ''}${Object.keys(newsMap).length > 0 ? `
## Latest News _(via CoinTelegraph)_

${enriched.map(h => {
  const news = newsMap[h.symbol]
  if (!news?.length) return ''
  return `### ${h.symbol}\n${news.map(n => `- [${n.title}](${n.url})${n.published ? ` _(${n.published})_` : ''}`).join('\n')}`
}).filter(Boolean).join('\n\n')}
` : ''}
---
_Prices and sentiment from CoinGecko. Fear & Greed from Alternative.me. Portfolio data from [ShaanAu/crypto-tracker](https://github.com/ShaanAu/crypto-tracker)._
`

// ── Write file ────────────────────────────────────────────────────────────────

const outPath = join(ROOT, filenames[type])
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, md)
console.log(`Written: ${filenames[type]}`)
