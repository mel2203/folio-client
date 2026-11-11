import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute, PublicOnlyRoute } from '../src/components/ProtectedRoute.jsx'
import { AuthContext } from '../src/context/authContext.js'

function LocationOutput() {
  const location = useLocation()
  return <p>Current route: {location.pathname}</p>
}

function renderRoutes(initialEntry, authState) {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading ?? false,
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/accounts" element={<p>Protected accounts</p>} />
          </Route>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<p>Login page</p>} />
          </Route>
          <Route path="*" element={<LocationOutput />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('route guards', () => {
  it('redirects an anonymous visitor from a protected route to login', () => {
    renderRoutes('/accounts', { isAuthenticated: false })

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('shows a loading state while checking a saved session', () => {
    renderRoutes('/accounts', { isAuthenticated: false, isLoading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session')
  })

  it('redirects an authenticated visitor away from public auth pages', () => {
    renderRoutes('/login', { isAuthenticated: true })

    expect(screen.getByText('Current route: /dashboard')).toBeInTheDocument()
  })
})
