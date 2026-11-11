import ReportsNav from '../components/ReportsNav.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTrialBalance } from '../api/reports.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import { getTodayCalendarDate } from '../utils/calendar-date.js'
import './TrialBalance.css'

function formatReportAmount(amount) {
  return formatMoney(parseAmountToCents(amount))
}

function TrialBalance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useMemo(() => getTodayCalendarDate(), [])
  const asOf = searchParams.get('asOf') || today
  const [responseState, setResponseState] = useState(null)
  const currentResponse = responseState?.asOf === asOf ? responseState : null
  const isLoading = currentResponse === null
  const report = currentResponse?.report ?? null
  const error = currentResponse?.error ?? null

  useEffect(() => {
    if (searchParams.has('asOf')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('asOf', today)
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, today])

  useEffect(() => {
    let isMounted = true
    getTrialBalance({ asOf })
      .then((result) => {
        if (!result || !Array.isArray(result.accounts) || !result.totals) {
          throw new Error('The server returned an invalid trial balance response.')
        }
        if (isMounted) setResponseState({ asOf, report: result, error: null })
      })
      .catch((requestError) => {
        if (isMounted) setResponseState({
          asOf,
          report: null,
          error: requestError.message || 'Unable to load the trial balance.',
        })
      })

    return () => {
      isMounted = false
    }
  }, [asOf])

  function changeAsOf(event) {
    const nextParams = new URLSearchParams(searchParams)
    if (event.target.value) nextParams.set('asOf', event.target.value)
    else nextParams.delete('asOf')
    setSearchParams(nextParams)
  }

  let differenceLabel = ''
  if (report) {
    const debit = parseAmountToCents(report.totals.debit)
    const credit = parseAmountToCents(report.totals.credit)
    const difference = debit >= credit ? debit - credit : credit - debit
    differenceLabel = 'Difference: ' + formatMoney(difference)
  }

  return (
    <section className="trial-balance-page">
      <PageHeader
        className="trial-balance-page__header reports-page__header"
        title="Trial Balance"
        sub="Review posted account balances as of the selected date."
      >
        <div className="trial-balance-page__control reports-date-control">
          <label htmlFor="trial-balance-as-of">As of</label>
          <input
            id="trial-balance-as-of"
            type="date"
            className="field"
            value={asOf}
            onChange={changeAsOf}
            disabled={isLoading}
          />
        </div>
      </PageHeader>
      <ReportsNav />

      {isLoading && (
        <LoadingState label="Loading trial balance..." className="trial-balance-state" />
      )}

      {!isLoading && error && (
        <p className="trial-balance-state trial-balance-state--error" role="alert" aria-live="polite">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && report && (
        <>
          <div className="trial-balance-page__status" aria-live="polite">
            {report.isBalanced
              ? <StatusChip tone="positive">Debits = Credits</StatusChip>
              : <StatusChip tone="error">{differenceLabel}</StatusChip>}
          </div>

          {report.accounts.length === 0 ? (
            <EmptyState title="No posted entries up to this date." className="trial-balance-state" />
          ) : (
            <Panel className="trial-balance-card">
              <div className="trial-balance-table-scroll">
                <table className="trial-balance-table ledger-table">
                  <caption className="visually-hidden">Trial Balance account balances</caption>
                  <thead>
                    <tr>
                      <th scope="col">Account code</th>
                      <th scope="col">Account name</th>
                      <th scope="col" className="trial-balance-table__money">Debit</th>
                      <th scope="col" className="trial-balance-table__money">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.accounts.map((account) => (
                      <tr key={account.accountId}>
                        <td className="font-mono trial-balance-table__code">{account.code}</td>
                        <td>{account.name}</td>
                        <td className="trial-balance-table__money num">{formatReportAmount(account.debit)}</td>
                        <td className="trial-balance-table__money num">{formatReportAmount(account.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="trial-balance-table__grand-total">
                      <th scope="row" colSpan="2">Totals</th>
                      <td className="trial-balance-table__money num">{formatReportAmount(report.totals.debit)}</td>
                      <td className="trial-balance-table__money num">{formatReportAmount(report.totals.credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </Panel>
          )}
        </>
      )}
    </section>
  )
}

export default TrialBalance
