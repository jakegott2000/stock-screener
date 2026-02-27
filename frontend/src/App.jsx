import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import ScreenerPage from './components/ScreenerPage'
import { verifyToken, logout } from './api'

// NOTE: Add to your HTML head tag:
// <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#06090f',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'clamp(10px, 3vw, 16px) clamp(16px, 5vw, 24px)',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderBottom: '1px solid rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '16px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  logoText: {
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  tag: {
    fontSize: 'clamp(10px, 2vw, 11px)',
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    padding: '4px 8px',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    padding: 'clamp(6px, 2vw, 8px) clamp(10px, 3vw, 14px)',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(71, 85, 105, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(12px, 2vw, 13px)',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  logoutBtnHover: {
    borderColor: 'rgba(248, 113, 113, 0.5)',
    color: '#fca5a5',
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#64748b',
    backgroundColor: '#06090f',
  },
}

export default function App() {
  const [authed, setAuthed] = useState(null) // null = loading
  const [logoutHovered, setLogoutHovered] = useState(false)

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
        <div style={styles.headerContent}>
          <div style={styles.logoContainer}>
            <div style={styles.logoText}>JacobIQ</div>
            <div style={styles.tag}>Draft 1.0</div>
          </div>
          <button
            style={{
              ...styles.logoutBtn,
              ...(logoutHovered ? styles.logoutBtnHover : {}),
            }}
            onClick={logout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
          >
            Logout
          </button>
        </div>
      </header>
      <ScreenerPage />
    </div>
  )
}
