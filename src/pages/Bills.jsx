import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listBills, listVendors } from '../api/purchases.js'
import Pagination from '../components/Pagination.jsx'
import { DocumentStatus } from '../components/SalesStatus.jsx'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

const PAGE_SIZE = 20

function Bills() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const vendorId = searchParams.get('vendorId') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const number = searchParams.get('number') || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const requestKey = JSON.stringify({ status, vendorId, from, to, number, page })
  const [response, setResponse] = useState(null)
  const current = response?.key === requestKey ? response : null
  const [vendors, setVendors] = useState([])
  const [vendorError, setVendorError] = useState('')

  useEffect(() => {
    let alive = true
    listBills({ status, vendorId, from, to, number, page, limit: PAGE_SIZE }).then((result) => {
      if (!Array.isArray(result?.data) || !result.meta) throw new Error('The server returned an invalid bills response.')
      if (alive) setResponse({ key: requestKey, data: result.data, meta: result.meta, error: '' })
    }).catch((error) => { if (alive) setResponse({ key: requestKey, data: [], meta: null, error: error.message || 'Unable to load bills.' }) })
    return () => { alive = false }
  }, [from, number, page, requestKey, status, to, vendorId])

  useEffect(() => {
    let alive = true
    listVendors({ active: 'true', page: 1, limit: 100 }).then((result) => {
      if (!Array.isArray(result?.data)) throw new Error('The server returned an invalid vendors response.')
      if (alive) { setVendors(result.data); setVendorError('') }
    }).catch((error) => { if (alive) setVendorError(error.message || 'Unable to load vendors.') })
    return () => { alive = false }
  }, [])

  function applyFilters(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    for (const key of ['status', 'vendorId', 'from', 'to', 'number']) {
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
    <section className="sales-page bills-page">
      <header className="sales-page__header"><div><h1>Bills</h1><p>Record vendor bills and track payments.</p></div><Link className="sales-primary-link" to="/bills/new">New bill</Link></header>
      <form className="sales-filters" onSubmit={applyFilters} key={requestKey}>
        <label className="sales-field">Bill number<input name="number" defaultValue={number} placeholder="BILL-0001" /></label>
        <label className="sales-field">Vendor<select name="vendorId" defaultValue={vendorId}><option value="">All vendors</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
        <label className="sales-field">Status<select name="status" defaultValue={status}><option value="">All statuses</option>{['draft', 'open', 'partial', 'paid', 'void'].map((value) => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        <label className="sales-field">From<input name="from" type="date" defaultValue={from} aria-invalid={Boolean(rangeError)} /></label>
        <label className="sales-field">To<input name="to" type="date" defaultValue={to} aria-invalid={Boolean(rangeError)} /></label>
        <button className="sales-secondary-button" type="submit">Apply filters</button>
      </form>
      {rangeError && <p className="sales-state sales-state--error" role="alert">{rangeError}</p>}
      {vendorError && <p className="sales-state sales-state--error" role="alert">{vendorError}</p>}
      {loading && <p className="sales-state" role="status" aria-live="polite">Loading bills...</p>}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && current.data.length === 0 && <p className="sales-state">No bills found.</p>}
      {!loading && !current.error && current.data.length > 0 && <div className="sales-card"><div className="sales-table-scroll"><table className="sales-table">
        <thead><tr><th>Bill</th><th>Vendor</th><th>Issue date</th><th>Due date</th><th>Status</th><th className="sales-table__money">Total</th><th className="sales-table__money">Outstanding</th></tr></thead>
        <tbody>{current.data.map((bill) => {
          const overdue = ['open', 'partial'].includes(bill.status) && bill.dueDate < getTodayCalendarDate()
          return <tr key={bill.id}><td><Link to={`/bills/${bill.id}`}>{bill.billNumber}</Link></td><td>{bill.vendorName}</td><td>{formatCalendarDate(bill.issueDate)}</td><td>{formatCalendarDate(bill.dueDate)}{overdue && <span className="sales-overdue">Overdue</span>}</td><td><DocumentStatus status={bill.status} document="purchase" /></td><td className="sales-table__money">{formatMoney(parseAmountToCents(bill.total))}</td><td className="sales-table__money">{formatMoney(parseAmountToCents(bill.total) - parseAmountToCents(bill.amountPaid))}</td></tr>
        })}</tbody>
      </table></div><Pagination page={current.meta.page} limit={current.meta.limit} total={current.meta.total} onPageChange={changePage} ariaLabel="Bill pagination" /></div>}
    </section>
  )
}

export default Bills
