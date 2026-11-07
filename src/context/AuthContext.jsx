import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
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

    getCurrentUser()
      .then((session) => {
        if (isMounted) {
          if (!session?.user || !session?.company) {
            throw new Error('The server returned an invalid session response.')
          }

          setUser(session.user)
          setCompany(session.company)
          setIsAuthenticated(true)
          setAuthError(null)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setUser(null)
          setCompany(null)
          setIsAuthenticated(false)
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
    if (typeof result?.token !== 'string' || !result.token) {
      throw new Error('The server returned an invalid login response.')
    }

    setAuthToken(result.token)

    try {
      const session = await getCurrentUser()
      if (!session?.user || !session?.company) {
        throw new Error('The server returned an invalid session response.')
      }

      setUser(session.user)
      setCompany(session.company)
      setIsAuthenticated(true)
      setAuthError(null)
      return { ...result, user: session.user, company: session.company }
    } catch (error) {
      clearAuthToken()
      setUser(null)
      setCompany(null)
      setIsAuthenticated(false)
      throw error
    }
  }, [])

  const register = useCallback(async (details) => {
    await registerRequest(details)
    return login({
      email: details.email,
      password: details.password,
    })
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
