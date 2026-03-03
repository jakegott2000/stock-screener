import React, { useState } from 'react'
import { login } from '../api'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#09090b',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    animation: 'fadeIn 0.4s ease-out',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#fafafa',
    letterSpacing: '-1px',
    marginBottom: '8px',
  },
  logoAccent: {
    color: '#818cf8',
  },
  subtitle: {
    fontSize: '14px',
    color: '#52525b',
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '32px 28px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#818cf8',
    boxShadow: '0 0 0 3px rgba(129, 140, 248, 0.1)',
  },
  button: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#818cf8',
    color: '#fafafa',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginTop: '20px',
  },
  buttonHover: {
    backgroundColor: '#6366f1',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
    padding: '10px 12px',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: '8px',
    border: '1px solid rgba(248, 113, 113, 0.15)',
  },
}

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)

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
        <div style={styles.logoSection}>
          <div style={styles.logo}>
            Jacob<span style={styles.logoAccent}>IQ</span>
          </div>
          <div style={styles.subtitle}>Global stock screener</div>
        </div>

        <div style={styles.formCard}>
          <form onSubmit={handleSubmit}>
            {error && <div style={styles.error}>{error}</div>}
            <label style={styles.label}>Password</label>
            <input
              style={{
                ...styles.input,
                ...(inputFocused ? styles.inputFocus : {}),
              }}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoFocus
            />
            <button
              style={{
                ...styles.button,
                ...(buttonHovered && !loading ? styles.buttonHover : {}),
                opacity: loading ? 0.7 : 1,
              }}
              type="submit"
              disabled={loading}
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
