import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createCustomer, listCustomers, updateCustomer } from '../api/sales.js'
import { createVendor, listVendors, updateVendor } from '../api/purchases.js'
import Pagination from '../components/Pagination.jsx'
import '../components/Sales.css'

const PAGE_SIZE = 20
const EMPTY_FORM = { name: '', email: '', phone: '', address: '', paymentTermsDays: '30' }

function ContactDirectoryPage({ kind = 'customer' }) {
  const isVendor = kind === 'vendor'
  const entity = isVendor ? 'vendor' : 'customer'
  const plural = isVendor ? 'vendors' : 'customers'
  const title = isVendor ? 'Vendors' : 'Customers'
  const listContacts = isVendor ? listVendors : listCustomers
  const createContact = isVendor ? createVendor : createCustomer
  const updateContact = isVendor ? updateVendor : updateCustomer
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const active = searchParams.get('active') || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const requestKey = JSON.stringify({ search, active, page })
  const [responseState, setResponseState] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const current = responseState?.key === requestKey ? responseState : null
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldError, setFieldError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingContactIds, setPendingContactIds] = useState(() => new Set())

  useEffect(() => {
    let alive = true
    listContacts({ search, active, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!Array.isArray(result?.data) || !result.meta) throw new Error(`The server returned an invalid ${entity} response.`)
        if (alive) setResponseState({ key: requestKey, data: result.data, meta: result.meta, error: '' })
      })
      .catch((error) => {
        if (alive) setResponseState({ key: requestKey, data: [], meta: null, error: error.message || `Unable to load ${plural}.` })
      })
    return () => { alive = false }
  }, [active, entity, listContacts, page, plural, refreshKey, requestKey, search])

  function applyFilters(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    if (data.get('search')) next.set('search', data.get('search').trim())
    if (data.get('active')) next.set('active', data.get('active'))
    next.set('page', '1')
    setSearchParams(next)
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFieldError('')
    setActionError('')
    setModalOpen(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name || '', email: customer.email || '', phone: customer.phone || '',
      address: customer.address || '', paymentTermsDays: String(customer.paymentTermsDays ?? 30),
    })
    setFieldError('')
    setActionError('')
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setFieldError(`Enter a ${entity} name.`)
      return
    }
    const terms = Number.parseInt(form.paymentTermsDays, 10)
    if (!Number.isInteger(terms) || terms < 0 || terms > 3650) {
      setFieldError('Payment terms must be between 0 and 3650 days.')
      return
    }
    setFieldError('')
    setActionError('')
    setSaving(true)
    const body = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      paymentTermsDays: terms,
    }
    try {
      if (editing) await updateContact(editing.id, body)
      else await createContact(body)
      setModalOpen(false)
      const next = new URLSearchParams(searchParams)
      next.set('page', '1')
      setSearchParams(next)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setActionError(error.message || `Unable to save this ${entity}.`)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(customer) {
    if (pendingContactIds.has(customer.id)) return
    const action = customer.isActive ? 'deactivate' : 'reactivate'
    if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${customer.name}?`)) return
    setActionError('')
    setPendingContactIds((currentIds) => new Set(currentIds).add(customer.id))
    try {
      await updateContact(customer.id, { isActive: !customer.isActive })
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setActionError(error.message || `Unable to ${action} this ${entity}.`)
    } finally {
      setPendingContactIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(customer.id)
        return nextIds
      })
    }
  }

  const loading = current === null

  return (
    <section className="sales-page customers-page">
      <header className="sales-page__header">
        <div><h1>{title}</h1><p>Manage {entity} contact details and payment terms.</p></div>
        <button className="sales-primary-button" type="button" onClick={openCreate}>Add {entity}</button>
      </header>

      <form className="sales-filters" onSubmit={applyFilters} key={requestKey}>
        <label className="sales-field">Search<input name="search" defaultValue={search} placeholder="Name or email" /></label>
        <label className="sales-field">Status
          <select name="active" defaultValue={active}>
            <option value="">All {plural}</option><option value="true">Active</option><option value="false">Inactive</option>
          </select>
        </label>
        <button className="sales-secondary-button" type="submit">Apply filters</button>
      </form>

      {actionError && !modalOpen && <p className="sales-state sales-state--error" role="alert">{actionError}</p>}
      {loading && <p className="sales-state" role="status" aria-live="polite">Loading {plural}...</p>}
      {!loading && current.error && <p className="sales-state sales-state--error" role="alert">Error: {current.error}</p>}
      {!loading && !current.error && current.data.length === 0 && <p className="sales-state">No {plural} found.</p>}
      {!loading && !current.error && current.data.length > 0 && (
        <div className="sales-card">
          <div className="sales-table-scroll">
            <table className="sales-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Terms</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {current.data.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td><td>{customer.email || '—'}</td><td>{customer.phone || '—'}</td>
                    <td>{customer.paymentTermsDays} days</td><td>{customer.isActive ? 'Active' : 'Inactive'}</td>
                    <td><div className="sales-actions">
                      <button className="sales-secondary-button" type="button" onClick={() => openEdit(customer)}>Edit</button>
                      <button className="sales-secondary-button" type="button" disabled={pendingContactIds.has(customer.id)} onClick={() => toggleActive(customer)}>
                        {pendingContactIds.has(customer.id)
                          ? customer.isActive ? 'Deactivating...' : 'Reactivating...'
                          : customer.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={current.meta.page} limit={current.meta.limit} total={current.meta.total} onPageChange={changePage} ariaLabel={`${title} pagination`} />
        </div>
      )}

      {modalOpen && (
        <div className="sales-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false) }}>
          <section className="sales-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-form-title">
            <h2 id="contact-form-title">{editing ? `Edit ${entity}` : `Add ${entity}`}</h2>
            {actionError && <p className="sales-error-summary" role="alert">{actionError}</p>}
            <form onSubmit={submit}>
              <div className="sales-form-grid">
                <label className="sales-field sales-field--wide">Name
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} aria-invalid={Boolean(fieldError && !form.name.trim())} />
                  {fieldError && !form.name.trim() && <span className="sales-inline-error">{fieldError}</span>}
                </label>
                <label className="sales-field">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label className="sales-field">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className="sales-field">Payment terms (days)<input type="number" min="0" max="3650" value={form.paymentTermsDays} onChange={(event) => setForm({ ...form, paymentTermsDays: event.target.value })} /></label>
                <label className="sales-field sales-field--wide">Address<textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
              </div>
              {fieldError && form.name.trim() && <p className="sales-inline-error" role="alert">{fieldError}</p>}
              <div className="sales-dialog__actions">
                <button className="sales-secondary-button" type="button" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="sales-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : `Save ${entity}`}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default ContactDirectoryPage
