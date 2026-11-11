import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { formatCalendarDate, getFirstDayOfMonth, getTodayCalendarDate } from '../utils/calendar-date.js'

const REPORT_TITLES = {
  '/reports/trial-balance': 'Trial Balance',
  '/reports/income-statement': 'Profit and Loss',
  '/reports/balance-sheet': 'Balance Sheet',
  '/reports/ar-aging': 'Accounts Receivable Aging',
  '/reports/ap-aging': 'Accounts Payable Aging',
}

function ReportsPrintHeader() {
  const { company } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const title = REPORT_TITLES[location.pathname]

  if (!title) return null

  const today = getTodayCalendarDate()
  let dateText
  if (location.pathname === '/reports/income-statement') {
    const from = searchParams.get('from') || getFirstDayOfMonth(today)
    const to = searchParams.get('to') || today
    dateText = 'Period: ' + formatCalendarDate(from) + ' – ' + formatCalendarDate(to)
  } else {
    const asOf = searchParams.get('asOf') || today
    dateText = 'As of ' + formatCalendarDate(asOf)
  }

  return (
    <header className="reports-print-header">
      <p>{company?.name || 'Folio'}</p>
      <h1>{title}</h1>
      <p>{dateText}</p>
    </header>
  )
}

export default ReportsPrintHeader
