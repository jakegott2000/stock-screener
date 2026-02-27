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

const EMPTY_FILTER = { field: 'market_cap', operator: 'gte', value: '', value2: '' }

const styles = {
  container: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s ease',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: '24px',
    letterSpacing: '-0.5px',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    padding: '16px',
    backgroundColor: '#161b22',
    borderRadius: '8px',
    border: '1px solid #30363d',
    transition: 'all 0.2s ease',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  fieldSelect: {
    flex: '1 1 220px',
    padding: '10px 14px',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '160px',
  },
  fieldSelectFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  operatorSelect: {
    flex: '0 0 auto',
    padding: '10px 14px',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '90px',
  },
  input: {
    flex: '0 1 140px',
    padding: '10px 14px',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    minWidth: '100px',
  },
  inputFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    backgroundColor: '#1c2333',
  },
  andLabel: {
    color: '#8b949e',
    fontSize: '14px',
    fontWeight: '500',
    flex: '0 0 auto',
  },
  removeBtn: {
    flex: '0 0 auto',
    padding: '10px 16px',
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    color: '#f85149',
    border: '1px solid rgba(248, 81, 73, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  removeBtnHover: {
    backgroundColor: 'rgba(248, 81, 73, 0.25)',
    borderColor: '#f85149',
  },
  hint: {
    fontSize: '12px',
    color: '#8b949e',
    marginTop: '16px',
    marginBottom: '20px',
    paddingLeft: '4px',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  addBtn: {
    padding: '11px 20px',
    backgroundColor: '#0d1117',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  addBtnHover: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  runBtn: {
    padding: '11px 28px',
    backgroundColor: '#3b82f6',
    backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  runBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)',
  },
  runBtnActive: {
    transform: 'translateY(0)',
  },
}

export default function FilterBuilder({ onRunScreen, loading }) {
  const [fields, setFields] = useState({})
  const [filters, setFilters] = useState([{ ...EMPTY_FILTER }])
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [hoveredRemoveBtn, setHoveredRemoveBtn] = useState(null)
  const [hoveredAddBtn, setHoveredAddBtn] = useState(false)
  const [hoveredRunBtn, setHoveredRunBtn] = useState(false)

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div style={styles.container}>
      <div style={styles.title}>Filter Criteria</div>

      {filters.map((filter, i) => (
        <div key={i} style={{
          ...styles.filterRow,
          ...(isMobile && { flexDirection: 'column', alignItems: 'stretch' }),
        }}>
          <select
            style={{
              ...styles.fieldSelect,
              ...(focusedIndex === `field-${i}` && styles.fieldSelectFocus),
            }}
            value={filter.field}
            onChange={(e) => updateFilter(i, 'field', e.target.value)}
            onFocus={() => setFocusedIndex(`field-${i}`)}
            onBlur={() => setFocusedIndex(null)}
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
              ...(focusedIndex === `operator-${i}` && styles.fieldSelectFocus),
            }}
            value={filter.operator}
            onChange={(e) => updateFilter(i, 'operator', e.target.value)}
            onFocus={() => setFocusedIndex(`operator-${i}`)}
            onBlur={() => setFocusedIndex(null)}
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            style={{
              ...styles.input,
              ...(focusedIndex === `value-${i}` && styles.inputFocus),
            }}
            type={fields[filter.field]?.type === 'string' ? 'text' : 'number'}
            placeholder={fields[filter.field]?.format === 'currency_compact' ? 'e.g. 800000000' : 'Value'}
            value={filter.value}
            onChange={(e) => updateFilter(i, 'value', e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocusedIndex(`value-${i}`)}
            onBlur={() => setFocusedIndex(null)}
          />

          {filter.operator === 'between' && (
            <>
              <span style={styles.andLabel}>and</span>
              <input
                style={{
                  ...styles.input,
                  ...(focusedIndex === `value2-${i}` && styles.inputFocus),
                }}
                type="number"
                placeholder="Max"
                value={filter.value2}
                onChange={(e) => updateFilter(i, 'value2', e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusedIndex(`value2-${i}`)}
                onBlur={() => setFocusedIndex(null)}
              />
            </>
          )}

          <button
            style={{
              ...styles.removeBtn,
              ...(hoveredRemoveBtn === i && styles.removeBtnHover),
            }}
            onClick={() => removeFilter(i)}
            onMouseEnter={() => setHoveredRemoveBtn(i)}
            onMouseLeave={() => setHoveredRemoveBtn(null)}
          >
            Remove
          </button>
        </div>
      ))}

      <div style={styles.hint}>
        Tip: For percentage fields, enter the number directly (e.g., "20" for 20%). For "vs 5yr Avg" fields, enter the % change (e.g., "20" means 20% above average).
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.addBtn,
            ...(hoveredAddBtn && styles.addBtnHover),
          }}
          onClick={addFilter}
          onMouseEnter={() => setHoveredAddBtn(true)}
          onMouseLeave={() => setHoveredAddBtn(false)}
        >
          + Add Filter
        </button>
        <button
          style={{
            ...styles.runBtn,
            ...(hoveredRunBtn && !loading && styles.runBtnHover),
            ...(loading && { opacity: 0.75 }),
          }}
          onClick={handleRun}
          onMouseEnter={() => setHoveredRunBtn(true)}
          onMouseLeave={() => setHoveredRunBtn(false)}
          disabled={loading}
        >
          {loading ? 'Screening...' : 'Run Screen'}
        </button>
      </div>
    </div>
  )
}
