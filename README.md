# Crypto Portfolio Tracker

Personal crypto portfolio tracker with live prices, P&L tracking, historical charts, and price alerts. Data persists in Supabase so it syncs across devices.

## Running locally

**1. Create a `.env.local` file in the project root:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
See [Supabase setup](#supabase-setup) below for where to get these values.

**2. Install and run:**
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with Google.

---

## Supabase setup

Do this once before running the app.

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a new project, and note your **Project URL** and **anon public key** from Settings → API.

### 2. Create the database tables
In Supabase → SQL Editor, run:

```sql
create table holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  coin_id text not null,
  symbol text not null,
  name text not null,
  amount numeric not null,
  cost_basis_usd numeric,
  created_at timestamptz default now(),
  unique(user_id, coin_id)
);
alter table holdings enable row level security;
create policy "own holdings" on holdings for all using (auth.uid() = user_id);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  coin_id text not null,
  symbol text not null,
  direction text not null check (direction in ('above', 'below')),
  target_price numeric not null,
  enabled boolean default true,
  triggered boolean default false,
  created_at timestamptz default now()
);
alter table alerts enable row level security;
create policy "own alerts" on alerts for all using (auth.uid() = user_id);

create table history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  timestamp bigint not null,
  total_value_usd numeric not null,
  created_at timestamptz default now()
);
alter table history enable row level security;
create policy "own history" on history for all using (auth.uid() = user_id);
```

### 3. Enable Google OAuth
In Supabase → Authentication → Providers → Google:
- Enable it
- Add your Google OAuth **Client ID** and **Client Secret** (from [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials)
- In Google Cloud, add `https://your-project.supabase.co/auth/v1/callback` as an authorised redirect URI

### 4. Set allowed redirect URLs
In Supabase → Authentication → URL Configuration:
- Site URL: `http://localhost:5173` (for local dev)
- Add `https://your-netlify-url.netlify.app` when you deploy

---

## Adding a new coin

1. Click **+ Add Coin** in the top right
2. Type the coin name or symbol (e.g. `bitcoin`, `ETH`, `solana`)
3. Select it from the dropdown
4. Enter your amount and optionally your average buy price (enables P&L)
5. Click **Save**

## Editing or removing a coin

Hover any row in the table to reveal the edit and delete icons on the right.

## Price alerts

Go to the **Alerts** tab → **Add Alert** → pick a coin, set above/below and a target price. You'll get a browser notification when it triggers.

## Deploying to Netlify

1. Push to GitHub
2. Connect the repo in Netlify — it picks up `netlify.toml` automatically
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Netlify → Site Settings → Environment Variables
4. Add your Netlify URL to Supabase's allowed redirect URLs (see step 4 above)
