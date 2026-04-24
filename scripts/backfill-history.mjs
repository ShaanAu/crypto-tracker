/**
 * One-time script to backfill 30 days of portfolio history.
 * Uses Binance public klines API (no key, generous rate limit).
 * Run with: node --env-file=.env.local scripts/backfill-history.mjs
 */

const TOKEN = process.env.VITE_GITHUB_TOKEN
if (!TOKEN) { console.error('VITE_GITHUB_TOKEN not set'); process.exit(1) }

const OWNER = 'ShaanAu'
const REPO  = 'crypto-tracker'
const BRANCH = 'main'
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

const ghHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
}

async function ghGet(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: ghHeaders })
  if (res.status === 404) return { data: null, sha: null }
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`)
  const json = await res.json()
  const data = JSON.parse(Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString())
  return { data, sha: json.sha }
}

async function ghPut(path, data, sha, message) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
  const body = { message, content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PUT',
    headers: ghHeaders,
    body: JSON.stringify(body),
  })
  if (!res.ok) { const err = await res.text(); throw new Error(`GitHub PUT ${path}: ${res.status} ${err}`) }
  return res.json()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// CoinGecko ID → Binance USDT pair
const BINANCE_PAIRS = {
  'dogecoin':    'DOGEUSDT',
  'avalanche-2': 'AVAXUSDT',
  'chainlink':   'LINKUSDT',
  'fetch-ai':    'FETUSDT',
  'ripple':      'XRPUSDT',
  'sui':         'SUIUSDT',
  'bittensor':   'TAOUSDT',
  'near':        'NEARUSDT',
  'bitcoin':     'BTCUSDT',
  'ethereum':    'ETHUSDT',
  'solana':      'SOLUSDT',
}

const { data: holdings } = await ghGet('data/holdings.json')
const { data: existingHistory, sha: historySha } = await ghGet('data/history.json')

console.log(`Loaded ${holdings.length} holdings, ${existingHistory?.length ?? 0} existing snapshots`)
console.log('Fetching 30-day klines from Binance...')

const priceCharts = {}
for (const h of holdings) {
  const pair = BINANCE_PAIRS[h.id]
  if (!pair) { console.log(`  ${h.symbol}: no Binance pair, skipping`); continue }

  process.stdout.write(`  ${h.symbol} (${pair})... `)
  await sleep(200)
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=32`
    )
    if (!res.ok) { console.log(`HTTP ${res.status}`); continue }
    const klines = await res.json()
    // kline format: [open_time, open, high, low, close, ...]
    // open_time is ms timestamp; close price is index 4
    const prices = klines.map(k => [k[0], parseFloat(k[4])])
    priceCharts[h.id] = prices
    console.log(`${prices.length} pts`)
  } catch (e) {
    console.log(`err: ${e.message}`)
  }
}

const coinsWithData = Object.keys(priceCharts).length
console.log(`\nGot data for ${coinsWithData}/${holdings.length} coins`)

// Compute portfolio value per calendar day
const dayMap = new Map()
for (const [coinId, prices] of Object.entries(priceCharts)) {
  for (const [ts, price] of prices) {
    const dayKey = Math.floor(ts / 86400000) * 86400000
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, {})
    dayMap.get(dayKey)[coinId] = price
  }
}

const backfillSnapshots = []
for (const [dayKey, prices] of dayMap.entries()) {
  let totalValue = 0
  for (const h of holdings) {
    totalValue += h.amount * (prices[h.id] ?? 0)
  }
  if (totalValue === 0) continue
  backfillSnapshots.push({ timestamp: dayKey, totalValueUsd: totalValue })
}
backfillSnapshots.sort((a, b) => a.timestamp - b.timestamp)

// Keep today's real-time snapshots; replace all older entries with fresh backfill
const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
const todaySnapshots = (existingHistory ?? []).filter(s => s.timestamp > oneDayAgo)
const merged = [...todaySnapshots, ...backfillSnapshots]
merged.sort((a, b) => a.timestamp - b.timestamp)

const fmt = v => '$' + new Intl.NumberFormat('en-US').format(Math.round(v))
const oldest = merged[0]
const newest = merged[merged.length - 1]
console.log(`Generated ${backfillSnapshots.length} backfill snapshots`)
console.log(`Total: ${todaySnapshots.length} today + ${backfillSnapshots.length} backfill = ${merged.length} snapshots`)
console.log(`Range: ${fmt(oldest.totalValueUsd)} (${new Date(oldest.timestamp).toISOString().split('T')[0]}) → ${fmt(newest.totalValueUsd)} (today)`)

await ghPut('data/history.json', merged, historySha, 'backfill: 30-day portfolio history via Binance')
console.log('\nDone! Refresh the app — chart and 7d/30d performance now show real data.')
