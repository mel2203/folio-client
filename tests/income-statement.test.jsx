import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IncomeStatement from '../src/pages/IncomeStatement.jsx'

function LocationOutput() {
  const location = useLocation()
  return <p>Current URL: {location.pathname}{location.search}</p>
}

function renderIncomeStatement(path = '/reports/income-statement?from=2026-11-01&to=2026-11-08') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationOutput />
      <IncomeStatement />
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
    from: '2026-11-01',
    to: '2026-11-08',
    currency: 'MYR',
    revenue: {
      accounts: [{ accountId: 'sales-1', code: '4000', name: 'Sales Revenue', amount: '1000.00' }],
      total: '1000.00',
    },
    expenses: {
      accounts: [{ accountId: 'rent-1', code: '6000', name: 'Rent Expense', amount: '300.00' }],
      total: '300.00',
    },
    netIncome: '700.00',
    ...overrides,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('Profit and Loss page', () => {
  it('renders revenue, expenses, totals, and net income from the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleReport())))
    renderIncomeStatement()

    expect(await screen.findByText('Sales Revenue')).toBeInTheDocument()
    expect(screen.getByText('Rent Expense')).toBeInTheDocument()
    expect(screen.getByText('Net income')).toBeInTheDocument()
    expect(screen.getAllByText('RM 1,000.00')).toHaveLength(2)
    expect(screen.getAllByText('RM 300.00')).toHaveLength(2)
  })

  it('shows negative net income as a parenthesized net loss', async () => {
    const report = sampleReport({
      revenue: { accounts: [], total: '0.00' },
      expenses: { accounts: [{ accountId: 'rent-1', code: '6000', name: 'Rent Expense', amount: '1200.00' }], total: '1200.00' },
      netIncome: '-1200.00',
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(report)))
    renderIncomeStatement()

    expect(await screen.findByText('Net loss')).toBeInTheDocument()
    expect(screen.getByText('(RM 1,200.00)')).toBeInTheDocument()
  })

  it('updates the URL and request when a date changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleReport()))
    vi.stubGlobal('fetch', fetchMock)
    renderIncomeStatement()
    await screen.findByText('Sales Revenue')

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-02' } })

    await waitFor(() => {
      expect(screen.getByText('Current URL: /reports/income-statement?from=2026-11-02&to=2026-11-08')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/reports/income-statement?from=2026-11-02&to=2026-11-08'),
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  it('shows range validation and does not request a reversed range', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleReport()))
    vi.stubGlobal('fetch', fetchMock)
    renderIncomeStatement()
    await screen.findByText('Sales Revenue')
    const requestCount = fetchMock.mock.calls.length

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-09' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('From date must be on or before the To date.')
    expect(fetchMock).toHaveBeenCalledTimes(requestCount)
  })

  it('shows loading, empty, and error states', async () => {
    let resolveResponse
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => { resolveResponse = resolve })))
    renderIncomeStatement()
    expect(screen.getByRole('status')).toHaveTextContent('Loading Profit and Loss')
    expect(screen.getByLabelText('From')).toBeDisabled()
    expect(screen.getByLabelText('To')).toBeDisabled()
    resolveResponse(jsonResponse(sampleReport({
      revenue: { accounts: [], total: '0.00' },
      expenses: { accounts: [], total: '0.00' },
      netIncome: '0.00',
    })))
    expect(await screen.findByText('No posted entries in this date range.')).toBeInTheDocument()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 500)))
    renderIncomeStatement()
    expect(await screen.findByRole('alert')).toHaveTextContent('The date is invalid.')
  })
})
