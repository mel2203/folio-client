import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BillForm from '../src/pages/BillForm.jsx'
import { addCalendarDays, getTodayCalendarDate } from '../src/utils/calendar-date.js'

vi.mock('../src/api/accounts.js', () => ({ getAccounts: vi.fn() }))
vi.mock('../src/api/purchases.js', () => ({ createBill: vi.fn(), getBill: vi.fn(), listVendors: vi.fn(), updateBill: vi.fn() }))
import { getAccounts } from '../src/api/accounts.js'
import { createBill, listVendors } from '../src/api/purchases.js'

afterEach(() => vi.clearAllMocks())

describe('bill form', () => {
  it('previews the sum in cents and sends bill items to the server', async () => {
    getAccounts.mockResolvedValue([{ id: 'expense-1', code: '6000', name: 'Rent', type: 'expense', isActive: true }])
    listVendors.mockResolvedValue({ data: [{ id: 'vendor-1', name: 'Acme Supplies', paymentTermsDays: 30 }] })
    createBill.mockResolvedValue({ id: 'bill-1' })
    render(<MemoryRouter initialEntries={['/bills/new']}><Routes><Route path="/bills/new" element={<BillForm />} /><Route path="/bills/:id" element={<p>Saved bill</p>} /></Routes></MemoryRouter>)
    await screen.findByRole('option', { name: '6000 — Rent' })
    expect(screen.getByLabelText('Due date')).toHaveValue(addCalendarDays(getTodayCalendarDate(), 30))
    fireEvent.change(screen.getByLabelText('Bill number'), { target: { value: 'SUP-001' } })
    fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Office rent' } })
    fireEvent.change(screen.getByLabelText('Item 1 amount'), { target: { value: '0.10' } })
    fireEvent.change(screen.getByLabelText('Item 1 account'), { target: { value: 'expense-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add line' }))
    fireEvent.change(screen.getByLabelText('Item 2 description'), { target: { value: 'Supplies' } })
    fireEvent.change(screen.getByLabelText('Item 2 amount'), { target: { value: '0.20' } })
    fireEvent.change(screen.getByLabelText('Item 2 account'), { target: { value: 'expense-1' } })
    expect(screen.getByText('RM 0.30')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save draft bill' }))
    await waitFor(() => expect(createBill).toHaveBeenCalledWith(expect.objectContaining({
      vendorId: 'vendor-1', billNumber: 'SUP-001',
      items: [{ description: 'Office rent', amount: '0.10', accountId: 'expense-1' }, { description: 'Supplies', amount: '0.20', accountId: 'expense-1' }],
    })))
    expect(await screen.findByText('Saved bill')).toBeInTheDocument()
  })

  it('validates missing vendor, number and item details', async () => {
    getAccounts.mockResolvedValue([])
    listVendors.mockResolvedValue({ data: [] })
    render(<MemoryRouter><BillForm /></MemoryRouter>)
    await screen.findByRole('button', { name: 'Save draft bill' })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft bill' }))
    expect(await screen.findByText('Choose a vendor.')).toBeInTheDocument()
    expect(screen.getByText('Enter a bill number.')).toBeInTheDocument()
    expect(screen.getByText('Choose an active expense or asset account.')).toBeInTheDocument()
  })
})
