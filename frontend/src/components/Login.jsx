import React, { useState } from 'react'
import { login } from '../api'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#06090f',
    background: 'linear-gradient(135deg, #06090f 0%, #0d1421 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  },
  brandContainer: {
    marginBottom: '24px',
  },
  logo: {
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#94a3b8',
    fontWeight: '400',
    letterSpacing: '0.5px',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #334155, transparent)',
    margin: '28px 0',
  },
  formTitle: {
    fontSize: '14px',
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: '20px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(71, 85, 105, 0.4)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
  },
  inputFocus: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: 'rgba(59, 130, 246, 0.6)',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
    letterSpacing: '0.5px',
  },
  buttonHover: {
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
    transform: 'translateY(-2px)',
  },
  error: {
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
    padding: '10px 12px',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(248, 113, 113, 0.2)',
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
        <div style={styles.brandContainer}>
          <div style={styles.logo}>JacobIQ</div>
          <div style={styles.subtitle}>Screener Draft 1.0</div>
        </div>
        <div style={styles.divider}></div>
        <div style={styles.formTitle}>Access Terminal</div>
        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            style={{
              ...styles.input,
              ...(inputFocused ? styles.inputFocus : {}),
            }}
            type="password"
            placeholder="Password"
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
              opacity: loading ? 0.75 : 1,
            }}
            type="submit"
            disabled={loading}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
