# Crypto Portfolio Tracker

Personal crypto portfolio tracker with live prices, P&L tracking, historical charts, and price alerts. Data is stored as JSON files in this private repo and syncs across devices automatically.

## Running locally

**1. Create a GitHub personal access token**

Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Fine-grained tokens** → Generate new token:
- Repository access: `ShaanAu/crypto-tracker` only
- Permissions: **Contents** → Read and write

**2. Create `.env.local` in the project root:**
```
VITE_GITHUB_TOKEN=github_pat_your_token_here
```

**3. Install and run:**
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Your portfolio loads from `data/holdings.json` in this repo. Any changes you make (add/edit/delete coins, alerts) are committed back automatically.

## How data sync works

- `data/holdings.json` — your coin holdings and cost basis
- `data/alerts.json` — your price alerts
- `data/history.json` — portfolio value snapshots (written every 30 mins)

Every change commits directly to `main` via the GitHub API. On another device, just set up `.env.local` with the same token and run `npm run dev` — it reads the latest data from the repo.

## Adding a new coin

1. Click **+ Add Coin** in the top right
2. Type the coin name or symbol (e.g. `bitcoin`, `ETH`)
3. Select it from the dropdown
4. Enter your amount and optionally your average buy price (enables P&L column)
5. Click **Save**

## Editing or removing a coin

Hover any row in the table to reveal the edit and delete icons on the right.

## Price alerts

Go to the **Alerts** tab → **Add Alert** → pick a coin, set above/below and a target price. You'll get a browser notification when it triggers.

## Deploying to Netlify

1. Add `VITE_GITHUB_TOKEN` to Netlify → Site Settings → Environment Variables
2. Push to GitHub — Netlify picks up `netlify.toml` and deploys automatically
