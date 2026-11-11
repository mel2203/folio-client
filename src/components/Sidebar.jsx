import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink className="sidebar__brand" to="/journal" aria-label="Folio home">
        <Logo variant="dark" />
      </NavLink>
      <nav className="sidebar__nav" aria-label="Main navigation">
        <NavLink
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
          to="/journal"
        >
          Journal entries
        </NavLink>
        <NavLink
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
          to="/reports"
        >
          Reports
        </NavLink>
        <NavLink
          end
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
          to="/accounts"
        >
          Chart of accounts
        </NavLink>
        <div className="sidebar__section" aria-label="Sales">
          <span className="sidebar__section-title">Sales</span>
          <NavLink
            className={({ isActive }) => `sidebar__link sidebar__link--nested${isActive ? ' is-active' : ''}`}
            to="/customers"
          >
            Customers
          </NavLink>
          <NavLink
            className={({ isActive }) => `sidebar__link sidebar__link--nested${isActive ? ' is-active' : ''}`}
            to="/invoices"
          >
            Invoices
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
