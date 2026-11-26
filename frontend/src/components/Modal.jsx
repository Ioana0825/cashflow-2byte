/*
 * A pop-up window ("modal") built on the browser's own <dialog> element.
 *
 * dialog.showModal() gives us for free:
 *   - a dark backdrop behind the window (styled with ::backdrop in CSS)
 *   - focus stays inside the window while it's open (keyboard friendly)
 *   - the Esc key closes it (we listen to its "cancel" event)
 *   - the rest of the page can't be clicked
 *
 * Props: title, onClose, children, size ("md" | "sm")
 */
import { useEffect, useRef } from 'react'

import { CloseIcon } from './Icons'
import './Modal.css'

export default function Modal({ title, onClose, children, size = 'md' }) {
  // useRef gives us the real <dialog> DOM element so we can call showModal()
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close() // when the component disappears
  }, [])

  function handleCancel(event) {
    event.preventDefault() // we close it ourselves, through React state
    onClose()
  }

  // A click exactly on the <dialog> (not on its content) is a click on the
  // backdrop -> close the window
  function handleClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal-${size}`}
      onCancel={handleCancel}
      onClick={handleClick}
      aria-labelledby="modal-title"
    >
      <div className="modal-box">
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
