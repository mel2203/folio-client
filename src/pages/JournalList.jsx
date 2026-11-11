import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { listJournalEntries } from '../api/journal.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import Pagination from '../components/Pagination.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { Button } from '../components/ui/button.jsx'
import { formatCalendarDate } from '../utils/calendar-date.js'
import './Journal.css'

const PAGE_SIZE = 20
const VALID_STATUSES = new Set(['posted', 'void'])

function readPage(value) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
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
      <PageHeader
        title="Journal entries"
        sub="Review your company&apos;s posted journal entries."
      >
        <Button asChild>
          <Link to="/journal/new">New entry</Link>
        </Button>
      </PageHeader>

      <form className="journal-filters" key={queryString} onSubmit={applyFilters}>
        <div className="journal-filter">
          <label htmlFor="journal-from">From</label>
          <input
            id="journal-from"
            name="from"
            type="date"
            className="field"
            defaultValue={from}
          />
        </div>
        <div className="journal-filter">
          <label htmlFor="journal-to">To</label>
          <input
            id="journal-to"
            name="to"
            type="date"
            className="field"
            defaultValue={to}
          />
        </div>
        <div className="journal-filter">
          <label htmlFor="journal-status">Status</label>
          <select
            id="journal-status"
            name="status"
            className="field"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            <option value="posted">Posted</option>
            <option value="void">Void</option>
          </select>
        </div>
        <Button className="journal-secondary-button" variant="outline" type="submit">Apply filters</Button>
      </form>

      {isLoading && (
        <LoadingState label="Loading journal entries..." className="journal-state" />
      )}

      {!isLoading && error && (
        <p className="journal-state journal-state--error" role="alert" aria-live="polite">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <Panel className="journal-table-card journal-table-card--empty">
          <EmptyState title="No journal entries found." className="journal-state journal-state--embedded" />
          {meta && (
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              onPageChange={changePage}
            />
          )}
          </Panel>
      )}

      {!isLoading && !error && entries.length > 0 && meta && (
        <div className="journal-entry-list">
          {entries.map((entry) => (
            <Panel className="journal-entry-card" key={entry.id}>
              <div
                className="journal-entry"
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
                <time className="journal-entry__date" dateTime={entry.entry_date}>
                  {formatCalendarDate(entry.entry_date)}
                </time>
                <span className="journal-entry__memo">{entry.memo || 'No memo'}</span>
                <StatusChip tone={entry.status === 'posted' ? 'positive' : 'error'}>
                  {entry.status}
                </StatusChip>
              </div>
            </Panel>
          ))}
          <div className="journal-table-card">
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              onPageChange={changePage}
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default JournalList
