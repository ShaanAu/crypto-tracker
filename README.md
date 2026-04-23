# Crypto Portfolio Tracker

Personal crypto portfolio tracker with live prices, P&L tracking, historical charts, and price alerts.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Prices auto-refresh every 60 seconds via the CoinGecko free API.

## Adding a new coin

1. Click **+ Add Coin** in the top right
2. Type the coin name or symbol in the search box (e.g. `bitcoin`, `ETH`, `solana`)
3. Select the coin from the dropdown
4. Enter the amount you hold
5. Optionally enter your average buy price — this enables the P&L column
6. Click **Save**

The coin will appear in the holdings table immediately and persist across page reloads.

> **Note:** CoinGecko's free API is rate-limited (~30 requests/min). If search returns no results, wait a moment and try again.

## Editing or removing a coin

Hover over any row in the table to reveal the edit (pencil) and delete (trash) icons on the right.

## Price alerts

1. Go to the **Alerts** tab
2. Click **Add Alert**
3. Select a coin, set the condition (above / below), and enter a target price
4. Click **Add Alert** — your browser will prompt for notification permission

When the price hits your target, a browser notification fires. Alerts can be toggled on/off without deleting them.

## Deploying to Netlify

Connect this repo in Netlify — it will pick up the `netlify.toml` automatically and run `npm run build` on every push.
