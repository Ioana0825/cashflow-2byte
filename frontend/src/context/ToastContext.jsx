/*
 * Toasts: the small messages that pop up in a corner for a few seconds,
 * e.g. "Transaction added". Any component can show one with
 *     const toast = useToast()
 *     toast('Transaction added')
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react'

import { AlertIcon, CheckIcon } from '../components/Icons'
import './Toast.css'

const ToastContext = createContext(() => {})

const DURATION_MS = 3500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]) // [{id, message, kind}]
  const nextId = useRef(1) // useRef keeps a value without causing re-renders

  const show = useCallback((message, kind = 'success') => {
    const id = nextId.current++
    setToasts((list) => [...list, { id, message, kind }])
    // Remove it again after a few seconds
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: screen readers announce new messages automatically */}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'error' ? <AlertIcon /> : <CheckIcon />}
            {/* React escapes text like this, so a message can never inject HTML */}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
