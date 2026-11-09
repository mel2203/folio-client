import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'
import { AuthContext } from '../src/context/authContext.js'

function responseFor(url) {
  let data
  if (url.includes('/income-statement')) {
    data = {
      from: '2026-11-01', to: '2026-11-09', currency: 'MYR',
      revenue: { accounts: [], total: '0.00' },
      expenses: { accounts: [], total: '0.00' }, netIncome: '0.00',
    }
  } else if (url.includes('/balance-sheet')) {
    data = {
      asOf: '2026-11-09', currency: 'MYR',
      assets: { accounts: [], total: '0.00' },
      liabilities: { accounts: [], total: '0.00' },
      equity: { accounts: [], currentEarnings: '0.00', total: '0.00' },
      totalLiabilitiesAndEquity: '0.00', isBalanced: true, difference: '0.00',
    }
  } else {
    data = {
      asOf: '2026-11-09', currency: 'MYR', accounts: [],
      totals: { debit: '0.00', credit: '0.00' }, isBalanced: true,
    }
  }
  return { ok: true, status: 200, json: async () => ({ data }) }
}

function renderApp(path) {
  window.history.replaceState({}, '', path)
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

describe('report navigation and print controls', () => {
  it('redirects /reports to Trial Balance and marks Reports active', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve(responseFor(url))))
    renderApp('/reports')

    const trialHeadings = await screen.findAllByRole('heading', { name: 'Trial Balance' })
    expect(trialHeadings.some((heading) => !heading.closest('.reports-print-header'))).toBe(true)
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Trial Balance' })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(window.location.pathname).toBe('/reports/trial-balance'))
  })

  it('navigates among report tabs and calls the browser print dialog', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve(responseFor(url))))
    const printMock = vi.fn()
    vi.stubGlobal('print', printMock)
    renderApp('/reports/trial-balance?asOf=2026-11-09')

    const profitAndLoss = await screen.findByRole('link', { name: 'Profit and Loss' })
    fireEvent.click(profitAndLoss)
    const profitHeadings = await screen.findAllByRole('heading', { name: 'Profit and Loss' })
    expect(profitHeadings.some((heading) => !heading.closest('.reports-print-header'))).toBe(true)
    expect(screen.getByRole('link', { name: 'Profit and Loss' })).toHaveAttribute('aria-current', 'page')
    const printHeader = document.querySelector('.reports-print-header')
    expect(printHeader).toHaveTextContent('Example Company')
    expect(printHeader).toHaveTextContent('Period: 01/11/2026 – 09/11/2026')

    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(printMock).toHaveBeenCalledOnce()
  })
})
