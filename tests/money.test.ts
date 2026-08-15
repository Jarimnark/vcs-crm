// Testing priority 4: money arithmetic via decimal.js — no float anywhere.
import { describe, expect, it } from 'vitest'
import { formatMoney, roundMoney, toDecimal, toMoneyString } from '@/lib/money'

describe('money', () => {
  it('survives the float trap: 0.1 + 0.2 === 0.3', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // the reason this module exists
    expect(toMoneyString(toDecimal('0.1').plus(toDecimal('0.2')))).toBe('0.30')
  })

  it('parses NUMERIC strings and thousands-separated input', () => {
    expect(toDecimal('123456.78').toString()).toBe('123456.78')
    expect(toDecimal('1,234,567.89').toString()).toBe('1234567.89')
  })

  it('rejects garbage', () => {
    expect(() => toDecimal('12.34.56')).toThrow()
    expect(() => toDecimal('abc')).toThrow()
    expect(() => toDecimal('')).toThrow()
    expect(() => toDecimal('1e5')).toThrow()
  })

  it('serializes with exactly two decimal places', () => {
    expect(toMoneyString(toDecimal('7'))).toBe('7.00')
    expect(toMoneyString(toDecimal('7.005'))).toBe('7.01') // half-up
    expect(toMoneyString(toDecimal('7.004'))).toBe('7.00')
  })

  it('rounds half-up, the commercial convention', () => {
    expect(roundMoney(toDecimal('2.675')).toString()).toBe('2.68') // floats get 2.67
    expect(roundMoney(toDecimal('-2.675')).toString()).toBe('-2.68')
  })

  it('formats with thousands separators', () => {
    expect(formatMoney('1234567.891')).toBe('1,234,567.89')
    expect(formatMoney('0')).toBe('0.00')
    expect(formatMoney('-1234.5')).toBe('-1,234.50')
  })
})
