import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getArAging } from '../api/reports.js'
import ReportsNav from '../components/ReportsNav.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoneyString } from '../utils/money.js'
import '../components/Sales.css'

function ArAging() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useMemo(() => getTodayCalendarDate(), [])
  const asOf = searchParams.get('asOf') || today
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
    getArAging({ asOf })
      .then((result) => {
        if (!result || !Array.isArray(result.customers) || !result.totals) throw new Error('The server returned an invalid A/R aging response.')
        if (alive) setResponseState({ asOf, report: result, error: '' })
      })
      .catch((error) => { if (alive) setResponseState({ asOf, report: null, error: error.message || 'Unable to load A/R aging.' }) })
    return () => { alive = false }
  }, [asOf])

  function changeAsOf(event) {
    const next = new URLSearchParams(searchParams)
    if (event.target.value) next.set('asOf', event.target.value)
    else next.delete('asOf')
    setSearchParams(next)
  }

  const report = current?.report

  return (
    <section className="sales-page ar-aging-page">
      <header className="sales-page__header ar-aging-page__header">
        <div><h1>Accounts Receivable Aging</h1><p>Review outstanding customer invoices and reconcile them to the A/R ledger.</p></div>
        <label className="sales-field">As of
          <input type="date" value={asOf} onChange={changeAsOf} disabled={loading} />
        </label>
      </header>
      <ReportsNav />
      {loading && <p className="sales-state" role="status" aria-live="polite">Loading A/R aging...</p>}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && report && (
        <>
          <div className="aging-status" aria-live="polite">
            {report.reconciles
              ? <StatusChip tone="positive">Aging reconciles to A/R ledger</StatusChip>
              : <StatusChip tone="error">Difference: {formatMoneyString(report.difference)}</StatusChip>}
            <span className="sales-muted">As of {formatCalendarDate(report.asOf)} · Ledger balance {formatMoneyString(report.ledgerBalance)}</span>
          </div>
          {report.customers.length === 0 ? <p className="sales-state">No outstanding invoices as of this date.</p> : (
            <div className="aging-card">
              <div className="sales-table-scroll">
                <table className="sales-table">
                  <thead><tr>
                    <th>Customer</th><th className="sales-table__money">Current</th><th className="sales-table__money">1–30 days</th>
                    <th className="sales-table__money">31–60 days</th><th className="sales-table__money">61–90 days</th>
                    <th className="sales-table__money">90+ days</th><th className="sales-table__money">Total</th>
                  </tr></thead>
                  <tbody>{report.customers.map((customer) => <tr key={customer.customerId}>
                    <td>{customer.name}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.current)}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.days1To30)}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.days31To60)}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.days61To90)}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.days90Plus)}</td>
                    <td className="sales-table__money">{formatMoneyString(customer.total)}</td>
                  </tr>)}</tbody>
                  <tfoot><tr className="invoice-preview__total">
                    <th scope="row">Total outstanding</th>
                    <td className="sales-table__money">{formatMoneyString(report.totals.current)}</td>
                    <td className="sales-table__money">{formatMoneyString(report.totals.days1To30)}</td>
                    <td className="sales-table__money">{formatMoneyString(report.totals.days31To60)}</td>
                    <td className="sales-table__money">{formatMoneyString(report.totals.days61To90)}</td>
                    <td className="sales-table__money">{formatMoneyString(report.totals.days90Plus)}</td>
                    <td className="sales-table__money">{formatMoneyString(report.totals.total)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ArAging
