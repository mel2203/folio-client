import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listBills, listVendors } from '../api/purchases.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import Pagination from '../components/Pagination.jsx'
import { DocumentStatus } from '../components/SalesStatus.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import { Button } from '../components/ui/button.jsx'
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
      <PageHeader title="Bills" sub="Record vendor bills and track payments.">
        <Button asChild><Link to="/bills/new">New bill</Link></Button>
      </PageHeader>
      <form className="sales-filters" onSubmit={applyFilters} key={requestKey}>
        <label className="sales-field">Bill number<input className="field" name="number" defaultValue={number} placeholder="BILL-0001" /></label>
        <label className="sales-field">Vendor<select className="field" name="vendorId" defaultValue={vendorId}><option value="">All vendors</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
        <label className="sales-field">Status<select className="field" name="status" defaultValue={status}><option value="">All statuses</option>{['draft', 'open', 'partial', 'paid', 'void'].map((value) => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        <label className="sales-field">From<input className="field" name="from" type="date" defaultValue={from} aria-invalid={Boolean(rangeError)} /></label>
        <label className="sales-field">To<input className="field" name="to" type="date" defaultValue={to} aria-invalid={Boolean(rangeError)} /></label>
        <Button className="sales-secondary-button" type="submit" variant="outline">Apply filters</Button>
      </form>
      {rangeError && <p className="sales-state sales-state--error" role="alert">{rangeError}</p>}
      {vendorError && <p className="sales-state sales-state--error" role="alert">{vendorError}</p>}
      {loading && <LoadingState label="Loading bills..." className="sales-state" />}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && current.data.length === 0 && <EmptyState title="No bills found." className="sales-state" />}
      {!loading && !current.error && current.data.length > 0 && <Panel className="sales-card sales-table-panel"><div className="sales-table-scroll"><table className="sales-table ledger-table">
        <thead><tr><th>Bill</th><th>Vendor</th><th>Issue date</th><th>Due date</th><th>Status</th><th className="sales-table__money">Total</th><th className="sales-table__money">Outstanding</th></tr></thead>
        <tbody>{current.data.map((bill) => {
          const overdue = ['open', 'partial'].includes(bill.status) && bill.dueDate < getTodayCalendarDate()
          return <tr key={bill.id}><td><Link to={`/bills/${bill.id}`}>{bill.billNumber}</Link></td><td>{bill.vendorName}</td><td>{formatCalendarDate(bill.issueDate)}</td><td><span className={overdue ? 'sales-due-date sales-due-date--overdue' : 'sales-due-date'}>{formatCalendarDate(bill.dueDate)}</span>{overdue && <span className="sales-overdue">Overdue</span>}</td><td><DocumentStatus status={bill.status} document="purchase" /></td><td className="sales-table__money num">{formatMoney(parseAmountToCents(bill.total))}</td><td className="sales-table__money num">{formatMoney(parseAmountToCents(bill.total) - parseAmountToCents(bill.amountPaid))}</td></tr>
        })}</tbody>
      </table></div><Pagination page={current.meta.page} limit={current.meta.limit} total={current.meta.total} onPageChange={changePage} ariaLabel="Bill pagination" /></Panel>}
    </section>
  )
}

export default Bills
