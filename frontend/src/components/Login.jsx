import React, { useState } from 'react'
import { login } from '../api'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0e17',
  },
  card: {
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '40px',
    width: '360px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '12px',
  },
}

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = await login(password)
      if (success) {
        onLogin()
      } else {
        setError('Incorrect password')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.title}>Stock Screener</div>
        <div style={styles.subtitle}>Enter your password to continue</div>
        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
