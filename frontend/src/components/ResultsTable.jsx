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
      return `${value >= 0 ? '+' : ''}${pct}%`
    }
    case 'decimal2':
      return value.toFixed(2)
    default:
      if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      return String(value)
  }
}

const DEFAULT_COLUMNS = [
  'ticker', 'name', 'sector', 'market_cap', 'forward_pe', 'ev_to_ebitda',
  'gross_margin', 'operating_margin', 'roic', 'revenue_growth_yoy',
  'forward_pe_vs_5yr_pct', 'gross_margin_vs_5yr_pct',
]

const styles = {
  container: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #27272a',
  },
  count: {
    fontSize: '13px',
    color: '#52525b',
    fontWeight: '500',
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
    padding: '10px 16px',
    textAlign: 'left',
    color: '#52525b',
    fontWeight: '600',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #27272a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'color 0.15s ease',
  },
  thHover: {
    color: '#a1a1aa',
  },
  td: {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(39, 39, 42, 0.5)',
    whiteSpace: 'nowrap',
    color: '#d4d4d8',
  },
  trHover: {
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
  },
  watchBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 4px',
    color: '#3f3f46',
    transition: 'all 0.15s ease',
    lineHeight: '1',
  },
  watchBtnActive: {
    color: '#818cf8',
  },
  ticker: {
    fontWeight: '600',
    color: '#fafafa',
  },
  name: {
    color: '#71717a',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  positive: {
    color: '#4ade80',
  },
  negative: {
    color: '#f87171',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '14px',
    borderTop: '1px solid #27272a',
  },
  pageBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: '#71717a',
    border: '1px solid #27272a',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  pageInfo: {
    color: '#52525b',
    fontSize: '12px',
    fontWeight: '500',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#3f3f46',
    fontSize: '14px',
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
  const [hoveredTh, setHoveredTh] = useState(null)

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          Set your filters and click "Run Screen" to find stocks.
        </div>
      </div>
    )
  }

  const { results, total, limit, offset } = data

  if (results.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          No companies matched your filters. Try adjusting your criteria.
        </div>
      </div>
    )
  }

  const columns = DEFAULT_COLUMNS.filter(c => fields[c])
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const getColor = (value, format) => {
    if (typeof value !== 'number') return {}
    if (format === 'percent_change') {
      if (value > 0) return styles.positive
      if (value < 0) return styles.negative
    }
    return {}
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.count}>{total.toLocaleString()} results</div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '36px', textAlign: 'center', cursor: 'default' }}>
                <span style={{ fontSize: '12px', color: '#3f3f46' }}>★</span>
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  style={{
                    ...styles.th,
                    ...(hoveredTh === col ? styles.thHover : {}),
                    ...(sortBy === col ? { color: '#a1a1aa' } : {}),
                  }}
                  onClick={() => onSort(col)}
                  onMouseEnter={() => setHoveredTh(col)}
                  onMouseLeave={() => setHoveredTh(null)}
                >
                  {fields[col]?.label || col}
                  {sortBy === col && (
                    <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
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
                          ...(col === 'name' ? styles.name : {}),
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
            style={{ ...styles.pageBtn, opacity: currentPage <= 1 ? 0.3 : 1 }}
            onClick={() => onPageChange(offset - limit)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>
          <button
            style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.3 : 1 }}
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
