import { request } from './client.js'

function withQuery(path, params) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const suffix = query.toString()
  return suffix ? path + '?' + suffix : path
}

export function getTrialBalance({ asOf } = {}) {
  return request(withQuery('/api/reports/trial-balance', { asOf }))
}

export function getIncomeStatement({ from, to } = {}) {
  return request(withQuery('/api/reports/income-statement', { from, to }))
}

export function getBalanceSheet({ asOf } = {}) {
  return request(withQuery('/api/reports/balance-sheet', { asOf }))
}

export function getArAging({ asOf } = {}) {
  return request(withQuery('/api/reports/ar-aging', { asOf }))
}

export function getApAging({ asOf } = {}) {
  return request(withQuery('/api/reports/ap-aging', { asOf }))
}
