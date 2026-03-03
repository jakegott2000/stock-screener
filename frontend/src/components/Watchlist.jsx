import React, { useState, useEffect } from 'react'
import { getWatchlist, removeFromWatchlist } from '../api'

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
      return `${value >= 0 ? '+' : ''}${pct}%`
    }
    case 'decimal2':
      return value.toFixed(2)
    default:
      if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      return String(value)
  }
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative',
    transition: 'all 0.15s ease',
  },
  cardHover: {
    borderColor: '#3f3f46',
  },
  ticker: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: '2px',
  },
  name: {
    fontSize: '12px',
    color: '#52525b',
    marginBottom: '16px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  divider: {
    height: '1px',
    backgroundColor: '#27272a',
    marginBottom: '14px',
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    marginBottom: '8px',
  },
  statLabel: {
    color: '#52525b',
    fontWeight: '500',
  },
  statValue: {
    fontWeight: '600',
    color: '#d4d4d8',
  },
  removeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#3f3f46',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
    lineHeight: '1',
  },
  removeBtnHover: {
    color: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  empty: {
    gridColumn: '1 / -1',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#3f3f46',
    fontSize: '14px',
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#52525b',
    fontSize: '13px',
  },
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
          <div style={styles.divider} />

          <div style={styles.stat}>
            <span style={styles.statLabel}>Market Cap</span>
            <span style={styles.statValue}>
              {formatValue(stock.market_cap, 'currency_compact')}
            </span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Fwd P/E</span>
            <span style={styles.statValue}>
              {formatValue(stock.forward_pe, 'decimal2')}
            </span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Gross Margin</span>
            <span style={{
              ...styles.statValue,
              ...(stock.gross_margin > 0 ? { color: '#4ade80' } : { color: '#f87171' }),
            }}>
              {formatValue(stock.gross_margin, 'percent')}
            </span>
          </div>

          <div style={styles.stat}>
            <span style={styles.statLabel}>Rev Growth</span>
            <span style={{
              ...styles.statValue,
              ...(stock.revenue_growth_yoy > 0 ? { color: '#4ade80' } : stock.revenue_growth_yoy < 0 ? { color: '#f87171' } : {}),
            }}>
              {formatValue(stock.revenue_growth_yoy, 'percent')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
