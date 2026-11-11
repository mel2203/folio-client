import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getAccounts } from '../api/accounts.js'
import { createBill, getBill, listVendors, updateBill } from '../api/purchases.js'
import { addCalendarDays, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

const blankItem = () => ({ description: '', amount: '', accountId: '' })
const amountPattern = /^\d+(?:\.\d{1,2})?$/

function previewTotal(items) {
  return items.reduce((total, item) => total + (amountPattern.test(item.amount) ? parseAmountToCents(item.amount) : 0n), 0n)
}

function BillForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const today = useMemo(() => getTodayCalendarDate(), [])
  const [form, setForm] = useState({ vendorId: '', billNumber: '', issueDate: today, dueDate: today, notes: '', items: [blankItem()] })
  const [vendors, setVendors] = useState([])
  const [accounts, setAccounts] = useState([])
  const [initializing, setInitializing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dueDateTouched, setDueDateTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([listVendors({ active: 'true', page: 1, limit: 100 }), getAccounts({ active: true }), editing ? getBill(id) : Promise.resolve(null)])
      .then(([vendorResult, accountResult, bill]) => {
        if (!Array.isArray(vendorResult?.data) || !Array.isArray(accountResult)) throw new Error('The server returned invalid bill form options.')
        if (!alive) return
        setVendors(vendorResult.data)
        setAccounts(accountResult.filter((account) => account.isActive && ['expense', 'asset'].includes(account.type)))
        if (bill) {
          setDueDateTouched(true)
          setForm({ vendorId: bill.vendorId, billNumber: bill.billNumber, issueDate: bill.issueDate, dueDate: bill.dueDate, notes: bill.notes || '', items: bill.items.map((item) => ({ description: item.description, amount: item.amount, accountId: item.accountId })) })
        } else if (vendorResult.data.length > 0) {
          const vendor = vendorResult.data[0]
          setForm((current) => ({ ...current, vendorId: vendor.id, dueDate: addCalendarDays(today, vendor.paymentTermsDays) }))
        }
      }).catch((error) => { if (alive) setServerError(error.message || 'Unable to load bill form.') }).finally(() => { if (alive) setInitializing(false) })
    return () => { alive = false }
  }, [editing, id, today])

  function updateVendor(vendorId) {
    const vendor = vendors.find((item) => item.id === vendorId)
    setForm((current) => ({ ...current, vendorId, ...(!dueDateTouched && vendor ? { dueDate: addCalendarDays(current.issueDate, vendor.paymentTermsDays) } : {}) }))
  }
  function updateIssueDate(issueDate) {
    const vendor = vendors.find((item) => item.id === form.vendorId)
    setForm((current) => ({ ...current, issueDate, ...(!dueDateTouched && vendor ? { dueDate: addCalendarDays(issueDate, vendor.paymentTermsDays) } : {}) }))
  }
  function updateItem(index, field, value) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
    setErrors((current) => ({ ...current, [`item-${index}-${field}`]: undefined }))
  }
  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.vendorId) nextErrors.vendorId = 'Choose a vendor.'
    if (!form.billNumber.trim()) nextErrors.billNumber = 'Enter a bill number.'
    if (!form.issueDate) nextErrors.issueDate = 'Choose an issue date.'
    if (!form.dueDate) nextErrors.dueDate = 'Choose a due date.'
    form.items.forEach((item, index) => {
      if (!item.description.trim()) nextErrors[`item-${index}-description`] = 'Enter a description.'
      if (!amountPattern.test(item.amount) || parseAmountToCents(item.amount || '0') <= 0n) nextErrors[`item-${index}-amount`] = 'Enter an amount greater than zero with up to two decimal places.'
      if (!item.accountId) nextErrors[`item-${index}-accountId`] = 'Choose an active expense or asset account.'
    })
    setErrors(nextErrors)
    setServerError('')
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    try {
      const body = { vendorId: form.vendorId, billNumber: form.billNumber.trim(), issueDate: form.issueDate, dueDate: form.dueDate, notes: form.notes.trim() || null, items: form.items.map((item) => ({ description: item.description.trim(), amount: item.amount, accountId: item.accountId })) }
      const bill = editing ? await updateBill(id, body) : await createBill(body)
      navigate(`/bills/${bill.id}`)
    } catch (error) { setServerError(error.message || 'Unable to save the bill.') } finally { setSaving(false) }
  }

  if (initializing) return <LoadingState label="Loading bill form..." className="sales-state" />
  if (serverError && !vendors.length && !accounts.length) return <p className="sales-state sales-state--error" role="alert">Error: {serverError}</p>
  return <section className="sales-form-page">
    <PageHeader title={editing ? 'Edit draft bill' : 'New bill'} sub="Enter the vendor bill details and item expenses.">
      <Link className="sales-link" to="/bills">Back to bills</Link>
    </PageHeader>
    <form className="invoice-form-card" onSubmit={submit} noValidate>
      {serverError && <p className="sales-error-summary" role="alert">{serverError}</p>}
      <div className="sales-form-grid">
        <label className="sales-field">Vendor<select className="field" value={form.vendorId} onChange={(event) => updateVendor(event.target.value)} disabled={saving} aria-invalid={Boolean(errors.vendorId)}><option value="">Select a vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>{errors.vendorId && <span className="sales-inline-error">{errors.vendorId}</span>}</label>
        <label className="sales-field">Bill number<input className="field" value={form.billNumber} onChange={(event) => setForm({ ...form, billNumber: event.target.value })} disabled={saving} aria-invalid={Boolean(errors.billNumber)} />{errors.billNumber && <span className="sales-inline-error">{errors.billNumber}</span>}</label>
        <label className="sales-field">Issue date<input className="field" type="date" value={form.issueDate} onChange={(event) => updateIssueDate(event.target.value)} disabled={saving} /></label>
        <label className="sales-field">Due date<input className="field" type="date" value={form.dueDate} onChange={(event) => { setDueDateTouched(true); setForm({ ...form, dueDate: event.target.value }) }} disabled={saving} /></label>
        <label className="sales-field sales-field--wide">Notes<textarea className="field" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={saving} /></label>
      </div>
      <section className="invoice-form-section" aria-labelledby="bill-items-heading">
        <div className="sales-page__header"><h2 id="bill-items-heading">Items</h2><button className="sales-secondary-button" type="button" disabled={saving} onClick={() => setForm({ ...form, items: [...form.items, blankItem()] })}>Add line</button></div>
        <div className="sales-table-scroll"><table className="sales-table invoice-items-table"><thead><tr><th>Description</th><th>Expense or asset account</th><th className="sales-table__money">Amount</th><th><span className="visually-hidden">Remove</span></th></tr></thead><tbody>
          {form.items.map((item, index) => <tr key={index}><td><input className="field" aria-label={`Item ${index + 1} description`} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} disabled={saving} />{errors[`item-${index}-description`] && <span className="sales-inline-error">{errors[`item-${index}-description`]}</span>}</td><td><select className="field" aria-label={`Item ${index + 1} account`} value={item.accountId} onChange={(event) => updateItem(index, 'accountId', event.target.value)} disabled={saving}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select>{errors[`item-${index}-accountId`] && <span className="sales-inline-error">{errors[`item-${index}-accountId`]}</span>}</td><td><input className="field" aria-label={`Item ${index + 1} amount`} inputMode="decimal" value={item.amount} onChange={(event) => updateItem(index, 'amount', event.target.value)} disabled={saving} />{errors[`item-${index}-amount`] && <span className="sales-inline-error">{errors[`item-${index}-amount`]}</span>}</td><td><button className="invoice-line-remove" type="button" aria-label={`Remove item ${index + 1}`} disabled={saving || form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="invoice-preview" aria-live="polite" aria-label="Bill total preview"><h2>Total preview</h2><p className="invoice-preview__note">Preview only. The server returns the official total after saving.</p><div className="invoice-preview__row invoice-preview__total"><span>Total</span><strong>{formatMoney(previewTotal(form.items))}</strong></div></section>
      <div className="sales-form-actions"><Link className="sales-secondary-button" to="/bills">Cancel</Link><button className="sales-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save draft bill'}</button></div>
    </form>
  </section>
}

export default BillForm
