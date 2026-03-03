import React, { useState } from 'react'
import { login } from '../api'

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#logoGrad2)" />
      <path d="M8 22L13 15L17 18L24 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="24" cy="10" r="2" fill="#fff"/>
      <defs>
        <linearGradient id="logoGrad2" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#8b5cf6"/>
          <stop offset="1" stopColor="#06b6d4"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = await login(password)
      if (success) onLogin()
      else setError('Incorrect password')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', backgroundColor:'#f8fafc', padding:'16px' }}>
      <div style={{ width:'100%', maxWidth:'380px', animation:'fadeIn 0.4s ease-out' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ display:'inline-flex', marginBottom:'16px' }}><Logo size={48} /></div>
          <div style={{ fontSize:'28px', fontWeight:'900', letterSpacing:'-1px', marginBottom:'6px', color:'#0f172a' }}>
            Jacob<span style={{ background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>IQ</span>
          </div>
          <div style={{ fontSize:'14px', color:'#94a3b8' }}>Global Stock Intelligence</div>
        </div>
        <div style={{ backgroundColor:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'16px', padding:'32px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ color:'#ef4444', fontSize:'13px', marginBottom:'16px', padding:'10px 12px', backgroundColor:'rgba(239,68,68,0.06)', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.12)' }}>{error}</div>
            )}
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#64748b', marginBottom:'8px' }}>Password</label>
            <input
              style={{
                width:'100%', padding:'11px 14px', backgroundColor:'#f8fafc', border:'1px solid #e2e8f0',
                borderRadius:'10px', color:'#0f172a', fontSize:'14px', outline:'none', transition:'all 0.15s', boxSizing:'border-box',
                ...(focused ? { borderColor:'#8b5cf6', boxShadow:'0 0 0 3px rgba(139,92,246,0.1)' } : {}),
              }}
              type="password" placeholder="Enter password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoFocus
            />
            <button style={{
              width:'100%', padding:'11px', marginTop:'20px', border:'none', borderRadius:'10px',
              fontSize:'14px', fontWeight:'600', cursor:'pointer', transition:'all 0.15s',
              background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', color:'#fff',
              opacity: loading ? 0.7 : 1,
              ...(btnHover && !loading ? { filter:'brightness(1.1)', transform:'translateY(-1px)', boxShadow:'0 4px 16px rgba(139,92,246,0.25)' } : {}),
            }} type="submit" disabled={loading}
              onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
            >{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
