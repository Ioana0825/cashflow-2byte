/*
 * The CashFlow logo: four rising gold bars + the name in serif.
 *
 * Props:
 *   size     "sm" (sidebar/top bar) or "lg" (centred on the login card)
 *   tagline  true -> show "PERSONAL FINANCE MANAGER" under the name
 */
import './Logo.css'

export function LogoMark({ className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} viewBox="0 0 40 32" aria-hidden="true">
      {/* Plain colours, darker to lighter. (A shared <linearGradient> would break
          when the sidebar copy of the logo is hidden with display: none.) */}
      <rect x="2" y="19" width="6" height="11" rx="1" fill="#b98d48" />
      <rect x="11" y="14" width="6" height="16" rx="1" fill="#cfa660" />
      <rect x="20" y="9" width="6" height="21" rx="1" fill="#e2bf7c" />
      <rect x="29" y="2" width="6" height="28" rx="1" fill="#f0d9a6" />
    </svg>
  )
}

export default function Logo({ size = 'sm', tagline = false }) {
  return (
    <div className={`logo logo-${size}`}>
      <LogoMark />
      <span className="logo-name">CashFlow</span>
      {tagline && <span className="logo-tagline eyebrow">Personal finance manager</span>}
    </div>
  )
}
