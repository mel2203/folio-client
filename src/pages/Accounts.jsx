import { useEffect, useState } from 'react'
import { createAccount, getAccounts, updateAccount } from '../api/accounts.js'
import './Accounts.css'

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
]

const EMPTY_FORM = { code: '', name: '', type: 'asset', parentId: '' }

function validateForm(form) {
  const errors = {}
  if (!/^\d{4,8}$/.test(form.code.trim())) {
    errors.code = 'Enter a code with 4 to 8 digits.'
  }
  if (!form.name.trim()) {
    errors.name = 'Enter an account name.'
  } else if (form.name.trim().length > 100) {
    errors.name = 'Account name must be 100 characters or fewer.'
  }
  return errors
}

function getServerFieldErrors(details) {
  if (!Array.isArray(details)) return {}
  const errors = {}
  details.forEach((detail) => {
    const field = typeof detail?.path === 'string' ? detail.path.split('.').at(-1) : ''
    if (['code', 'name', 'type', 'parentId'].includes(field) && detail.message) {
      errors[field] = detail.message
    }
  })
  return errors
}

function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    getAccounts()
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid accounts response.')
        }

        if (isMounted) setAccounts(result)
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message || 'Unable to load accounts.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  function openCreateForm() {
    setEditingAccount(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setServerError(null)
    setActionError('')
    setIsFormOpen(true)
  }

  function openEditForm(account) {
    setEditingAccount(account)
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId ?? '',
    })
    setFieldErrors({})
    setServerError(null)
    setActionError('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingAccount(null)
    setServerError(null)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setServerError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validation = validateForm(form)
    setFieldErrors(validation)
    setServerError(null)
    if (Object.keys(validation).length > 0) return

    const fields = {
      code: form.code.trim(),
      name: form.name.trim(),
    }

    setIsSaving(true)
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          ...fields,
          parentId: form.parentId || null,
        })
      } else {
        await createAccount({
          ...fields,
          type: form.type,
          ...(form.parentId ? { parentId: form.parentId } : {}),
        })
      }
      setIsFormOpen(false)
      setEditingAccount(null)
      setIsLoading(true)
      setError('')
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setFieldErrors(getServerFieldErrors(requestError.details))
      setServerError({
        message: requestError.message || 'Unable to save the account.',
        details: Array.isArray(requestError.details) ? requestError.details : [],
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleAccount(account) {
    const nextAction = account.isActive ? 'deactivate' : 'reactivate'
    const confirmation = account.isActive
      ? `Deactivate ${account.code} — ${account.name}? It will remain in reports and journal history.`
      : `Reactivate ${account.code} — ${account.name}?`
    if (!window.confirm(confirmation)) return

    setActionError('')
    try {
      await updateAccount(account.id, { isActive: !account.isActive })
      setIsLoading(true)
      setError('')
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setActionError(requestError.message || `Unable to ${nextAction} this account.`)
    }
  }

  const visibleAccounts = accounts.filter((account) => {
    if (statusFilter === 'active') return account.isActive
    if (statusFilter === 'inactive') return !account.isActive
    return true
  })

  return (
    <section className="accounts-page">
      <header className="accounts-page__header">
        <div>
          <h1>Chart of accounts</h1>
          <p>Accounts available to your company.</p>
        </div>
        <button className="accounts-primary-button" type="button" onClick={openCreateForm}>
          Add account
        </button>
      </header>

      <div className="accounts-toolbar">
        <label htmlFor="accounts-status-filter">Show</label>
        <select
          id="accounts-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          disabled={isLoading || isSaving}
        >
          <option value="all">All accounts</option>
          <option value="active">Active accounts</option>
          <option value="inactive">Inactive accounts</option>
        </select>
      </div>

      {isLoading && (
        <p className="accounts-state" role="status" aria-live="polite">
          Loading accounts...
        </p>
      )}

      {!isLoading && error && (
        <p className="accounts-state accounts-state--error" role="alert" aria-live="polite">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && actionError && (
        <p className="accounts-state accounts-state--error" role="alert" aria-live="polite">
          {actionError}
        </p>
      )}

      {!isLoading && !error && visibleAccounts.length === 0 && (
        <p className="accounts-state">
          {accounts.length === 0 ? 'No accounts found.' : `No ${statusFilter} accounts found.`}
        </p>
      )}

      {!isLoading && !error && visibleAccounts.length > 0 && (
        <div className="accounts-groups">
          {ACCOUNT_TYPES.map(({ value, label }) => {
            const groupedAccounts = visibleAccounts.filter((account) => account.type === value)
            if (groupedAccounts.length === 0) return null

            return (
              <section className="accounts-group" key={value} aria-labelledby={`accounts-${value}`}>
                <h2 id={`accounts-${value}`}>{label}</h2>
                <div className="accounts-table-scroll">
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th scope="col">Code</th>
                        <th scope="col">Name</th>
                        <th scope="col">Normal balance</th>
                        <th scope="col">Parent</th>
                        <th scope="col"><span className="visually-hidden">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedAccounts.map((account) => {
                        const parent = accounts.find((item) => item.id === account.parentId)
                        return (
                          <tr
                            className={account.isActive ? '' : 'accounts-table__row--inactive'}
                            key={account.id}
                          >
                            <td>{account.code}</td>
                            <td>
                              <span>{account.name}</span>
                              {!account.isActive && (
                                <span className="accounts-table__inactive-label"> (Inactive)</span>
                              )}
                              {account.systemRole && (
                                <span className="accounts-system-badge">System</span>
                              )}
                            </td>
                            <td>{account.normalBalance}</td>
                            <td>{parent ? `${parent.code} — ${parent.name}` : '—'}</td>
                            <td className="accounts-table__actions">
                              <button
                                type="button"
                                className="accounts-text-button"
                                onClick={() => openEditForm(account)}
                                disabled={isSaving}
                                aria-label={`Edit ${account.code} ${account.name}`}
                              >
                                Edit
                              </button>
                              {!account.systemRole && (
                                <button
                                  type="button"
                                  className="accounts-text-button"
                                  onClick={() => toggleAccount(account)}
                                  disabled={isSaving}
                                  aria-label={`${account.isActive ? 'Deactivate' : 'Reactivate'} ${account.code} ${account.name}`}
                                >
                                  {account.isActive ? 'Deactivate' : 'Reactivate'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="accounts-dialog-backdrop">
          <section
            className="accounts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-form-title"
          >
            <header className="accounts-dialog__header">
              <h2 id="account-form-title">{editingAccount ? 'Edit account' : 'Add account'}</h2>
              <button type="button" className="accounts-text-button" onClick={closeForm} disabled={isSaving}>
                Cancel
              </button>
            </header>
            <form className="accounts-form" onSubmit={handleSubmit} noValidate>
              {serverError && (
                <div className="accounts-form__server-error" role="alert" aria-live="polite">
                  <p>{serverError.message}</p>
                  {serverError.details.length > 0 && (
                    <ul>
                      {serverError.details.map((detail, index) => (
                        <li key={`${detail.path ?? 'detail'}-${index}`}>
                          {detail.message ?? String(detail)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="accounts-form__field">
                <label htmlFor="account-code">Code</label>
                <input
                  id="account-code"
                  name="code"
                  value={form.code}
                  onChange={(event) => updateField('code', event.target.value)}
                  disabled={isSaving}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={fieldErrors.code ? 'account-code-error' : undefined}
                />
                {fieldErrors.code && <span id="account-code-error" className="accounts-form__field-error">{fieldErrors.code}</span>}
              </div>

              <div className="accounts-form__field">
                <label htmlFor="account-name">Name</label>
                <input
                  id="account-name"
                  name="name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  disabled={isSaving}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'account-name-error' : undefined}
                />
                {fieldErrors.name && <span id="account-name-error" className="accounts-form__field-error">{fieldErrors.name}</span>}
              </div>

              {!editingAccount && (
                <div className="accounts-form__field">
                  <label htmlFor="account-type">Type</label>
                  <select
                    id="account-type"
                    name="type"
                    value={form.type}
                    onChange={(event) => {
                      updateField('type', event.target.value)
                      updateField('parentId', '')
                    }}
                    disabled={isSaving}
                  >
                    {ACCOUNT_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="accounts-form__field">
                <label htmlFor="account-parent">Parent account (optional)</label>
                <select
                  id="account-parent"
                  name="parentId"
                  value={form.parentId}
                  onChange={(event) => updateField('parentId', event.target.value)}
                  disabled={isSaving}
                  aria-invalid={Boolean(fieldErrors.parentId)}
                  aria-describedby={fieldErrors.parentId ? 'account-parent-error' : undefined}
                >
                  <option value="">No parent</option>
                  {accounts
                    .filter((account) => account.type === form.type && account.id !== editingAccount?.id)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}{account.isActive ? '' : ' (Inactive)'}
                      </option>
                    ))}
                </select>
                {fieldErrors.parentId && <span id="account-parent-error" className="accounts-form__field-error">{fieldErrors.parentId}</span>}
              </div>

              <footer className="accounts-form__actions">
                <button type="button" className="accounts-secondary-button" onClick={closeForm} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="accounts-primary-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingAccount ? 'Save changes' : 'Create account'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default Accounts
