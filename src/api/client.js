import {
  clearAuthToken,
  getAuthToken,
} from './tokenStorage.js'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export const AUTH_UNAUTHORIZED_EVENT = 'folio:unauthorized'

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function isPublicAuthRequest(path, method) {
  return method === 'POST'
    && (path === '/api/auth/login' || path === '/api/auth/register')
}

export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }
  const token = getAuthToken()

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the server',
      details: null,
    })
  }

  if (response.status === 401 && !isPublicAuthRequest(path, method)) {
    clearAuthToken()
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
  }

  if (response.status === 204) return undefined

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'The server returned an invalid response.',
      details: null,
    })
  }

  if (!response.ok) {
    const error = payload?.error ?? {}
    throw new ApiError({
      status: response.status,
      code: error.code ?? 'REQUEST_FAILED',
      message: error.message ?? 'The request could not be completed.',
      details: error.details ?? null,
    })
  }

  if (payload && Object.hasOwn(payload, 'meta')) {
    return { data: payload.data, meta: payload.meta }
  }

  return payload?.data
}
