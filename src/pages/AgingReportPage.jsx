import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportsNav from '../components/ReportsNav.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoneyString } from '../utils/money.js'
import '../components/Sales.css'

function AgingReportPage({ direction, getReport }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useMemo(() => getTodayCalendarDate(), [])
  const asOf = searchParams.get('asOf') || today
  const receivable = direction === 'receivable'
  const noun = receivable ? 'A/R' : 'A/P'
  const title = receivable ? 'Accounts Receivable Aging' : 'Accounts Payable Aging'
  const collection = receivable ? 'customers' : 'vendors'
  const rowId = receivable ? 'customerId' : 'vendorId'
  const [responseState, setResponseState] = useState(null)
  const current = responseState?.asOf === asOf ? responseState : null
  const loading = current === null

  useEffect(() => {
    if (searchParams.has('asOf')) return
    const next = new URLSearchParams(searchParams)
    next.set('asOf', today)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, today])

  useEffect(() => {
    let alive = true
    getReport({ asOf }).then((result) => {
      if (!result || !Array.isArray(result[collection]) || !result.totals) throw new Error(`The server returned an invalid ${noun} aging response.`)
      if (alive) setResponseState({ asOf, report: result, error: '' })
    }).catch((error) => {
      if (alive) setResponseState({ asOf, report: null, error: error.message || `Unable to load ${noun} aging.` })
    })
    return () => { alive = false }
  }, [asOf, collection, getReport, noun])

  function changeAsOf(event) {
    const next = new URLSearchParams(searchParams)
    if (event.target.value) next.set('asOf', event.target.value)
    else next.delete('asOf')
    setSearchParams(next)
  }

  const report = current?.report
  const rows = report?.[collection] || []
  const relation = receivable ? 'A/R' : 'A/P'
  return (
    <section className={`sales-page ${receivable ? 'ar-aging-page' : 'ap-aging-page'}`}>
      <PageHeader
        className="sales-page__header ar-aging-page__header reports-page__header"
        title={title}
        sub={`Review outstanding ${receivable ? 'customer' : 'vendor'} balances and reconcile them to the ${relation} ledger.`}
      >
        <label className="reports-date-control">
          <span>As of</span>
          <input type="date" className="field" value={asOf} onChange={changeAsOf} disabled={loading} />
        </label>
      </PageHeader>
      <ReportsNav />
      {loading && <LoadingState label={`Loading ${noun} aging...`} className="sales-state" />}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && report && <>
        <div className="aging-status" aria-live="polite">
          {report.reconciles ? <StatusChip tone="positive">Aging reconciles to {relation} ledger</StatusChip> : <StatusChip tone="error">Difference: {formatMoneyString(report.difference)}</StatusChip>}
          <span className="sales-muted">As of {formatCalendarDate(report.asOf)} · Ledger balance {formatMoneyString(report.ledgerBalance)}</span>
        </div>
        {rows.length === 0 ? <EmptyState title={`No outstanding ${receivable ? 'invoices' : 'bills'} as of this date.`} className="sales-state reports-state" /> : (
          <Panel className="aging-card reports-aging-card"><div className="sales-table-scroll"><table className="sales-table ledger-table">
            <thead><tr><th>{receivable ? 'Customer' : 'Vendor'}</th><th className="sales-table__money">Current</th><th className="sales-table__money">1–30 days</th><th className="sales-table__money">31–60 days</th><th className="sales-table__money">61–90 days</th><th className="sales-table__money">90+ days</th><th className="sales-table__money">Total</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[rowId]}><td>{row.name}</td><td className="sales-table__money">{formatMoneyString(row.current)}</td><td className="sales-table__money">{formatMoneyString(row.days1To30)}</td><td className="sales-table__money">{formatMoneyString(row.days31To60)}</td><td className="sales-table__money">{formatMoneyString(row.days61To90)}</td><td className="sales-table__money">{formatMoneyString(row.days90Plus)}</td><td className="sales-table__money">{formatMoneyString(row.total)}</td></tr>)}</tbody>
            <tfoot><tr className="invoice-preview__total"><th scope="row">Total outstanding</th><td className="sales-table__money">{formatMoneyString(report.totals.current)}</td><td className="sales-table__money">{formatMoneyString(report.totals.days1To30)}</td><td className="sales-table__money">{formatMoneyString(report.totals.days31To60)}</td><td className="sales-table__money">{formatMoneyString(report.totals.days61To90)}</td><td className="sales-table__money">{formatMoneyString(report.totals.days90Plus)}</td><td className="sales-table__money">{formatMoneyString(report.totals.total)}</td></tr></tfoot>
          </table></div></Panel>
        )}
      </>}
    </section>
  )
}

export default AgingReportPage
