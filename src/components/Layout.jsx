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
      <Sidebar
        companyName={company?.name}
        userName={user?.fullName}
        onLogout={handleLogout}
      />
      <div className="app-shell__main">
        <main className="page-content">
          <ReportsPrintHeader />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
