import React, { useState, useEffect } from 'react'
import FilterBuilder from './FilterBuilder'
import ResultsTable from './ResultsTable'
import Watchlist from './Watchlist'
import { runScreen, getFields, getStats, triggerIngestion, triggerQuoteUpdate, getWatchlistTickers, addToWatchlist, removeFromWatchlist, getIngestionProgress } from '../api'

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

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 24px',
    paddingBottom: '60px',
  },
  inner: {
    width: '100%',
    maxWidth: '1400px',
    paddingTop: '24px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  stats: {
    fontSize: '13px',
    color: '#52525b',
    fontWeight: '500',
  },
  adminBtns: {
    display: 'flex',
    gap: '8px',
  },
  adminBtn: {
    padding: '7px 14px',
    backgroundColor: 'transparent',
    color: '#71717a',
    border: '1px solid #27272a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  tabsContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    backgroundColor: '#18181b',
    borderRadius: '10px',
    padding: '4px',
    width: 'fit-content',
  },
  tab: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#71717a',
    borderRadius: '7px',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: '#27272a',
    color: '#fafafa',
  },
  tabBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '6px',
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    backgroundColor: '#818cf8',
    color: '#fafafa',
    borderRadius: '9px',
    fontSize: '11px',
    fontWeight: '600',
  },
  presetBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: '12px',
    color: '#52525b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  preset: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: '#a1a1aa',
    border: '1px solid #27272a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  message: {
    padding: '10px 16px',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    color: '#4ade80',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid rgba(74, 222, 128, 0.15)',
    fontWeight: '500',
  },
  progressContainer: {
    padding: '16px 20px',
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '13px',
  },
  progressLabel: {
    color: '#fafafa',
    fontWeight: '600',
  },
  progressMeta: {
    color: '#52525b',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: '#27272a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#818cf8',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  progressPercent: {
    fontSize: '11px',
    color: '#52525b',
    marginTop: '6px',
  },
}

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
  const [hoveredPreset, setHoveredPreset] = useState(null)
  const [hoveredAdmin, setHoveredAdmin] = useState(null)

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
    getStats().then(setStats).catch(() => {})
    fetchWatchlistTickers()
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
      setMessage('Full data sync started. This may take a while.')
      setTimeout(() => setMessage(''), 8000)
    } catch (err) {
      setMessage('Failed to start ingestion: ' + err.message)
    }
  }

  const handleUpdateQuotes = async () => {
    try {
      await triggerQuoteUpdate()
      setMessage('Quote refresh started.')
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
      <div style={styles.inner}>
        <div style={styles.topBar}>
          <div style={styles.stats}>
            {stats ? `${stats.screened_companies.toLocaleString()} companies` : 'Loading...'}
          </div>
          <div style={styles.adminBtns}>
            <button
              style={{
                ...styles.adminBtn,
                ...(hoveredAdmin === 'quotes' ? { borderColor: '#3f3f46', color: '#a1a1aa', backgroundColor: '#18181b' } : {}),
              }}
              onClick={handleUpdateQuotes}
              onMouseEnter={() => setHoveredAdmin('quotes')}
              onMouseLeave={() => setHoveredAdmin(null)}
            >
              Refresh Quotes
            </button>
            <button
              style={{
                ...styles.adminBtn,
                ...(hoveredAdmin === 'ingest' ? { borderColor: '#3f3f46', color: '#a1a1aa', backgroundColor: '#18181b' } : {}),
              }}
              onClick={handleIngest}
              onMouseEnter={() => setHoveredAdmin('ingest')}
              onMouseLeave={() => setHoveredAdmin(null)}
            >
              Full Data Sync
            </button>
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
          <div style={styles.progressContainer}>
            <div style={styles.progressHeader}>
              <span style={styles.progressLabel}>
                {progress.phase === 'Pulling stock list from FMP...'
                  ? 'Loading stock list...'
                  : `Syncing ${progress.current_ticker}`}
              </span>
              <span style={styles.progressMeta}>
                {progress.total > 0
                  ? `${progress.current} / ${progress.total}`
                  : 'Starting...'}
                {progress.errors > 0 && ` · ${progress.errors} errors`}
              </span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{
                ...styles.progressFill,
                width: progress.total > 0
                  ? `${(progress.current / progress.total * 100).toFixed(1)}%`
                  : '3%',
              }} />
            </div>
            {progress.total > 0 && (
              <div style={styles.progressPercent}>
                {((progress.current / progress.total) * 100).toFixed(1)}% complete
              </div>
            )}
          </div>
        )}

        {activeTab === 'screener' && (
          <>
            <div style={styles.presetBar}>
              <span style={styles.presetLabel}>Presets</span>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  style={{
                    ...styles.preset,
                    ...(hoveredPreset === i ? { borderColor: '#818cf8', color: '#c7d2fe' } : {}),
                  }}
                  onClick={() => runPreset(p)}
                  onMouseEnter={() => setHoveredPreset(i)}
                  onMouseLeave={() => setHoveredPreset(null)}
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
    </div>
  )
}
