/*
 * Calls to the /api/transactions and /api/summary endpoints.
 */
import { request } from './client'

// All my transactions, newest first (the backend sorts them)
export function getTransactions() {
  return request('/transactions')
}

// `data` = { type, amount, category, date, description }
export function createTransaction(data) {
  return request('/transactions', { method: 'POST', body: data })
}

export function updateTransaction(id, data) {
  // encodeURIComponent makes sure the id can't change the URL in a weird way
  return request(`/transactions/${encodeURIComponent(id)}`, { method: 'PUT', body: data })
}

export function deleteTransaction(id) {
  return request(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// { total_income, total_expenses, balance, transaction_count, by_category }
export function getSummary() {
  return request('/summary')
}
