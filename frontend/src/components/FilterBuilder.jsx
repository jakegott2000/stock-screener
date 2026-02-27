import React, { useState, useEffect } from 'react'
import { getFields } from '../api'

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'between', label: 'Between' },
]

// Group fields for the dropdown
const FIELD_GROUPS = {
  'Valuation': ['market_cap', 'enterprise_value', 'pe_ratio', 'forward_pe', 'price_to_sales', 'price_to_book', 'ev_to_ebitda', 'ev_to_revenue'],
  'Profitability': ['gross_margin', 'operating_margin', 'net_margin', 'ebitda_margin'],
  'Returns': ['roic', 'roe', 'roa'],
  'Growth': ['revenue_growth_yoy', 'revenue_growth_3yr_cagr', 'earnings_growth_yoy'],
  'Balance Sheet': ['debt_to_equity', 'net_debt_to_ebitda', 'current_ratio'],
  'Short Interest': ['short_percent_float', 'short_ratio'],
  'vs 5yr Average (%)': ['forward_pe_vs_5yr_pct', 'ev_ebitda_vs_5yr_pct', 'gross_margin_vs_5yr_pct', 'operating_margin_vs_5yr_pct', 'roic_vs_5yr_pct', 'roe_vs_5yr_pct'],
  'Historical Averages': ['pe_5yr_avg', 'ev_ebitda_5yr_avg', 'gross_margin_5yr_avg', 'operating_margin_5yr_avg', 'net_margin_5yr_avg', 'roic_5yr_avg', 'roe_5yr_avg'],
  'Info': ['sector', 'industry', 'country', 'exchange'],
}

const styles = {
  container: {
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    minWidth: '180px',
  },
  input: {
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    width: '120px',
  },
  removeBtn: {
    padding: '6px 10px',
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  addBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a5f',
    color: '#60a5fa',
    border: '1px solid #2563eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginRight: '10px',
  },
  runBtn: {
    padding: '8px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
    alignItems: 'center',
  },
  hint: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
  },
  optgroup: {
    color: '#94a3b8',
  },
}

const EMPTY_FILTER = { field: 'market_cap', operator: 'gte', value: '', value2: '' }

export default function FilterBuilder({ onRunScreen, loading }) {
  const [fields, setFields] = useState({})
  const [filters, setFilters] = useState([{ ...EMPTY_FILTER }])

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
  }, [])

  const updateFilter = (index, key, val) => {
    const updated = [...filters]
    updated[index] = { ...updated[index], [key]: val }
    setFilters(updated)
  }

  const addFilter = () => {
    setFilters([...filters, { ...EMPTY_FILTER }])
  }

  const removeFilter = (index) => {
    if (filters.length === 1) return
    setFilters(filters.filter((_, i) => i !== index))
  }

  const handleRun = () => {
    const parsed = filters
      .filter(f => f.field && f.value !== '')
      .map(f => {
        const fieldDef = fields[f.field] || {}
        let value = f.operator === 'between'
          ? [parseFloat(f.value), parseFloat(f.value2)]
          : fieldDef.type === 'string' ? f.value : parseFloat(f.value)

        // Convert user-friendly values:
        // Percentages: user enters 20 for 20%, we store as 0.20
        const format = fieldDef.format || ''
        if ((format === 'percent' || format === 'percent_change') && typeof value === 'number') {
          value = value / 100
        }
        if ((format === 'percent' || format === 'percent_change') && Array.isArray(value)) {
          value = value.map(v => v / 100)
        }

        return { field: f.field, operator: f.operator, value }
      })

    onRunScreen(parsed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRun()
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Screen Filters</div>

      {filters.map((filter, i) => (
        <div key={i} style={styles.filterRow}>
          <select
            style={styles.select}
            value={filter.field}
            onChange={(e) => updateFilter(i, 'field', e.target.value)}
          >
            {Object.entries(FIELD_GROUPS).map(([group, fieldNames]) => (
              <optgroup key={group} label={group} style={styles.optgroup}>
                {fieldNames.filter(fn => fields[fn]).map(fn => (
                  <option key={fn} value={fn}>{fields[fn]?.label || fn}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <select
            style={{ ...styles.select, minWidth: '80px' }}
            value={filter.operator}
            onChange={(e) => updateFilter(i, 'operator', e.target.value)}
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            style={styles.input}
            type={fields[filter.field]?.type === 'string' ? 'text' : 'number'}
            placeholder={fields[filter.field]?.format === 'currency_compact' ? 'e.g. 800000000' : 'Value'}
            value={filter.value}
            onChange={(e) => updateFilter(i, 'value', e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {filter.operator === 'between' && (
            <>
              <span style={{ color: '#64748b', fontSize: '13px' }}>and</span>
              <input
                style={styles.input}
                type="number"
                placeholder="Max"
                value={filter.value2}
                onChange={(e) => updateFilter(i, 'value2', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </>
          )}

          <button style={styles.removeBtn} onClick={() => removeFilter(i)}>Remove</button>
        </div>
      ))}

      <div style={styles.hint}>
        Tip: For percentage fields, enter the number directly (e.g., "20" for 20%). For "vs 5yr Avg" fields, enter the % change (e.g., "20" means 20% above average).
      </div>

      <div style={styles.actions}>
        <button style={styles.addBtn} onClick={addFilter}>+ Add Filter</button>
        <button
          style={{ ...styles.runBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? 'Screening...' : 'Run Screen'}
        </button>
      </div>
    </div>
  )
}
