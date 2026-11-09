import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TrialBalance from '../src/pages/TrialBalance.jsx'

function LocationOutput() {
  const location = useLocation()
  return <p>Current URL: {location.pathname}{location.search}</p>
}

function renderTrialBalance(path = '/reports/trial-balance?asOf=2026-11-08') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationOutput />
      <TrialBalance />
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

function balancedReport(overrides = {}) {
  return {
    asOf: '2026-11-08',
    currency: 'MYR',
    accounts: [
      { accountId: 'cash-1', code: '1000', name: 'Cash and Bank', type: 'asset', debit: '4700.00', credit: '0.00' },
      { accountId: 'capital-1', code: '3000', name: "Owner's Capital", type: 'equity', debit: '0.00', credit: '4700.00' },
    ],
    totals: { debit: '4700.00', credit: '4700.00' },
    isBalanced: true,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Trial Balance page', () => {
  it('renders account figures and the balanced chip from the API response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(balancedReport()))
    vi.stubGlobal('fetch', fetchMock)

    renderTrialBalance()

    expect(await screen.findByText('Cash and Bank')).toBeInTheDocument()
    expect(screen.getAllByText('RM 4,700.00')).toHaveLength(4)
    expect(screen.getByText('Debits = Credits')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Debit' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Credit' })).toBeInTheDocument()
  })

  it('shows a mismatch chip with the absolute difference', async () => {
    const report = balancedReport({
      totals: { debit: '4.00', credit: '3.00' },
      isBalanced: false,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(report)))

    renderTrialBalance()

    expect(await screen.findByText('Difference: RM 1.00')).toBeInTheDocument()
  })

  it('sends a changed date and keeps it in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(balancedReport()))
    vi.stubGlobal('fetch', fetchMock)
    renderTrialBalance()
    await screen.findByText('Cash and Bank')

    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-11-09' } })

    await waitFor(() => {
      expect(screen.getByText('Current URL: /reports/trial-balance?asOf=2026-11-09')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/reports/trial-balance?asOf=2026-11-09'),
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  it('disables the date control while loading and shows the empty state', async () => {
    let resolveResponse
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => { resolveResponse = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    renderTrialBalance()

    expect(screen.getByRole('status')).toHaveTextContent('Loading trial balance')
    expect(screen.getByLabelText('As of')).toBeDisabled()
    resolveResponse(jsonResponse(balancedReport({ accounts: [] })))

    expect(await screen.findByText('No posted entries up to this date.')).toBeInTheDocument()
  })

  it('shows API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 400)))

    renderTrialBalance('/reports/trial-balance?asOf=2026-02-30')

    expect(await screen.findByRole('alert')).toHaveTextContent('The date is invalid.')
  })
})
