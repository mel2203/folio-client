import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getJournalEntry } from '../api/journal.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import { formatCalendarDate } from '../utils/calendar-date.js'
import './Journal.css'

function calculateTotals(lines) {
  return lines.reduce(
    (totals, line) => ({
      debits: totals.debits + parseAmountToCents(line.debit),
      credits: totals.credits + parseAmountToCents(line.credit),
    }),
    { debits: 0n, credits: 0n },
  )
}

function JournalDetail() {
  const { id } = useParams()
  const location = useLocation()
  const backTo = location.state?.from || '/journal'
  const successMessage = location.state?.successMessage
  const [responseState, setResponseState] = useState(null)
  const currentResponse = responseState?.id === id ? responseState : null
  const isLoading = currentResponse === null
  const entry = currentResponse?.entry ?? null
  const totals = currentResponse?.totals ?? null
  const error = currentResponse?.error ?? null

  useEffect(() => {
    let isMounted = true

    getJournalEntry(id)
      .then((result) => {
        if (!result || !Array.isArray(result.lines)) {
          throw new Error('The server returned an invalid journal entry response.')
        }

        const entryTotals = calculateTotals(result.lines)
        if (isMounted) {
          setResponseState({
            id,
            entry: result,
            totals: entryTotals,
            error: null,
          })
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setResponseState({
            id,
            entry: null,
            totals: null,
            error: requestError,
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (isLoading) {
    return <LoadingState label="Loading journal entry..." className="journal-state" />
  }

  if (error?.status === 404) {
    return (
      <section className="journal-detail">
        <Link className="journal-detail__back" to={backTo}>Back to journal entries</Link>
        <EmptyState title="Journal entry not found." className="journal-state" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="journal-detail">
        <Link className="journal-detail__back" to={backTo}>Back to journal entries</Link>
        <p className="journal-state journal-state--error" role="alert" aria-live="polite">
          Error: {error.message || 'Unable to load journal entry.'}
        </p>
      </section>
    )
  }

  if (!entry || !totals) {
    return null
  }

  const isBalanced = totals.debits === totals.credits

  return (
    <section className="journal-detail">
      <Link className="journal-detail__back" to={backTo}>Back to journal entries</Link>
      <PageHeader
        className="journal-detail__header"
        title="Journal entry"
        sub={<time dateTime={entry.entry_date}>{formatCalendarDate(entry.entry_date)}</time>}
      >
        <StatusChip tone={entry.status === 'posted' ? 'positive' : 'error'}>
          {entry.status}
        </StatusChip>
      </PageHeader>
      {successMessage && (
        <p className="journal-detail__success" role="status" aria-live="polite">
          {successMessage}
        </p>
      )}

      <Panel className="journal-detail-card" title="Memo">
        <p className="journal-detail__memo">{entry.memo || 'No memo'}</p>
      </Panel>

      <Panel className="journal-detail-card journal-detail-card--lines" title="Journal lines">
        <div className="journal-detail-table-scroll">
          <table className="journal-detail-table ledger-table">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col" className="money">Debit</th>
                <th scope="col" className="money">Credit</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  <td className={parseAmountToCents(line.credit) > 0n ? 'journal-detail-table__credit' : ''}>{line.accountCode} — {line.accountName}</td>
                  <td className="money num">{formatMoney(parseAmountToCents(line.debit))}</td>
                  <td className="money num">{formatMoney(parseAmountToCents(line.credit))}</td>
                  <td>{line.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="money num">{formatMoney(totals.debits)}</td>
                <td className="money num">{formatMoney(totals.credits)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="journal-detail__summary">
          <StatusChip tone={isBalanced ? 'positive' : 'error'}>
            {isBalanced ? 'Debits = Credits' : 'Debits do not equal credits'}
          </StatusChip>
        </div>
      </Panel>
    </section>
  )
}

export default JournalDetail
