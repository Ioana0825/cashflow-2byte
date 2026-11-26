/*
 * App: the list of pages (routes) and who may open them.
 *
 *   /login, /register      public (only when logged out)
 *   /, /transactions       private (only when logged in), inside AppLayout
 *   anything else          -> back to /
 *
 * React Router shows the page whose `path` matches the address bar. Routes
 * inside another route are "nested": the parent decides whether, and where,
 * the child is drawn (with <Outlet />). So for "/transactions":
 *     ProtectedRoute (logged in?) -> AppLayout (sidebar) -> Transactions
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Transactions from './pages/Transactions'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
