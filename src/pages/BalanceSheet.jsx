import ReportsNav from '../components/ReportsNav.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getBalanceSheet } from '../api/reports.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoneyString } from '../utils/money.js'
import './BalanceSheet.css'

function AccountTable({ accounts, label }) {
  return (
    <table className="balance-sheet-table ledger-table">
      <caption className="visually-hidden">{label} accounts</caption>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.accountId}>
            <td><span className="balance-sheet-table__code">{account.code}</span>{account.name}</td>
            <td className="balance-sheet-table__money num">{formatMoneyString(account.amount)}</td>
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
      <PageHeader
        className="balance-sheet-page__header reports-page__header"
        title="Balance Sheet"
        sub="Assets, liabilities, and equity as of the selected date."
      >
        <div className="balance-sheet-page__control reports-date-control">
          <label htmlFor="balance-sheet-as-of">As of</label>
          <input
            id="balance-sheet-as-of"
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
        <LoadingState label="Loading balance sheet..." className="balance-sheet-state" />
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
              ? (
                <StatusChip tone="positive">
                  <span aria-hidden="true">✓ </span>
                  <span>Assets = Liabilities + Equity</span>
                </StatusChip>
              ) : (
                <StatusChip tone="error">
                  <span aria-hidden="true">× </span>
                  <span>Difference: {formatMoneyString(report.difference)}</span>
                </StatusChip>
              )}
          </div>
          {hasNoAccounts ? (
            <EmptyState title="No posted entries up to this date." className="balance-sheet-state" />
          ) : (
            <div className="balance-sheet-card balance-sheet-grid">
              <Panel className="balance-sheet-section">
                <h2 id="assets-heading">Assets</h2>
                {report.assets.accounts.length > 0
                  ? <AccountTable accounts={report.assets.accounts} label="Assets" />
                  : <EmptyState title="No asset balances." className="folio-empty-state--inline balance-sheet-section__empty" />}
                <p className="balance-sheet-section__total"><span>Total assets</span><strong className="num">{formatMoneyString(report.assets.total)}</strong></p>
              </Panel>

              <Panel className="balance-sheet-section balance-sheet-section--liabilities-equity">
                <section className="balance-sheet-subsection" aria-labelledby="liabilities-heading">
                  <h2 id="liabilities-heading">Liabilities</h2>
                  {report.liabilities.accounts.length > 0
                    ? <AccountTable accounts={report.liabilities.accounts} label="Liabilities" />
                    : <EmptyState title="No liability balances." className="folio-empty-state--inline balance-sheet-section__empty" />}
                  <p className="balance-sheet-section__total"><span>Total liabilities</span><strong className="num">{formatMoneyString(report.liabilities.total)}</strong></p>
                </section>

                <section className="balance-sheet-subsection" aria-labelledby="equity-heading">
                  <h2 id="equity-heading">Equity</h2>
                  {report.equity.accounts.length > 0
                    ? <AccountTable accounts={report.equity.accounts} label="Equity" />
                    : <EmptyState title="No equity account balances." className="folio-empty-state--inline balance-sheet-section__empty" />}
                  <p className="balance-sheet-section__current-earnings">
                    <span>Current earnings</span><strong className="num">{formatMoneyString(report.equity.currentEarnings)}</strong>
                  </p>
                  <p className="balance-sheet-section__total"><span>Total equity</span><strong className="num">{formatMoneyString(report.equity.total)}</strong></p>
                </section>
              </Panel>

              <div className="balance-sheet-grand-total">
                <span>Total assets</span>
                <strong className="num">{formatMoneyString(report.assets.total)}</strong>
                <span>Total liabilities and equity</span>
                <strong className="num">{formatMoneyString(report.totalLiabilitiesAndEquity)}</strong>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default BalanceSheet
