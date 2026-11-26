/*
 * Dashboard (feature F08): the totals and the most recent transactions.
 *
 * It loads two things from the API at the same time:
 *   GET /api/summary        -> total income, total expenses, balance
 *   GET /api/transactions   -> the list (we show the newest 5)
 *
 * Whenever a transaction is added, edited or deleted, AppLayout increases
 * `dataVersion`; because it's in the useEffect's dependency list, the data
 * is loaded again and the totals update right away (F09).
 */
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { getSummary, getTransactions } from '../api/transactions'
import { FormAlert } from '../components/FormFields'
import { AlertIcon, ArrowRightIcon, InboxIcon, PlusIcon } from '../components/Icons'
import SummaryCards from '../components/SummaryCards'
import TransactionList from '../components/TransactionList'
import { useAuth } from '../context/AuthContext'
import { greeting, nameFromEmail } from '../utils/format'
import './pages.css'

const RECENT_COUNT = 5

// "Thursday, November 26"
const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date())

export default function Dashboard() {
  const { user } = useAuth()
  const { openEditor, confirmDelete, dataVersion } = useOutletContext()

  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0) // bump to try loading again

  useEffect(() => {
    let cancelled = false
    // (loading + error are reset by the "Try again" button before it bumps retry)

    // Promise.all runs both requests in parallel and waits for both
    Promise.all([getSummary(), getTransactions()])
      .then(([summaryData, transactions]) => {
        if (cancelled) return
        setSummary(summaryData)
        setRecent(transactions.slice(0, RECENT_COUNT))
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))

    // If the page closes before the answer arrives, ignore the answer
    return () => {
      cancelled = true
    }
  }, [dataVersion, retry])

  const name = nameFromEmail(user.email)

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">{todayLabel}</span>
          <h1>
            {greeting()}
            {name && `, ${name}`}
          </h1>
          <p className="page-sub">Here&apos;s where your money stands.</p>
        </div>
      </header>

      {loading && (
        <div className="loading-box">
          <div className="spinner" role="status" aria-label="Loading" />
        </div>
      )}

      {!loading && error && (
        <div className="load-error">
          <FormAlert icon={AlertIcon}>{error}</FormAlert>
          <button type="button" className="btn btn-outline" onClick={() => {
              setLoading(true)
              setError('')
              setRetry((n) => n + 1)
            }}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <SummaryCards summary={summary} />

          <section className="panel panel-section" aria-labelledby="recent-title">
            <div className="panel-head">
              <h2 id="recent-title">Recent transactions</h2>
              {recent.length > 0 && (
                <Link to="/transactions" className="link-arrow">
                  View all <ArrowRightIcon />
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="empty-state">
                <InboxIcon />
                <h3>No transactions yet</h3>
                <p>Add your first income or expense to see your balance here.</p>
                <button type="button" className="btn btn-gold" onClick={() => openEditor()}>
                  <PlusIcon /> Add a transaction
                </button>
              </div>
            ) : (
              <TransactionList transactions={recent} onEdit={openEditor} onDelete={confirmDelete} />
            )}
          </section>
        </>
      )}
    </>
  )
}
