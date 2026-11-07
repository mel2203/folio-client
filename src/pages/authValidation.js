const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getEmailError(email) {
  if (!email.trim()) {
    return 'Email is required.'
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Enter a valid email address.'
  }

  return ''
}

export function getPasswordError(password) {
  if (password.length < 8 || password.length > 72) {
    return 'Password must be 8 to 72 characters.'
  }

  return ''
}

export function getAuthServerError(error, action) {
  if (error.status === 401) {
    return 'Invalid email or password.'
  }

  if (error.status === 409) {
    return 'That email is already in use.'
  }

  if (error.status === 429) {
    return 'Too many attempts. Please try again later.'
  }

  return error.message || `Unable to ${action}. Please try again.`
}
