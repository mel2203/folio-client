import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx'
import NotFound from './pages/NotFound.jsx'

function RoutePlaceholder({ title }) {
  return (
    <section className="route-placeholder">
      <h1>{title}</h1>
      <p>This page will be added in a later stage.</p>
    </section>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<RoutePlaceholder title="Log in" />} />
          <Route path="/register" element={<RoutePlaceholder title="Create your account" />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/journal" replace />} />
            <Route path="/journal" element={<RoutePlaceholder title="Journal entries" />} />
            <Route path="/journal/new" element={<RoutePlaceholder title="New journal entry" />} />
            <Route path="/journal/:id" element={<RoutePlaceholder title="Journal entry" />} />
            <Route path="/accounts" element={<RoutePlaceholder title="Chart of accounts" />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
