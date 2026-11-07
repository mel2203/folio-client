import { useEffect, useState } from 'react'
import { getAccounts } from '../api/accounts.js'
import './Accounts.css'

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
]

function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getAccounts()
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid accounts response.')
        }

        if (isMounted) {
          setAccounts(result)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.message || 'Unable to load accounts.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="accounts-page">
      <header className="accounts-page__header">
        <h1>Chart of accounts</h1>
        <p>Accounts available to your company.</p>
      </header>

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

      {!isLoading && !error && accounts.length === 0 && (
        <p className="accounts-state">No accounts found.</p>
      )}

      {!isLoading && !error && accounts.length > 0 && (
        <div className="accounts-groups">
          {ACCOUNT_TYPES.map(({ value, label }) => {
            const groupedAccounts = accounts.filter((account) => account.type === value)

            if (groupedAccounts.length === 0) {
              return null
            }

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
                      </tr>
                    </thead>
                    <tbody>
                      {groupedAccounts.map((account) => (
                        <tr
                          className={account.is_active ? '' : 'accounts-table__row--inactive'}
                          key={account.id}
                        >
                          <td>{account.code}</td>
                          <td>
                            {account.name}
                            {!account.is_active && (
                              <span className="accounts-table__inactive-label"> (Inactive)</span>
                            )}
                          </td>
                          <td>{account.normal_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Accounts
