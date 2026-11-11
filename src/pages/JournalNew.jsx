import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAccounts } from '../api/accounts.js'
import { createJournalEntry } from '../api/journal.js'
import StatusChip from '../components/StatusChip.jsx'
import { formatMoney, parseAmountToCents, centsToAmount } from '../utils/money.js'
import './Journal.css'
import './JournalNew.css'

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
]
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeLine(id) {
  return {
    id,
    accountId: '',
    debit: '',
    credit: '',
    description: '',
  }
}

function getAmountCents(value) {
  if (!value) {
    return 0n
  }

  if (!AMOUNT_PATTERN.test(value)) {
    return null
  }

  return parseAmountToCents(value)
}

function getLineAmounts(line) {
  return {
    debit: getAmountCents(line.debit),
    credit: getAmountCents(line.credit),
  }
}

function getServerDetails(details) {
  if (Array.isArray(details)) {
    return details.map((detail) => {
      if (typeof detail === 'string') {
        return detail
      }

      if (detail && typeof detail === 'object') {
        const path = typeof detail.path === 'string' ? detail.path : ''
        const message = typeof detail.message === 'string' ? detail.message : ''
        return [path, message].filter(Boolean).join(': ') || 'Additional server validation detail.'
      }

      return String(detail)
    })
  }

  if (details && typeof details === 'object') {
    return Object.entries(details).map(([field, message]) => `${field}: ${String(message)}`)
  }

  return []
}

function JournalNew() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const [date, setDate] = useState(getTodayDate)
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState(() => [makeLine('line-1'), makeLine('line-2')])
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nextLineNumber = useRef(3)
  const submitLock = useRef(false)

  useEffect(() => {
    let isMounted = true

    getAccounts()
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid accounts response.')
        }

        if (isMounted) {
          setAccounts(result)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setAccountsError(error.message || 'Unable to load accounts.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setAccountsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const totals = lines.reduce(
    (current, line) => {
      const amounts = getLineAmounts(line)
      return {
        debits: current.debits + (amounts.debit ?? 0n),
        credits: current.credits + (amounts.credit ?? 0n),
        hasInvalidAmount: current.hasInvalidAmount
          || amounts.debit === null
          || amounts.credit === null,
      }
    },
    { debits: 0n, credits: 0n, hasInvalidAmount: false },
  )

  const difference = totals.debits >= totals.credits
    ? totals.debits - totals.credits
    : totals.credits - totals.debits
  const isBalanced = !totals.hasInvalidAmount
    && totals.debits > 0n
    && totals.debits === totals.credits

  const canSubmit = Boolean(date)
    && lines.length >= 2
    && !accountsLoading
    && !accountsError
    && lines.every((line) => {
      const amounts = getLineAmounts(line)
      if (!line.accountId || amounts.debit === null || amounts.credit === null) {
        return false
      }

      return (amounts.debit > 0n) !== (amounts.credit > 0n)
    })
    && isBalanced

  function updateLine(lineId, field, value) {
    setLines((current) => current.map((line) => {
      if (line.id !== lineId) {
        return line
      }

      if (field === 'debit' || field === 'credit') {
        const otherField = field === 'debit' ? 'credit' : 'debit'
        return { ...line, [field]: value, [otherField]: '' }
      }

      return { ...line, [field]: value }
    }))
    setServerError(null)
  }

  function addLine() {
    const lineId = `line-${nextLineNumber.current}`
    nextLineNumber.current += 1
    setLines((current) => [...current, makeLine(lineId)])
  }

  function removeLine(lineId) {
    setLines((current) => (
      current.length > 2 ? current.filter((line) => line.id !== lineId) : current
    ))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit || submitLock.current) {
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    setServerError(null)

    const payload = {
      date,
      memo: memo.trim() || null,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        debit: centsToAmount(getAmountCents(line.debit)),
        credit: centsToAmount(getAmountCents(line.credit)),
        description: line.description.trim() || undefined,
      })),
    }

    try {
      const result = await createJournalEntry(payload)
      if (!result || typeof result.id !== 'string' || !result.id) {
        throw new Error('The server returned an invalid journal entry response.')
      }

      navigate(`/journal/${encodeURIComponent(result.id)}`, {
        state: { successMessage: 'Journal entry created successfully.' },
      })
    } catch (error) {
      setServerError({
        message: error.message || 'Unable to create the journal entry.',
        details: getServerDetails(error.details),
      })
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  if (accountsLoading) {
    return (
      <p className="journal-state" role="status" aria-live="polite">
        Loading accounts...
      </p>
    )
  }

  if (accountsError) {
    return (
      <section className="journal-new">
        <Link className="journal-detail__back" to="/journal">Back to journal entries</Link>
        <p className="journal-state journal-state--error" role="alert" aria-live="polite">
          Error: {accountsError}
        </p>
      </section>
    )
  }

  return (
    <section className="journal-new">
      <Link className="journal-detail__back" to="/journal">Back to journal entries</Link>
      <header className="journal-new__header">
        <h1>New journal entry</h1>
        <p>Record equal debits and credits for your business.</p>
      </header>

      <form className="journal-new__form" onSubmit={handleSubmit} noValidate>
        <div className="journal-new__fields">
          <div className="journal-new__field journal-new__field--date">
            <label htmlFor="journal-entry-date">Date</label>
            <input
              id="journal-entry-date"
              name="date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setServerError(null)
              }}
              required
            />
          </div>
          <div className="journal-new__field">
            <label htmlFor="journal-entry-memo">Memo</label>
            <input
              id="journal-entry-memo"
              name="memo"
              type="text"
              maxLength={1000}
              value={memo}
              onChange={(event) => {
                setMemo(event.target.value)
                setServerError(null)
              }}
            />
          </div>
        </div>

        <section className="journal-new__lines-section" aria-labelledby="journal-lines-title">
          <h2 id="journal-lines-title">Journal lines</h2>
          <div className="journal-new__lines">
            {lines.map((line, index) => {
              const amounts = getLineAmounts(line)
              const debitInvalid = Boolean(line.debit) && amounts.debit === null
              const creditInvalid = Boolean(line.credit) && amounts.credit === null

              return (
                <fieldset className="journal-new__line" key={line.id}>
                  <legend>Line {index + 1}</legend>
                  <div className="journal-new__line-grid">
                    <div className="journal-new__field journal-new__field--account">
                      <label htmlFor={`${line.id}-account`}>Account</label>
                      <select
                        id={`${line.id}-account`}
                        name="accountId"
                        value={line.accountId}
                        onChange={(event) => updateLine(line.id, 'accountId', event.target.value)}
                      >
                        <option value="">Select an account</option>
                        {ACCOUNT_TYPES.map(({ value, label }) => {
                          const typeAccounts = accounts.filter(
                            (account) => account.type === value && account.isActive,
                          )
                          if (typeAccounts.length === 0) {
                            return null
                          }

                          return (
                            <optgroup label={label} key={value}>
                              {typeAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} — {account.name}
                                </option>
                              ))}
                            </optgroup>
                          )
                        })}
                      </select>
                    </div>

                    <div className="journal-new__field">
                      <label htmlFor={`${line.id}-debit`}>Debit (RM)</label>
                      <input
                        id={`${line.id}-debit`}
                        name="debit"
                        type="text"
                        inputMode="decimal"
                        value={line.debit}
                        onChange={(event) => updateLine(line.id, 'debit', event.target.value)}
                        aria-invalid={debitInvalid}
                        aria-describedby={debitInvalid ? `${line.id}-debit-error` : undefined}
                      />
                      {debitInvalid && (
                        <span
                          className="journal-new__field-error"
                          id={`${line.id}-debit-error`}
                          aria-live="polite"
                        >
                          Use digits with up to two decimal places.
                        </span>
                      )}
                    </div>

                    <div className="journal-new__field">
                      <label htmlFor={`${line.id}-credit`}>Credit (RM)</label>
                      <input
                        id={`${line.id}-credit`}
                        name="credit"
                        type="text"
                        inputMode="decimal"
                        value={line.credit}
                        onChange={(event) => updateLine(line.id, 'credit', event.target.value)}
                        aria-invalid={creditInvalid}
                        aria-describedby={creditInvalid ? `${line.id}-credit-error` : undefined}
                      />
                      {creditInvalid && (
                        <span
                          className="journal-new__field-error"
                          id={`${line.id}-credit-error`}
                          aria-live="polite"
                        >
                          Use digits with up to two decimal places.
                        </span>
                      )}
                    </div>

                    <div className="journal-new__field journal-new__field--description">
                      <label htmlFor={`${line.id}-description`}>Description</label>
                      <input
                        id={`${line.id}-description`}
                        name="description"
                        type="text"
                        maxLength={500}
                        value={line.description}
                        onChange={(event) => updateLine(line.id, 'description', event.target.value)}
                      />
                    </div>
                    <button
                      className="journal-new__remove"
                      type="button"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(line.id)}
                      aria-label={`Remove line ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                </fieldset>
              )
            })}
          </div>
          <button className="journal-secondary-button" type="button" onClick={addLine}>
            Add line
          </button>
        </section>

        <section className="journal-new__summary" aria-live="polite" aria-atomic="true">
          <h2>Entry totals</h2>
          <dl>
            <div>
              <dt>Total debits</dt>
              <dd>{formatMoney(totals.debits)}</dd>
            </div>
            <div>
              <dt>Total credits</dt>
              <dd>{formatMoney(totals.credits)}</dd>
            </div>
            <div>
              <dt>Difference</dt>
              <dd>{formatMoney(difference)}</dd>
            </div>
          </dl>
          {isBalanced ? (
            <StatusChip tone="positive">Balanced</StatusChip>
          ) : difference > 0n ? (
            <StatusChip tone="error">Out by {formatMoney(difference)}</StatusChip>
          ) : (
            <StatusChip tone="neutral">Not balanced yet</StatusChip>
          )}
        </section>

        {serverError && (
          <div className="journal-new__server-error" role="alert" aria-live="polite">
            <p>Error: {serverError.message}</p>
            {serverError.details.length > 0 && (
              <ul>
                {serverError.details.map((detail, index) => (
                  <li key={`${index}-${detail}`}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          className="journal-new__submit"
          type="submit"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Saving entry...' : 'Save journal entry'}
        </button>
      </form>
    </section>
  )
}

export default JournalNew
