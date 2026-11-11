import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Accounts from '../src/pages/Accounts.jsx'

vi.mock('../src/api/accounts.js', () => ({
  createAccount: vi.fn(),
  getAccounts: vi.fn(),
  updateAccount: vi.fn(),
}))

import { createAccount, getAccounts, updateAccount } from '../src/api/accounts.js'

const ACCOUNT_LIST = [
  {
    id: 'cash-id',
    code: '1000',
    name: 'Cash and Bank',
    type: 'asset',
    normalBalance: 'debit',
    parentId: null,
    isActive: true,
    systemRole: 'cash',
  },
  {
    id: 'asset-1',
    code: '1200',
    name: 'Prepaid Expenses',
    type: 'asset',
    normalBalance: 'debit',
    parentId: null,
    isActive: true,
    systemRole: null,
  },
  {
    id: 'expense-1',
    code: '6000',
    name: 'Rent Expense',
    type: 'expense',
    normalBalance: 'debit',
    parentId: null,
    isActive: false,
    systemRole: null,
  },
]

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('Chart of Accounts page', () => {
  it('shows loading while accounts are being requested', () => {
    getAccounts.mockReturnValue(new Promise(() => {}))

    render(<Accounts />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading accounts')
  })

  it('groups accounts by type, displays camelCase fields, and badges system accounts', async () => {
    getAccounts.mockResolvedValue(ACCOUNT_LIST)

    render(<Accounts />)

    expect(await screen.findByRole('heading', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    expect(screen.getByText('Cash and Bank')).toBeInTheDocument()
    expect(screen.getByText('Rent Expense')).toBeInTheDocument()
    expect(screen.getByText('(Inactive)')).toBeInTheDocument()
    expect(screen.getAllByText('debit')).toHaveLength(3)
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Deactivate 1000 Cash and Bank/ })).not.toBeInTheDocument()
  })

  it('filters the visible list to active and inactive accounts', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNT_LIST)
    render(<Accounts />)

    await screen.findByText('Rent Expense')
    await user.selectOptions(screen.getByLabelText('Show'), 'inactive')

    expect(screen.getByText('Rent Expense')).toBeInTheDocument()
    expect(screen.queryByText('Cash and Bank')).not.toBeInTheDocument()
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

  it('shows inline validation errors and prevents an invalid account submission', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue([])
    render(<Accounts />)

    await user.click(screen.getByRole('button', { name: 'Add account' }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Enter a code with 4 to 8 digits.')).toBeInTheDocument()
    expect(screen.getByText('Enter an account name.')).toBeInTheDocument()
    expect(createAccount).not.toHaveBeenCalled()
  })

  it('submits a valid account and omits an empty optional parent', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue([])
    createAccount.mockResolvedValue({
      id: 'new-id', code: '9000', name: 'Clearing', type: 'asset',
      normalBalance: 'debit', parentId: null, isActive: true, systemRole: null,
    })
    render(<Accounts />)

    await user.click(screen.getByRole('button', { name: 'Add account' }))
    await user.type(screen.getByLabelText('Code'), '9000')
    await user.type(screen.getByLabelText('Name'), 'Clearing')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(createAccount).toHaveBeenCalledWith({ code: '9000', name: 'Clearing', type: 'asset' })
    })
  })

  it('shows server validation errors in the form', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue([])
    createAccount.mockRejectedValue(Object.assign(new Error('An account with this code already exists'), {
      details: [{ path: 'body.code', message: 'Code is already in use.' }],
    }))
    render(<Accounts />)

    await user.click(screen.getByRole('button', { name: 'Add account' }))
    await user.type(screen.getByLabelText('Code'), '9000')
    await user.type(screen.getByLabelText('Name'), 'Clearing')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this code already exists')
    expect(screen.getByRole('alert')).toHaveTextContent('Code is already in use.')
    expect(screen.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'true')
  })

  it('requires confirmation before deactivation and applies the confirmed action', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNT_LIST)
    updateAccount.mockResolvedValue({ ...ACCOUNT_LIST[1], isActive: false })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Accounts />)

    await screen.findByText('Prepaid Expenses')
    const deactivate = screen.getByRole('button', { name: 'Deactivate 1200 Prepaid Expenses' })
    await user.click(deactivate)
    expect(window.confirm).toHaveBeenCalled()
    expect(updateAccount).not.toHaveBeenCalled()

    window.confirm.mockReturnValue(true)
    await user.click(deactivate)
    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith('asset-1', { isActive: false })
    })
  })
})
