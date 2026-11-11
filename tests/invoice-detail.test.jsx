import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InvoiceDetail from '../src/pages/InvoiceDetail.jsx'
import { AuthContext } from '../src/context/authContext.js'

vi.mock('../src/api/accounts.js', () => ({ getAccounts: vi.fn() }))
vi.mock('../src/api/sales.js', () => ({
  deleteInvoice: vi.fn(),
  getInvoice: vi.fn(),
  recordInvoicePayment: vi.fn(),
  sendInvoice: vi.fn(),
  voidInvoice: vi.fn(),
}))

import { getAccounts } from '../src/api/accounts.js'
import { getInvoice } from '../src/api/sales.js'
const BASE_INVOICE = {
  id: 'invoice-1', customerId: 'customer-1', invoiceNumber: 'INV-0001',
  issueDate: '2026-11-01', dueDate: '2026-12-01', subtotal: '100.00', taxTotal: '6.00', total: '106.00',
  amountPaid: '0.00', notes: null, journalEntryId: 'entry-1', reversalEntryId: null,
  customer: { id: 'customer-1', name: 'Northwind', email: null },
  items: [{ id: 'item-1', description: 'Consulting', quantity: '1.00', unitPrice: '100.00', taxRate: '6.00', revenueAccountId: 'revenue-1', revenueAccountCode: '4000', revenueAccountName: 'Sales Revenue', lineSubtotal: '100.00', lineTax: '6.00', lineTotal: '106.00' }],
  payments: [],
}

function renderDetail(status, amountPaid = '0.00') {
  getInvoice.mockResolvedValue({ ...BASE_INVOICE, status, amountPaid })
  getAccounts.mockResolvedValue([{ id: 'cash-1', code: '1000', name: 'Cash', type: 'asset', isActive: true }])
  return render(
    <AuthContext.Provider value={{ company: { name: 'Example Company' } }}>
      <MemoryRouter initialEntries={['/invoices/invoice-1']}>
        <Routes><Route path="/invoices/:id" element={<InvoiceDetail />} /></Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('invoice detail actions', () => {
  it.each([
    ['draft', '0.00', ['Edit draft', 'Delete draft', 'Send invoice'], ['Record payment', 'Void invoice']],
    ['sent', '0.00', ['Record payment', 'Void invoice'], ['Edit draft', 'Delete draft']],
    ['partial', '50.00', ['Record payment'], ['Edit draft', 'Delete draft', 'Void invoice']],
    ['paid', '106.00', [], ['Edit draft', 'Delete draft', 'Record payment', 'Void invoice']],
    ['void', '0.00', [], ['Edit draft', 'Delete draft', 'Record payment', 'Void invoice']],
  ])('shows only actions allowed for %s invoices', async (status, amountPaid, visible, hidden) => {
    renderDetail(status, amountPaid)
    await screen.findAllByRole('heading', { name: 'INV-0001' })
    visible.forEach((label) => {
      const query = label === 'Edit draft' ? screen.getByRole('link', { name: label }) : screen.getByRole('button', { name: label })
      expect(query).toBeInTheDocument()
    })
    hidden.forEach((label) => {
      const query = label === 'Edit draft' ? screen.queryByRole('link', { name: label }) : screen.queryByRole('button', { name: label })
      expect(query).not.toBeInTheDocument()
    })
  })

  it('calls the browser print dialog from the invoice print button', async () => {
    renderDetail('sent')
    const printMock = vi.fn()
    vi.stubGlobal('print', printMock)
    await screen.findByRole('button', { name: 'Print' })
    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(printMock).toHaveBeenCalledOnce()
    expect(document.querySelector('.invoice-detail__print-header')).toHaveTextContent('Example Company')
    expect(document.querySelector('.invoice-detail__print-header')).toHaveTextContent('Issue date: 01/11/2026 · Due date: 01/12/2026')
  })
})
