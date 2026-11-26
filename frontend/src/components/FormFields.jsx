/*
 * Reusable form inputs with a label, an optional icon and an error message.
 *
 * Accessibility details (they also make the app nicer for everyone):
 *   - <label htmlFor=id> is linked to the input, so clicking the label
 *     focuses the input and screen readers read the label.
 *   - aria-invalid tells screen readers the value is wrong (and our CSS
 *     colours the border red).
 *   - aria-describedby links the input to its error message.
 */
import { useId, useState } from 'react'

import { EyeIcon, EyeOffIcon } from './Icons'

export function TextField({ label, error, icon: Icon, hint, ...inputProps }) {
  // useId() creates a unique id, e.g. ":r3:", so labels never clash
  const id = useId()
  const messageId = `${id}-msg`

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`input-wrap ${Icon ? 'has-icon' : ''}`}>
        {Icon && <Icon className="input-icon" />}
        <input
          id={id}
          className="input"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? messageId : undefined}
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={messageId} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/*
 * Password input with an eye button to show/hide what you typed.
 * It simply switches the input between type="password" and type="text".
 */
export function PasswordField({ label, error, icon: Icon, hint, ...inputProps }) {
  const id = useId()
  const messageId = `${id}-msg`
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`input-wrap ${Icon ? 'has-icon' : ''}`}>
        {Icon && <Icon className="input-icon" />}
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? messageId : undefined}
          style={{ paddingRight: 46 }}
          {...inputProps}
        />
        <button
          type="button" // "button", so clicking it doesn't submit the form
          className="icon-btn input-action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={messageId} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

// Red box with an icon, for errors that are not about one specific field
export function FormAlert({ children, icon: Icon }) {
  if (!children) return null
  return (
    <div className="form-alert" role="alert">
      {Icon && <Icon />}
      <span>{children}</span>
    </div>
  )
}
