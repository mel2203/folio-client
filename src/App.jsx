import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { Toaster } from './components/ui/sonner.jsx'
import LoadingState from './components/LoadingState.jsx'
import Accounts from './pages/Accounts.jsx'
import ArAging from './pages/ArAging.jsx'
import BalanceSheet from './pages/BalanceSheet.jsx'
import IncomeStatement from './pages/IncomeStatement.jsx'
import Customers from './pages/Customers.jsx'
import Invoices from './pages/Invoices.jsx'
import InvoiceForm from './pages/InvoiceForm.jsx'
import InvoiceDetail from './pages/InvoiceDetail.jsx'
import JournalDetail from './pages/JournalDetail.jsx'
import JournalList from './pages/JournalList.jsx'
import JournalNew from './pages/JournalNew.jsx'
import TrialBalance from './pages/TrialBalance.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Register from './pages/Register.jsx'
import Vendors from './pages/Vendors.jsx'
import Bills from './pages/Bills.jsx'
import BillForm from './pages/BillForm.jsx'
import BillDetail from './pages/BillDetail.jsx'
import ApAging from './pages/ApAging.jsx'
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))

const PAGE_TITLES = [
  [/^\/dashboard\/?$/, 'Dashboard'],
  [/^\/journal\/new\/?$/, 'New journal entry'],
  [/^\/journal\/[^/]+\/?$/, 'Journal entry'],
  [/^\/journal\/?$/, 'Journal entries'],
  [/^\/accounts\/?$/, 'Chart of accounts'],
  [/^\/customers\/?$/, 'Customers'],
  [/^\/invoices\/new\/?$/, 'New invoice'],
  [/^\/invoices\/[^/]+\/edit\/?$/, 'Edit invoice'],
  [/^\/invoices\/[^/]+\/?$/, 'Invoice'],
  [/^\/invoices\/?$/, 'Invoices'],
  [/^\/vendors\/?$/, 'Vendors'],
  [/^\/bills\/new\/?$/, 'New bill'],
  [/^\/bills\/[^/]+\/edit\/?$/, 'Edit bill'],
  [/^\/bills\/[^/]+\/?$/, 'Bill'],
  [/^\/bills\/?$/, 'Bills'],
  [/^\/reports\/trial-balance\/?$/, 'Trial Balance'],
  [/^\/reports\/income-statement\/?$/, 'Profit and Loss'],
  [/^\/reports\/balance-sheet\/?$/, 'Balance Sheet'],
  [/^\/reports\/ar-aging\/?$/, 'Accounts Receivable Aging'],
  [/^\/reports\/ap-aging\/?$/, 'Accounts Payable Aging'],
  [/^\/reports\/?$/, 'Reports'],
  [/^\/login\/?$/, 'Log in'],
  [/^\/register\/?$/, 'Create account'],
]

function PageTitleManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const pageTitle = PAGE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] || 'Page not found'
    document.title = `${pageTitle} | Folio`
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <PageTitleManager />
      <ErrorBoundary>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={(
                  <Suspense fallback={<LoadingState label="Loading dashboard..." />}>
                    <Dashboard />
                  </Suspense>
                )}
              />
              <Route path="/journal" element={<JournalList />} />
              <Route path="/journal/new" element={<JournalNew />} />
              <Route path="/journal/:id" element={<JournalDetail />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/bills/new" element={<BillForm />} />
              <Route path="/bills/:id/edit" element={<BillForm />} />
              <Route path="/bills/:id" element={<BillDetail />} />
              <Route path="/reports" element={<Navigate to="/reports/trial-balance" replace />} />
              <Route path="/reports/trial-balance" element={<TrialBalance />} />
              <Route path="/reports/income-statement" element={<IncomeStatement />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
              <Route path="/reports/ar-aging" element={<ArAging />} />
              <Route path="/reports/ap-aging" element={<ApAging />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
