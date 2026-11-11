import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listCustomers, listInvoices } from '../api/sales.js'
import Pagination from '../components/Pagination.jsx'
import SalesStatus from '../components/SalesStatus.jsx'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoney } from '../utils/money.js'
import { parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

const PAGE_SIZE = 20

function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const customerId = searchParams.get('customerId') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const number = searchParams.get('number') || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const requestKey = JSON.stringify({ status, customerId, from, to, number, page })
  const [responseState, setResponseState] = useState(null)
  const current = responseState?.key === requestKey ? responseState : null
  const [customers, setCustomers] = useState([])
  const [customerError, setCustomerError] = useState('')

  useEffect(() => {
    let alive = true
    listInvoices({ status, customerId, from, to, number, page, limit: PAGE_SIZE })
      .then((invoiceResult) => {
        if (!Array.isArray(invoiceResult?.data) || !invoiceResult.meta) throw new Error('The server returned an invalid invoices response.')
        if (alive) setResponseState({ key: requestKey, data: invoiceResult.data, meta: invoiceResult.meta, error: '' })
      })
      .catch((error) => {
        if (alive) setResponseState({ key: requestKey, data: [], meta: null, error: error.message || 'Unable to load invoices.' })
      })
    return () => { alive = false }
  }, [customerId, from, number, page, requestKey, status, to])

  useEffect(() => {
    let alive = true
    listCustomers({ page: 1, limit: 100 })
      .then((result) => {
        if (!Array.isArray(result?.data)) throw new Error('The server returned an invalid customers response.')
        if (alive) { setCustomers(result.data); setCustomerError('') }
      })
      .catch((error) => { if (alive) setCustomerError(error.message || 'Unable to load customers.') })
    return () => { alive = false }
  }, [])

  function applyFilters(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    for (const key of ['status', 'customerId', 'from', 'to', 'number']) {
      const value = String(data.get(key) || '').trim()
      if (value) next.set(key, value)
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  const loading = current === null
  const rangeError = from && to && from > to ? 'From date must be on or before the To date.' : ''

  return (
    <section className="sales-page invoices-page">
      <header className="sales-page__header">
        <div><h1>Invoices</h1><p>Create, send, and track customer invoices.</p></div>
        <Link className="sales-primary-link" to="/invoices/new">New invoice</Link>
      </header>
      <form className="sales-filters" onSubmit={applyFilters} key={requestKey}>
        <label className="sales-field">Invoice number<input name="number" defaultValue={number} placeholder="INV-0001" /></label>
        <label className="sales-field">Customer
          <select name="customerId" defaultValue={customerId}>
            <option value="">All customers</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}
          </select>
        </label>
        <label className="sales-field">Status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {['draft', 'sent', 'partial', 'paid', 'void'].map((value) => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
          </select>
        </label>
        <label className="sales-field">From<input name="from" type="date" defaultValue={from} aria-invalid={Boolean(rangeError)} /></label>
        <label className="sales-field">To<input name="to" type="date" defaultValue={to} aria-invalid={Boolean(rangeError)} /></label>
        <button className="sales-secondary-button" type="submit">Apply filters</button>
      </form>
      {rangeError && <p className="sales-state sales-state--error" role="alert">{rangeError}</p>}
      {customerError && <p className="sales-state sales-state--error" role="alert">{customerError}</p>}
      {loading && <p className="sales-state" role="status" aria-live="polite">Loading invoices...</p>}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && current.data.length === 0 && <p className="sales-state">No invoices found.</p>}
      {!loading && !current.error && current.data.length > 0 && (
        <div className="sales-card">
          <div className="sales-table-scroll">
            <table className="sales-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Issue date</th><th>Due date</th><th>Status</th><th className="sales-table__money">Total</th><th className="sales-table__money">Outstanding</th></tr></thead>
              <tbody>
                {current.data.map((invoice) => {
                  const overdue = ['sent', 'partial'].includes(invoice.status)
                    && invoice.dueDate < getTodayCalendarDate()
                  return (
                    <tr key={invoice.id}>
                      <td><Link to={`/invoices/${invoice.id}`}>{invoice.invoiceNumber || `Draft ${invoice.id.slice(0, 8)}`}</Link></td>
                      <td>{invoice.customerName}</td>
                      <td>{formatCalendarDate(invoice.issueDate)}</td>
                      <td>{formatCalendarDate(invoice.dueDate)}{overdue && <span className="sales-overdue">Overdue</span>}</td>
                      <td><SalesStatus status={invoice.status} /></td>
                      <td className="sales-table__money">{formatMoney(parseAmountToCents(invoice.total))}</td>
                      <td className="sales-table__money">{formatMoney(parseAmountToCents(invoice.total) - parseAmountToCents(invoice.amountPaid))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={current.meta.page} limit={current.meta.limit} total={current.meta.total} onPageChange={changePage} ariaLabel="Invoice pagination" />
        </div>
      )}
    </section>
  )
}

export default Invoices
