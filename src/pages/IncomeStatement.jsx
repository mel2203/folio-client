import ReportsNav from '../components/ReportsNav.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getIncomeStatement } from '../api/reports.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import { getFirstDayOfMonth, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoneyString } from '../utils/money.js'
import './IncomeStatement.css'

function IncomeStatement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useMemo(() => getTodayCalendarDate(), [])
  const defaultFrom = useMemo(() => getFirstDayOfMonth(today), [today])
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || today
  const rangeError = from > to ? 'From date must be on or before the To date.' : ''
  const requestKey = JSON.stringify({ from, to })
  const [responseState, setResponseState] = useState(null)
  const currentResponse = responseState?.key === requestKey ? responseState : null
  const isLoading = !rangeError && currentResponse === null
  const report = currentResponse?.report ?? null
  const requestError = currentResponse?.error ?? null

  useEffect(() => {
    if (searchParams.has('from') && searchParams.has('to')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('from', from)
    nextParams.set('to', to)
    setSearchParams(nextParams, { replace: true })
  }, [from, searchParams, setSearchParams, to])

  useEffect(() => {
    if (rangeError) return undefined
    let isMounted = true
    getIncomeStatement({ from, to })
      .then((result) => {
        if (!result || !result.revenue || !result.expenses) {
          throw new Error('The server returned an invalid income statement response.')
        }
        if (isMounted) setResponseState({ key: requestKey, report: result, error: null })
      })
      .catch((error) => {
        if (isMounted) setResponseState({
          key: requestKey,
          report: null,
          error: error.message || 'Unable to load the income statement.',
        })
      })

    return () => {
      isMounted = false
    }
  }, [from, rangeError, requestKey, to])

  function changeDate(key, value) {
    const nextParams = new URLSearchParams(searchParams)
    if (value) nextParams.set(key, value)
    else nextParams.delete(key)
    setSearchParams(nextParams)
  }

  return (
    <section className="income-statement-page">
      <PageHeader
        className="income-statement-page__header reports-page__header"
        title="Profit and Loss"
        sub="Revenue and expenses for the selected period."
      >
        <div className="income-statement-page__controls">
          <div>
            <label htmlFor="income-statement-from">From</label>
            <input
              id="income-statement-from"
              type="date"
              className="field"
              value={from}
              onChange={(event) => changeDate('from', event.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(rangeError)}
              aria-describedby={rangeError ? 'income-statement-range-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="income-statement-to">To</label>
            <input
              id="income-statement-to"
              type="date"
              className="field"
              value={to}
              onChange={(event) => changeDate('to', event.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(rangeError)}
              aria-describedby={rangeError ? 'income-statement-range-error' : undefined}
            />
          </div>
        </div>
      </PageHeader>
      <ReportsNav />

      {rangeError && (
        <p id="income-statement-range-error" className="income-statement-state income-statement-state--error" role="alert" aria-live="polite">
          {rangeError}
        </p>
      )}
      {!rangeError && isLoading && (
        <LoadingState label="Loading Profit and Loss..." className="income-statement-state" />
      )}
      {!rangeError && !isLoading && requestError && (
        <p className="income-statement-state income-statement-state--error" role="alert" aria-live="polite">
          Error: {requestError}
        </p>
      )}
      {!rangeError && !isLoading && !requestError && report && (
        report.revenue.accounts.length === 0 && report.expenses.accounts.length === 0 ? (
          <EmptyState title="No posted entries in this date range." className="income-statement-state" />
        ) : (
          <Panel className="income-statement-card">
            <section className="income-statement-section" aria-labelledby="revenue-heading">
              <h2 id="revenue-heading">Revenue</h2>
              {report.revenue.accounts.length === 0 ? (
                <EmptyState title="No revenue posted." className="folio-empty-state--inline income-statement-section__empty" />
              ) : (
                <table className="income-statement-table ledger-table">
                  <tbody>
                    {report.revenue.accounts.map((account) => (
                      <tr key={account.accountId}>
                        <td><span className="income-statement-table__code">{account.code}</span>{account.name}</td>
                        <td className="income-statement-table__money num">{formatMoneyString(account.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="income-statement-table__subtotal">
                      <th scope="row">Total revenue</th>
                      <td className="income-statement-table__money num">{formatMoneyString(report.revenue.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
              {report.revenue.accounts.length === 0 && (
                <p className="income-statement-section__total">Total revenue <strong>{formatMoneyString(report.revenue.total)}</strong></p>
              )}
            </section>

            <section className="income-statement-section" aria-labelledby="expenses-heading">
              <h2 id="expenses-heading">Expenses</h2>
              {report.expenses.accounts.length === 0 ? (
                <EmptyState title="No expenses posted." className="folio-empty-state--inline income-statement-section__empty" />
              ) : (
                <table className="income-statement-table ledger-table">
                  <tbody>
                    {report.expenses.accounts.map((account) => (
                      <tr key={account.accountId}>
                        <td><span className="income-statement-table__code">{account.code}</span>{account.name}</td>
                        <td className="income-statement-table__money num">{formatMoneyString(account.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="income-statement-table__subtotal">
                      <th scope="row">Total expenses</th>
                      <td className="income-statement-table__money num">{formatMoneyString(report.expenses.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
              {report.expenses.accounts.length === 0 && (
                <p className="income-statement-section__total">Total expenses <strong>{formatMoneyString(report.expenses.total)}</strong></p>
              )}
            </section>

            <div className="income-statement-grand-total">
              <span>{report.netIncome.startsWith('-') ? 'Net loss' : 'Net income'}</span>
              <strong className={`num ${report.netIncome.startsWith('-') ? 'text-destructive-text' : 'text-success-text'}`}>{formatMoneyString(report.netIncome)}</strong>
            </div>
          </Panel>
        )
      )}
    </section>
  )
}

export default IncomeStatement
