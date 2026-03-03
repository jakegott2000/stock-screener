import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import ScreenerPage from './components/ScreenerPage'
import { verifyToken, logout } from './api'

/* ─── SVG Logo (used in header + intro) ─── */
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

/* ─── Cinematic Intro ─── */
function CinematicIntro({ onComplete }) {
  const [phase, setPhase] = useState(0)
  // 0: black screen, 1: logo draws in, 2: text reveals, 3: glow burst, 4: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => onComplete(), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#0a0a0f',
      display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
      transition:'opacity 0.6s ease',
      opacity: phase >= 4 ? 0 : 1,
      pointerEvents: phase >= 4 ? 'none' : 'all',
    }}>
      {/* Ambient glow behind logo */}
      <div style={{
        position:'absolute', width:'300px', height:'300px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        transition:'all 1s ease',
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 3 ? 'scale(3)' : 'scale(1)',
      }} />

      {/* Logo SVG — draws the chart line */}
      <div style={{
        transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)',
        transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
        opacity: phase >= 1 ? 1 : 0,
        marginBottom:'28px',
      }}>
        <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#introLogoGrad)" style={{
            opacity: phase >= 1 ? 1 : 0,
            transition:'opacity 0.4s ease',
          }}/>
          <path d="M8 22L13 15L17 18L24 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset={phase >= 1 ? 0 : 40}
            style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.65,0,0.35,1) 0.3s' }}
          />
          <circle cx="24" cy="10" r="2" fill="#fff" style={{
            opacity: phase >= 2 ? 1 : 0,
            transition:'opacity 0.3s ease',
          }}/>
          <defs>
            <linearGradient id="introLogoGrad" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#8b5cf6"/>
              <stop offset="1" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text reveal */}
      <div style={{
        display:'flex', alignItems:'baseline', gap:'0px',
        overflow:'hidden', height:'44px',
      }}>
        <span style={{
          fontSize:'36px', fontWeight:'900', letterSpacing:'-1.5px', color:'#e2e8f0',
          transition:'all 0.6s cubic-bezier(0.16,1,0.3,1)',
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(50px)',
          opacity: phase >= 2 ? 1 : 0,
        }}>Jacob</span>
        <span style={{
          fontSize:'36px', fontWeight:'900', letterSpacing:'-1.5px',
          background:'linear-gradient(135deg,#8b5cf6,#06b6d4)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          transition:'all 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s',
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(50px)',
          opacity: phase >= 2 ? 1 : 0,
        }}>IQ</span>
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize:'13px', fontWeight:'500', color:'#475569', letterSpacing:'3px', textTransform:'uppercase',
        marginTop:'12px',
        transition:'all 0.5s ease 0.3s',
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
      }}>Global Stock Intelligence</div>

      {/* Horizontal line sweep */}
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        height:'1px', transform:'translateX(-50%)',
        background:'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(6,182,212,0.6), transparent)',
        transition:'all 0.8s cubic-bezier(0.16,1,0.3,1)',
        width: phase >= 3 ? '80vw' : '0px',
        opacity: phase >= 3 ? (phase >= 4 ? 0 : 0.6) : 0,
      }} />
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(null)
  const [introComplete, setIntroComplete] = useState(false)
  const [logoutHovered, setLogoutHovered] = useState(false)

  useEffect(() => {
    verifyToken().then(setAuthed)
  }, [])

  // Show intro on every fresh page load
  if (!introComplete) {
    return <CinematicIntro onComplete={() => setIntroComplete(true)} />
  }

  if (authed === null) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#f8fafc' }}>
        <div style={{ width:28, height:28, border:'3px solid #e2e8f0', borderTopColor:'#8b5cf6', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'#f8fafc', color:'#0f172a', animation:'fadeIn 0.5s ease-out' }}>
      <header style={{
        display:'flex', justifyContent:'center', padding:'0 24px',
        backgroundColor:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', maxWidth:'1440px', height:'60px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Logo size={30} />
            <span style={{ fontSize:'20px', fontWeight:'800', letterSpacing:'-0.5px', color:'#0f172a' }}>
              Jacob<span style={{ background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>IQ</span>
            </span>
            <span style={{
              fontSize:'10px', fontWeight:'600', color:'#8b5cf6', letterSpacing:'0.5px', textTransform:'uppercase',
              padding:'3px 8px', background:'rgba(139,92,246,0.08)', borderRadius:'6px', border:'1px solid rgba(139,92,246,0.15)',
            }}>Beta</span>
          </div>
          <button
            style={{
              padding:'7px 16px', backgroundColor:'transparent', color:'#94a3b8',
              border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer',
              fontSize:'13px', fontWeight:'500', transition:'all 0.15s ease',
              ...(logoutHovered ? { borderColor:'#cbd5e1', color:'#64748b', backgroundColor:'#f1f5f9' } : {}),
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
