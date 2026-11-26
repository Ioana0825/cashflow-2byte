/*
 * Calls to the /api/auth endpoints. Each function is a thin wrapper around
 * request() so the pages don't need to know URLs or HTTP methods.
 */
import { request } from './client'

// The backend answers {token, user}. We only keep `user`: the token is
// already stored by the browser as an httpOnly cookie (see client.js).
export async function registerUser(email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { email, password },
  })
  return data.user
}

export async function loginUser(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  return data.user
}

// Asks the server to delete the login cookie (JavaScript can't do it itself)
export function logoutUser() {
  return request('/auth/logout', { method: 'POST' })
}

// Who is logged in? Used when the page loads. Throws ApiError(401) if nobody.
export function fetchCurrentUser() {
  return request('/auth/me')
}
