/*
 * The three cards at the top of the Dashboard (features F08 + F09):
 *   Current balance = total income − total expenses
 *   Total income
 *   Total expenses
 *
 * The numbers are calculated by the backend (GET /api/summary), with a SUM
 * in the database. The frontend only displays them, so there is one single
 * source of truth for the maths.
 */
import { formatMoney } from '../utils/format'
import GoldLines from './GoldLines'
import { ArrowDownRightIcon, ArrowUpRightIcon, WalletIcon } from './Icons'
import './SummaryCards.css'

export default function SummaryCards({ summary }) {
  const { total_income, total_expenses, balance, transaction_count } = summary
  const negative = balance < 0

  return (
    <section className="summary-cards" aria-label="Totals">
      {/* Featured gold card */}
      <article className="summary-card balance">
        <GoldLines className="balance-lines" />
        <span className="summary-icon">
          <WalletIcon />
        </span>
        <div>
          <h2 className="summary-label">Current balance</h2>
          <p className={`summary-value num ${negative ? 'expense' : ''}`}>
            {/* formatMoney(-50) already writes "-$50.00" */}
            {formatMoney(balance)}
          </p>
          <p className="summary-note">
            Income minus expenses · {transaction_count}{' '}
            {transaction_count === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
      </article>

      <article className="summary-card income-card">
        <span className="summary-icon">
          <ArrowUpRightIcon />
        </span>
        <div>
          <h2 className="summary-label">Total income</h2>
          <p className="summary-value num">{formatMoney(total_income)}</p>
        </div>
      </article>

      <article className="summary-card expense-card">
        <span className="summary-icon">
          <ArrowDownRightIcon />
        </span>
        <div>
          <h2 className="summary-label">Total expenses</h2>
          <p className="summary-value num">{formatMoney(total_expenses)}</p>
        </div>
      </article>
    </section>
  )
}
