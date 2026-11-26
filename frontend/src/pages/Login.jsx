/*
 * Login page (feature F02).
 *
 * Flow: the user types email + password -> we check the form in the browser
 * -> we send it to POST /api/auth/login -> on success the server sets the
 * login cookie and we go to the Dashboard (or the page they wanted before).
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import AuthLayout from '../components/AuthLayout'
import { FormAlert, PasswordField, TextField } from '../components/FormFields'
import { AlertIcon, ArrowRightIcon, LockIcon, MailIcon } from '../components/Icons'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { validateLogin } from '../utils/validation'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // "Controlled inputs": React state holds what's typed in each input
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({}) // errors per field
  const [serverError, setServerError] = useState('') // error from the API
  const [submitting, setSubmitting] = useState(false)

  // One change handler for every input, thanks to the input's `name`
  function handleChange(event) {
    const { name, value } = event.target
    setForm((old) => ({ ...old, [name]: value }))
    // Remove the error of this field as soon as the user fixes it
    if (errors[name]) setErrors((old) => ({ ...old, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setServerError('')

    const found = validateLogin(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return // fix the form first

    setSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
      // Go back to the page the user tried to open, or to the dashboard.
      // We only accept paths that start with "/" (our own app), never a
      // full URL, so this can't be abused to send people to another site.
      const from = location.state?.from
      const target = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
      navigate(target, { replace: true })
    } catch (err) {
      // 401 -> "Incorrect email or password." ; 429 -> too many attempts
      setServerError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      topAction={
        <>
          <span className="auth-top-text">Don&apos;t have an account?</span>
          <Link to="/register" className="btn btn-outline">
            Sign up
          </Link>
        </>
      }
    >
      <div className="auth-head">
        <Logo size="lg" tagline />
        <h1>Sign in</h1>
        <p className="auth-sub">Welcome back! Please sign in to your account.</p>
      </div>

      {/* noValidate: we show our own messages instead of the browser's popups */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormAlert icon={AlertIcon}>{serverError}</FormAlert>

        <TextField
          label="Email address"
          name="email"
          type="email"
          icon={MailIcon}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoFocus
        />

        <PasswordField
          label="Password"
          name="password"
          icon={LockIcon}
          placeholder="Your password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />

        <button type="submit" className="btn btn-gold btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRightIcon />}
        </button>
      </form>

      <p className="auth-switch">
        New to CashFlow? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
