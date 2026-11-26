/*
 * App: the list of pages (routes) and who may open them.
 *
 *   /login, /register      public (only when logged out)
 *   /, /transactions       private (only when logged in)
 *   anything else          -> back to /
 *
 * React Router shows the page whose `path` matches the address bar. Routes
 * inside another route are "nested": the parent decides whether, and where,
 * the child is drawn (with <Outlet />).
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import { AuthProvider } from './context/AuthContext'

// Temporary placeholders, replaced by the real pages in the next steps
const Placeholder = ({ title }) => <h1 style={{ padding: 40 }}>{title}</h1>

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Placeholder title="Login" />} />
            <Route path="/register" element={<Placeholder title="Register" />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Placeholder title="Dashboard" />} />
            <Route path="/transactions" element={<Placeholder title="Transactions" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
