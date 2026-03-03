import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import ScreenerPage from './components/ScreenerPage'
import { verifyToken, logout } from './api'

// SVG Logo component — signal/chart icon
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
      <path d="M8 22L13 15L17 18L24 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="24" cy="10" r="2" fill="#fff"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#8b5cf6"/>
          <stop offset="1" stopColor="#06b6d4"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(null)
  const [logoutHovered, setLogoutHovered] = useState(false)

  useEffect(() => {
    verifyToken().then(setAuthed)
  }, [])

  if (authed === null) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#09090b' }}>
        <div style={{ width:28, height:28, border:'3px solid #27272a', borderTopColor:'#8b5cf6', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'#09090b', color:'#fafafa' }}>
      <header style={{
        display:'flex', justifyContent:'center', padding:'0 24px',
        backgroundColor:'rgba(9,9,11,0.8)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid #18181b', position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', maxWidth:'1440px', height:'60px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Logo size={30} />
            <span style={{ fontSize:'20px', fontWeight:'800', letterSpacing:'-0.5px' }}>
              Jacob<span style={{ background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>IQ</span>
            </span>
            <span style={{
              fontSize:'10px', fontWeight:'600', color:'#06b6d4', letterSpacing:'0.5px', textTransform:'uppercase',
              padding:'3px 8px', background:'rgba(6,182,212,0.1)', borderRadius:'6px', border:'1px solid rgba(6,182,212,0.2)',
            }}>Beta</span>
          </div>
          <button
            style={{
              padding:'7px 16px', backgroundColor:'transparent', color:'#71717a',
              border:'1px solid #27272a', borderRadius:'8px', cursor:'pointer',
              fontSize:'13px', fontWeight:'500', transition:'all 0.15s ease',
              ...(logoutHovered ? { borderColor:'#3f3f46', color:'#a1a1aa', backgroundColor:'#18181b' } : {}),
            }}
            onClick={logout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
          >Sign out</button>
        </div>
      </header>
      <ScreenerPage />
    </div>
  )
}
