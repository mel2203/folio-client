import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/api/client.js'
import JournalDetail from '../src/pages/JournalDetail.jsx'
import JournalNew from '../src/pages/JournalNew.jsx'

vi.mock('../src/api/accounts.js', () => ({
  getAccounts: vi.fn(),
}))

vi.mock('../src/api/journal.js', () => ({
  createJournalEntry: vi.fn(),
  getJournalEntry: vi.fn(),
  listJournalEntries: vi.fn(),
}))

import { getAccounts } from '../src/api/accounts.js'
import { createJournalEntry, getJournalEntry } from '../src/api/journal.js'

const ACCOUNTS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    code: '1000',
    name: 'Cash and Bank',
    type: 'asset',
    normalBalance: 'debit',
    isActive: true,
    parentId: null,
    systemRole: 'cash',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    code: '4000',
    name: 'Sales Revenue',
    type: 'revenue',
    normalBalance: 'credit',
    isActive: true,
    parentId: null,
    systemRole: 'sales_revenue',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    code: '1100',
    name: 'Inactive Receivable',
    type: 'asset',
    normalBalance: 'debit',
    isActive: false,
    parentId: null,
    systemRole: null,
  },
]

function LocationOutput() {
  const location = useLocation()
  return <p>Current route: {location.pathname}</p>
}

function renderJournalNew() {
  return render(
    <MemoryRouter initialEntries={['/journal/new']}>
      <LocationOutput />
      <Routes>
        <Route path="/journal/new" element={<JournalNew />} />
        <Route path="/journal/:id" element={<JournalDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillBalancedEntry(user, { debit = '100.25', credit = debit } = {}) {
  await user.selectOptions(
    screen.getAllByRole('combobox')[0],
    ACCOUNTS[0].id,
  )
  await user.selectOptions(
    screen.getAllByRole('combobox')[1],
    ACCOUNTS[1].id,
  )
  await user.type(screen.getAllByLabelText('Debit (RM)')[0], debit)
  await user.type(screen.getAllByLabelText('Credit (RM)')[1], credit)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('new journal entry form', () => {
  it('keeps submission disabled until at least two active-account lines balance', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    renderJournalNew()

    expect(await screen.findByRole('heading', { name: 'New journal entry' })).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Save journal entry' })
    expect(submit).toBeDisabled()
    expect(screen.queryByRole('option', { name: /Inactive Receivable/ })).not.toBeInTheDocument()

    await fillBalancedEntry(user)

    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getAllByText('RM 100.25')).toHaveLength(2)
    expect(submit).toBeEnabled()
  })

  it('disables submission again when editing one side makes the entry unbalanced', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })
    await fillBalancedEntry(user)
    expect(screen.getByRole('button', { name: 'Save journal entry' })).toBeEnabled()

    const debit = screen.getAllByLabelText('Debit (RM)')[0]
    await user.clear(debit)
    await user.type(debit, '100.24')

    expect(screen.queryByText('Balanced')).not.toBeInTheDocument()
    expect(screen.getByText('Out by RM 0.01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save journal entry' })).toBeDisabled()
  })

  it('clears the opposite amount field when entering an amount', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })
    const credit = screen.getAllByLabelText('Credit (RM)')[0]
    const debit = screen.getAllByLabelText('Debit (RM)')[0]
    await user.type(credit, '5.00')
    await user.type(debit, '1.00')

    expect(debit).toHaveValue('1.00')
    expect(credit).toHaveValue('')
  })

  it('shows an inline error and blocks submission for more than two decimals', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })
    const debit = screen.getAllByLabelText('Debit (RM)')[0]
    await user.type(debit, '1.234')

    expect(screen.getByText('Use digits with up to two decimal places.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save journal entry' })).toBeDisabled()
  })

  it('submits canonical two-decimal strings and shows success on the new detail page', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    createJournalEntry.mockResolvedValue({ id: 'new-entry-id' })
    getJournalEntry.mockResolvedValue({
      id: 'new-entry-id',
      entry_date: '2026-11-07',
      memo: 'Test memo',
      status: 'posted',
      lines: [
        {
          id: 'new-line-1',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          debit: '5000.00',
          credit: '0.00',
          description: 'Cash received',
        },
        {
          id: 'new-line-2',
          accountCode: '4000',
          accountName: 'Sales Revenue',
          debit: '0.00',
          credit: '5000.00',
          description: 'Sales',
        },
      ],
    })
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })
    await user.type(screen.getByLabelText('Memo'), 'Test memo')
    await fillBalancedEntry(user, { debit: '5000', credit: '5000' })
    await user.type(screen.getAllByLabelText('Description')[0], 'Cash received')
    await user.type(screen.getAllByLabelText('Description')[1], 'Sales')
    await user.click(screen.getByRole('button', { name: 'Save journal entry' }))

    expect(await screen.findByText('Journal entry created successfully.')).toBeInTheDocument()
    expect(screen.getByText('Current route: /journal/new-entry-id')).toBeInTheDocument()
    await waitFor(() => {
      expect(createJournalEntry).toHaveBeenCalledWith({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        memo: 'Test memo',
        lines: [
          {
            accountId: ACCOUNTS[0].id,
            debit: '5000.00',
            credit: '0.00',
            description: 'Cash received',
          },
          {
            accountId: ACCOUNTS[1].id,
            debit: '0.00',
            credit: '5000.00',
            description: 'Sales',
          },
        ],
      })
    })
  })

  it('shows server validation details and preserves the form values after a 422', async () => {
    const user = userEvent.setup()
    getAccounts.mockResolvedValue(ACCOUNTS)
    createJournalEntry.mockRejectedValue(new ApiError({
      status: 422,
      code: 'ACCOUNTING_RULE_BROKEN',
      message: 'Total debits must equal total credits',
      details: [{ path: 'lines', message: 'The entry is out of balance.' }],
    }))
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })
    await user.type(screen.getByLabelText('Memo'), 'Keep this memo')
    await fillBalancedEntry(user, { debit: '40.00', credit: '40.00' })
    await user.click(screen.getByRole('button', { name: 'Save journal entry' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Total debits must equal total credits',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('lines: The entry is out of balance.')
    expect(screen.getByLabelText('Memo')).toHaveValue('Keep this memo')
    expect(screen.getAllByLabelText('Debit (RM)')[0]).toHaveValue('40.00')
    expect(screen.getAllByLabelText('Credit (RM)')[1]).toHaveValue('40.00')
  })

  it('does not allow removing lines below two', async () => {
    getAccounts.mockResolvedValue(ACCOUNTS)
    renderJournalNew()

    await screen.findByRole('heading', { name: 'New journal entry' })

    expect(screen.getByRole('button', { name: 'Remove line 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove line 2' })).toBeDisabled()
  })
})
