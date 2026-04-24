import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Currency = 'usd' | 'gbp'

interface CurrencyCtx {
  currency: Currency
  gbpRate: number | null
  toggle: () => void
  format: (usdValue: number, decimals?: number) => string
  symbol: string
}

const CurrencyContext = createContext<CurrencyCtx | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('usd')
  const [gbpRate, setGbpRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => setGbpRate(d?.rates?.GBP ?? null))
      .catch(() => {})
  }, [])

  const toggle = () => setCurrency(c => c === 'usd' ? 'gbp' : 'usd')
  const symbol = currency === 'gbp' ? '£' : '$'

  const format = (usdValue: number, decimals = 2): string => {
    const value = currency === 'gbp' && gbpRate ? usdValue * gbpRate : usdValue
    const locale = currency === 'gbp' ? 'en-GB' : 'en-US'
    const curr   = currency === 'gbp' ? 'GBP' : 'USD'

    // Values >= $1 (prices, P&L, totals): use `decimals` places (default 2)
    // Values < $1 (sub-dollar coin prices): allow up to 6 decimal places
    if (Math.abs(value) >= 1) {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency: curr,
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }).format(value)
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: curr,
      minimumFractionDigits: 2, maximumFractionDigits: 6,
    }).format(value)
  }

  return (
    <CurrencyContext.Provider value={{ currency, gbpRate, toggle, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
