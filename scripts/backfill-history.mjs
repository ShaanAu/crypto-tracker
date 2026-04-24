/**
 * One-time script to backfill 30 days of portfolio history from CoinGecko.
 * Run with: node --env-file=.env.local scripts/backfill-history.mjs
 */

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
void __dirname

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

const { data: holdings } = await ghGet('data/holdings.json')
const { data: existingHistory, sha: historySha } = await ghGet('data/history.json')

console.log(`Loaded ${holdings.length} holdings, ${existingHistory?.length ?? 0} existing snapshots`)

// Fetch 30-day daily price chart for each coin
const priceCharts = {}
for (const h of holdings) {
  console.log(`Fetching 30-day history for ${h.symbol}...`)
  await sleep(3000)
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${h.id}/market_chart?vs_currency=usd&days=30&interval=daily`
    )
    if (!res.ok) { console.warn(`  HTTP ${res.status}`); continue }
    const json = await res.json()
    priceCharts[h.id] = json.prices // [[timestamp_ms, price], ...]
    console.log(`  ${json.prices.length} data points`)
  } catch (e) {
    console.warn(`  Error: ${e.message}`)
  }
}

// Group prices by calendar day (floor to midnight UTC)
const dayMap = new Map()
for (const [coinId, prices] of Object.entries(priceCharts)) {
  for (const [ts, price] of prices) {
    const dayKey = Math.floor(ts / 86400000) * 86400000
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, {})
    dayMap.get(dayKey)[coinId] = price
  }
}

// Compute total portfolio value per day
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
console.log(`\nGenerated ${backfillSnapshots.length} backfill snapshots`)

// Keep only today's real-time snapshots from the app (last 24h); replace all older entries with backfill
const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
const todaySnapshots = (existingHistory ?? []).filter(s => s.timestamp > oneDayAgo)
const merged = [...todaySnapshots, ...backfillSnapshots]
merged.sort((a, b) => a.timestamp - b.timestamp)
console.log(`Kept ${todaySnapshots.length} today-snapshots + ${backfillSnapshots.length} backfill = ${merged.length} total`)

await ghPut('data/history.json', merged, historySha, 'backfill: 30-day portfolio history')
console.log('Done! data/history.json updated on GitHub.')
console.log('\nRefresh the app — chart and 7d/30d performance will now show real data.')
