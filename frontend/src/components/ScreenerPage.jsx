import React, { useState, useEffect } from 'react'
import FilterBuilder from './FilterBuilder'
import ResultsTable from './ResultsTable'
import { runScreen, getFields, getStats, triggerIngestion, triggerQuoteUpdate } from '../api'

const styles = {
  page: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 24px',
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
    color: '#64748b',
  },
  adminBtns: {
    display: 'flex',
    gap: '8px',
  },
  adminBtn: {
    padding: '6px 14px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  presetBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  preset: {
    padding: '6px 14px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  message: {
    padding: '10px 16px',
    backgroundColor: '#064e3b',
    color: '#6ee7b7',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '12px',
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
  const [fields, setFields] = useState({})
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('market_cap')
  const [sortDir, setSortDir] = useState('desc')
  const [lastFilters, setLastFilters] = useState([])
  const [stats, setStats] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
    getStats().then(setStats).catch(() => {})
  }, [])

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

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.presetBar}>
        <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '30px' }}>Presets:</span>
        {PRESETS.map((p, i) => (
          <button key={i} style={styles.preset} onClick={() => runPreset(p)} title={p.description}>
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
      />
    </div>
  )
}
