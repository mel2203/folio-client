import { request } from './client.js'

export function listJournalEntries({ from, to, status, page, limit }) {
  const query = new URLSearchParams()

  if (from) query.set('from', from)
  if (to) query.set('to', to)
  if (status) query.set('status', status)
  query.set('page', String(page))
  query.set('limit', String(limit))

  return request(`/api/journal-entries?${query.toString()}`)
}

export function getJournalEntry(id) {
  return request(`/api/journal-entries/${encodeURIComponent(id)}`)
}
