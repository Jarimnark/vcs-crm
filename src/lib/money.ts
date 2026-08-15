// The ONLY place money is parsed or formatted (docs/03-tech-stack.md §7).
//
// G3: NUMERIC arrives from Drizzle as a string, deliberately. Money stays a
// string from the database, enters Decimal for arithmetic, and is formatted
// for display. Never parseFloat, never Number(), never arithmetic on the raw
// string. `mode: 'number'` is banned on every money column.
import Decimal from 'decimal.js'

// Half-up is the commercial rounding convention on Thai quotations.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export type MoneyString = string

const MONEY_RE = /^-?\d+(\.\d+)?$/

/** Parse a database NUMERIC string (or user input) into a Decimal. */
export function toDecimal(value: MoneyString | Decimal): Decimal {
  if (value instanceof Decimal) return value
  const trimmed = value.trim().replace(/,/g, '')
  if (!MONEY_RE.test(trimmed)) {
    throw new Error(`Not a valid money value: ${JSON.stringify(value)}`)
  }
  return new Decimal(trimmed)
}

/** Serialize for a NUMERIC(15,2) column — always two decimal places. */
export function toMoneyString(value: Decimal): MoneyString {
  return value.toDecimalPlaces(2).toFixed(2)
}

/** Round to two decimal places, staying in Decimal. */
export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2)
}

/**
 * Format for display: thousands separators, two decimals — `1,234,567.89`.
 * The quotation PDF and every screen use this one formatter, so the browser
 * preview and the server-rendered document can never disagree on rounding.
 */
export function formatMoney(value: MoneyString | Decimal): string {
  const d = toDecimal(value).toDecimalPlaces(2)
  const [int, frac] = d.abs().toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${d.isNegative() ? '-' : ''}${grouped}.${frac}`
}

export { Decimal }
