/*
 * Register page (feature F01).
 *
 * Same idea as Login: validate in the browser, send to the API, show the
 * server's message if it refuses (e.g. 409 "An account with this email
 * already exists."). After registering the user is logged in right away.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AuthLayout from '../components/AuthLayout'
import { FormAlert, PasswordField, TextField } from '../components/FormFields'
import { AlertIcon, ChartIcon, LockIcon, MailIcon, ShieldIcon, WalletIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { validateRegister } from '../utils/validation'

// Left column (only on wide screens)
function RegisterAside() {
  return (
    <>
      <h2>
        Your finances,
        <br />
        simplified.
      </h2>
      <hr />
      <ul className="auth-perks">
        <li>
          <ChartIcon /> Track your income and expenses
        </li>
        <li>
          <WalletIcon /> See your balance at a glance
        </li>
        <li>
          <ShieldIcon /> Your data stays private to you
        </li>
      </ul>
    </>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((old) => ({ ...old, [name]: value }))
    if (errors[name]) setErrors((old) => ({ ...old, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const found = validateRegister(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await register(form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      // If the server says which field is wrong, show it under that field
      if (err.field === 'email' || err.field === 'password') {
        setErrors({ [err.field]: err.message.replace(/^\w+: /, '') })
      } else {
        setServerError(err.message)
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      aside={<RegisterAside />}
      topAction={
        <>
          <span className="auth-top-text">Already a member?</span>
          <Link to="/login" className="btn btn-outline">
            Log in
          </Link>
        </>
      }
    >
      <div className="auth-head">
        <span className="auth-badge">
          <WalletIcon />
        </span>
        <h1>Create your account</h1>
        <p className="auth-sub">Join CashFlow and take control of your finances.</p>
      </div>

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
          placeholder="Create a password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          icon={LockIcon}
          placeholder="Type it again"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <button type="submit" className="btn btn-gold btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
