import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import ScreenerPage from './components/ScreenerPage'
import { verifyToken, logout } from './api'

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0a0e17',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#111827',
    borderBottom: '1px solid #1e293b',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#60a5fa',
    letterSpacing: '-0.5px',
  },
  logoutBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#64748b',
  },
}

export default function App() {
  const [authed, setAuthed] = useState(null) // null = loading

  useEffect(() => {
    verifyToken().then(setAuthed)
  }, [])

  if (authed === null) {
    return <div style={styles.loading}>Loading...</div>
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo}>Stock Screener</div>
        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
      </header>
      <ScreenerPage />
    </div>
  )
}
