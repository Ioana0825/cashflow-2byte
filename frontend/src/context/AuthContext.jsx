/*
 * AuthContext: remembers WHO is logged in and shares it with the whole app.
 *
 * React "context" is a way to give data to every component without passing
 * it down through props manually. Any component can write
 *     const { user, login, logout } = useAuth()
 *
 * States:
 *   checking = true   -> we're still asking the server (on page load)
 *   user = null       -> nobody is logged in
 *   user = {id, email, created_at} -> logged in
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // On page load (or refresh) ask the server if our cookie is still valid.
  // useEffect with [] runs once, after the first render.
  useEffect(() => {
    let cancelled = false // ignore the answer if the component is gone
    fetchCurrentUser()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null)) // 401 = not logged in
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [])

  // If ANY request later answers 401 (e.g. the token expired after 60 min),
  // forget the user. ProtectedRoute then redirects to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // useCallback keeps the same function between renders, so components that
  // use them don't re-render for nothing
  const login = useCallback(async (email, password) => {
    const loggedIn = await loginUser(email, password)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const register = useCallback(async (email, password) => {
    const created = await registerUser(email, password)
    setUser(created)
    return created
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser() // server deletes the cookie
    } finally {
      // Even if the request failed (server down), forget the user locally
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, checking, login, register, logout }),
    [user, checking, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Small helper so components write useAuth() instead of useContext(AuthContext)
// (The comment below silences a linter hint about mixing components and
// helpers in one file; it only affects hot-reloading during development.)
// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
