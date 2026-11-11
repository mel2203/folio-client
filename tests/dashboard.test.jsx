import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'
import { AuthContext } from '../src/context/authContext.js'

const summary = {
  asOf: '2026-11-11',
  currency: 'MYR',
  balances: {
    cash: '1025.00',
    accountsReceivable: '81.00',
    accountsPayable: '40.00',
  },
  netIncomeThisMonth: '60.00',
  monthlyPerformance: [
    { month: '2026-06', revenue: '0.00', expenses: '0.00' },
    { month: '2026-07', revenue: '0.00', expenses: '0.00' },
    { month: '2026-08', revenue: '0.00', expenses: '0.00' },
    { month: '2026-09', revenue: '0.00', expenses: '0.00' },
    { month: '2026-10', revenue: '0.00', expenses: '0.00' },
    { month: '2026-11', revenue: '100.00', expenses: '40.00' },
  ],
  overdueInvoices: { count: 1, amount: '81.00' },
  topCustomers: [
    { customerId: 'customer-1', name: 'Northstar Studio', invoicedAmount: '106.00' },
  ],
  topExpenseAccounts: [
    { accountId: 'expense-1', code: '6000', name: 'Rent Expense', amount: '40.00' },
  ],
}

const overdueInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-0001',
  customerName: 'Northstar Studio',
  issueDate: '2026-10-01',
  dueDate: '2026-10-31',
  status: 'sent',
  total: '81.00',
  amountPaid: '0.00',
}

function jsonResponse(data, meta) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data, ...(meta ? { meta } : {}) }),
  }
}

function renderDashboard() {
  window.history.replaceState({}, '', '/dashboard')
  return render(
    <AuthContext.Provider value={{
      user: { fullName: 'Test User' },
      company: { name: 'Example Company' },
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    }}>
      <App />
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('dashboard page', () => {
  it('renders the server summary, overdue invoices, and chart text alternative', async () => {
    const fetchMock = vi.fn((url) => {
      if (String(url).includes('/api/dashboard/summary')) return Promise.resolve(jsonResponse(summary))
      if (String(url).includes('status=partial')) {
        return Promise.resolve(jsonResponse([], { page: 1, limit: 100, total: 0 }))
      }
      return Promise.resolve(jsonResponse([overdueInvoice], { page: 1, limit: 100, total: 1 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    const invoiceLinks = await screen.findAllByRole('link', { name: /INV-0001/ })
    expect(invoiceLinks[0]).toHaveAttribute('href', '/invoices/invoice-1')
    expect(screen.getByText('RM 1,025.00')).toBeInTheDocument()
    expect(screen.getAllByText(/Northstar Studio/)).toHaveLength(2)
    expect(screen.getByText('Rent Expense')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Revenue and expenses by month' })).toBeInTheDocument()
    expect(document.title).toBe('Dashboard | Folio')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard/summary'),
      expect.any(Object),
    )
    expect(fetchMock.mock.calls[0][0]).not.toContain('asOf=')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('Dashboard updated.')).toBeInTheDocument()
  })

  it('shows a loading skeleton while requests are pending', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderDashboard()

    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard')
  })

  it('shows a clear empty state when all monthly totals are zero', async () => {
    const emptySummary = {
      ...summary,
      balances: { cash: '0.00', accountsReceivable: '0.00', accountsPayable: '0.00' },
      netIncomeThisMonth: '0.00',
      monthlyPerformance: summary.monthlyPerformance.map((month) => ({
        ...month,
        revenue: '0.00',
        expenses: '0.00',
      })),
      overdueInvoices: { count: 0, amount: '0.00' },
      topCustomers: [],
      topExpenseAccounts: [],
    }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(emptySummary))))
    renderDashboard()

    expect(await screen.findByText('No posted revenue or expenses for this period.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /bar chart/i })).not.toBeInTheDocument()
  })

  it('shows an accessible error and retries the failed summary request', async () => {
    let failSummary = true
    const fetchMock = vi.fn((url) => {
      if (String(url).includes('/api/dashboard/summary') && failSummary) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: { code: 'SERVER_ERROR', message: 'Unavailable' } }),
        })
      }
      if (String(url).includes('/api/dashboard/summary')) return Promise.resolve(jsonResponse(summary))
      return Promise.resolve(jsonResponse([], { page: 1, limit: 100, total: 0 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    expect(await screen.findByText('Dashboard unavailable.')).toBeInTheDocument()
    failSummary = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('RM 1,025.00')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
  })
})
