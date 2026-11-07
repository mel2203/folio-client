import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from '../src/api/client.js'
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

afterEach(() => {
  clearAuthToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('API client', () => {
  it('attaches the bearer token and returns data with pagination metadata', async () => {
    setAuthToken('test-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ id: 'entry-1' }], meta: { page: 1, total: 1 } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await request('/api/journal-entries')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/journal-entries'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
    expect(result).toEqual({
      data: [{ id: 'entry-1' }],
      meta: { page: 1, total: 1 },
    })
  })

  it('returns data when the response has no metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'account-1' } })))

    await expect(request('/api/accounts')).resolves.toEqual({ id: 'account-1' })
  })

  it('converts an API error body into an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({
        error: {
          code: 'INVALID_INPUT',
          message: 'The request is invalid.',
          details: { field: 'date' },
        },
      }, 400),
    ))

    await expect(request('/api/journal-entries')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'INVALID_INPUT',
      message: 'The request is invalid.',
      details: { field: 'date' },
    })
  })

  it('clears the token and announces an unauthorized session on 401', async () => {
    setAuthToken('expired-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sign in again.' } }, 401),
    ))
    const unauthorized = vi.fn()
    window.addEventListener('folio:unauthorized', unauthorized)

    await expect(request('/api/accounts')).rejects.toBeInstanceOf(ApiError)

    expect(getAuthToken()).toBeNull()
    expect(unauthorized).toHaveBeenCalledOnce()
    window.removeEventListener('folio:unauthorized', unauthorized)
  })

  it('does not clear the token for a failed login request', async () => {
    setAuthToken('existing-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials.' } }, 401),
    ))

    await expect(request('/api/auth/login', {
      method: 'POST',
      body: { email: 'person@example.com', password: 'not-a-real-password' },
    })).rejects.toBeInstanceOf(ApiError)

    expect(getAuthToken()).toBe('existing-token')
  })

  it('turns network failures into a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')))

    await expect(request('/api/accounts')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the server',
    })
  })
})
