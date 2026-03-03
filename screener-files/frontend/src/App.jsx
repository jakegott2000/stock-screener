import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import ScreenerPage from './components/ScreenerPage'
import { verifyToken, logout } from './api'

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#09090b',
    color: '#fafafa',
  },
  header: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 24px',
    backgroundColor: '#09090b',
    borderBottom: '1px solid #18181b',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1400px',
    height: '56px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#fafafa',
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: '#818cf8',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    padding: '3px 8px',
    backgroundColor: '#18181b',
    borderRadius: '6px',
    border: '1px solid #27272a',
  },
  logoutBtn: {
    padding: '7px 14px',
    backgroundColor: 'transparent',
    color: '#71717a',
    border: '1px solid #27272a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#09090b',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #27272a',
    borderTopColor: '#818cf8',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
}

export default function App() {
  const [authed, setAuthed] = useState(null)
  const [logoutHovered, setLogoutHovered] = useState(false)

  useEffect(() => {
    verifyToken().then(setAuthed)
    const style = document.createElement('style')
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
    document.head.appendChild(style)
    return () => { try { document.head.removeChild(style) } catch {} }
  }, [])

  if (authed === null) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoArea}>
            <div style={styles.logo}>
              Jacob<span style={styles.logoAccent}>IQ</span>
            </div>
            <div style={styles.badge}>Beta</div>
          </div>
          <button
            style={{
              ...styles.logoutBtn,
              ...(logoutHovered ? {
                borderColor: '#3f3f46',
                color: '#a1a1aa',
                backgroundColor: '#18181b',
              } : {}),
            }}
            onClick={logout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
          >
            Sign out
          </button>
        </div>
      </header>
      <ScreenerPage />
    </div>
  )
}
