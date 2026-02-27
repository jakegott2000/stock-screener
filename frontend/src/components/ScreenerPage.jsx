import React, { useState, useEffect } from 'react'
import FilterBuilder from './FilterBuilder'
import ResultsTable from './ResultsTable'
import Watchlist from './Watchlist'
import { runScreen, getFields, getStats, triggerIngestion, triggerQuoteUpdate, getWatchlistTickers, addToWatchlist, removeFromWatchlist, getIngestionProgress } from '../api'

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
  page: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 24px',
    backgroundColor: 'transparent',
    minHeight: '100vh',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  stats: {
    fontSize: '13px',
    color: COLORS.secondary,
    fontWeight: '500',
  },
  adminBtns: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  adminBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0px',
    marginBottom: '16px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.secondary,
    borderBottom: `3px solid transparent`,
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  tabActive: {
    color: COLORS.accent,
    borderBottomColor: COLORS.accent,
  },
  tabBadge: {
    display: 'inline-block',
    marginLeft: '6px',
    padding: '3px 8px',
    background: `linear-gradient(135deg, ${COLORS.accent} 0%, #3b82f6 100%)`,
    color: '#0a0e1a',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
  },
  presetBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: '12px',
    color: COLORS.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  preset: {
    padding: '8px 16px',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  presetHover: {
    borderColor: COLORS.accent,
    color: COLORS.accent,
    backgroundColor: `rgba(6, 182, 212, 0.1)`,
    boxShadow: `0 0 16px rgba(6, 182, 212, 0.2)`,
  },
  message: {
    padding: '12px 16px',
    backgroundColor: `rgba(16, 185, 129, 0.1)`,
    color: COLORS.green,
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '12px',
    border: `1px solid rgba(16, 185, 129, 0.3)`,
  },
}

// Example preset screens from Jacob's requirements
const PRESETS = [
  {
    name: 'Value + Margin Expansion',
    description: 'Mkt cap >$800M, Fwd P/E above 5yr avg, Gross margin 20%+ above 5yr avg',
    filters: [
      { field: 'market_cap', operator: 'gte', value: 800000000 },
      { field: 'forward_pe_vs_5yr_pct', operator: 'gte', value: 0.0 },
      { field: 'gross_margin_vs_5yr_pct', operator: 'gte', value: 0.20 },
    ]
  },
  {
    name: 'Short Interest + Expensive',
    description: 'Mkt cap >$1B, Short interest 4-14%, EV/EBITDA above 5yr avg',
    filters: [
      { field: 'market_cap', operator: 'gte', value: 1000000000 },
      { field: 'short_percent_float', operator: 'between', value: [0.04, 0.14] },
      { field: 'ev_ebitda_vs_5yr_pct', operator: 'gte', value: 0.0 },
    ]
  },
  {
    name: 'High Quality Growth',
    description: 'Mkt cap >$500M, ROIC >15%, Revenue growth >10%, Gross margin >40%',
    filters: [
      { field: 'market_cap', operator: 'gte', value: 500000000 },
      { field: 'roic', operator: 'gte', value: 0.15 },
      { field: 'revenue_growth_yoy', operator: 'gte', value: 0.10 },
      { field: 'gross_margin', operator: 'gte', value: 0.40 },
    ]
  },
]

export default function ScreenerPage() {
  const [activeTab, setActiveTab] = useState('screener')
  const [fields, setFields] = useState({})
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('market_cap')
  const [sortDir, setSortDir] = useState('desc')
  const [lastFilters, setLastFilters] = useState([])
  const [stats, setStats] = useState(null)
  const [message, setMessage] = useState('')
  const [watchedTickers, setWatchedTickers] = useState(new Set())
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
    getStats().then(setStats).catch(() => {})
    fetchWatchlistTickers()
    // Poll progress every 3 seconds
    const interval = setInterval(async () => {
      try {
        const p = await getIngestionProgress()
        setProgress(p)
        if (p && !p.running && p.phase === 'Complete') {
          getStats().then(setStats).catch(() => {})
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchWatchlistTickers = async () => {
    try {
      const tickers = await getWatchlistTickers()
      const tickerSet = new Set(tickers || [])
      setWatchedTickers(tickerSet)
      setWatchlistCount(tickerSet.size)
    } catch (err) {
      console.error('Failed to fetch watchlist tickers:', err)
    }
  }

  const handleScreen = async (filters, sort = sortBy, dir = sortDir, offset = 0) => {
    setLoading(true)
    setLastFilters(filters)
    try {
      const result = await runScreen(filters, sort, dir, 100, offset)
      setData(result)
    } catch (err) {
      console.error('Screen failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    const newDir = sortBy === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortBy(field)
    setSortDir(newDir)
    if (lastFilters.length > 0) {
      handleScreen(lastFilters, field, newDir)
    }
  }

  const handlePageChange = (newOffset) => {
    if (newOffset >= 0) {
      handleScreen(lastFilters, sortBy, sortDir, newOffset)
    }
  }

  const runPreset = (preset) => {
    handleScreen(preset.filters)
  }

  const handleIngest = async () => {
    try {
      await triggerIngestion()
      setMessage('Full data ingestion started in background. This may take a while.')
      setTimeout(() => setMessage(''), 8000)
    } catch (err) {
      setMessage('Failed to start ingestion: ' + err.message)
    }
  }

  const handleUpdateQuotes = async () => {
    try {
      await triggerQuoteUpdate()
      setMessage('Quote update started in background.')
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage('Failed to start update: ' + err.message)
    }
  }

  const handleToggleWatch = async (ticker) => {
    try {
      if (watchedTickers.has(ticker)) {
        await removeFromWatchlist(ticker)
        const newSet = new Set(watchedTickers)
        newSet.delete(ticker)
        setWatchedTickers(newSet)
        setWatchlistCount(newSet.size)
      } else {
        await addToWatchlist(ticker)
        const newSet = new Set(watchedTickers)
        newSet.add(ticker)
        setWatchedTickers(newSet)
        setWatchlistCount(newSet.size)
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.stats}>
          {stats ? `${stats.screened_companies.toLocaleString()} companies loaded` : 'Loading stats...'}
        </div>
        <div style={styles.adminBtns}>
          <button style={styles.adminBtn} onClick={handleUpdateQuotes}>Refresh Quotes</button>
          <button style={styles.adminBtn} onClick={handleIngest}>Full Data Sync</button>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'screener' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('screener')}
        >
          Screener
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'watchlist' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('watchlist')}
        >
          Watchlist
          {watchlistCount > 0 && (
            <span style={styles.tabBadge}>{watchlistCount}</span>
          )}
        </button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {progress && progress.running && (
        <div style={{
          padding: '20px 24px',
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '12px',
          marginBottom: '20px',
          backdropFilter: 'blur(10px)',
          boxShadow: `0 0 20px rgba(6, 182, 212, 0.15)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: '#e6edf3', fontWeight: '700' }}>
              {progress.phase === 'Pulling stock list from FMP...' ? 'Loading stock list...' : `Syncing: ${progress.current_ticker}`}
            </span>
            <span style={{ color: COLORS.secondary }}>
              {progress.total > 0 ? `${progress.current} / ${progress.total} companies` : 'Starting...'}
              {progress.errors > 0 && ` (${progress.errors} errors)`}
            </span>
          </div>
          <div style={{
            width: '100%', height: '10px', backgroundColor: 'rgba(10, 14, 26, 0.6)',
            borderRadius: '6px', overflow: 'hidden', border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{
              width: progress.total > 0 ? `${(progress.current / progress.total * 100).toFixed(1)}%` : '5%',
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.accent}, #3b82f6, ${COLORS.accentPurple})`,
              borderRadius: '6px',
              transition: 'width 0.5s ease',
              boxShadow: `0 0 20px ${COLORS.accent}, 0 0 10px rgba(59, 130, 246, 0.6)`,
              animation: 'pulse-glow 2s ease-in-out infinite',
            }} />
          </div>
          {progress.total > 0 && (
            <div style={{ fontSize: '11px', color: COLORS.secondary, marginTop: '8px' }}>
              {((progress.current / progress.total) * 100).toFixed(1)}% complete — this runs on the server, safe to close your browser
            </div>
          )}
        </div>
      )}

      {activeTab === 'screener' && (
        <>
          <div style={styles.presetBar}>
            <span style={styles.presetLabel}>Presets:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                style={styles.preset}
                onClick={() => runPreset(p)}
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>

          <FilterBuilder onRunScreen={handleScreen} loading={loading} />

          <ResultsTable
            data={data}
            fields={fields}
            onSort={handleSort}
            sortBy={sortBy}
            sortDir={sortDir}
            onPageChange={handlePageChange}
            watchedTickers={watchedTickers}
            onToggleWatch={handleToggleWatch}
          />
        </>
      )}

      {activeTab === 'watchlist' && (
        <Watchlist />
      )}
    </div>
  )
}
