import React, { useState, useEffect } from 'react'
import { getWatchlist, removeFromWatchlist } from '../api'

function fmt(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'currency_compact': {
      const a = Math.abs(value)
      if (a >= 1e12) return `$${(value/1e12).toFixed(2)}T`
      if (a >= 1e9) return `$${(value/1e9).toFixed(2)}B`
      if (a >= 1e6) return `$${(value/1e6).toFixed(1)}M`
      return `$${value.toLocaleString()}`
    }
    case 'percent': return `${(value*100).toFixed(1)}%`
    case 'percent_change': return `${value>=0?'+':''}${(value*100).toFixed(1)}%`
    case 'decimal2': return value.toFixed(2)
    default: return typeof value === 'number' ? value.toLocaleString(undefined,{maximumFractionDigits:2}) : String(value)
  }
}

const METRICS = [
  { key: 'market_cap', label: 'Market Cap', format: 'currency_compact' },
  { key: 'forward_pe', label: 'Fwd P/E', format: 'decimal2' },
  { key: 'ev_to_ebitda', label: 'EV/EBITDA', format: 'decimal2' },
  { key: 'gross_margin', label: 'Gross Margin', format: 'percent', color: true },
  { key: 'operating_margin', label: 'Op Margin', format: 'percent', color: true },
  { key: 'roic', label: 'ROIC', format: 'percent', color: true },
  { key: 'revenue_growth_yoy', label: 'Rev Growth', format: 'percent_change', color: true },
  { key: 'forward_pe_vs_5yr_pct', label: 'P/E vs 5yr', format: 'percent_change', color: true, invert: true },
]

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)
  const [removeHovered, setRemoveHovered] = useState(null)

  useEffect(() => { fetchWatchlist() }, [])

  const fetchWatchlist = async () => {
    setLoading(true)
    try {
      const data = await getWatchlist()
      setWatchlist(data || [])
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
      setWatchlist([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (ticker) => {
    try {
      await removeFromWatchlist(ticker)
      setWatchlist(watchlist.filter(s => s.ticker !== ticker))
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#52525b', fontSize:'13px' }}>
      <div style={{ width:24, height:24, border:'3px solid #27272a', borderTopColor:'#8b5cf6', borderRadius:'50%', animation:'spin 0.6s linear infinite', margin:'0 auto 12px' }} />
      Loading watchlist...
    </div>
  )

  if (watchlist.length === 0) return (
    <div style={{
      backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px',
      padding:'60px 20px', textAlign:'center',
    }}>
      <div style={{ fontSize:'32px', marginBottom:'12px' }}>☆</div>
      <div style={{ color:'#52525b', fontSize:'14px', marginBottom:'4px' }}>No stocks in your watchlist yet.</div>
      <div style={{ color:'#3f3f46', fontSize:'13px' }}>
        Star stocks from the screener or use the <span style={{ color:'#8b5cf6', fontWeight:'600' }}>search bar</span> to add them.
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <span style={{ fontSize:'13px', color:'#71717a', fontWeight:'600' }}>
          <span style={{ color:'#fafafa' }}>{watchlist.length}</span> {watchlist.length === 1 ? 'stock' : 'stocks'} watched
        </span>
      </div>
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'12px',
      }}>
        {watchlist.map((stock) => {
          const isHov = hovered === stock.ticker
          return (
            <div key={stock.ticker} style={{
              backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px',
              padding:'20px', position:'relative', transition:'all 0.2s ease',
              ...(isHov ? { borderColor:'#3f3f46', transform:'translateY(-2px)', boxShadow:'0 8px 24px rgba(0,0,0,0.3)' } : {}),
            }}
              onMouseEnter={() => setHovered(stock.ticker)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Remove button */}
              <button style={{
                position:'absolute', top:'14px', right:'14px', background:'none', border:'none',
                fontSize:'13px', cursor:'pointer', padding:'4px 6px', borderRadius:'6px',
                transition:'all 0.15s', lineHeight:'1',
                color: removeHovered === stock.ticker ? '#f87171' : '#3f3f46',
                backgroundColor: removeHovered === stock.ticker ? 'rgba(248,113,113,0.08)' : 'transparent',
              }}
                onClick={() => handleRemove(stock.ticker)}
                onMouseEnter={() => setRemoveHovered(stock.ticker)}
                onMouseLeave={() => setRemoveHovered(null)}
                title="Remove from watchlist"
              >✕</button>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                <span style={{ color:'#8b5cf6', fontSize:'14px' }}>★</span>
                <span style={{ fontSize:'16px', fontWeight:'800', color:'#fafafa', letterSpacing:'-0.3px' }}>{stock.ticker}</span>
                {stock.sector && (
                  <span style={{
                    fontSize:'10px', fontWeight:'600', color:'#06b6d4', letterSpacing:'0.3px',
                    padding:'2px 7px', background:'rgba(6,182,212,0.08)', borderRadius:'4px',
                    border:'1px solid rgba(6,182,212,0.15)',
                  }}>{stock.sector}</span>
                )}
              </div>
              <div style={{
                fontSize:'12px', color:'#52525b', marginBottom:'16px',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'220px',
              }}>{stock.name || '—'}</div>

              {/* Gradient divider */}
              <div style={{
                height:'1px', marginBottom:'14px',
                background:'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3), transparent)',
              }} />

              {/* Metrics */}
              {METRICS.map(m => {
                const v = stock[m.key]
                let valColor = '#d4d4d8'
                if (m.color && typeof v === 'number') {
                  if (m.invert) {
                    valColor = v < 0 ? '#4ade80' : v > 0 ? '#f87171' : '#d4d4d8'
                  } else if (m.format === 'percent_change') {
                    valColor = v > 0 ? '#4ade80' : v < 0 ? '#f87171' : '#d4d4d8'
                  } else {
                    valColor = v > 0 ? '#4ade80' : '#f87171'
                  }
                }
                return (
                  <div key={m.key} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    fontSize:'12px', marginBottom:'7px',
                  }}>
                    <span style={{ color:'#52525b', fontWeight:'500' }}>{m.label}</span>
                    <span style={{ fontWeight:'600', color: valColor, fontVariantNumeric:'tabular-nums' }}>
                      {fmt(v, m.format)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
