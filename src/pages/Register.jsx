import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPageLayout from '../components/AuthPageLayout.jsx'
import { useAuth } from '../context/useAuth.js'
import { getAuthServerError, getEmailError, getPasswordError } from './authValidation.js'

const INITIAL_VALUES = {
  companyName: '',
  fullName: '',
  email: '',
  password: '',
}

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState(INITIAL_VALUES)
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
      companyName: values.companyName.trim() ? '' : 'Company name is required.',
      fullName: values.fullName.trim() ? '' : 'Full name is required.',
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
      await register(values)
      navigate('/dashboard', { replace: true, state: { registrationSuccess: true } })
    } catch (error) {
      setServerError(getAuthServerError(error, 'create your account'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageLayout>
      <h1>Create your account</h1>
      <p className="auth-form__intro">Set up Folio for your business.</p>
      <form noValidate onSubmit={handleSubmit}>
        <div className="auth-form__fields">
          <div className="auth-form__field">
            <label htmlFor="register-company-name">Company name</label>
            <input
              autoComplete="organization"
              id="register-company-name"
              name="companyName"
              value={values.companyName}
              onChange={handleChange}
              aria-invalid={Boolean(errors.companyName)}
              aria-describedby={errors.companyName ? 'register-company-error' : undefined}
            />
            {errors.companyName && (
              <span className="auth-form__field-error" id="register-company-error" aria-live="polite">
                {errors.companyName}
              </span>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="register-full-name">Full name</label>
            <input
              autoComplete="name"
              id="register-full-name"
              name="fullName"
              value={values.fullName}
              onChange={handleChange}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'register-full-name-error' : undefined}
            />
            {errors.fullName && (
              <span className="auth-form__field-error" id="register-full-name-error" aria-live="polite">
                {errors.fullName}
              </span>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="register-email">Email</label>
            <input
              autoComplete="email"
              id="register-email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'register-email-error' : undefined}
            />
            {errors.email && (
              <span className="auth-form__field-error" id="register-email-error" aria-live="polite">
                {errors.email}
              </span>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="register-password">Password</label>
            <input
              autoComplete="new-password"
              id="register-password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
            />
            {errors.password && (
              <span className="auth-form__field-error" id="register-password-error" aria-live="polite">
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
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="auth-form__footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthPageLayout>
  )
}

export default Register
