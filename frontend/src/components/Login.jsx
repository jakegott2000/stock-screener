import React, { useState } from 'react'
import { login } from '../api'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0e1a',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 25%, #1f2937 50%, #111827 75%, #0a0e1a 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradient-shift 15s ease infinite',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '16px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(6, 182, 212, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
    position: 'relative',
    zIndex: 10,
  },
  brandContainer: {
    marginBottom: '28px',
  },
  logo: {
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
    marginBottom: '10px',
    textShadow: '0 0 30px rgba(6, 182, 212, 0.2)',
  },
  subtitle: {
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  divider: {
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)',
    margin: '28px 0',
  },
  formTitle: {
    fontSize: '14px',
    color: '#cbd5e1',
    fontWeight: '700',
    marginBottom: '20px',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#06b6d4',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(10, 14, 26, 0.6)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },
  inputFocus: {
    backgroundColor: 'rgba(10, 14, 26, 0.8)',
    borderColor: 'rgba(6, 182, 212, 0.6)',
    boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.2), 0 0 20px rgba(6, 182, 212, 0.1)',
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
  },
  buttonHover: {
    boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4), 0 0 20px rgba(6, 182, 212, 0.3)',
    transform: 'translateY(-2px)',
  },
  error: {
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
    padding: '10px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
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
