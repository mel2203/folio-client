import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBalanceSheet, getIncomeStatement, getTrialBalance } from '../src/api/reports.js'

function jsonResponse(data) {
  return { ok: true, status: 200, json: async () => ({ data }) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('report API functions', () => {
  it('requests a trial balance with its asOf date and unwraps data', async () => {
    const data = { asOf: '2026-11-08', accounts: [], totals: { debit: '0.00', credit: '0.00' } }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(data))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTrialBalance({ asOf: '2026-11-08' })).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/trial-balance?asOf=2026-11-08'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('requests an income statement with inclusive from and to parameters', async () => {
    const data = { from: '2026-11-01', to: '2026-11-08', netIncome: '0.00' }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(data))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getIncomeStatement({ from: data.from, to: data.to })).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/income-statement?from=2026-11-01&to=2026-11-08'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('requests a balance sheet and omits a query string when no date is supplied', async () => {
    const data = { asOf: '2026-11-08', assets: { accounts: [], total: '0.00' } }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(data))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getBalanceSheet()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/balance-sheet'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
