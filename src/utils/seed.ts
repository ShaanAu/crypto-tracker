import type { Holding } from '../types'

const img = (id: string) => `https://assets.coingecko.com/coins/images/${id}/small/thumb.png`

export const SEED_HOLDINGS: Holding[] = [
  { id: 'dogecoin',    symbol: 'DOGE', name: 'Dogecoin',       amount: 183680.07, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche',      amount: 1627.72,   image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink',   symbol: 'LINK', name: 'Chainlink',      amount: 1325.24,   image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  { id: 'fetch-ai',    symbol: 'FET',  name: 'Fetch.ai',       amount: 8255.17,   image: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg' },
  { id: 'ripple',      symbol: 'XRP',  name: 'XRP',            amount: 561.57,    image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'sui',         symbol: 'SUI',  name: 'Sui',            amount: 854.5,     image: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg' },
  { id: 'bittensor',   symbol: 'TAO',  name: 'Bittensor',      amount: 3.205,     image: 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg' },
  { id: 'near',        symbol: 'NEAR', name: 'NEAR Protocol',  amount: 566.5,     image: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg' },
]

// suppress unused warning
void img
