/*
 * The list of transactions, used on the Dashboard (recent ones) and on the
 * Transactions page (all of them, grouped by month). Feature F07.
 *
 * On a wide screen every transaction is one row with columns, like a table.
 * On a phone the same HTML is shown as compact cards (see the CSS file):
 * we don't build two different lists, CSS rearranges the same one.
 *
 * Props:
 *   transactions   array from the API, already sorted newest first
 *   onEdit(tx)     called by the pencil button
 *   onDelete(tx)   called by the bin button
 *   groupByMonth   true -> a "November 2026" heading before each month
 */
import { Fragment } from 'react'

import { formatDate, formatMonth, formatSignedAmount } from '../utils/format'
import { PencilIcon, TrashIcon } from './Icons'
import './TransactionList.css'

export default function TransactionList({ transactions, onEdit, onDelete, groupByMonth = false }) {
  return (
    <div className="tx-list" role="table" aria-label="Transactions">
      {/* Column titles (hidden on phones) */}
      <div className="tx-row tx-head" role="row">
        <span role="columnheader">Description</span>
        <span role="columnheader">Category</span>
        <span role="columnheader">Date</span>
        <span role="columnheader">Type</span>
        <span role="columnheader" className="tx-amount">
          Amount
        </span>
        <span role="columnheader">
          <span className="sr-only">Actions</span>
        </span>
      </div>

      {transactions.map((tx, index) => {
        // Show a month heading before the first transaction of each month.
        // The list is sorted, so we only compare with the transaction before.
        const month = tx.date.slice(0, 7) // "2026-11"
        const previousMonth = index > 0 ? transactions[index - 1].date.slice(0, 7) : null
        const showMonth = groupByMonth && month !== previousMonth

        return (
          // Fragment groups elements without adding an extra <div>
          <Fragment key={tx.id}>
            {showMonth && (
              <div className="tx-month" role="row">
                <span role="cell">{formatMonth(tx.date)}</span>
              </div>
            )}

            <div className="tx-row" role="row">
              <span className="tx-main" role="cell">
                {/* Round badge with the category's first letter */}
                <span className={`tx-badge ${tx.type}`} aria-hidden="true">
                  {tx.category.charAt(0).toUpperCase()}
                </span>
                <span className="tx-text">
                  {/* React escapes this text automatically, so a description
                      like "<script>" is shown as text, never run (no XSS) */}
                  <span className="tx-title">{tx.description || tx.category}</span>
                  <span className="tx-sub">
                    {tx.category} · {formatDate(tx.date)}
                  </span>
                </span>
              </span>

              <span className="tx-category" role="cell">
                <span className="chip">{tx.category}</span>
              </span>

              <span className="tx-date" role="cell">
                {formatDate(tx.date)}
              </span>

              <span className="tx-type" role="cell">
                <span className={`pill ${tx.type}`}>{tx.type === 'income' ? 'Income' : 'Expense'}</span>
              </span>

              <span className={`tx-amount num ${tx.type}`} role="cell">
                {formatSignedAmount(tx.amount, tx.type)}
              </span>

              <span className="tx-actions" role="cell">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onEdit(tx)}
                  aria-label={`Edit ${tx.description || tx.category}`}
                  title="Edit"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => onDelete(tx)}
                  aria-label={`Delete ${tx.description || tx.category}`}
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
