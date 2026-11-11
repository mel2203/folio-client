import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InvoiceForm from '../src/pages/InvoiceForm.jsx'
import { addCalendarDays, getTodayCalendarDate } from '../src/utils/calendar-date.js'

vi.mock('../src/api/accounts.js', () => ({ getAccounts: vi.fn() }))
vi.mock('../src/api/sales.js', () => ({
  createInvoice: vi.fn(),
  getInvoice: vi.fn(),
  listCustomers: vi.fn(),
  updateInvoice: vi.fn(),
}))

import { getAccounts } from '../src/api/accounts.js'
import { createInvoice, listCustomers } from '../src/api/sales.js'

function LocationOutput() {
  const location = useLocation()
  return <p>Route: {location.pathname}</p>
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/invoices/new']}>
      <LocationOutput />
      <Routes>
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/:id" element={<p>Saved invoice details</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.clearAllMocks())

describe('invoice form', () => {
  it('previews rounded totals in cents and sends the item values to the server', async () => {
    getAccounts.mockResolvedValue([{
      id: 'revenue-1', code: '4000', name: 'Sales Revenue', type: 'revenue', isActive: true,
    }])
    listCustomers.mockResolvedValue({ data: [{ id: 'customer-1', name: 'Northwind', paymentTermsDays: 30 }] })
    createInvoice.mockResolvedValue({ id: 'invoice-1' })
    renderForm()

    await screen.findByRole('option', { name: '4000 — Sales Revenue' })
    expect(screen.getByLabelText('Due date')).toHaveValue(addCalendarDays(getTodayCalendarDate(), 30))
    fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Small sale' } })
    fireEvent.change(screen.getByLabelText('Item 1 unit price'), { target: { value: '0.25' } })
    fireEvent.change(screen.getByLabelText('Item 1 tax rate'), { target: { value: '6.00' } })
    fireEvent.change(screen.getByLabelText('Item 1 revenue account'), { target: { value: 'revenue-1' } })

    expect(screen.getByText('Preview only. The server calculates and returns the official totals after saving.')).toBeInTheDocument()
    expect(screen.getByText('RM 0.27')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save draft invoice' }))

    await waitFor(() => expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      items: [{ description: 'Small sale', quantity: '1.00', unitPrice: '0.25', taxRate: '6.00', revenueAccountId: 'revenue-1' }],
    })))
    expect(await screen.findByText('Saved invoice details')).toBeInTheDocument()
  })

  it('shows validation when required item and account fields are missing', async () => {
    getAccounts.mockResolvedValue([])
    listCustomers.mockResolvedValue({ data: [] })
    renderForm()
    await screen.findByRole('button', { name: 'Save draft invoice' })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft invoice' }))
    expect(await screen.findByText('Choose a customer.')).toBeInTheDocument()
    expect(screen.getByText('Enter a description.')).toBeInTheDocument()
  })
})
