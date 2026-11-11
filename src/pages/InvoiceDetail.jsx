import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAccounts } from '../api/accounts.js'
import { deleteInvoice, getInvoice, recordInvoicePayment, sendInvoice, voidInvoice } from '../api/sales.js'
import SalesStatus from '../components/SalesStatus.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatCalendarDate, getTodayCalendarDate } from '../utils/calendar-date.js'
import { centsToAmount, formatMoney, formatMoneyString, parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { company } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ paymentDate: getTodayCalendarDate(), amount: '', method: 'bank_transfer', reference: '', depositAccountId: '' })

  useEffect(() => {
    let alive = true
    getInvoice(id)
      .then((result) => { if (alive) { setInvoice(result); setError('') } })
      .catch((requestError) => { if (alive) setError(requestError.message || 'Unable to load the invoice.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    let alive = true
    getAccounts({ active: true })
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('The server returned an invalid accounts response.')
        if (alive) setAccounts(result.filter((account) => account.type === 'asset' && account.isActive))
      })
      .catch((requestError) => {
        if (alive) {
          setAccounts([])
          setAccountsError(requestError.message || 'Unable to load deposit accounts.')
        }
      })
      .finally(() => { if (alive) setAccountsLoading(false) })
    return () => { alive = false }
  }, [])

  async function runAction(action) {
    setBusy(true)
    setActionError('')
    try {
      const result = await action()
      setInvoice(result)
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to update the invoice.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this draft invoice? This cannot be undone.')) return
    setBusy(true)
    setActionError('')
    try {
      await deleteInvoice(id)
      navigate('/invoices', { replace: true })
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to delete this draft invoice.')
    } finally { setBusy(false) }
  }

  function openPayment() {
    if (!accounts.length) {
      setActionError('No active asset account is available for depositing this payment.')
      return
    }
    const remaining = parseAmountToCents(invoice.total) - parseAmountToCents(invoice.amountPaid)
    setPaymentForm({
      paymentDate: getTodayCalendarDate(),
      amount: centsToAmount(remaining),
      method: 'bank_transfer',
      reference: '',
      depositAccountId: accounts[0].id,
    })
    setActionError('')
    setPaymentOpen(true)
  }

  async function submitPayment(event) {
    event.preventDefault()
    if (!/^\d+(?:\.\d{1,2})?$/.test(paymentForm.amount) || parseAmountToCents(paymentForm.amount) <= 0n) {
      setActionError('Enter a payment amount greater than zero with up to two decimal places.')
      return
    }
    setBusy(true)
    setActionError('')
    try {
      const result = await recordInvoicePayment(id, {
        paymentDate: paymentForm.paymentDate,
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || null,
        depositAccountId: paymentForm.depositAccountId,
      })
      setInvoice(result.invoice)
      setPaymentOpen(false)
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to record this payment.')
    } finally { setBusy(false) }
  }

  if (loading) return <LoadingState label="Loading invoice..." className="sales-state" />
  if (error || !invoice) return <p className="sales-state sales-state--error" role="alert">Error: {error || 'Invoice not found.'}</p>

  const isOverdue = ['sent', 'partial'].includes(invoice.status) && invoice.dueDate < getTodayCalendarDate()

  return (
    <section className="invoice-detail sales-page">
      <header className="invoice-detail__header">
        <div>
          <h1>{invoice.invoiceNumber || 'Draft invoice'}</h1>
          <p>{invoice.customer.name}</p>
        </div>
        <Link className="sales-link" to="/invoices">Back to invoices</Link>
      </header>
      <div className="invoice-detail-card">
        <div className="invoice-detail__print-header">
          <div>
            <p className="invoice-detail__company">{company?.name || 'Folio'}</p>
            <p>Issue date: {formatCalendarDate(invoice.issueDate)} · Due date: {formatCalendarDate(invoice.dueDate)}</p>
          </div>
          <div className="invoice-detail__document-title">
            <h1>Invoice</h1>
            <p>{invoice.invoiceNumber || 'Draft invoice'}</p>
            <SalesStatus status={invoice.status} />
          </div>
        </div>
        {actionError && <p className="sales-error-summary" role="alert">{actionError}</p>}
        {accountsLoading && <LoadingState label="Loading deposit accounts..." className="folio-loading-state--inline" />}
        {accountsError && <p className="sales-error-summary" role="alert">Unable to load deposit accounts: {accountsError} Reload the page to try again.</p>}
        <div className="invoice-detail__actions">
          <SalesStatus status={invoice.status} />
          {isOverdue && <span className="sales-overdue">Overdue</span>}
          {invoice.status === 'draft' && <>
            <Link className="sales-secondary-button" to={`/invoices/${id}/edit`}>Edit draft</Link>
            <button className="sales-secondary-button" type="button" disabled={busy} onClick={handleDelete}>Delete draft</button>
            <button className="sales-primary-button" type="button" disabled={busy} onClick={() => runAction(() => sendInvoice(id))}>{busy ? 'Sending...' : 'Send invoice'}</button>
          </>}
          {['sent', 'partial'].includes(invoice.status) && <button className="sales-primary-button" type="button" disabled={busy || accountsLoading || Boolean(accountsError)} onClick={openPayment}>Record payment</button>}
          {invoice.status === 'sent' && invoice.amountPaid === '0.00' && (
            <button className="sales-danger-button" type="button" disabled={busy} onClick={() => setVoidOpen(true)}>Void invoice</button>
          )}
          <button className="sales-secondary-button" type="button" onClick={() => window.print()}>Print</button>
        </div>

        <div className="invoice-detail__overview">
          <div><span className="invoice-detail__label">Bill to</span><strong>{invoice.customer.name}</strong><br /><span>{invoice.customer.email || ''}</span></div>
          <div><span className="invoice-detail__label">Issued</span><strong>{formatCalendarDate(invoice.issueDate)}</strong></div>
          <div><span className="invoice-detail__label">Due</span><strong>{formatCalendarDate(invoice.dueDate)}</strong></div>
          <div><span className="invoice-detail__label">Invoice number</span><strong>{invoice.invoiceNumber || 'Not assigned until sent'}</strong></div>
          <div><span className="invoice-detail__label">Amount paid</span><strong>{formatMoneyString(invoice.amountPaid)}</strong></div>
          <div><span className="invoice-detail__label">Outstanding</span><strong>{formatMoney(parseAmountToCents(invoice.total) - parseAmountToCents(invoice.amountPaid))}</strong></div>
        </div>

        <section className="invoice-detail__section" aria-labelledby="invoice-detail-items-title">
          <h2 id="invoice-detail-items-title">Invoice items</h2>
          <div className="sales-table-scroll">
            <table className="sales-table ledger-table">
              <thead><tr><th>Description</th><th>Revenue account</th><th>Quantity</th><th className="sales-table__money">Unit price</th><th className="sales-table__money">Tax</th><th className="sales-table__money">Line total</th></tr></thead>
              <tbody>{invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td><td>{item.revenueAccountCode} — {item.revenueAccountName}</td><td>{item.quantity}</td>
                  <td className="sales-table__money num">{formatMoneyString(item.unitPrice)}</td>
                  <td className="sales-table__money num">{formatMoneyString(item.lineTax)}</td>
                  <td className="sales-table__money num">{formatMoneyString(item.lineTotal)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="invoice-detail__totals">
            <p><span>Subtotal</span><strong>{formatMoneyString(invoice.subtotal)}</strong></p>
            <p><span>Tax</span><strong>{formatMoneyString(invoice.taxTotal)}</strong></p>
            <p className="invoice-detail__total"><span>Total</span><strong>{formatMoneyString(invoice.total)}</strong></p>
          </div>
        </section>

        {invoice.notes && <section className="invoice-detail__section"><h2>Notes</h2><p>{invoice.notes}</p></section>}
        <section className="invoice-detail__section" aria-labelledby="invoice-journal-title">
          <h2 id="invoice-journal-title">Journal entries</h2>
          {invoice.journalEntryId
            ? <p>Invoice posting: <Link className="sales-link" to={`/journal/${invoice.journalEntryId}`}>View journal entry</Link></p>
            : <p className="sales-muted">No entry until this draft is sent.</p>}
          {invoice.reversalEntryId && <p>Void reversal: <Link className="sales-link" to={`/journal/${invoice.reversalEntryId}`}>View reversal entry</Link></p>}
        </section>
        <section className="invoice-detail__section" aria-labelledby="invoice-payments-title">
          <h2 id="invoice-payments-title">Payments</h2>
          {invoice.payments.length === 0 ? <EmptyState title="No payments recorded." className="folio-empty-state--inline" /> : (
            <div className="sales-table-scroll"><table className="sales-table ledger-table">
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="sales-table__money">Amount</th><th>Journal entry</th></tr></thead>
              <tbody>{invoice.payments.map((payment) => <tr key={payment.id}>
                <td>{formatCalendarDate(payment.paymentDate)}</td><td>{payment.method}</td><td>{payment.reference || '—'}</td>
                <td className="sales-table__money num">{formatMoneyString(payment.amount)}</td>
                <td><Link className="sales-link" to={`/journal/${payment.journalEntryId}`}>View entry</Link></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </section>
      </div>

      {voidOpen && (
        <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
          <DialogContent className="sales-dialog">
            <DialogHeader>
              <DialogTitle>Void invoice?</DialogTitle>
              <DialogDescription>A reversing journal entry will be posted. The original invoice and its journal entry will remain in the records.</DialogDescription>
            </DialogHeader>
            <div className="sales-dialog__actions">
              <button className="sales-secondary-button" type="button" disabled={busy} onClick={() => setVoidOpen(false)}>Cancel</button>
              <button className="sales-danger-button" type="button" disabled={busy} onClick={() => {
                setVoidOpen(false)
                runAction(() => voidInvoice(id))
              }}>{busy ? 'Voiding...' : 'Confirm void'}</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {paymentOpen && (
        <Dialog open={paymentOpen} onOpenChange={(open) => { if (!busy) setPaymentOpen(open) }}>
          <DialogContent className="sales-dialog">
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Enter the date, amount, and deposit account for this payment.</DialogDescription>
            </DialogHeader>
            {actionError && <p className="sales-error-summary" role="alert">{actionError}</p>}
            <form onSubmit={submitPayment}>
              <div className="sales-form-grid">
                <label className="sales-field">Payment date<input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required disabled={busy} /></label>
                <label className="sales-field">Amount<input inputMode="decimal" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required disabled={busy} /></label>
                <label className="sales-field">Method<input value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })} required disabled={busy} /></label>
                <label className="sales-field">Deposit account<select value={paymentForm.depositAccountId} onChange={(event) => setPaymentForm({ ...paymentForm, depositAccountId: event.target.value })} required disabled={busy}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>
                <label className="sales-field sales-field--wide">Reference<input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} disabled={busy} /></label>
              </div>
              <div className="sales-dialog__actions">
                <button className="sales-secondary-button" type="button" disabled={busy} onClick={() => setPaymentOpen(false)}>Cancel</button>
                <button className="sales-primary-button" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save payment'}</button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}

export default InvoiceDetail
