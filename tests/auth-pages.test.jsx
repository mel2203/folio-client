import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Login from '../src/pages/Login.jsx'
import Register from '../src/pages/Register.jsx'
import { AuthProvider } from '../src/context/AuthContext.jsx'
import { clearAuthToken } from '../src/api/tokenStorage.js'

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }
}

function renderAuthPage(page) {
  return render(
    <AuthProvider>
      <MemoryRouter>
        {page}
      </MemoryRouter>
    </AuthProvider>,
  )
}

afterEach(() => {
  clearAuthToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('authentication pages', () => {
  it('shows the server message for a login 401', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          details: [],
        },
      }, 401),
    ))
    renderAuthPage(<Login />)

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'not-a-real-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('validates email and password before sending a login request', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAuthPage(<Login />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Password must be 8 to 72 characters.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires company and full names before sending a registration request', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAuthPage(<Register />)

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Company name is required.')).toBeInTheDocument()
    expect(screen.getByText('Full name is required.')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })
})
