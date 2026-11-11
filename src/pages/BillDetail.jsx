import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAccounts } from '../api/accounts.js'
import { deleteBill, getBill, postBill, recordBillPayment, voidBill } from '../api/purchases.js'
import { DocumentStatus } from '../components/SalesStatus.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { centsToAmount, formatMoney, formatMoneyString, parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

function BillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { company } = useAuth()
  const [bill, setBill] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ paymentDate: getTodayCalendarDate(), amount: '', method: 'bank_transfer', reference: '', payingAccountId: '' })

  useEffect(() => {
    let alive = true
    getBill(id).then((result) => { if (alive) { setBill(result); setError('') } }).catch((requestError) => { if (alive) setError(requestError.message || 'Unable to load the bill.') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])
  useEffect(() => {
    let alive = true
    getAccounts({ active: true }).then((result) => { if (alive && Array.isArray(result)) setAccounts(result.filter((account) => account.type === 'asset' && account.isActive)) }).catch(() => {})
    return () => { alive = false }
  }, [])

  async function runAction(action) {
    setBusy(true); setActionError('')
    try { setBill(await action()) } catch (requestError) { setActionError(requestError.message || 'Unable to update the bill.') } finally { setBusy(false) }
  }
  async function handleDelete() {
    if (!window.confirm('Delete this draft bill? This cannot be undone.')) return
    setBusy(true); setActionError('')
    try { await deleteBill(id); navigate('/bills', { replace: true }) } catch (requestError) { setActionError(requestError.message || 'Unable to delete this draft bill.') } finally { setBusy(false) }
  }
  function openPayment() {
    if (!accounts.length) { setActionError('No active asset account is available for paying this bill.'); return }
    const remaining = parseAmountToCents(bill.total) - parseAmountToCents(bill.amountPaid)
    setPaymentForm({ paymentDate: getTodayCalendarDate(), amount: centsToAmount(remaining), method: 'bank_transfer', reference: '', payingAccountId: accounts[0].id })
    setActionError(''); setPaymentOpen(true)
  }
  async function submitPayment(event) {
    event.preventDefault()
    if (!/^\d+(?:\.\d{1,2})?$/.test(paymentForm.amount) || parseAmountToCents(paymentForm.amount) <= 0n) { setActionError('Enter a payment amount greater than zero with up to two decimal places.'); return }
    setBusy(true); setActionError('')
    try { const result = await recordBillPayment(id, { ...paymentForm, reference: paymentForm.reference.trim() || null }); setBill(result.bill); setPaymentOpen(false) }
    catch (requestError) { setActionError(requestError.message || 'Unable to record this payment.') } finally { setBusy(false) }
  }

  if (loading) return <p className="sales-state" role="status">Loading bill...</p>
  if (error || !bill) return <p className="sales-state sales-state--error" role="alert">Error: {error || 'Bill not found.'}</p>
  const overdue = ['open', 'partial'].includes(bill.status) && bill.dueDate < getTodayCalendarDate()
  return <section className="invoice-detail sales-page bill-detail">
    <header className="invoice-detail__header"><div><h1>{bill.billNumber}</h1><p>{bill.vendor.name}</p></div><Link className="sales-link" to="/bills">Back to bills</Link></header>
    <div className="invoice-detail__print-header"><p>{company?.name || 'Folio'}</p><h1>{bill.billNumber}</h1><p>Issue date: {formatCalendarDate(bill.issueDate)} · Due date: {formatCalendarDate(bill.dueDate)}</p></div>
    <div className="invoice-detail-card">
      {actionError && <p className="sales-error-summary" role="alert">{actionError}</p>}
      <div className="invoice-detail__actions"><DocumentStatus status={bill.status} document="purchase" />{overdue && <span className="sales-overdue">Overdue</span>}
        {bill.status === 'draft' && <><Link className="sales-secondary-button" to={`/bills/${id}/edit`}>Edit draft</Link><button className="sales-secondary-button" type="button" disabled={busy} onClick={handleDelete}>Delete draft</button><button className="sales-primary-button" type="button" disabled={busy} onClick={() => runAction(() => postBill(id))}>{busy ? 'Posting...' : 'Post bill'}</button></>}
        {['open', 'partial'].includes(bill.status) && <button className="sales-primary-button" type="button" disabled={busy} onClick={openPayment}>Record payment</button>}
        {bill.status === 'open' && bill.amountPaid === '0.00' && <button className="sales-danger-button" type="button" disabled={busy} onClick={() => { if (window.confirm('Void this unpaid bill? A reversing journal entry will be posted.')) runAction(() => voidBill(id)) }}>Void bill</button>}
        <button className="sales-secondary-button" type="button" onClick={() => window.print()}>Print</button>
      </div>
      <div className="invoice-detail__overview"><div><span className="invoice-detail__label">Vendor</span><strong>{bill.vendor.name}</strong><br /><span>{bill.vendor.email || ''}</span></div><div><span className="invoice-detail__label">Issue date</span><strong>{formatCalendarDate(bill.issueDate)}</strong></div><div><span className="invoice-detail__label">Due date</span><strong>{formatCalendarDate(bill.dueDate)}</strong></div><div><span className="invoice-detail__label">Bill number</span><strong>{bill.billNumber}</strong></div><div><span className="invoice-detail__label">Amount paid</span><strong>{formatMoneyString(bill.amountPaid)}</strong></div><div><span className="invoice-detail__label">Outstanding</span><strong>{formatMoney(parseAmountToCents(bill.total) - parseAmountToCents(bill.amountPaid))}</strong></div></div>
      <section className="invoice-detail__section"><h2>Bill items</h2><div className="sales-table-scroll"><table className="sales-table"><thead><tr><th>Description</th><th>Account</th><th className="sales-table__money">Amount</th></tr></thead><tbody>{bill.items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.accountCode} — {item.accountName}</td><td className="sales-table__money">{formatMoneyString(item.amount)}</td></tr>)}</tbody></table></div><div className="invoice-detail__totals"><p className="invoice-detail__total"><span>Total</span><strong>{formatMoneyString(bill.total)}</strong></p></div></section>
      {bill.notes && <section className="invoice-detail__section"><h2>Notes</h2><p>{bill.notes}</p></section>}
      <section className="invoice-detail__section"><h2>Journal entries</h2>{bill.journalEntryId ? <p>Bill posting: <Link className="sales-link" to={`/journal/${bill.journalEntryId}`}>View journal entry</Link></p> : <p className="sales-muted">No entry until this draft is posted.</p>}{bill.reversalEntryId && <p>Void reversal: <Link className="sales-link" to={`/journal/${bill.reversalEntryId}`}>View reversal entry</Link></p>}</section>
      <section className="invoice-detail__section"><h2>Payments</h2>{bill.payments.length === 0 ? <p className="sales-muted">No payments recorded.</p> : <div className="sales-table-scroll"><table className="sales-table"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="sales-table__money">Amount</th><th>Journal entry</th></tr></thead><tbody>{bill.payments.map((payment) => <tr key={payment.id}><td>{formatCalendarDate(payment.paymentDate)}</td><td>{payment.method}</td><td>{payment.reference || '—'}</td><td className="sales-table__money">{formatMoneyString(payment.amount)}</td><td><Link className="sales-link" to={`/journal/${payment.journalEntryId}`}>View entry</Link></td></tr>)}</tbody></table></div>}</section>
    </div>
    {paymentOpen && <div className="sales-dialog-backdrop" role="presentation"><section className="sales-dialog" role="dialog" aria-modal="true" aria-labelledby="record-bill-payment-title"><h2 id="record-bill-payment-title">Record payment</h2>{actionError && <p className="sales-error-summary" role="alert">{actionError}</p>}<form onSubmit={submitPayment}><div className="sales-form-grid"><label className="sales-field">Payment date<input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required disabled={busy} /></label><label className="sales-field">Amount<input inputMode="decimal" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required disabled={busy} /></label><label className="sales-field">Method<input value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })} required disabled={busy} /></label><label className="sales-field">Paying account<select value={paymentForm.payingAccountId} onChange={(event) => setPaymentForm({ ...paymentForm, payingAccountId: event.target.value })} required disabled={busy}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label><label className="sales-field sales-field--wide">Reference<input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} disabled={busy} /></label></div><div className="sales-dialog__actions"><button className="sales-secondary-button" type="button" disabled={busy} onClick={() => setPaymentOpen(false)}>Cancel</button><button className="sales-primary-button" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save payment'}</button></div></form></section></div>}
  </section>
}

export default BillDetail
