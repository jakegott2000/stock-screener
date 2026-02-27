import React, { useState, useEffect } from 'react'
import { getWatchlist, removeFromWatchlist } from '../api'

const COLORS = {
  bg: '#0a0e1a',
  card: 'rgba(17, 24, 39, 0.5)',
  border: 'rgba(6, 182, 212, 0.2)',
  text: '#e6edf3',
  secondary: '#8b949e',
  accent: '#06b6d4',
  accentPurple: '#8b5cf6',
  green: '#10b981',
  red: '#ef4444',
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '12px',
      padding: '12px',
    },
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
      gap: '12px',
      padding: '12px',
    },
  },
  card: {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '20px',
    position: 'relative',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  cardHover: {
    borderColor: COLORS.accent,
    boxShadow: `0 8px 24px rgba(6, 182, 212, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05)`,
    transform: 'translateY(-4px)',
  },
  ticker: {
    fontSize: '24px',
    fontWeight: '800',
    background: `linear-gradient(135deg, ${COLORS.accent} 0%, #3b82f6 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '6px',
  },
  name: {
    fontSize: '13px',
    color: COLORS.secondary,
    marginBottom: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '500',
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: COLORS.text,
    marginBottom: '10px',
  },
  statLabel: {
    color: COLORS.secondary,
    fontWeight: '500',
  },
  statValue: {
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: COLORS.secondary,
    cursor: 'pointer',
    padding: '0',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  removeBtnHover: {
    color: COLORS.red,
    boxShadow: `0 0 12px ${COLORS.red}`,
  },
  empty: {
    gridColumn: '1 / -1',
    padding: '60px 20px',
    textAlign: 'center',
    color: COLORS.secondary,
    fontSize: '15px',
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    marginTop: '20px',
    backdropFilter: 'blur(10px)',
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: COLORS.secondary,
    fontSize: '14px',
  },
}

function formatValue(value, format) {
  if (value === null || value === undefined) return '—'

  switch (format) {
    case 'currency_compact': {
      const abs = Math.abs(value)
      if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
      if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
      if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
      return `$${value.toLocaleString()}`
    }
    case 'percent':
      return `${(value * 100).toFixed(1)}%`
    case 'percent_change': {
      const pct = (value * 100).toFixed(1)
      const sign = value >= 0 ? '+' : ''
      return `${sign}${pct}%`
    }
    case 'decimal2':
      return value.toFixed(2)
    default:
      if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      return String(value)
  }
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)
  const [removeHovered, setRemoveHovered] = useState(null)

  useEffect(() => {
    fetchWatchlist()
  }, [])

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
      setWatchlist(watchlist.filter(stock => stock.ticker !== ticker))
    } catch (err) {
      console.error('Failed to remove from watchlist:', err)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading watchlist...</div>
      </div>
    )
  }

  if (watchlist.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          No stocks in your watchlist yet. Star stocks from the screener to add them here.
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {watchlist.map((stock) => (
        <div
          key={stock.ticker}
          style={{
            ...styles.card,
            ...(hovered === stock.ticker ? styles.cardHover : {}),
          }}
          onMouseEnter={() => setHovered(stock.ticker)}
          onMouseLeave={() => setHovered(null)}
        >
          <button
            style={{
              ...styles.removeBtn,
              ...(removeHovered === stock.ticker ? styles.removeBtnHover : {}),
            }}
            onClick={() => handleRemove(stock.ticker)}
            onMouseEnter={() => setRemoveHovered(stock.ticker)}
            onMouseLeave={() => setRemoveHovered(null)}
            title="Remove from watchlist"
          >
            ✕
          </button>

          <div style={styles.ticker}>{stock.ticker}</div>
          <div style={styles.name}>{stock.name}</div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Market Cap</span>
            <span style={styles.statValue}>{formatValue(stock.market_cap, 'currency_compact')}</span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>P/E Ratio</span>
            <span style={styles.statValue}>{formatValue(stock.forward_pe, 'decimal2')}</span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Gross Margin</span>
            <span style={{
              ...styles.statValue,
              color: stock.gross_margin > 0 ? COLORS.green : COLORS.red,
            }}>
              {formatValue(stock.gross_margin, 'percent')}
            </span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Revenue Growth</span>
            <span style={{
              ...styles.statValue,
              color: stock.revenue_growth_yoy > 0 ? COLORS.green : COLORS.red,
            }}>
              {formatValue(stock.revenue_growth_yoy, 'percent')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
