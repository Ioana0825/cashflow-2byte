/*
 * The API client: ONE function that every part of the app uses to talk to
 * the FastAPI backend. Keeping it in one place means the details (URL,
 * headers, error format, what to do on 401) are written only once.
 *
 * HOW LOGIN WORKS IN THIS APP
 * When you log in, the backend puts the token in an httpOnly cookie. The
 * browser stores it and sends it back automatically with every request to
 * /api. Our JavaScript never sees the token, so we do NOT keep it in
 * localStorage. That is safer: if an attacker ever managed to run a script
 * in our page (XSS), there would be no token for them to steal.
 */

// All requests go to "/api/..." on the same address as the React app.
// In development, Vite forwards them to http://localhost:8000 (vite.config.js).
const API_BASE = '/api'

/*
 * An Error that also remembers the HTTP status and the input field the
 * backend complained about. The backend always answers errors as
 *     { "error": "Message", "field": "amount" }
 * so forms can show the message next to the right input.
 */
export class ApiError extends Error {
  constructor(message, status, field = null) {
    super(message)
    this.status = status
    this.field = field
  }
}

// Messages for when the server did not send its own (e.g. it crashed)
const FALLBACK_MESSAGES = {
  401: 'Unauthorized access. Please log in again.',
  404: 'Not found.',
  429: 'Too many attempts. Please wait a bit and try again.',
  500: 'Server error. Please try again later.',
}

// Function to call when the server says "not logged in" (401).
// AuthContext sets it, so an expired login sends the user back to /login.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

/*
 * request('/transactions', { method: 'POST', body: {...} })
 *
 * Returns the parsed JSON answer, or null for "204 No Content".
 * Throws an ApiError when something goes wrong, so callers can use
 * try { ... } catch (err) { show err.message }.
 */
export async function request(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    // 'same-origin' = send our cookies, but only to our own server
    credentials: 'same-origin',
    headers: {},
  }
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(API_BASE + path, options)
  } catch {
    // fetch() itself only fails when the server can't be reached at all
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  if (response.status === 204) return null

  // Read the JSON body. It may be missing or not JSON (e.g. a proxy error page)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    // Logged out / session expired: tell AuthContext. We skip this for the
    // login request itself, where 401 just means "wrong password".
    if (response.status === 401 && onUnauthorized && path !== '/auth/login') {
      onUnauthorized()
    }
    const message =
      data?.error ||
      FALLBACK_MESSAGES[response.status] ||
      `Request failed (${response.status}).`
    throw new ApiError(message, response.status, data?.field ?? null)
  }

  return data
}
