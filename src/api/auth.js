import { request } from './client.js'

export function login(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export function register(details) {
  return request('/api/auth/register', {
    method: 'POST',
    body: details,
  })
}

export function validateSession() {
  return request('/api/accounts')
}
