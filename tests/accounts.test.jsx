import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Accounts from '../src/pages/Accounts.jsx'

vi.mock('../src/api/accounts.js', () => ({
  getAccounts: vi.fn(),
}))

import { getAccounts } from '../src/api/accounts.js'

afterEach(() => {
  vi.clearAllMocks()
})

describe('Chart of Accounts page', () => {
  it('shows loading while accounts are being requested', () => {
    getAccounts.mockReturnValue(new Promise(() => {}))

    render(<Accounts />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading accounts')
  })

  it('groups accounts by type and identifies inactive accounts', async () => {
    getAccounts.mockResolvedValue([
      {
        id: 'asset-1',
        code: '1000',
        name: 'Cash and Bank',
        type: 'asset',
        normal_balance: 'debit',
        is_active: true,
      },
      {
        id: 'expense-1',
        code: '6000',
        name: 'Rent Expense',
        type: 'expense',
        normal_balance: 'debit',
        is_active: false,
      },
    ])

    render(<Accounts />)

    expect(await screen.findByRole('heading', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    expect(screen.getByText('Cash and Bank')).toBeInTheDocument()
    expect(screen.getByText('Rent Expense')).toBeInTheDocument()
    expect(screen.getByText('(Inactive)')).toBeInTheDocument()
    expect(screen.getAllByText('debit')).toHaveLength(2)
  })

  it('shows the empty state when there are no accounts', async () => {
    getAccounts.mockResolvedValue([])

    render(<Accounts />)

    expect(await screen.findByText('No accounts found.')).toBeInTheDocument()
  })

  it('shows the server error when loading accounts fails', async () => {
    getAccounts.mockRejectedValue(new Error('Cannot reach the server'))

    render(<Accounts />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })

  it('shows an error instead of treating an invalid response as an empty list', async () => {
    getAccounts.mockResolvedValue({ accounts: [] })

    render(<Accounts />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server returned an invalid accounts response.',
    )
  })
})
