/*
 * Transactions page (feature F07): the full history, newest first, grouped
 * by month, with Edit and Delete on every row.
 *
 * The order comes from the backend (GET /api/transactions sorts by date,
 * newest first), so the list is always chronological.
 */
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { getTransactions } from '../api/transactions'
import { FormAlert } from '../components/FormFields'
import { AlertIcon, InboxIcon, PlusIcon } from '../components/Icons'
import TransactionList from '../components/TransactionList'
import './pages.css'

export default function Transactions() {
  const { openEditor, confirmDelete, dataVersion } = useOutletContext()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    // (loading + error are reset by the "Try again" button before it bumps retry)
    getTransactions()
      .then((list) => !cancelled && setTransactions(list))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [dataVersion, retry])

  const count = transactions.length

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">History</span>
          <h1>Transactions</h1>
          <p className="page-sub">
            {loading
              ? 'Loading…'
              : `${count} ${count === 1 ? 'transaction' : 'transactions'}, newest first`}
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => openEditor()}>
          <PlusIcon /> New transaction
        </button>
      </header>

      <section className="panel panel-section">
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

        {!loading && !error && count === 0 && (
          <div className="empty-state">
            <InboxIcon />
            <h3>Your history is empty</h3>
            <p>Every income and expense you add will be listed here.</p>
            <button type="button" className="btn btn-gold" onClick={() => openEditor()}>
              <PlusIcon /> Add a transaction
            </button>
          </div>
        )}

        {!loading && !error && count > 0 && (
          <TransactionList
            transactions={transactions}
            onEdit={openEditor}
            onDelete={confirmDelete}
            groupByMonth
          />
        )}
      </section>
    </>
  )
}
