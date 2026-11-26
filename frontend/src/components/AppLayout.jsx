/*
 * The frame around every page you see after logging in.
 *
 *   Desktop (> 860px): a sidebar on the left with the logo, the menu, and the
 *                      user's email + "Log out" at the bottom.
 *   Phone / tablet:    a slim top bar (logo + log out) and a navigation bar
 *                      at the bottom with a big gold "+" in the middle,
 *                      where thumbs can reach it easily.
 *
 * The layout also owns the "add / edit transaction" window, because both the
 * Dashboard and the Transactions page need it (and the "+" button lives in
 * the layout). The same goes for the "delete?" confirmation window.
 * Pages reach both through React Router's "outlet context":
 *     const { openEditor, confirmDelete, dataVersion } = useOutletContext()
 * `dataVersion` goes up by 1 after every save or delete; pages use it as a
 * signal to load their data again, so totals are always up to date (F09).
 */
import { useCallback, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import DeleteDialog from './DeleteDialog'
import GoldLines from './GoldLines'
import { HomeIcon, ListIcon, LogoutIcon, PlusIcon } from './Icons'
import Logo from './Logo'
import TransactionForm from './TransactionForm'
import './AppLayout.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListIcon },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // editor = null (closed) | { transaction: null } (add) | { transaction: {...} } (edit)
  const [editor, setEditor] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)

  // The transaction waiting for "are you sure?" before being deleted (or null)
  const [toDelete, setToDelete] = useState(null)

  const openEditor = useCallback((transaction = null) => setEditor({ transaction }), [])
  const closeEditor = useCallback(() => setEditor(null), [])
  const confirmDelete = useCallback((transaction) => setToDelete(transaction), [])
  const refreshData = useCallback(() => setDataVersion((v) => v + 1), [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {/* ------------------------------------------------ desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            // NavLink adds the class "active" when its page is open
            <NavLink key={to} to={to} end={end} className="sidebar-link">
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="btn btn-gold sidebar-add" onClick={() => openEditor()}>
          <PlusIcon /> New transaction
        </button>

        <GoldLines className="sidebar-lines" />

        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {user.email.charAt(0).toUpperCase()}
          </span>
          {/* title shows the full email on hover if it's cut off */}
          <span className="sidebar-email" title={user.email}>
            {user.email}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------ mobile top bar */}
      <header className="topbar">
        <Logo />
        <button type="button" className="btn btn-ghost topbar-logout" onClick={handleLogout}>
          <LogoutIcon /> Log out
        </button>
      </header>

      {/* ------------------------------------------------ page content */}
      <main className="app-main">
        <Outlet context={{ openEditor, confirmDelete, dataVersion }} />
      </main>

      {/* ------------------------------------------------ mobile bottom bar */}
      <nav className="bottom-nav" aria-label="Main">
        <NavLink to="/" end className="bottom-link">
          <HomeIcon />
          <span>Dashboard</span>
        </NavLink>
        <button
          type="button"
          className="bottom-add"
          onClick={() => openEditor()}
          aria-label="New transaction"
        >
          <PlusIcon />
        </button>
        <NavLink to="/transactions" className="bottom-link">
          <ListIcon />
          <span>Transactions</span>
        </NavLink>
      </nav>

      {/* The add/edit window, only drawn while it's open */}
      {editor && (
        <TransactionForm
          transaction={editor.transaction}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor()
            refreshData()
          }}
        />
      )}

      {toDelete && (
        <DeleteDialog
          transaction={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setToDelete(null)
            refreshData()
          }}
        />
      )}
    </div>
  )
}
