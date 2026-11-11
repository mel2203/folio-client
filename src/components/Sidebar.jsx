import {
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  ListTree,
  LogOut,
  Receipt,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const NAV_GROUPS = [
  {
    id: 'main',
    label: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/journal', label: 'Journal', icon: BookOpen },
      { to: '/accounts', label: 'Chart of accounts', icon: ListTree, end: true },
      { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/invoices', label: 'Invoices', icon: FileText },
    ],
  },
  {
    id: 'purchases',
    label: 'Purchases',
    items: [
      { to: '/vendors', label: 'Vendors', icon: Users },
      { to: '/bills', label: 'Bills', icon: Receipt },
    ],
  },
]

function Navigation({ onNavigate }) {
  return (
    <nav className="sidebar__nav" aria-label="Main navigation">
      {NAV_GROUPS.map((group) => (
        <div className="sidebar__group" key={group.id}>
          {group.label && <h2 className="sidebar__section-title">{group.label}</h2>}
          {group.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              end={end}
              className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
              to={to}
              onClick={onNavigate}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function LogoutButton({ onLogout }) {
  return (
    <button className="sidebar__logout" type="button" onClick={onLogout}>
      <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>Sign out</span>
    </button>
  )
}

function Sidebar({ companyName, userName, onLogout }) {
  return (
    <aside className="sidebar">
      <NavLink className="sidebar__brand" to="/dashboard" aria-label="Folio home">
        <Logo variant="dark" />
      </NavLink>
      <p className="sidebar__company">{companyName || 'Your company'}</p>
      <Navigation />
      <div className="sidebar__account">
        <span className="sidebar__user">{userName || 'Account'}</span>
        <LogoutButton onLogout={onLogout} />
      </div>
    </aside>
  )
}

export default Sidebar
