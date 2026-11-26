/*
 * Route guards decide who may see a page.
 *
 *   <ProtectedRoute>   pages for logged-in users only (Dashboard, Transactions).
 *                      Not logged in -> redirect to /login.
 *   <GuestRoute>       pages for logged-OUT users (Login, Register).
 *                      Already logged in -> redirect to the dashboard.
 *
 * IMPORTANT: this only hides pages in the browser. The real protection is on
 * the backend, which checks the token on every request. Someone could edit
 * our JavaScript, but they still couldn't get data without a valid login.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

// Shown for a split second while we ask the server who is logged in
function FullPageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  )
}

export function ProtectedRoute() {
  const { user, checking } = useAuth()
  const location = useLocation()

  if (checking) return <FullPageSpinner />
  if (!user) {
    // Remember where the user wanted to go, so Login can send them back there.
    // replace -> the protected URL is not kept in the browser history
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  // <Outlet /> = "draw the child route here" (see App.jsx)
  return <Outlet />
}

export function GuestRoute() {
  const { user, checking } = useAuth()

  if (checking) return <FullPageSpinner />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
