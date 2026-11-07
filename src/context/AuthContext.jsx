import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  login as loginRequest,
  register as registerRequest,
  validateSession,
} from '../api/auth.js'
import {
  AUTH_UNAUTHORIZED_EVENT,
} from '../api/client.js'
import { AuthContext } from './authContext.js'
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '../api/tokenStorage.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(getAuthToken()))

  useEffect(() => {
    let isMounted = true

    if (!getAuthToken()) {
      return undefined
    }

    validateSession()
      .then(() => {
        if (isMounted) {
          setIsAuthenticated(true)
        }
      }).catch((error) => {
        if (isMounted) {
          if (error.status !== 401) {
            setAuthError(error)
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
      setCompany(null)
      setIsAuthenticated(false)
      setAuthError(null)
      setIsLoading(false)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials)
    setAuthToken(result.token)
    setUser(result.user)
    setCompany(null)
    setIsAuthenticated(true)
    setAuthError(null)
    return result
  }, [])

  const register = useCallback(async (details) => {
    const registration = await registerRequest(details)
    const session = await login({
      email: details.email,
      password: details.password,
    })

    setCompany(registration.company)
    return { ...session, company: registration.company }
  }, [login])

  const logout = useCallback(() => {
    clearAuthToken()
    setUser(null)
    setCompany(null)
    setIsAuthenticated(false)
    setAuthError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      company,
      isAuthenticated,
      authError,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, company, isAuthenticated, authError, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
