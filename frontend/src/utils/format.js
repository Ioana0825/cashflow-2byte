/*
 * Helpers that turn raw data into nice text: money, dates, names.
 *
 * Intl.NumberFormat / Intl.DateTimeFormat are built into every browser and
 * handle thousands separators, decimals and month names for us.
 */

// Change these two lines to use another currency, e.g. 'ro-RO' + 'RON' for lei
const LOCALE = 'en-US'
const CURRENCY = 'USD'

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// 1234.5 -> "$1,234.50"
export function formatMoney(amount) {
  return moneyFormatter.format(Number(amount) || 0)
}

// With a sign that depends on the type: income "+$50.00", expense "−$50.00"
export function formatSignedAmount(amount, type) {
  const sign = type === 'income' ? '+' : '−' // "−" is a real minus sign
  return sign + formatMoney(Math.abs(amount))
}

/*
 * The API sends dates as "2026-11-20". new Date("2026-11-20") would read it
 * as midnight UTC, which in Romania (UTC+2) is fine, but in America it would
 * become the 19th! So we split the text and build a LOCAL date ourselves.
 */
export function parseISODate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day) // months start at 0 in JavaScript
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

// "2026-11-20" -> "Nov 20, 2026"
export function formatDate(isoDate) {
  return dateFormatter.format(parseISODate(isoDate))
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })

// "2026-11-20" -> "November 2026" (used to group the history by month)
export function formatMonth(isoDate) {
  return monthFormatter.format(parseISODate(isoDate))
}

// Today as "YYYY-MM-DD" in the user's own time zone (default for new transactions)
export function todayISO() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// "ana.popescu@mail.com" -> "Ana" (we don't store names, so we use the email)
export function nameFromEmail(email = '') {
  const first = email.split('@')[0].split(/[._-]/)[0] || ''
  return first.charAt(0).toUpperCase() + first.slice(1)
}

// "Good morning" / "Good afternoon" / "Good evening" depending on the hour
export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
