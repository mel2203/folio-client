import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDashboardSummary } from '../api/dashboard.js'
import { listInvoices } from '../api/sales.js'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { Button } from '../components/ui/button.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Stat from '../components/Stat.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatCalendarDate } from '../utils/calendar-date.js'
import { formatMoney, formatMoneyString, parseAmountToCents } from '../utils/money.js'
import './Dashboard.css'

const INVOICE_PAGE_SIZE = 100

function formatMonth(month) {
  const [year, monthNumber] = month.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[Number.parseInt(monthNumber, 10) - 1]} ${year}`
}

function chartCents(amount) {
  const cents = parseAmountToCents(amount)
  const value = Number(cents)
  if (!Number.isSafeInteger(value)) throw new RangeError('Chart amount is outside the supported range.')
  return value
}

function preparePerformance(months) {
  return months.map((month) => ({
    month: formatMonth(month.month),
    revenueCents: chartCents(month.revenue),
    expensesCents: chartCents(month.expenses),
    revenue: month.revenue,
    expenses: month.expenses,
  }))
}

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function isDashboardSummary(value) {
  return value
    && typeof value.asOf === 'string'
    && value.balances
    && ['cash', 'accountsReceivable', 'accountsPayable']
      .every((key) => typeof value.balances[key] === 'string')
    && typeof value.netIncomeThisMonth === 'string'
    && Array.isArray(value.monthlyPerformance)
    && value.monthlyPerformance.every((month) => (
      typeof month.month === 'string'
      && typeof month.revenue === 'string'
      && typeof month.expenses === 'string'
    ))
    && value.overdueInvoices
    && Number.isInteger(value.overdueInvoices.count)
    && typeof value.overdueInvoices.amount === 'string'
    && Array.isArray(value.topCustomers)
    && value.topCustomers.every((customer) => (
      typeof customer.customerId === 'string'
      && typeof customer.name === 'string'
      && typeof customer.invoicedAmount === 'string'
    ))
    && Array.isArray(value.topExpenseAccounts)
    && value.topExpenseAccounts.every((account) => (
      typeof account.accountId === 'string'
      && typeof account.code === 'string'
      && typeof account.name === 'string'
      && typeof account.amount === 'string'
    ))
}

function invoiceRowsFromResponse(response, asOf) {
  if (!Array.isArray(response?.data)) {
    throw new Error('The server returned an invalid invoices response.')
  }
  return response.data
    .filter((invoice) => ['sent', 'partial'].includes(invoice.status)
      && invoice.issueDate <= asOf
      && invoice.dueDate < asOf
      && parseAmountToCents(invoice.total) > parseAmountToCents(invoice.amountPaid))
    .map((invoice) => ({
      ...invoice,
      outstandingCents: parseAmountToCents(invoice.total) - parseAmountToCents(invoice.amountPaid),
    }))
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 5)
}

async function loadOverdueInvoices(asOf, overdueCount) {
  const targetCount = Math.min(overdueCount, 5)
  if (targetCount === 0) return []

  const statuses = ['sent', 'partial']
  const state = statuses.map((status) => ({ status, page: 1, total: null, done: false, invoices: [] }))
  const firstPages = await Promise.all(state.map(async (statusState) => {
    const response = await listInvoices({
      status: statusState.status,
      page: statusState.page,
      limit: INVOICE_PAGE_SIZE,
    })
    if (!Array.isArray(response?.data) || !Number.isInteger(response?.meta?.total)) {
      throw new Error('The server returned an invalid invoices response.')
    }
    statusState.total = response.meta.total
    statusState.invoices = invoiceRowsFromResponse(response, asOf)
    statusState.done = response.data.length === 0 || response.meta.total <= INVOICE_PAGE_SIZE
    return statusState.invoices
  }))
  const found = firstPages.flat()
  let nextStatus = 0

  while (found.length < targetCount && state.some((statusState) => !statusState.done)) {
    const statusState = state[nextStatus]
    nextStatus = (nextStatus + 1) % state.length
    if (statusState.done) continue

    statusState.page += 1
    const response = await listInvoices({
      status: statusState.status,
      page: statusState.page,
      limit: INVOICE_PAGE_SIZE,
    })
    if (!Array.isArray(response?.data) || !Number.isInteger(response?.meta?.total)) {
      throw new Error('The server returned an invalid invoices response.')
    }
    statusState.total = response.meta.total
    statusState.invoices = invoiceRowsFromResponse(response, asOf)
    statusState.done = response.data.length === 0
      || (statusState.page - 1) * INVOICE_PAGE_SIZE + response.data.length >= statusState.total
    found.push(...statusState.invoices)
  }

  return found
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 5)
}

function Dashboard() {
  const { user, company } = useAuth()
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [summaryState, setSummaryState] = useState(null)
  const [invoiceState, setInvoiceState] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const notifyOnRefresh = useRef(false)
  const summary = summaryState?.data ?? null
  const summaryError = summaryState?.error ?? ''
  const overdueInvoices = invoiceState?.data ?? null
  const overdueError = invoiceState?.error ?? ''
  const performance = useMemo(
    () => summary ? preparePerformance(summary.monthlyPerformance) : [],
    [summary],
  )
  const hasPerformance = performance.some((month) => (
    month.revenueCents !== 0 || month.expensesCents !== 0
  ))
  const incomeIsNegative = summary?.netIncomeThisMonth.startsWith('-')

  useEffect(() => {
    let active = true
    const summaryRequest = getDashboardSummary()
    const invoicesRequest = summaryRequest.then((result) => {
      if (!isDashboardSummary(result)) {
        throw new Error('The server returned an invalid dashboard response.')
      }
      return loadOverdueInvoices(result.asOf, result.overdueInvoices.count)
    })
    Promise.allSettled([summaryRequest, invoicesRequest]).then(([summaryResult, invoicesResult]) => {
      if (!active) return
      const validSummary = summaryResult.status === 'fulfilled'
        && isDashboardSummary(summaryResult.value)
      const validInvoices = invoicesResult.status === 'fulfilled'

      if (validSummary) {
        setSummaryState({ data: summaryResult.value, error: '' })
      } else if (summaryResult.status === 'fulfilled') {
        setSummaryState({ data: null, error: 'The server returned an invalid dashboard response.' })
      } else {
        setSummaryState({
          data: null,
          error: summaryResult.reason?.message || 'Unable to load the dashboard.',
        })
      }

      if (validInvoices) {
        setInvoiceState({ data: invoicesResult.value, error: '' })
      } else {
        setInvoiceState({
          data: [],
          error: invoicesResult.status === 'fulfilled'
            ? 'The server returned an invalid invoices response.'
            : invoicesResult.reason?.message || 'Unable to load overdue invoices.',
        })
      }

      setRefreshing(false)
      if (notifyOnRefresh.current) {
        const hadError = !validSummary || !validInvoices
        if (hadError) toast.error('Some dashboard information could not be refreshed.')
        else toast.success('Dashboard updated.')
        notifyOnRefresh.current = false
      }
    })
    return () => { active = false }
  }, [refreshVersion])

  function refreshDashboard() {
    setRefreshing(true)
    notifyOnRefresh.current = true
    setRefreshVersion((version) => version + 1)
  }

  const loading = summary === null && !summaryError

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Dashboard"
        sub={`${getGreeting()}${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} · ${company?.name || 'Your business'}${summary ? ` · As of ${formatCalendarDate(summary.asOf)}` : ''}`}
      >
        <Button type="button" onClick={refreshDashboard} disabled={refreshing || loading}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </PageHeader>

      {loading && (
        <div className="dashboard-skeleton" role="status" aria-live="polite">
          <span className="dashboard-sr-only">Loading dashboard…</span>
          <div className="dashboard-kpis" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => <div className="dashboard-skeleton__kpi rounded-2xl border border-border bg-card shadow-soft" key={index} />)}
          </div>
          <div className="dashboard-skeleton__panel rounded-2xl border border-border bg-card shadow-soft" aria-hidden="true" />
          <div className="dashboard-skeleton__row" aria-hidden="true">
            <div className="dashboard-skeleton__panel rounded-2xl border border-border bg-card shadow-soft" />
            <div className="dashboard-skeleton__panel rounded-2xl border border-border bg-card shadow-soft" />
          </div>
        </div>
      )}

      {!loading && summaryError && (
        <div className="dashboard-state dashboard-state--error" role="alert" aria-live="polite">
          <strong>Dashboard unavailable.</strong> {summaryError}
          <Button type="button" onClick={refreshDashboard} disabled={refreshing}>Try again</Button>
        </div>
      )}

      {!loading && summary && (
        <>
          <section className="dashboard-kpis" aria-label="Key balances and performance">
            <Stat
              label="Cash balance"
              value={formatMoneyString(summary.balances.cash)}
              tone={summary.balances.cash.startsWith('-') ? 'bad' : 'good'}
              className="dashboard-kpi"
            />
            <Stat
              label="Accounts receivable"
              value={formatMoneyString(summary.balances.accountsReceivable)}
              tone={summary.balances.accountsReceivable.startsWith('-') ? 'bad' : 'good'}
              className="dashboard-kpi"
            />
            <Stat
              label="Accounts payable"
              value={formatMoneyString(summary.balances.accountsPayable)}
              tone="bad"
              className="dashboard-kpi"
            />
            <Stat
              label="Net income this month"
              value={formatMoneyString(summary.netIncomeThisMonth)}
              tone={incomeIsNegative ? 'bad' : 'good'}
              className="dashboard-kpi"
            />
          </section>

          <Panel className="dashboard-panel" aria-labelledby="dashboard-performance-title">
            <div className="dashboard-panel__heading">
              <div>
                <h2 id="dashboard-performance-title">Revenue vs expenses</h2>
                <p>Monthly totals for the six months through {formatCalendarDate(summary.asOf)}.</p>
              </div>
              <Link to="/reports/income-statement">View Profit and Loss</Link>
            </div>
            {!hasPerformance ? (
              <EmptyState title="No posted revenue or expenses for this period." className="folio-empty-state--inline" />
            ) : (
              <>
                <div className="dashboard-chart" role="img" aria-label="Bar chart comparing revenue and expenses for the last six months.">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performance} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#E4E0FF" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#3B3566', fontSize: 12 }} />
                      <YAxis
                        width={84}
                        tick={{ fill: '#3B3566', fontSize: 11 }}
                        tickFormatter={(value) => formatMoney(BigInt(Math.round(value)))}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatMoney(BigInt(Math.round(value))),
                          name,
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenueCents" name="Revenue" fill="#5B3DF5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expensesCents" name="Expenses" fill="#140F3D" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="dashboard-sr-only">
                  <caption>Revenue and expenses by month</caption>
                  <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th></tr></thead>
                  <tbody>
                    {performance.map((month) => (
                      <tr key={month.month}>
                        <th scope="row">{month.month}</th>
                        <td>{formatMoneyString(month.revenue)}</td>
                        <td>{formatMoneyString(month.expenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Panel>

          <div className="dashboard-panels">
            <Panel className="dashboard-panel" aria-labelledby="dashboard-overdue-title">
              <div className="dashboard-panel__heading">
                <div>
                  <h2 id="dashboard-overdue-title">Overdue invoices</h2>
                  <p>{summary.overdueInvoices.count} overdue · {formatMoneyString(summary.overdueInvoices.amount)} outstanding</p>
                </div>
                <Link to="/invoices">View invoices</Link>
              </div>
              {overdueError ? (
                <p className="dashboard-state dashboard-state--error" role="alert">Error: {overdueError}</p>
              ) : overdueInvoices === null ? (
                <LoadingState label="Loading overdue invoices..." className="folio-loading-state--inline" />
              ) : overdueInvoices.length === 0 ? (
                <EmptyState title="No overdue invoices." className="folio-empty-state--inline" />
              ) : (
                <div className="dashboard-list">
                  {overdueInvoices.map((invoice) => (
                    <Link className="dashboard-list__row" to={`/invoices/${invoice.id}`} key={invoice.id}>
                      <span>
                        <strong>{invoice.invoiceNumber || 'Invoice'}</strong>
                        <small>{invoice.customerName} · Due {formatCalendarDate(invoice.dueDate)}</small>
                      </span>
                      <strong className="num text-destructive-text">{formatMoney(invoice.outstandingCents)}</strong>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="dashboard-panel" aria-labelledby="dashboard-expenses-title">
              <div className="dashboard-panel__heading">
                <div>
                  <h2 id="dashboard-expenses-title">Top expenses this month</h2>
                  <p>Posted expense accounts through {formatCalendarDate(summary.asOf)}.</p>
                </div>
                <Link to="/reports/income-statement">See report</Link>
              </div>
              {summary.topExpenseAccounts.length === 0 ? (
                <EmptyState title="No posted expenses this month." className="folio-empty-state--inline" />
              ) : (
                <div className="dashboard-list">
                  {summary.topExpenseAccounts.map((account) => (
                    <div className="dashboard-list__row dashboard-list__row--static" key={account.accountId}>
                      <span><strong>{account.name}</strong><small>{account.code}</small></span>
                      <strong className="num">{formatMoneyString(account.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel className="dashboard-panel" aria-labelledby="dashboard-customers-title">
            <div className="dashboard-panel__heading">
              <div>
                <h2 id="dashboard-customers-title">Top customers this year</h2>
                <p>Invoiced amount from posted entries in {summary.asOf.slice(0, 4)}.</p>
              </div>
              <Link to="/customers">View customers</Link>
            </div>
            {summary.topCustomers.length === 0 ? (
              <EmptyState title="No posted invoices for this year yet." className="folio-empty-state--inline" />
            ) : (
              <div className="dashboard-list">
                {summary.topCustomers.map((customer, index) => (
                  <div className="dashboard-list__row dashboard-list__row--static" key={customer.customerId}>
                    <span><strong>{index + 1}. {customer.name}</strong><small>Invoiced this year</small></span>
                    <strong className="num">{formatMoneyString(customer.invoicedAmount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </section>
  )
}

export default Dashboard
