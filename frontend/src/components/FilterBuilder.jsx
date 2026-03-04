import { useState, useEffect } from 'react'
import { getFields, saveScreen } from '../api'

const OPERATORS = [
  { value: 'gt', label: '>' }, { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' }, { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' }, { value: 'between', label: 'Between' },
]

const FIELD_GROUPS = {
  'Valuation (Trailing)': ['market_cap', 'enterprise_value', 'pe_ratio', 'price_to_sales', 'price_to_book', 'ev_to_ebitda', 'ev_to_revenue'],
  'Valuation (Forward)': ['forward_pe', 'forward_ev_to_ebitda', 'forward_ev_to_ebit'],
  'Profitability': ['gross_margin', 'operating_margin', 'net_margin', 'ebitda_margin'],
  'Returns': ['roic', 'roe', 'roa'],
  'Growth': ['revenue_growth_yoy', 'revenue_growth_3yr_cagr', 'earnings_growth_yoy'],
  'Balance Sheet': ['debt_to_equity', 'net_debt_to_ebitda', 'current_ratio'],
  'Shares Float': ['float_shares', 'outstanding_shares', 'free_float_pct'],
  'vs 5yr Average': ['forward_pe_vs_5yr_pct', 'ev_ebitda_vs_5yr_pct', 'gross_margin_vs_5yr_pct', 'operating_margin_vs_5yr_pct', 'roic_vs_5yr_pct', 'roe_vs_5yr_pct'],
  'Historical Avgs': ['pe_5yr_avg', 'ev_ebitda_5yr_avg', 'gross_margin_5yr_avg', 'operating_margin_5yr_avg', 'net_margin_5yr_avg', 'roic_5yr_avg', 'roe_5yr_avg'],
  'Info': ['sector', 'industry', 'country', 'exchange'],
}

const EMPTY = { field: 'market_cap', operator: 'gte', value: '', value2: '' }

export default function FilterBuilder({ onRunScreen, loading, onSaveScreen }) {
  const [fields, setFields] = useState({})
  const [filters, setFilters] = useState([{ ...EMPTY }])
  const [focused, setFocused] = useState(null)
  const [hovRemove, setHovRemove] = useState(null)
  const [hovAdd, setHovAdd] = useState(false)
  const [hovRun, setHovRun] = useState(false)
  const [hovSave, setHovSave] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => { getFields().then(setFields).catch(() => {}) }, [])

  const update = (i, k, v) => { const u = [...filters]; u[i] = { ...u[i], [k]: v }; setFilters(u) }
  const add = () => setFilters([...filters, { ...EMPTY }])
  const remove = (i) => { if (filters.length > 1) setFilters(filters.filter((_, j) => j !== i)) }

  const parseFilters = () => {
    return filters.filter(f => f.field && f.value !== '').map(f => {
      const fd = fields[f.field] || {}
      let value = f.operator === 'between'
        ? [parseFloat(f.value), parseFloat(f.value2)]
        : fd.type === 'string' ? f.value : parseFloat(f.value)
      const fmt = fd.format || ''
      if ((fmt === 'percent' || fmt === 'percent_change') && typeof value === 'number') value = value / 100
      if ((fmt === 'percent' || fmt === 'percent_change') && Array.isArray(value)) value = value.map(v => v / 100)
      return { field: f.field, operator: f.operator, value }
    })
  }

  const run = () => { onRunScreen(parseFilters()) }

  const handleSave = async () => {
    if (!saveName.trim()) return
    const parsed = parseFilters()
    if (parsed.length === 0) { setSaveMsg('Add at least one filter first'); setTimeout(() => setSaveMsg(''), 3000); return }
    try {
      await saveScreen(saveName.trim(), parsed)
      setSaveName(''); setShowSaveInput(false); setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
      if (onSaveScreen) onSaveScreen()
    } catch (err) { setSaveMsg('Failed to save'); setTimeout(() => setSaveMsg(''), 3000) }
  }

  const focusStyle = { borderColor: '#8b5cf6', boxShadow: '0 0 0 2px rgba(139,92,246,0.08)' }
  const inputBase = {
    padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '8px', color: '#0f172a', fontSize: '13px', fontWeight: '500',
    outline: 'none', transition: 'all 0.15s ease',
  }

  return (
    <div style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'20px', marginBottom:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>
        <span style={{ background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Filter Criteria</span>
      </div>

      {filters.map((f, i) => (
        <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px', flexWrap:'wrap' }}>
          <select style={{ ...inputBase, flex:'1 1 200px', cursor:'pointer', minWidth:'140px', ...(focused===`f${i}` ? focusStyle : {}) }}
            value={f.field} onChange={(e) => update(i, 'field', e.target.value)}
            onFocus={() => setFocused(`f${i}`)} onBlur={() => setFocused(null)}>
            {Object.entries(FIELD_GROUPS).map(([g, fns]) => (
              <optgroup key={g} label={g}>
                {fns.filter(fn => fields[fn]).map(fn => <option key={fn} value={fn}>{fields[fn]?.label || fn}</option>)}
              </optgroup>
            ))}
          </select>
          <select style={{ ...inputBase, flex:'0 0 auto', cursor:'pointer', minWidth:'80px', ...(focused===`o${i}` ? focusStyle : {}) }}
            value={f.operator} onChange={(e) => update(i, 'operator', e.target.value)}
            onFocus={() => setFocused(`o${i}`)} onBlur={() => setFocused(null)}>
            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
          <input style={{ ...inputBase, flex:'0 1 120px', minWidth:'80px', ...(focused===`v${i}` ? focusStyle : {}) }}
            type={fields[f.field]?.type === 'string' ? 'text' : 'number'}
            placeholder={fields[f.field]?.format === 'currency_compact' ? 'e.g. 800000000' : 'Value'}
            value={f.value} onChange={(e) => update(i, 'value', e.target.value)}
            onKeyDown={(e) => { if (e.key==='Enter') run() }}
            onFocus={() => setFocused(`v${i}`)} onBlur={() => setFocused(null)} />
          {f.operator === 'between' && <>
            <span style={{ color:'#cbd5e1', fontSize:'12px', fontWeight:'500' }}>and</span>
            <input style={{ ...inputBase, flex:'0 1 120px', minWidth:'80px', ...(focused===`v2${i}` ? focusStyle : {}) }}
              type="number" placeholder="Max" value={f.value2}
              onChange={(e) => update(i, 'value2', e.target.value)}
              onKeyDown={(e) => { if (e.key==='Enter') run() }}
              onFocus={() => setFocused(`v2${i}`)} onBlur={() => setFocused(null)} />
          </>}
          <button className="btn-press" style={{
            ...inputBase, cursor:'pointer', border:'1px solid transparent', color:'#cbd5e1',
            transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            ...(hovRemove===i ? { color:'#ef4444', backgroundColor:'rgba(239,68,68,0.06)', transform:'scale(1.15) rotate(90deg)' } : {}),
          }} onClick={() => remove(i)} onMouseEnter={() => setHovRemove(i)} onMouseLeave={() => setHovRemove(null)}>✕</button>
        </div>
      ))}

      <div style={{ fontSize:'11px', color:'#cbd5e1', margin:'12px 0 16px' }}>
        Enter percentages as numbers (e.g. "20" for 20%).
      </div>

      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <button className="btn-press" style={{
          padding:'8px 16px', backgroundColor:'transparent', color:'#94a3b8',
          border:'1px dashed #e2e8f0', borderRadius:'8px', cursor:'pointer',
          fontSize:'13px', fontWeight:'500', transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          ...(hovAdd ? { borderColor:'#8b5cf6', color:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.03)', borderStyle:'solid' } : {}),
        }} onClick={add} onMouseEnter={() => setHovAdd(true)} onMouseLeave={() => setHovAdd(false)}>+ Add filter</button>

        <button className="btn-press btn-glow btn-ripple" style={{
          padding:'8px 28px', border:'none', borderRadius:'8px', cursor:'pointer',
          fontSize:'13px', fontWeight:'700', transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)', color:'#fff',
          background: loading ? '#94a3b8' : 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
          boxShadow:'0 2px 12px rgba(139,92,246,0.2)',
          opacity: loading ? 0.8 : 1,
          ...(hovRun && !loading ? { filter:'brightness(1.08)', boxShadow:'0 6px 24px rgba(139,92,246,0.3)' } : {}),
        }} onClick={run} disabled={loading}
          onMouseEnter={() => setHovRun(true)} onMouseLeave={() => setHovRun(false)}
        >{loading ? '⟳ Screening...' : '▶ Run Screen'}</button>

        {/* Save screen button */}
        {!showSaveInput ? (
          <button className="btn-press" style={{
            padding:'8px 16px', backgroundColor:'transparent', color:'#94a3b8',
            border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer',
            fontSize:'13px', fontWeight:'500', transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            ...(hovSave ? { borderColor:'#8b5cf6', color:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.04)', boxShadow:'0 2px 12px rgba(139,92,246,0.08)' } : {}),
          }} onClick={() => setShowSaveInput(true)}
            onMouseEnter={() => setHovSave(true)} onMouseLeave={() => setHovSave(false)}
          >💾 Save Screen</button>
        ) : (
          <div style={{ display:'flex', gap:'6px', alignItems:'center', animation:'popIn 0.2s ease-out' }}>
            <input style={{ ...inputBase, width:'180px' }}
              placeholder="Screen name..." value={saveName} onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key==='Enter') handleSave(); if (e.key==='Escape') setShowSaveInput(false) }}
              autoFocus />
            <button className="btn-press" style={{
              padding:'8px 14px', border:'none', borderRadius:'8px', cursor:'pointer',
              fontSize:'12px', fontWeight:'600', color:'#fff', background:'#8b5cf6', transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              boxShadow:'0 2px 8px rgba(139,92,246,0.2)',
            }} onClick={handleSave}>Save</button>
            <button className="btn-press" style={{
              padding:'8px 10px', border:'none', borderRadius:'8px', cursor:'pointer',
              fontSize:'12px', color:'#94a3b8', background:'transparent', transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            }} onClick={() => { setShowSaveInput(false); setSaveName('') }}>Cancel</button>
          </div>
        )}

        {saveMsg && <span style={{ fontSize:'12px', color: saveMsg === 'Saved!' ? '#16a34a' : '#ef4444', fontWeight:'500' }}>{saveMsg}</span>}
      </div>
    </div>
  )
}
