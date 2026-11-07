const TOKEN_KEY = 'folio.auth.token'

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}
