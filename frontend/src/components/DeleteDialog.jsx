/*
 * "Are you sure?" window before deleting a transaction (feature F06).
 * Deleting can't be undone, so we always ask first and show exactly which
 * transaction will be removed.
 */
import { useState } from 'react'

import { deleteTransaction } from '../api/transactions'
import { useToast } from '../context/ToastContext'
import { formatDate, formatSignedAmount } from '../utils/format'
import { FormAlert } from './FormFields'
import { AlertIcon } from './Icons'
import Modal from './Modal'

export default function DeleteDialog({ transaction, onClose, onDeleted }) {
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await deleteTransaction(transaction.id)
      toast('Transaction deleted')
      onDeleted()
    } catch (err) {
      // e.g. 404 "Transaction not found." if it was already deleted elsewhere
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Modal title="Delete transaction?" onClose={onClose} size="sm">
      <FormAlert icon={AlertIcon}>{error}</FormAlert>
      <p style={{ color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text)' }}>
          {transaction.description || transaction.category}
        </strong>{' '}
        ({formatSignedAmount(transaction.amount, transaction.type)} on{' '}
        {formatDate(transaction.date)}) will be removed permanently. This can&apos;t be undone.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
