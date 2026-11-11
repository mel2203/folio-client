import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAccounts } from '../api/accounts.js'
import { createInvoice, getInvoice, listCustomers, updateInvoice } from '../api/sales.js'
import { addCalendarDays, getTodayCalendarDate } from '../utils/calendar-date.js'
import { formatMoney, parseAmountToCents } from '../utils/money.js'
import '../components/Sales.css'

const blankItem = () => ({ description: '', quantity: '1.00', unitPrice: '0.00', taxRate: '0.00', revenueAccountId: '' })

function toHundredths(value) {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

function roundHalfUp(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator
}

function getPreview(items) {
  let subtotal = 0n
  let tax = 0n
  const lines = items.map((item) => {
    if (!/^\d+(?:\.\d{1,2})?$/.test(item.quantity)
      || !/^\d+(?:\.\d{1,2})?$/.test(item.unitPrice)
      || !/^\d+(?:\.\d{1,2})?$/.test(item.taxRate)) return null
    const net = roundHalfUp(toHundredths(item.quantity) * parseAmountToCents(item.unitPrice), 100n)
    const itemTax = roundHalfUp(net * toHundredths(item.taxRate), 10000n)
    subtotal += net
    tax += itemTax
    return { net, tax: itemTax, total: net + itemTax }
  })
  return { subtotal, tax, total: subtotal + tax, lines }
}

function validateInvoice(form) {
  const errors = {}
  if (!form.customerId) errors.customerId = 'Choose a customer.'
  if (!form.issueDate) errors.issueDate = 'Choose an issue date.'
  if (!form.dueDate) errors.dueDate = 'Choose a due date.'
  form.items.forEach((item, index) => {
    if (!item.description.trim()) errors[`item-${index}-description`] = 'Enter a description.'
    if (!/^\d+(?:\.\d{1,2})?$/.test(item.quantity) || toHundredths(item.quantity || '0') <= 0n) errors[`item-${index}-quantity`] = 'Enter a quantity greater than zero with up to two decimal places.'
    if (!/^\d+(?:\.\d{1,2})?$/.test(item.unitPrice)) errors[`item-${index}-unitPrice`] = 'Enter a price with up to two decimal places.'
    if (!/^\d{1,2}(?:\.\d{1,2})?$|^100(?:\.0{1,2})?$/.test(item.taxRate)
      || (item.taxRate && toHundredths(item.taxRate) > 10000n)) errors[`item-${index}-taxRate`] = 'Enter a tax rate from 0 to 100.'
    if (!item.revenueAccountId) errors[`item-${index}-revenueAccountId`] = 'Choose an active revenue account.'
  })
  return errors
}

function InvoiceForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const today = useMemo(() => getTodayCalendarDate(), [])
  const [form, setForm] = useState({ customerId: '', issueDate: today, dueDate: today, notes: '', items: [blankItem()] })
  const [customers, setCustomers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [initializing, setInitializing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dueDateTouched, setDueDateTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      listCustomers({ active: 'true', page: 1, limit: 100 }),
      getAccounts({ active: true }),
      editing ? getInvoice(id) : Promise.resolve(null),
    ])
      .then(([customerResult, accountResult, invoice]) => {
        if (!Array.isArray(customerResult?.data) || !Array.isArray(accountResult)) {
          throw new Error('The server returned invalid invoice form options.')
        }
        if (!alive) return
        setCustomers(customerResult.data)
        setAccounts(accountResult.filter((account) => account.type === 'revenue' && account.isActive))
        if (invoice) {
          setDueDateTouched(true)
          setForm({
            customerId: invoice.customerId,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            notes: invoice.notes || '',
            items: invoice.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              revenueAccountId: item.revenueAccountId,
            })),
          })
        } else if (customerResult.data.length > 0) {
          const customer = customerResult.data[0]
          setForm((current) => ({ ...current, customerId: customer.id, dueDate: addCalendarDays(today, customer.paymentTermsDays) }))
        }
      })
      .catch((error) => { if (alive) setServerError(error.message || 'Unable to load invoice form.') })
      .finally(() => { if (alive) setInitializing(false) })
    return () => { alive = false }
  }, [editing, id, today])

  const preview = useMemo(() => {
    try { return getPreview(form.items) } catch { return null }
  }, [form.items])

  function updateCustomer(customerId) {
    const customer = customers.find((item) => item.id === customerId)
    setForm((current) => ({
      ...current,
      customerId,
      ...(!dueDateTouched && customer ? { dueDate: addCalendarDays(current.issueDate, customer.paymentTermsDays) } : {}),
    }))
  }

  function updateIssueDate(issueDate) {
    const customer = customers.find((item) => item.id === form.customerId)
    setForm((current) => ({
      ...current,
      issueDate,
      ...(!dueDateTouched && customer ? { dueDate: addCalendarDays(issueDate, customer.paymentTermsDays) } : {}),
    }))
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
    setErrors((current) => ({ ...current, [`item-${index}-${field}`]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const validation = validateInvoice(form)
    setErrors(validation)
    setServerError('')
    if (Object.keys(validation).length > 0) return
    setSaving(true)
    const body = {
      customerId: form.customerId,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: form.notes.trim() || null,
      items: form.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        revenueAccountId: item.revenueAccountId,
      })),
    }
    try {
      const invoice = editing ? await updateInvoice(id, body) : await createInvoice(body)
      navigate(`/invoices/${invoice.id}`)
    } catch (error) {
      setServerError(error.message || 'Unable to save the invoice.')
    } finally {
      setSaving(false)
    }
  }

  if (initializing) return <p className="sales-state" role="status">Loading invoice form...</p>
  if (serverError && customers.length === 0 && accounts.length === 0) return <p className="sales-state sales-state--error" role="alert">Error: {serverError}</p>

  return (
    <section className="sales-form-page invoice-form-page">
      <header className="sales-form-page__header">
        <div><h1>{editing ? 'Edit draft invoice' : 'New invoice'}</h1><p>Invoice totals are calculated from the line items.</p></div>
        <Link className="sales-link" to="/invoices">Back to invoices</Link>
      </header>
      <form className="invoice-form-card" onSubmit={submit} noValidate>
        {serverError && <p className="sales-error-summary" role="alert">{serverError}</p>}
        <div className="sales-form-grid">
          <label className="sales-field">Customer
            <select value={form.customerId} onChange={(event) => updateCustomer(event.target.value)} disabled={saving} aria-invalid={Boolean(errors.customerId)}>
              <option value="">Select a customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            {errors.customerId && <span className="sales-inline-error">{errors.customerId}</span>}
          </label>
          <label className="sales-field">Issue date
            <input type="date" value={form.issueDate} onChange={(event) => updateIssueDate(event.target.value)} disabled={saving} aria-invalid={Boolean(errors.issueDate)} />
            {errors.issueDate && <span className="sales-inline-error">{errors.issueDate}</span>}
          </label>
          <label className="sales-field">Due date
            <input type="date" value={form.dueDate} onChange={(event) => { setDueDateTouched(true); setForm((current) => ({ ...current, dueDate: event.target.value })) }} disabled={saving} aria-invalid={Boolean(errors.dueDate)} />
            {errors.dueDate && <span className="sales-inline-error">{errors.dueDate}</span>}
          </label>
          <label className="sales-field sales-field--wide">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} disabled={saving} /></label>
        </div>

        <section className="invoice-form-section" aria-labelledby="invoice-items-heading">
          <div className="sales-page__header"><h2 id="invoice-items-heading">Items</h2><button className="sales-secondary-button" type="button" disabled={saving} onClick={() => setForm((current) => ({ ...current, items: [...current.items, blankItem()] }))}>Add line</button></div>
          <div className="sales-table-scroll">
            <table className="sales-table invoice-items-table">
              <thead><tr><th>Description</th><th>Revenue account</th><th>Quantity</th><th>Unit price</th><th>Tax %</th><th className="sales-table__money">Net</th><th className="sales-table__money">Tax</th><th><span className="visually-hidden">Remove</span></th></tr></thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td><input aria-label={`Item ${index + 1} description`} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} disabled={saving} />{errors[`item-${index}-description`] && <span className="sales-inline-error">{errors[`item-${index}-description`]}</span>}</td>
                    <td><select aria-label={`Item ${index + 1} revenue account`} value={item.revenueAccountId} onChange={(event) => updateItem(index, 'revenueAccountId', event.target.value)} disabled={saving}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select>{errors[`item-${index}-revenueAccountId`] && <span className="sales-inline-error">{errors[`item-${index}-revenueAccountId`]}</span>}</td>
                    <td><input aria-label={`Item ${index + 1} quantity`} inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} disabled={saving} />{errors[`item-${index}-quantity`] && <span className="sales-inline-error">{errors[`item-${index}-quantity`]}</span>}</td>
                    <td><input aria-label={`Item ${index + 1} unit price`} inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} disabled={saving} />{errors[`item-${index}-unitPrice`] && <span className="sales-inline-error">{errors[`item-${index}-unitPrice`]}</span>}</td>
                    <td><input aria-label={`Item ${index + 1} tax rate`} inputMode="decimal" value={item.taxRate} onChange={(event) => updateItem(index, 'taxRate', event.target.value)} disabled={saving} />{errors[`item-${index}-taxRate`] && <span className="sales-inline-error">{errors[`item-${index}-taxRate`]}</span>}</td>
                    <td className="sales-table__money">{preview?.lines[index] ? formatMoney(preview.lines[index].net) : '—'}</td>
                    <td className="sales-table__money">{preview?.lines[index] ? formatMoney(preview.lines[index].tax) : '—'}</td>
                    <td><button className="invoice-line-remove" type="button" aria-label={`Remove item ${index + 1}`} disabled={saving || form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="invoice-preview" aria-live="polite" aria-label="Invoice totals preview">
          <h2>Totals preview</h2>
          <p className="invoice-preview__note">Preview only. The server calculates and returns the official totals after saving.</p>
          <div className="invoice-preview__row"><span>Subtotal</span><strong>{preview ? formatMoney(preview.subtotal) : '—'}</strong></div>
          <div className="invoice-preview__row"><span>Tax</span><strong>{preview ? formatMoney(preview.tax) : '—'}</strong></div>
          <div className="invoice-preview__row invoice-preview__total"><span>Total</span><strong>{preview ? formatMoney(preview.total) : '—'}</strong></div>
        </section>
        <div className="sales-form-actions">
          <Link className="sales-secondary-button" to="/invoices">Cancel</Link>
          <button className="sales-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save draft' : 'Save draft invoice'}</button>
        </div>
      </form>
    </section>
  )
}

export default InvoiceForm
