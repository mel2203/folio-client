import { request } from './client.js'

export function getAccounts() {
  return request('/api/accounts')
}

//clients import



