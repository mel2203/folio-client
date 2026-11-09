import { describe, expect, it } from 'vitest'
import {
  centsToAmount,
  formatMoney,
  formatMoneyString,
  parseAmountToCents,
} from '../src/utils/money.js'

describe('money helpers', () => {
  it('converts amount strings to integer cents and back', () => {
    expect(parseAmountToCents('1356.80')).toBe(135680n)
    expect(centsToAmount(135680n)).toBe('1356.80')
  })

  it('formats amounts with RM and thousands separators', () => {
    expect(formatMoney(135680n)).toBe('RM 1,356.80')
    expect(formatMoney(99n)).toBe('RM 0.99')
    expect(formatMoney(-12000n)).toBe('(RM 120.00)')
    expect(formatMoney(-123456789n)).toBe('(RM 1,234,567.89)')
    expect(formatMoneyString('-1234567.89')).toBe('(RM 1,234,567.89)')
  })

  it('adds awkward decimal amounts exactly in cents', () => {
    const total = parseAmountToCents('0.1') + parseAmountToCents('0.2')

    expect(total).toBe(30n)
    expect(formatMoney(total)).toBe('RM 0.30')
  })

  it('rejects amounts with more than two decimal places', () => {
    expect(() => parseAmountToCents('12.345')).toThrow(TypeError)
  })

  it('rejects non-string amounts and non-integer-cent formatting inputs', () => {
    expect(() => parseAmountToCents(12)).toThrow(TypeError)
    expect(() => centsToAmount(12)).toThrow(TypeError)
  })
})
