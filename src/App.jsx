import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/journal" replace />} />
            <Route path="/journal" element={<JournalList />} />
            <Route path="/journal/new" element={<JournalNew />} />
            <Route path="/journal/:id" element={<JournalDetail />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/reports" element={<Navigate to="/reports/trial-balance" replace />} />
            <Route path="/reports/trial-balance" element={<TrialBalance />} />
            <Route path="/reports/income-statement" element={<IncomeStatement />} />
            <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
            <Route path="/reports/ar-aging" element={<ArAging />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
