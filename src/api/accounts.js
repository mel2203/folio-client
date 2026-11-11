import { request } from './client.js'

export function getAccounts({ active } = {}) {
  const query = new URLSearchParams()
  if (active !== undefined) query.set('active', String(active))
  const suffix = query.toString()
  return request(`/api/accounts${suffix ? `?${suffix}` : ''}`)
}

export function createAccount(body) {
  return request('/api/accounts', { method: 'POST', body })
}

export function updateAccount(id, body) {
  return request(`/api/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

//clients import



