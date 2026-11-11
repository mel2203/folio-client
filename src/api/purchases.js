import { request } from './client.js'

function withQuery(path, params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export const listVendors = (filters = {}) => request(withQuery('/api/vendors', filters))
export const createVendor = (body) => request('/api/vendors', { method: 'POST', body })
export const getVendor = (id) => request(`/api/vendors/${encodeURIComponent(id)}`)
export const updateVendor = (id, body) => request(`/api/vendors/${encodeURIComponent(id)}`, { method: 'PATCH', body })
export const listBills = (filters = {}) => request(withQuery('/api/bills', filters))
export const createBill = (body) => request('/api/bills', { method: 'POST', body })
export const getBill = (id) => request(`/api/bills/${encodeURIComponent(id)}`)
export const updateBill = (id, body) => request(`/api/bills/${encodeURIComponent(id)}`, { method: 'PATCH', body })
export const deleteBill = (id) => request(`/api/bills/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const postBill = (id) => request(`/api/bills/${encodeURIComponent(id)}/post`, { method: 'POST', body: {} })
export const voidBill = (id) => request(`/api/bills/${encodeURIComponent(id)}/void`, { method: 'POST', body: {} })
export const recordBillPayment = (id, body) => request(`/api/bills/${encodeURIComponent(id)}/payments`, { method: 'POST', body })
