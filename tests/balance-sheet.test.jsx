import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BalanceSheet from '../src/pages/BalanceSheet.jsx'

function LocationOutput() {
  const location = useLocation()
  return <p>Current URL: {location.pathname}{location.search}</p>
}

function renderBalanceSheet(path = '/reports/balance-sheet?asOf=2026-11-08') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationOutput />
      <BalanceSheet />
    </MemoryRouter>,
  )
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => status >= 400
      ? { error: { code: 'VALIDATION_ERROR', message: 'The date is invalid.' } }
      : { data },
  }
}

function sampleReport(overrides = {}) {
  return {
    asOf: '2026-11-08',
    currency: 'MYR',
    assets: {
      accounts: [{ accountId: 'cash-1', code: '1000', name: 'Cash and Bank', amount: '4700.00' }],
      total: '4700.00',
    },
    liabilities: { accounts: [], total: '0.00' },
    equity: {
      accounts: [{ accountId: 'capital-1', code: '3000', name: "Owner's Capital", amount: '4000.00' }],
      currentEarnings: '700.00',
      total: '4700.00',
    },
    totalLiabilitiesAndEquity: '4700.00',
    isBalanced: true,
    difference: '0.00',
    ...overrides,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('Balance Sheet page', () => {
  it('renders asset and equity figures with the balanced chip', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleReport())))
    renderBalanceSheet()

    expect(await screen.findByText('Cash and Bank')).toBeInTheDocument()
    expect(screen.getByText('Current earnings')).toBeInTheDocument()
    expect(screen.getByText('Assets = Liabilities + Equity')).toBeInTheDocument()
    expect(screen.getAllByText('RM 4,700.00')).toHaveLength(5)
  })

  it('shows the mismatch chip and its signed difference', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleReport({
      isBalanced: false,
      difference: '-120.00',
    }))))
    renderBalanceSheet()

    expect(await screen.findByText('Difference: (RM 120.00)')).toBeInTheDocument()
  })

  it('updates the as-of request and URL when the date changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleReport()))
    vi.stubGlobal('fetch', fetchMock)
    renderBalanceSheet()
    await screen.findByText('Cash and Bank')

    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-11-09' } })

    await waitFor(() => {
      expect(screen.getByText('Current URL: /reports/balance-sheet?asOf=2026-11-09')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/reports/balance-sheet?asOf=2026-11-09'),
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  it('shows loading, empty, and error states', async () => {
    let resolveResponse
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => { resolveResponse = resolve })))
    renderBalanceSheet()
    expect(screen.getByRole('status')).toHaveTextContent('Loading balance sheet')
    expect(screen.getByLabelText('As of')).toBeDisabled()
    resolveResponse(jsonResponse(sampleReport({
      assets: { accounts: [], total: '0.00' },
      liabilities: { accounts: [], total: '0.00' },
      equity: { accounts: [], currentEarnings: '0.00', total: '0.00' },
      totalLiabilitiesAndEquity: '0.00',
      difference: '0.00',
    })))
    expect(await screen.findByText('No posted entries up to this date.')).toBeInTheDocument()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 500)))
    renderBalanceSheet()
    expect(await screen.findByRole('alert')).toHaveTextContent('The date is invalid.')
  })
})
