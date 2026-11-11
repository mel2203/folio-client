import { request } from './client.js'

export function getDashboardSummary({ asOf } = {}) {
  const query = new URLSearchParams()
  if (asOf) query.set('asOf', asOf)
  const suffix = query.toString()
  return request(`/api/dashboard/summary${suffix ? `?${suffix}` : ''}`)
}
