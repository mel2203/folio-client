import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { listJournalEntries } from '../api/journal.js'
import Pagination from '../components/Pagination.jsx'
import StatusChip from '../components/StatusChip.jsx'
import './Journal.css'

const PAGE_SIZE = 20
const VALID_STATUSES = new Set(['posted', 'void'])

function readPage(value) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function JournalList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryString = searchParams.toString()
  const page = readPage(searchParams.get('page'))
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const queryStatus = searchParams.get('status') ?? ''
  const status = VALID_STATUSES.has(queryStatus) ? queryStatus : ''

  const requestKey = JSON.stringify({ from, to, status, page })
  const [responseState, setResponseState] = useState(null)
  const currentResponse = responseState?.key === requestKey ? responseState : null
  const isLoading = currentResponse === null
  const entries = currentResponse?.entries ?? []
  const meta = currentResponse?.meta ?? null
  const error = currentResponse?.error ?? ''

  useEffect(() => {
    let isMounted = true

    listJournalEntries({
      from,
      to,
      status,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (
          !Array.isArray(result?.data)
          || !result.meta
          || !Number.isInteger(result.meta.page)
          || !Number.isInteger(result.meta.limit)
          || !Number.isInteger(result.meta.total)
        ) {
          throw new Error('The server returned an invalid journal entries response.')
        }

        if (isMounted) {
          setResponseState({
            key: requestKey,
            entries: result.data,
            meta: result.meta,
            error: '',
          })
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setResponseState({
            key: requestKey,
            entries: [],
            meta: null,
            error: requestError.message || 'Unable to load journal entries.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [from, to, status, page, requestKey])

  function applyFilters(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextParams = new URLSearchParams()
    const nextFrom = formData.get('from')
    const nextTo = formData.get('to')
    const nextStatus = formData.get('status')
    if (nextFrom) nextParams.set('from', nextFrom)
    if (nextTo) nextParams.set('to', nextTo)
    if (nextStatus) nextParams.set('status', nextStatus)
    nextParams.set('page', '1')
    nextParams.set('limit', String(PAGE_SIZE))
    setSearchParams(nextParams)
  }

  function changePage(nextPage) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(nextPage))
    nextParams.set('limit', String(PAGE_SIZE))
    setSearchParams(nextParams)
  }

  function openEntry(entryId) {
    navigate(`/journal/${encodeURIComponent(entryId)}`, {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  return (
    <section className="journal-page">
      <header className="journal-page__header">
        <div>
          <h1>Journal entries</h1>
          <p>Review your company&apos;s posted journal entries.</p>
        </div>
        <Link className="journal-primary-link" to="/journal/new">New entry</Link>
      </header>

      <form className="journal-filters" key={queryString} onSubmit={applyFilters}>
        <div className="journal-filter">
          <label htmlFor="journal-from">From</label>
          <input
            id="journal-from"
            name="from"
            type="date"
            defaultValue={from}
          />
        </div>
        <div className="journal-filter">
          <label htmlFor="journal-to">To</label>
          <input
            id="journal-to"
            name="to"
            type="date"
            defaultValue={to}
          />
        </div>
        <div className="journal-filter">
          <label htmlFor="journal-status">Status</label>
          <select
            id="journal-status"
            name="status"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            <option value="posted">Posted</option>
            <option value="void">Void</option>
          </select>
        </div>
        <button className="journal-secondary-button" type="submit">Apply filters</button>
      </form>

      {isLoading && (
        <p className="journal-state" role="status" aria-live="polite">
          Loading journal entries...
        </p>
      )}

      {!isLoading && error && (
        <p className="journal-state journal-state--error" role="alert" aria-live="polite">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="journal-table-card">
          <p className="journal-state">No journal entries found.</p>
          {meta && (
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              onPageChange={changePage}
            />
          )}
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && meta && (
        <div className="journal-table-card">
          <div className="journal-table-scroll">
            <table className="journal-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Memo</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="journal-table__clickable-row"
                    role="link"
                    tabIndex={0}
                    aria-label={`Open journal entry${entry.memo ? `: ${entry.memo}` : ''}`}
                    onClick={() => openEntry(entry.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        openEntry(entry.id)
                      }
                    }}
                  >
                    <td>
                      <time dateTime={entry.entry_date}>{formatDate(entry.entry_date)}</time>
                    </td>
                    <td>{entry.memo || 'No memo'}</td>
                    <td>
                      <StatusChip tone={entry.status === 'posted' ? 'positive' : 'error'}>
                        {entry.status}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            onPageChange={changePage}
          />
        </div>
      )}
    </section>
  )
}

export default JournalList
