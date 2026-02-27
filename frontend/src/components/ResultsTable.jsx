import React, { useState } from 'react'

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

// Default columns to show (excluding 'watch' which is handled separately)
const DEFAULT_COLUMNS = [
  'ticker', 'name', 'sector', 'market_cap', 'forward_pe', 'ev_to_ebitda',
  'gross_margin', 'operating_margin', 'roic', 'revenue_growth_yoy',
  'forward_pe_vs_5yr_pct', 'gross_margin_vs_5yr_pct',
]

const COLORS = {
  bg: '#0d1117',
  card: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  secondary: '#8b949e',
  accent: '#3b82f6',
  green: '#3fb950',
  red: '#f85149',
}

const styles = {
  container: {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '10px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  count: {
    fontSize: '14px',
    color: COLORS.secondary,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${COLORS.border}`,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  td: {
    padding: '10px 14px',
    borderBottom: `1px solid ${COLORS.border}33`,
    whiteSpace: 'nowrap',
    color: COLORS.text,
  },
  trHover: {
    backgroundColor: COLORS.bg,
  },
  watchBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '2px 6px',
    color: COLORS.secondary,
    transition: 'color 0.2s',
    lineHeight: '1',
  },
  watchBtnActive: {
    color: COLORS.accent,
  },
  ticker: {
    fontWeight: '700',
    color: COLORS.accent,
  },
  positive: {
    color: COLORS.green,
  },
  negative: {
    color: COLORS.red,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderTop: `1px solid ${COLORS.border}`,
    flexWrap: 'wrap',
  },
  pageBtn: {
    padding: '6px 14px',
    backgroundColor: COLORS.bg,
    color: COLORS.secondary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: COLORS.secondary,
    fontSize: '15px',
  },
}

export default function ResultsTable({
  data,
  fields,
  onSort,
  sortBy,
  sortDir,
  onPageChange,
  watchedTickers = new Set(),
  onToggleWatch = () => {},
}) {
  const [hoveredRow, setHoveredRow] = useState(null)

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          Configure your filters above and click "Run Screen" to find stocks.
        </div>
      </div>
    )
  }

  const { results, total, limit, offset } = data

  if (results.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          No companies matched your screen. Try adjusting your filters.
        </div>
      </div>
    )
  }

  const columns = DEFAULT_COLUMNS.filter(c => fields[c])
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const getColor = (value, format) => {
    if (typeof value !== 'number') return {}
    if (format === 'percent_change' || format === 'percent') {
      if (value > 0) return styles.positive
      if (value < 0) return styles.negative
    }
    return {}
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.count}>{total.toLocaleString()} companies found</div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>★</th>
              {columns.map(col => (
                <th
                  key={col}
                  style={styles.th}
                  onClick={() => onSort(col)}
                >
                  {fields[col]?.label || col}
                  {sortBy === col && (sortDir === 'desc' ? ' ▼' : ' ▲')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => {
              const isWatched = watchedTickers.has(row.ticker)
              return (
                <tr
                  key={row.ticker + i}
                  style={hoveredRow === i ? styles.trHover : {}}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      style={{
                        ...styles.watchBtn,
                        ...(isWatched ? styles.watchBtnActive : {}),
                      }}
                      onClick={() => onToggleWatch(row.ticker)}
                      title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      {isWatched ? '★' : '☆'}
                    </button>
                  </td>
                  {columns.map(col => {
                    const val = row[col]
                    const format = fields[col]?.format
                    const colorStyle = getColor(val, format)
                    return (
                      <td
                        key={col}
                        style={{
                          ...styles.td,
                          ...(col === 'ticker' ? styles.ticker : {}),
                          ...colorStyle,
                        }}
                      >
                        {formatValue(val, format)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, opacity: currentPage <= 1 ? 0.4 : 1 }}
            onClick={() => onPageChange(offset - limit)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span style={{ color: COLORS.secondary, fontSize: '13px', lineHeight: '32px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
            onClick={() => onPageChange(offset + limit)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
