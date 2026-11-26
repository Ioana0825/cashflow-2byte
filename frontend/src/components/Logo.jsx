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
      <defs>
        {/* A vertical gold gradient, reused by every bar via url(#logo-gold) */}
        <linearGradient id="logo-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1dcab" />
          <stop offset="1" stopColor="#b48843" />
        </linearGradient>
      </defs>
      <rect x="2" y="19" width="6" height="11" rx="1" fill="url(#logo-gold)" />
      <rect x="11" y="14" width="6" height="16" rx="1" fill="url(#logo-gold)" />
      <rect x="20" y="9" width="6" height="21" rx="1" fill="url(#logo-gold)" />
      <rect x="29" y="2" width="6" height="28" rx="1" fill="url(#logo-gold)" />
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
