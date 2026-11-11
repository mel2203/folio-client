import { request } from './client.js'

function withQuery(path, params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export function listCustomers(filters = {}) {
  return request(withQuery('/api/customers', filters))
}

export function createCustomer(body) {
  return request('/api/customers', { method: 'POST', body })
}

export function getCustomer(id) {
  return request(`/api/customers/${encodeURIComponent(id)}`)
}

export function updateCustomer(id, body) {
  return request(`/api/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

export function listInvoices(filters = {}) {
  return request(withQuery('/api/invoices', filters))
}

export function createInvoice(body) {
  return request('/api/invoices', { method: 'POST', body })
}

export function getInvoice(id) {
  return request(`/api/invoices/${encodeURIComponent(id)}`)
}

export function updateInvoice(id, body) {
  return request(`/api/invoices/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

export function deleteInvoice(id) {
  return request(`/api/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function sendInvoice(id) {
  return request(`/api/invoices/${encodeURIComponent(id)}/send`, { method: 'POST', body: {} })
}

export function voidInvoice(id) {
  return request(`/api/invoices/${encodeURIComponent(id)}/void`, { method: 'POST', body: {} })
}

export function recordInvoicePayment(id, body) {
  return request(`/api/invoices/${encodeURIComponent(id)}/payments`, { method: 'POST', body })
}
