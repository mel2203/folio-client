import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthPageLayout from '../components/AuthPageLayout.jsx'
import { useAuth } from '../context/useAuth.js'
import { getAuthServerError, getEmailError, getPasswordError } from './authValidation.js'

function Login() {
  const { authError, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setServerError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {
      email: getEmailError(values.email),
      password: getPasswordError(values.password),
    }
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    setIsSubmitting(true)
    setServerError('')
    try {
      await login(values)
      const destination = location.state?.from?.pathname || '/journal'
      navigate(destination, { replace: true, state: { loginSuccess: true } })
    } catch (error) {
      setServerError(getAuthServerError(error, 'log in'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageLayout>
      <h1>Welcome back</h1>
      <p className="auth-form__intro">Log in to continue to Folio.</p>
      {authError && !serverError && (
        <p className="auth-form__server-error" role="alert" aria-live="polite">
          Error: Unable to verify your saved session. {authError.message}
        </p>
      )}
      <form noValidate onSubmit={handleSubmit}>
        <div className="auth-form__fields">
          <div className="auth-form__field">
            <label htmlFor="login-email">Email</label>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
            {errors.email && (
              <span className="auth-form__field-error" id="login-email-error" aria-live="polite">
                {errors.email}
              </span>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="login-password">Password</label>
            <input
              autoComplete="current-password"
              id="login-password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
            />
            {errors.password && (
              <span className="auth-form__field-error" id="login-password-error" aria-live="polite">
                {errors.password}
              </span>
            )}
          </div>
        </div>
        {serverError && (
          <p className="auth-form__server-error" role="alert" aria-live="polite">
            Error: {serverError}
          </p>
        )}
        <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="auth-form__footer">
        New to Folio? <Link to="/register">Create an account</Link>
      </p>
    </AuthPageLayout>
  )
}

export default Login
