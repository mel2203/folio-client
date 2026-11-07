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
          end
        >
          Journal entries
        </NavLink>
        <NavLink
          className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
          to="/accounts"
        >
          Chart of accounts
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
