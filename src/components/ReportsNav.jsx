import { NavLink } from 'react-router-dom'

function ReportsNav() {
  function printReport() {
    window.print()
  }

  return (
    <nav className="reports-subnav" aria-label="Report types">
      <div className="reports-subnav__links">
        <NavLink end to="/reports/trial-balance">Trial Balance</NavLink>
        <NavLink end to="/reports/income-statement">Profit and Loss</NavLink>
        <NavLink end to="/reports/balance-sheet">Balance Sheet</NavLink>
        <NavLink end to="/reports/ar-aging">A/R Aging</NavLink>
      </div>
      <button className="reports-print-button" type="button" onClick={printReport}>Print</button>
    </nav>
  )
}

export default ReportsNav
