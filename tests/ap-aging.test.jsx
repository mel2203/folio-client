import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApAging from '../src/pages/ApAging.jsx'

vi.mock('../src/api/reports.js', () => ({ getApAging: vi.fn() }))
import { getApAging } from '../src/api/reports.js'

const report = {
  asOf: '2026-11-08', currency: 'MYR',
  vendors: [{ vendorId: 'vendor-1', name: 'Acme Supplies', current: '0.00', days1To30: '100.00', days31To60: '0.00', days61To90: '0.00', days90Plus: '0.00', total: '100.00' }],
  totals: { current: '0.00', days1To30: '100.00', days31To60: '0.00', days61To90: '0.00', days90Plus: '0.00', total: '100.00' },
  ledgerBalance: '100.00', difference: '0.00', reconciles: true,
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('A/P aging report', () => {
  it('shows vendor aging, reconciliation and print action', async () => {
    getApAging.mockResolvedValue(report)
    const print = vi.fn()
    vi.stubGlobal('print', print)
    render(<MemoryRouter initialEntries={['/reports/ap-aging?asOf=2026-11-08']}><ApAging /></MemoryRouter>)
    expect(await screen.findByText('Acme Supplies')).toBeInTheDocument()
    expect(screen.getByText('Aging reconciles to A/P ledger')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalledOnce()
  })

  it('shows a mismatch and refreshes when the as-of date changes', async () => {
    getApAging.mockResolvedValue({ ...report, reconciles: false, difference: '12.00' })
    render(<MemoryRouter initialEntries={['/reports/ap-aging?asOf=2026-11-08']}><ApAging /></MemoryRouter>)
    await screen.findByText('Acme Supplies')
    expect(screen.getByText('Difference: RM 12.00')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-11-09' } })
    await waitFor(() => expect(getApAging).toHaveBeenLastCalledWith({ asOf: '2026-11-09' }))
  })
})
