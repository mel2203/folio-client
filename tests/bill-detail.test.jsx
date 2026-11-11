import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BillDetail from '../src/pages/BillDetail.jsx'
import { AuthContext } from '../src/context/authContext.js'

vi.mock('../src/api/accounts.js', () => ({ getAccounts: vi.fn() }))
vi.mock('../src/api/purchases.js', () => ({ deleteBill: vi.fn(), getBill: vi.fn(), postBill: vi.fn(), recordBillPayment: vi.fn(), voidBill: vi.fn() }))
import { getAccounts } from '../src/api/accounts.js'
import { getBill } from '../src/api/purchases.js'

const BASE_BILL = {
  id: 'bill-1', vendorId: 'vendor-1', billNumber: 'SUP-001', issueDate: '2026-11-01', dueDate: '2026-12-01', total: '100.00', amountPaid: '0.00',
  notes: null, journalEntryId: null, reversalEntryId: null, vendor: { id: 'vendor-1', name: 'Acme Supplies', email: null },
  items: [{ id: 'line-1', description: 'Rent', amount: '100.00', accountId: 'expense-1', accountCode: '6000', accountName: 'Rent', accountType: 'expense' }], payments: [],
}

function renderDetail(status, amountPaid = '0.00') {
  getBill.mockResolvedValue({ ...BASE_BILL, status, amountPaid })
  getAccounts.mockResolvedValue([{ id: 'cash-1', code: '1000', name: 'Cash', type: 'asset', isActive: true }])
  return render(<AuthContext.Provider value={{ company: { name: 'Example Company' } }}><MemoryRouter initialEntries={['/bills/bill-1']}><Routes><Route path="/bills/:id" element={<BillDetail />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('bill detail actions', () => {
  it.each([
    ['draft', '0.00', ['Edit draft', 'Delete draft', 'Post bill'], ['Record payment', 'Void bill']],
    ['open', '0.00', ['Record payment', 'Void bill'], ['Edit draft', 'Delete draft', 'Post bill']],
    ['partial', '50.00', ['Record payment'], ['Edit draft', 'Delete draft', 'Void bill']],
    ['paid', '100.00', [], ['Edit draft', 'Delete draft', 'Record payment', 'Void bill']],
    ['void', '0.00', [], ['Edit draft', 'Delete draft', 'Record payment', 'Void bill']],
  ])('shows only actions allowed for %s bills', async (status, amountPaid, visible, hidden) => {
    renderDetail(status, amountPaid)
    await screen.findAllByRole('heading', { name: 'SUP-001' })
    visible.forEach((label) => {
      const control = label === 'Edit draft' ? screen.getByRole('link', { name: label }) : screen.getByRole('button', { name: label })
      expect(control).toBeInTheDocument()
    })
    hidden.forEach((label) => {
      const control = label === 'Edit draft' ? screen.queryByRole('link', { name: label }) : screen.queryByRole('button', { name: label })
      expect(control).not.toBeInTheDocument()
    })
  })

  it('includes company and bill dates in the printable heading', async () => {
    renderDetail('open')
    expect(await screen.findByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(document.querySelector('.invoice-detail__print-header')).toHaveTextContent('Example Company')
    expect(document.querySelector('.invoice-detail__print-header')).toHaveTextContent('Issue date: 01/11/2026 · Due date: 01/12/2026')
  })
})
