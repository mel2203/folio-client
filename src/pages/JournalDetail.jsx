import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getJournalEntry } from '../api/journal.js'
import StatusChip from '../components/StatusChip.jsx'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import './Journal.css'

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

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
    return (
      <p className="journal-state" role="status" aria-live="polite">
        Loading journal entry...
      </p>
    )
  }

  if (error?.status === 404) {
    return (
      <section className="journal-detail">
        <Link className="journal-detail__back" to={backTo}>Back to journal entries</Link>
        <p className="journal-state">Journal entry not found.</p>
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
      <header className="journal-detail__header">
        <div>
          <h1>Journal entry</h1>
          <p><time dateTime={entry.entry_date}>{formatDate(entry.entry_date)}</time></p>
        </div>
        <StatusChip tone={entry.status === 'posted' ? 'positive' : 'error'}>
          {entry.status}
        </StatusChip>
      </header>
      {successMessage && (
        <p className="journal-detail__success" role="status" aria-live="polite">
          {successMessage}
        </p>
      )}

      <section className="journal-detail-card" aria-labelledby="entry-memo-heading">
        <h2 id="entry-memo-heading">Memo</h2>
        <p className="journal-detail__memo">{entry.memo || 'No memo'}</p>
      </section>

      <section className="journal-detail-card journal-detail-card--lines" aria-labelledby="entry-lines-heading">
        <h2 id="entry-lines-heading">Journal lines</h2>
        <div className="journal-detail-table-scroll">
          <table className="journal-detail-table">
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
                  <td>{line.accountCode} — {line.accountName}</td>
                  <td className="money">{formatMoney(parseAmountToCents(line.debit))}</td>
                  <td className="money">{formatMoney(parseAmountToCents(line.credit))}</td>
                  <td>{line.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="money">{formatMoney(totals.debits)}</td>
                <td className="money">{formatMoney(totals.credits)}</td>
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
      </section>
    </section>
  )
}

export default JournalDetail
