import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/context/AuthContext.jsx'
import { useAuth } from '../src/context/useAuth.js'
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '../src/api/tokenStorage.js'

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }
}

function AuthState() {
  const { user, company, isAuthenticated, isLoading, register } = useAuth()
  const [registerError, setRegisterError] = useState('')

  async function handleRegister() {
    try {
      await register({
        companyName: 'Sample Company',
        fullName: 'Sample User',
        email: 'person@example.com',
        password: 'password-for-test',
      })
    } catch {
      setRegisterError('Registration failed.')
    }
  }

  if (isLoading) {
    return <p>Loading session</p>
  }

  return (
    <div>
      <p>{isAuthenticated ? 'Authenticated' : 'Signed out'}</p>
      <p>{user?.fullName ?? 'Signed out'}</p>
      <p>{company?.name ?? 'No company'}</p>
      {registerError && <p>{registerError}</p>}
      <button type="button" onClick={handleRegister}>Register</button>
    </div>
  )
}

afterEach(() => {
  clearAuthToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AuthProvider', () => {
  it('validates a saved token with the accounts endpoint without inventing a profile', async () => {
    setAuthToken('session-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    )

    expect(screen.getByText('Loading session')).toBeInTheDocument()
    expect(await screen.findByText('Authenticated')).toBeInTheDocument()
    expect(screen.getByText('No company')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts'),
      expect.any(Object),
    )
  })

  it('registers then logs in and restores the session', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        data: { user: { fullName: 'Sample User' }, company: { name: 'Sample Company' } },
      }, 201))
      .mockResolvedValueOnce(jsonResponse({
        data: { token: 'new-session-token', user: { fullName: 'Sample User' } },
      }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(screen.getByText('Sample User')).toBeInTheDocument()
      expect(screen.getByText('Sample Company')).toBeInTheDocument()
      expect(screen.getByText('Authenticated')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getAuthToken()).toBe('new-session-token')
  })

  it('treats a saved token rejected by the server as signed out', async () => {
    setAuthToken('invalid-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          details: [],
        },
      }, 401),
    ))

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    )

    expect(await screen.findByText('No company')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
  })
})
