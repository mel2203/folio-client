import { useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Sidebar from './Sidebar.jsx'
import ReportsPrintHeader from './ReportsPrintHeader.jsx'
import './Layout.css'

function Layout() {
  const { user, company, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <header className="topbar">
          <p className="topbar__company">{company?.name ?? 'Folio'}</p>
          <div className="topbar__account">
            <span className="topbar__name">{user?.fullName ?? 'Account'}</span>
            <button className="topbar__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
        <main className="page-content">
          <ReportsPrintHeader />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
