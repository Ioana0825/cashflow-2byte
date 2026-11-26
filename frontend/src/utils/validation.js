/*
 * Form validation done in the browser.
 *
 * It gives the user instant feedback, without waiting for the server. But it
 * is NOT security: anyone can skip our JavaScript and call the API directly.
 * That's why the backend (backend/app/schemas.py) checks the same rules again.
 *
 * Each function returns an object { fieldName: "error message" }.
 * An empty object {} means "everything is fine".
 */

// Simple email check: something@something.something, no spaces.
// The backend does a stricter check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.'
  return null
}

export function validateLogin({ email, password }) {
  const errors = {}
  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError
  if (!password) errors.password = 'Password is required.'
  return errors
}

// Same rules as the backend: 8-72 characters, at least one letter and one number
export function validateRegister({ email, password, confirmPassword }) {
  const errors = {}
  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (new TextEncoder().encode(password).length > 72) {
    // TextEncoder counts BYTES, like bcrypt on the server does
    errors.password = 'Password is too long.'
  } else if (!/[A-Za-zÀ-ɏ]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Use at least one letter and one number.'
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  return errors
}

// Allowed by the database: up to 10 digits in total, 2 after the dot
const MAX_AMOUNT = 99999999.99

export function validateTransaction({ type, amount, category, date, description }) {
  const errors = {}

  if (type !== 'income' && type !== 'expense') {
    errors.type = 'Choose income or expense.'
  }

  // The input gives us text; Number('') is 0 and Number('abc') is NaN
  const value = Number(amount)
  if (amount === '' || amount === null) {
    errors.amount = 'Amount is required.'
  } else if (!Number.isFinite(value) || value <= 0) {
    errors.amount = 'Invalid transaction amount: it must be greater than 0.'
  } else if (value > MAX_AMOUNT) {
    errors.amount = 'Amount is too large.'
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(amount).trim())) {
    errors.amount = 'Use at most 2 decimals, e.g. 45.50.'
  }

  if (!category || !category.trim()) {
    errors.category = 'Choose a category.'
  } else if (category.trim().length > 50) {
    errors.category = 'Category is too long (max 50 characters).'
  }

  if (!date) {
    errors.date = 'Date is required.'
  } else {
    const year = Number(date.slice(0, 4))
    if (!(year >= 1900 && year <= 2100)) errors.date = 'Enter a realistic date.'
  }

  if (description && description.length > 255) {
    errors.description = 'Description is too long (max 255 characters).'
  }

  return errors
}
