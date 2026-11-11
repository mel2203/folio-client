import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ArAging from '../src/pages/ArAging.jsx'

vi.mock('../src/api/reports.js', () => ({ getArAging: vi.fn() }))
import { getArAging } from '../src/api/reports.js'

function LocationOutput() {
  const location = useLocation()
  return <p>URL: {location.pathname}{location.search}</p>
}

function response(overrides = {}) {
  return {
    asOf: '2026-11-08', currency: 'MYR',
    customers: [{ customerId: 'customer-1', name: 'Northwind', current: '10.00', days1To30: '100.00', days31To60: '0.00', days61To90: '0.00', days90Plus: '0.00', total: '110.00' }],
    totals: { current: '10.00', days1To30: '100.00', days31To60: '0.00', days61To90: '0.00', days90Plus: '0.00', total: '110.00' },
    ledgerBalance: '110.00', difference: '0.00', reconciles: true,
    ...overrides,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('A/R aging report', () => {
  it('shows customer buckets and a reconciled status', async () => {
    getArAging.mockResolvedValue(response())
    render(<MemoryRouter initialEntries={['/reports/ar-aging?asOf=2026-11-08']}><ArAging /></MemoryRouter>)
    expect(await screen.findByText('Northwind')).toBeInTheDocument()
    expect(screen.getByText('Aging reconciles to A/R ledger')).toBeInTheDocument()
    expect(screen.getAllByText('RM 100.00').length).toBeGreaterThan(0)
  })

  it('shows the mismatch amount and updates the as-of request', async () => {
    getArAging.mockResolvedValue(response({ reconciles: false, difference: '-5.00' }))
    render(<MemoryRouter initialEntries={['/reports/ar-aging?asOf=2026-11-08']}><LocationOutput /><ArAging /></MemoryRouter>)
    await screen.findByText('Northwind')
    expect(screen.getByText('Difference: (RM 5.00)')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-11-09' } })
    await waitFor(() => expect(getArAging).toHaveBeenLastCalledWith({ asOf: '2026-11-09' }))
    expect(screen.getByText('URL: /reports/ar-aging?asOf=2026-11-09')).toBeInTheDocument()
  })

  it('calls print from the Reports print button', async () => {
    getArAging.mockResolvedValue(response())
    const printMock = vi.fn()
    vi.stubGlobal('print', printMock)
    render(<MemoryRouter initialEntries={['/reports/ar-aging?asOf=2026-11-08']}><ArAging /></MemoryRouter>)
    await screen.findByText('Northwind')
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(printMock).toHaveBeenCalledOnce()
  })
})
