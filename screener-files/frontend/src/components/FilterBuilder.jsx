import { useState, useEffect } from 'react'
import { getFields } from '../api'

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'between', label: 'Between' },
]

const FIELD_GROUPS = {
  'Valuation': ['market_cap', 'enterprise_value', 'pe_ratio', 'forward_pe', 'price_to_sales', 'price_to_book', 'ev_to_ebitda', 'ev_to_revenue'],
  'Profitability': ['gross_margin', 'operating_margin', 'net_margin', 'ebitda_margin'],
  'Returns': ['roic', 'roe', 'roa'],
  'Growth': ['revenue_growth_yoy', 'revenue_growth_3yr_cagr', 'earnings_growth_yoy'],
  'Balance Sheet': ['debt_to_equity', 'net_debt_to_ebitda', 'current_ratio'],
  'Short Interest': ['short_percent_float', 'short_ratio'],
  'vs 5yr Average': ['forward_pe_vs_5yr_pct', 'ev_ebitda_vs_5yr_pct', 'gross_margin_vs_5yr_pct', 'operating_margin_vs_5yr_pct', 'roic_vs_5yr_pct', 'roe_vs_5yr_pct'],
  'Historical Averages': ['pe_5yr_avg', 'ev_ebitda_5yr_avg', 'gross_margin_5yr_avg', 'operating_margin_5yr_avg', 'net_margin_5yr_avg', 'roic_5yr_avg', 'roe_5yr_avg'],
  'Info': ['sector', 'industry', 'country', 'exchange'],
}

const EMPTY_FILTER = { field: 'market_cap', operator: 'gte', value: '', value2: '' }

const styles = {
  container: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  select: {
    flex: '1 1 200px',
    padding: '8px 12px',
    backgroundColor: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '13px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
    minWidth: '140px',
  },
  operatorSelect: {
    flex: '0 0 auto',
    padding: '8px 12px',
    backgroundColor: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '13px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
    minWidth: '80px',
  },
  input: {
    flex: '0 1 120px',
    padding: '8px 12px',
    backgroundColor: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    minWidth: '80px',
  },
  andLabel: {
    color: '#52525b',
    fontSize: '12px',
    fontWeight: '500',
  },
  removeBtn: {
    flex: '0 0 auto',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#52525b',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  hint: {
    fontSize: '12px',
    color: '#3f3f46',
    marginTop: '12px',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    alignItems: 'center',
  },
  addBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#71717a',
    border: '1px dashed #27272a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  runBtn: {
    padding: '8px 24px',
    backgroundColor: '#818cf8',
    color: '#fafafa',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.15s ease',
  },
}

export default function FilterBuilder({ onRunScreen, loading }) {
  const [fields, setFields] = useState({})
  const [filters, setFilters] = useState([{ ...EMPTY_FILTER }])
  const [focusedEl, setFocusedEl] = useState(null)
  const [hoveredRemove, setHoveredRemove] = useState(null)
  const [hoveredAdd, setHoveredAdd] = useState(false)
  const [hoveredRun, setHoveredRun] = useState(false)

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
  }, [])

  const updateFilter = (index, key, val) => {
    const updated = [...filters]
    updated[index] = { ...updated[index], [key]: val }
    setFilters(updated)
  }

  const addFilter = () => setFilters([...filters, { ...EMPTY_FILTER }])

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

  const focusStyle = { borderColor: '#818cf8', boxShadow: '0 0 0 2px rgba(129, 140, 248, 0.1)' }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Filters</div>

      {filters.map((filter, i) => (
        <div key={i} style={styles.filterRow}>
          <select
            style={{
              ...styles.select,
              ...(focusedEl === `field-${i}` ? focusStyle : {}),
            }}
            value={filter.field}
            onChange={(e) => updateFilter(i, 'field', e.target.value)}
            onFocus={() => setFocusedEl(`field-${i}`)}
            onBlur={() => setFocusedEl(null)}
          >
            {Object.entries(FIELD_GROUPS).map(([group, fieldNames]) => (
              <optgroup key={group} label={group}>
                {fieldNames.filter(fn => fields[fn]).map(fn => (
                  <option key={fn} value={fn}>{fields[fn]?.label || fn}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <select
            style={{
              ...styles.operatorSelect,
              ...(focusedEl === `op-${i}` ? focusStyle : {}),
            }}
            value={filter.operator}
            onChange={(e) => updateFilter(i, 'operator', e.target.value)}
            onFocus={() => setFocusedEl(`op-${i}`)}
            onBlur={() => setFocusedEl(null)}
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            style={{
              ...styles.input,
              ...(focusedEl === `val-${i}` ? focusStyle : {}),
            }}
            type={fields[filter.field]?.type === 'string' ? 'text' : 'number'}
            placeholder={fields[filter.field]?.format === 'currency_compact' ? 'e.g. 800000000' : 'Value'}
            value={filter.value}
            onChange={(e) => updateFilter(i, 'value', e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocusedEl(`val-${i}`)}
            onBlur={() => setFocusedEl(null)}
          />

          {filter.operator === 'between' && (
            <>
              <span style={styles.andLabel}>and</span>
              <input
                style={{
                  ...styles.input,
                  ...(focusedEl === `val2-${i}` ? focusStyle : {}),
                }}
                type="number"
                placeholder="Max"
                value={filter.value2}
                onChange={(e) => updateFilter(i, 'value2', e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusedEl(`val2-${i}`)}
                onBlur={() => setFocusedEl(null)}
              />
            </>
          )}

          <button
            style={{
              ...styles.removeBtn,
              ...(hoveredRemove === i ? { color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.08)' } : {}),
            }}
            onClick={() => removeFilter(i)}
            onMouseEnter={() => setHoveredRemove(i)}
            onMouseLeave={() => setHoveredRemove(null)}
          >
            Remove
          </button>
        </div>
      ))}

      <div style={styles.hint}>
        Percentages: enter "20" for 20%. For "vs 5yr Avg" fields, enter the % change above average.
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.addBtn,
            ...(hoveredAdd ? { borderColor: '#3f3f46', color: '#a1a1aa' } : {}),
          }}
          onClick={addFilter}
          onMouseEnter={() => setHoveredAdd(true)}
          onMouseLeave={() => setHoveredAdd(false)}
        >
          + Add filter
        </button>
        <button
          style={{
            ...styles.runBtn,
            ...(hoveredRun && !loading ? { backgroundColor: '#6366f1' } : {}),
            ...(loading ? { opacity: 0.7 } : {}),
          }}
          onClick={handleRun}
          onMouseEnter={() => setHoveredRun(true)}
          onMouseLeave={() => setHoveredRun(false)}
          disabled={loading}
        >
          {loading ? 'Screening...' : 'Run Screen'}
        </button>
      </div>
    </div>
  )
}
