import ReportsNav from '../components/ReportsNav.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getBalanceSheet } from '../api/reports.js'
import StatusChip from '../components/StatusChip.jsx'
import { getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoneyString } from '../utils/money.js'
import './BalanceSheet.css'

function AccountTable({ accounts, label }) {
  return (
    <table className="balance-sheet-table">
      <caption className="visually-hidden">{label} accounts</caption>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.accountId}>
            <td><span className="balance-sheet-table__code">{account.code}</span>{account.name}</td>
            <td className="balance-sheet-table__money">{formatMoneyString(account.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BalanceSheet() {
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
    getBalanceSheet({ asOf })
      .then((result) => {
        if (!result || !result.assets || !result.liabilities || !result.equity) {
          throw new Error('The server returned an invalid balance sheet response.')
        }
        if (isMounted) setResponseState({ asOf, report: result, error: null })
      })
      .catch((requestError) => {
        if (isMounted) setResponseState({
          asOf,
          report: null,
          error: requestError.message || 'Unable to load the balance sheet.',
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

  const hasNoAccounts = report
    && report.assets.accounts.length === 0
    && report.liabilities.accounts.length === 0
    && report.equity.accounts.length === 0
    && report.equity.currentEarnings === '0.00'

  return (
    <section className="balance-sheet-page">
      <header className="balance-sheet-page__header">
        <div>
          <h1>Balance Sheet</h1>
          <p>Assets, liabilities, and equity as of the selected date.</p>
        </div>
        <div className="balance-sheet-page__control">
          <label htmlFor="balance-sheet-as-of">As of</label>
          <input
            id="balance-sheet-as-of"
            type="date"
            value={asOf}
            onChange={changeAsOf}
            disabled={isLoading}
          />
        </div>
      </header>
      <ReportsNav />

      {isLoading && (
        <p className="balance-sheet-state" role="status" aria-live="polite">Loading balance sheet...</p>
      )}
      {!isLoading && error && (
        <p className="balance-sheet-state balance-sheet-state--error" role="alert" aria-live="polite">
          Error: {error}
        </p>
      )}
      {!isLoading && !error && report && (
        <>
          <div className="balance-sheet-page__status" aria-live="polite">
            {report.isBalanced
              ? <StatusChip tone="positive">Assets = Liabilities + Equity</StatusChip>
              : <StatusChip tone="error">Difference: {formatMoneyString(report.difference)}</StatusChip>}
          </div>
          {hasNoAccounts ? (
            <p className="balance-sheet-state">No posted entries up to this date.</p>
          ) : (
            <div className="balance-sheet-card">
              <section className="balance-sheet-section" aria-labelledby="assets-heading">
                <h2 id="assets-heading">Assets</h2>
                {report.assets.accounts.length > 0
                  ? <AccountTable accounts={report.assets.accounts} label="Assets" />
                  : <p className="balance-sheet-section__empty">No asset balances.</p>}
                <p className="balance-sheet-section__total"><span>Total assets</span><strong>{formatMoneyString(report.assets.total)}</strong></p>
              </section>

              <section className="balance-sheet-section" aria-labelledby="liabilities-heading">
                <h2 id="liabilities-heading">Liabilities</h2>
                {report.liabilities.accounts.length > 0
                  ? <AccountTable accounts={report.liabilities.accounts} label="Liabilities" />
                  : <p className="balance-sheet-section__empty">No liability balances.</p>}
                <p className="balance-sheet-section__total"><span>Total liabilities</span><strong>{formatMoneyString(report.liabilities.total)}</strong></p>
              </section>

              <section className="balance-sheet-section" aria-labelledby="equity-heading">
                <h2 id="equity-heading">Equity</h2>
                {report.equity.accounts.length > 0
                  ? <AccountTable accounts={report.equity.accounts} label="Equity" />
                  : <p className="balance-sheet-section__empty">No equity account balances.</p>}
                <p className="balance-sheet-section__current-earnings">
                  <span>Current earnings</span><strong>{formatMoneyString(report.equity.currentEarnings)}</strong>
                </p>
                <p className="balance-sheet-section__total"><span>Total equity</span><strong>{formatMoneyString(report.equity.total)}</strong></p>
              </section>

              <div className="balance-sheet-grand-total">
                <span>Total assets</span>
                <strong>{formatMoneyString(report.assets.total)}</strong>
                <span>Total liabilities and equity</span>
                <strong>{formatMoneyString(report.totalLiabilitiesAndEquity)}</strong>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default BalanceSheet
