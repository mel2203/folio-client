import { NavLink, useLocation } from 'react-router-dom'
import { Button } from './ui/button.jsx'

const REPORTS = [
  ['/reports/trial-balance', 'Trial Balance'],
  ['/reports/income-statement', 'Profit and Loss'],
  ['/reports/balance-sheet', 'Balance Sheet'],
  ['/reports/ar-aging', 'A/R Aging'],
  ['/reports/ap-aging', 'A/P Aging'],
]

function ReportsNav() {
  const location = useLocation()

  function printReport() {
    window.print()
  }

  return (
    <nav className="reports-subnav" aria-label="Report types">
      <div className="reports-subnav__links" role="group" aria-label="Reports">
        {REPORTS.map(([path, label]) => (
          <NavLink
            className="reports-subnav__link"
            end
            key={path}
            to={`${path}${location.search}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <Button className="reports-print-button" type="button" variant="outline" onClick={printReport}>
        Print
      </Button>
    </nav>
  )
}

export default ReportsNav
