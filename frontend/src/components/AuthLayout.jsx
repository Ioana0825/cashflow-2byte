/*
 * The frame shared by the Login and Register pages: a top bar with the logo,
 * gold lines in the background, and the page content in the middle.
 *
 * Props:
 *   topAction  what to show in the top-right corner (e.g. a "Sign up" link)
 *   aside      optional extra column on the left (Register uses it)
 */
import GoldLines from './GoldLines'
import Logo from './Logo'
import './AuthLayout.css'

export default function AuthLayout({ topAction, aside, children }) {
  return (
    <div className="auth-page">
      {/* Decorative ribbons in two corners */}
      <GoldLines className="auth-lines auth-lines-bottom" />
      <GoldLines className="auth-lines auth-lines-top" flip />

      <header className="auth-topbar">
        <div className="auth-brand">
          <Logo />
          <span className="auth-motto" aria-hidden="true">
            Track <i>·</i> Manage <i>·</i> Grow
          </span>
        </div>
        <div className="auth-top-action">{topAction}</div>
      </header>

      <main className={`auth-main ${aside ? 'with-aside' : ''}`}>
        {aside && <aside className="auth-aside">{aside}</aside>}
        <div className="auth-card">{children}</div>
      </main>
    </div>
  )
}
