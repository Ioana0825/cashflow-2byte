/*
 * The form to ADD a transaction (F04) or EDIT one (F05), shown in a Modal.
 *
 *   transaction = null      -> "New transaction", empty form, POST
 *   transaction = {...}     -> "Edit transaction", pre-filled form, PUT
 *
 * Fields: type (income/expense), amount, category, date, description.
 * The form is checked in the browser first (utils/validation.js); if the
 * server still refuses something, its message is shown under the field it
 * names (the backend answers {"error": "...", "field": "amount"}).
 */
import { useState } from 'react'

import { createTransaction, updateTransaction } from '../api/transactions'
import { useToast } from '../context/ToastContext'
import { CATEGORIES } from '../utils/categories'
import { todayISO } from '../utils/format'
import { validateTransaction } from '../utils/validation'
import { FormAlert, TextField } from './FormFields'
import { AlertIcon, ArrowDownRightIcon, ArrowUpRightIcon } from './Icons'
import Modal from './Modal'
import './TransactionForm.css'

// Initial values of the form fields
function initialValues(transaction) {
  if (!transaction) {
    return { type: 'expense', amount: '', category: '', date: todayISO(), description: '' }
  }
  return {
    type: transaction.type,
    amount: Number(transaction.amount).toFixed(2), // 52.3 -> "52.30"
    category: transaction.category,
    date: transaction.date,
    description: transaction.description ?? '',
  }
}

export default function TransactionForm({ transaction, onClose, onSaved }) {
  const isEdit = Boolean(transaction)
  const toast = useToast()

  const [form, setForm] = useState(() => initialValues(transaction))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  // Categories for the chosen type. If we edit a transaction whose category
  // isn't in our list (e.g. created in Postman), we still offer it.
  const options = [...CATEGORIES[form.type]]
  if (form.category && !options.includes(form.category)) options.unshift(form.category)

  function setField(name, value) {
    setForm((old) => ({ ...old, [name]: value }))
    if (errors[name]) setErrors((old) => ({ ...old, [name]: undefined }))
  }

  function handleChange(event) {
    setField(event.target.name, event.target.value)
  }

  // Switching income <-> expense resets the category, because the lists differ
  function chooseType(type) {
    if (type === form.type) return
    setForm((old) => ({ ...old, type, category: '' }))
    setErrors((old) => ({ ...old, type: undefined, category: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const found = validateTransaction(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // The shape the API expects. Amount is sent as a number with 2 decimals.
    const payload = {
      type: form.type,
      amount: Number(Number(form.amount).toFixed(2)),
      category: form.category.trim(),
      date: form.date,
      description: form.description.trim() || null,
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateTransaction(transaction.id, payload)
        toast('Transaction updated')
      } else {
        await createTransaction(payload)
        toast('Transaction added')
      }
      onSaved()
    } catch (err) {
      if (err.field && err.field in form) {
        // "amount: Input should be greater than 0" -> "Input should be greater than 0"
        setErrors({ [err.field]: err.message.replace(/^\w+: /, '') })
      } else {
        setServerError(err.message)
      }
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit transaction' : 'New transaction'} onClose={onClose}>
      <form className="tx-form" onSubmit={handleSubmit} noValidate>
        <FormAlert icon={AlertIcon}>{serverError}</FormAlert>

        {/* Type: two big toggle buttons instead of a dropdown */}
        <div className="field">
          <span className="field-label" id="type-label">
            Type
          </span>
          <div className="type-toggle" role="radiogroup" aria-labelledby="type-label">
            <button
              type="button"
              role="radio"
              aria-checked={form.type === 'expense'}
              className={`type-option expense ${form.type === 'expense' ? 'selected' : ''}`}
              onClick={() => chooseType('expense')}
            >
              <ArrowDownRightIcon /> Expense
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.type === 'income'}
              className={`type-option income ${form.type === 'income' ? 'selected' : ''}`}
              onClick={() => chooseType('income')}
            >
              <ArrowUpRightIcon /> Income
            </button>
          </div>
          {errors.type && <p className="field-error">{errors.type}</p>}
        </div>

        <div className="tx-form-row">
          <TextField
            label="Amount"
            name="amount"
            type="number"
            inputMode="decimal" // phones show a number keyboard with a dot
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            error={errors.amount}
            autoFocus={!isEdit}
          />
          <TextField
            label="Date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            error={errors.date}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-category">
            Category
          </label>
          <select
            id="tx-category"
            name="category"
            className="input"
            value={form.category}
            onChange={handleChange}
            aria-invalid={errors.category ? 'true' : 'false'}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-description">
            Description <span className="optional">(optional)</span>
          </label>
          <textarea
            id="tx-description"
            name="description"
            className="input"
            maxLength={255}
            placeholder="e.g. Groceries at the market"
            value={form.description}
            onChange={handleChange}
            aria-invalid={errors.description ? 'true' : 'false'}
          />
          {errors.description ? (
            <p className="field-error">{errors.description}</p>
          ) : (
            <p className="field-hint counter">{form.description.length}/255</p>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
