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
import JournalList from '../src/pages/JournalList.jsx'

vi.mock('../src/api/journal.js', () => ({
  getJournalEntry: vi.fn(),
  listJournalEntries: vi.fn(),
}))

import { getJournalEntry, listJournalEntries } from '../src/api/journal.js'

const ENTRY = {
  id: 'entry-1',
  entry_date: '2026-11-07',
  memo: 'Office rent',
  status: 'posted',
}

function LocationOutput() {
  const location = useLocation()
  return <p>Current URL: {location.pathname}{location.search}</p>
}

function renderJournal(initialEntry = '/journal') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationOutput />
      <Routes>
        <Route path="/journal" element={<JournalList />} />
        <Route path="/journal/:id" element={<JournalDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('journal entries list', () => {
  it('shows entries, omits the unsupported amount column, and opens an entry row', async () => {
    listJournalEntries.mockResolvedValue({
      data: [ENTRY],
      meta: { page: 1, limit: 20, total: 1 },
    })
    getJournalEntry.mockResolvedValue({
      ...ENTRY,
      lines: [
        {
          id: 'line-1',
          accountCode: '6000',
          accountName: 'Rent Expense',
          debit: '500.00',
          credit: '0.00',
          description: 'November rent',
        },
        {
          id: 'line-2',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          debit: '0.00',
          credit: '500.00',
          description: 'November rent',
        },
      ],
    })

    renderJournal()

    expect(await screen.findByText('Office rent')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Amount' })).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-1 of 1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Open journal entry: Office rent' }))

    expect(await screen.findByRole('heading', { name: 'Journal entry' })).toBeInTheDocument()
    expect(screen.getByText('6000 — Rent Expense')).toBeInTheDocument()
    expect(screen.getAllByText('RM 500.00')).toHaveLength(4)
    expect(screen.getByText('Debits = Credits')).toBeInTheDocument()
  })

  it('loads URL filters and applies changed filters to the URL and API query', async () => {
    const user = userEvent.setup()
    listJournalEntries.mockResolvedValue({
      data: [ENTRY],
      meta: { page: 1, limit: 20, total: 1 },
    })

    renderJournal('/journal?from=2026-11-01&to=2026-11-30&status=posted&page=2')

    expect(await screen.findByText('Office rent')).toBeInTheDocument()
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-30')
    expect(screen.getByLabelText('Status')).toHaveValue('posted')
    expect(listJournalEntries).toHaveBeenCalledWith({
      from: '2026-11-01',
      to: '2026-11-30',
      status: 'posted',
      page: 2,
      limit: 20,
    })

    await user.selectOptions(screen.getByLabelText('Status'), 'void')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      expect(screen.getByText(
        'Current URL: /journal?from=2026-11-01&to=2026-11-30&status=void&page=1&limit=20',
      )).toBeInTheDocument()
    })
    expect(listJournalEntries).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-30',
      status: 'void',
      page: 1,
      limit: 20,
    })
  })

  it('uses server pagination metadata and keeps filters when changing pages', async () => {
    listJournalEntries.mockImplementation(({ page, limit }) => Promise.resolve({
      data: [ENTRY],
      meta: { page, limit, total: 21 },
    }))

    renderJournal('/journal?status=posted&page=1')

    expect(await screen.findByText('Showing 1-20 of 21')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Showing 21-21 of 21')).toBeInTheDocument()
    expect(screen.getByText('Current URL: /journal?status=posted&page=2&limit=20')).toBeInTheDocument()
    expect(listJournalEntries).toHaveBeenLastCalledWith({
      from: '',
      to: '',
      status: 'posted',
      page: 2,
      limit: 20,
    })
  })

  it('shows loading, empty, and error states', async () => {
    listJournalEntries.mockReturnValueOnce(new Promise(() => {}))
    const { unmount } = renderJournal()
    expect(screen.getByRole('status')).toHaveTextContent('Loading journal entries')
    unmount()

    listJournalEntries.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    })
    renderJournal()
    expect(await screen.findByText('No journal entries found.')).toBeInTheDocument()
  })

  it('shows list request errors', async () => {
    listJournalEntries.mockRejectedValue(new Error('Cannot reach the server'))

    renderJournal()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })
})

describe('journal entry detail', () => {
  it('adds decimal strings using integer cents for the totals row', async () => {
    getJournalEntry.mockResolvedValue({
      ...ENTRY,
      lines: [
        {
          id: 'line-1',
          accountCode: '1000',
          accountName: 'Cash and Bank',
          debit: '0.1',
          credit: '0.00',
          description: 'First part',
        },
        {
          id: 'line-2',
          accountCode: '1100',
          accountName: 'Accounts Receivable',
          debit: '0.2',
          credit: '0.00',
          description: 'Second part',
        },
        {
          id: 'line-3',
          accountCode: '4000',
          accountName: 'Sales Revenue',
          debit: '0.00',
          credit: '0.3',
          description: 'Revenue',
        },
      ],
    })

    renderJournal('/journal/entry-1')

    expect(await screen.findByText('Debits = Credits')).toBeInTheDocument()
    expect(screen.getAllByText('RM 0.30')).toHaveLength(3)
    expect(screen.getByText('First part')).toBeInTheDocument()
  })

  it('shows a friendly not-found message for a 404 response', async () => {
    getJournalEntry.mockRejectedValue(new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Journal entry not found',
      details: null,
    }))

    renderJournal('/journal/missing')

    expect(await screen.findByText('Journal entry not found.')).toBeInTheDocument()
  })

  it('shows the detail loading state', () => {
    getJournalEntry.mockReturnValue(new Promise(() => {}))

    renderJournal('/journal/entry-1')

    expect(screen.getByRole('status')).toHaveTextContent('Loading journal entry')
  })
})
