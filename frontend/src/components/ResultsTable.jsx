import React, { useState } from 'react'

function fmt(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'currency_compact': {
      const a = Math.abs(value)
      if (a >= 1e12) return `$${(value/1e12).toFixed(2)}T`
      if (a >= 1e9) return `$${(value/1e9).toFixed(2)}B`
      if (a >= 1e6) return `$${(value/1e6).toFixed(1)}M`
      return `$${value.toLocaleString()}`
    }
    case 'percent': return `${(value*100).toFixed(1)}%`
    case 'percent_change': return `${value>=0?'+':''}${(value*100).toFixed(1)}%`
    case 'decimal2': return value.toFixed(2)
    default: return typeof value === 'number' ? value.toLocaleString(undefined,{maximumFractionDigits:2}) : String(value)
  }
}

const COLS = [
  'ticker','name','sector','market_cap','forward_pe','ev_to_ebitda',
  'gross_margin','operating_margin','roic','revenue_growth_yoy',
  'forward_pe_vs_5yr_pct','gross_margin_vs_5yr_pct',
]

export default function ResultsTable({ data, fields, onSort, sortBy, sortDir, onPageChange, watchedTickers = new Set(), onToggleWatch = () => {} }) {
  const [hovRow, setHovRow] = useState(null)
  const [hovTh, setHovTh] = useState(null)

  if (!data) return (
    <div style={{ backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#3f3f46', fontSize:'14px' }}>
        Set your filters and click <span style={{ color:'#8b5cf6', fontWeight:'600' }}>Run Screen</span> to find stocks.
      </div>
    </div>
  )

  const { results, total, limit, offset } = data
  if (results.length === 0) return (
    <div style={{ backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#3f3f46', fontSize:'14px' }}>No companies matched. Try adjusting your filters.</div>
    </div>
  )

  const cols = COLS.filter(c => fields[c])
  const page = Math.floor(offset/limit)+1, pages = Math.ceil(total/limit)

  return (
    <div style={{ backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #27272a' }}>
        <span style={{ fontSize:'13px', color:'#71717a', fontWeight:'600' }}>
          <span style={{ color:'#fafafa' }}>{total.toLocaleString()}</span> results
        </span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
          <thead>
            <tr>
              <th style={{ padding:'10px 12px', textAlign:'center', color:'#3f3f46', fontWeight:'600', fontSize:'11px', borderBottom:'1px solid #27272a', width:'36px' }}>★</th>
              {cols.map(c => (
                <th key={c} style={{
                  padding:'10px 16px', textAlign:'left', fontWeight:'600', fontSize:'11px',
                  textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #27272a',
                  cursor:'pointer', whiteSpace:'nowrap', userSelect:'none', transition:'color 0.15s',
                  color: sortBy===c ? '#a1a1aa' : (hovTh===c ? '#71717a' : '#3f3f46'),
                }} onClick={() => onSort(c)} onMouseEnter={() => setHovTh(c)} onMouseLeave={() => setHovTh(null)}>
                  {fields[c]?.label || c}
                  {sortBy===c && <span style={{ marginLeft:'3px', fontSize:'10px' }}>{sortDir==='desc'?'↓':'↑'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => {
              const watched = watchedTickers.has(row.ticker)
              return (
                <tr key={row.ticker+i} style={{ ...(hovRow===i ? { backgroundColor:'rgba(39,39,42,0.3)' } : {}) }}
                  onMouseEnter={() => setHovRow(i)} onMouseLeave={() => setHovRow(null)}>
                  <td style={{ padding:'8px 12px', borderBottom:'1px solid rgba(39,39,42,0.4)', textAlign:'center' }}>
                    <button onClick={() => onToggleWatch(row.ticker)} style={{
                      background:'none', border:'none', fontSize:'14px', cursor:'pointer', padding:'2px 4px',
                      color: watched ? '#8b5cf6' : '#27272a', transition:'all 0.15s', lineHeight:'1',
                    }} title={watched?'Remove':'Add to watchlist'}>{watched?'★':'☆'}</button>
                  </td>
                  {cols.map(c => {
                    const v = row[c], f = fields[c]?.format
                    let color = '#d4d4d8'
                    if (c==='ticker') color = '#fafafa'
                    if (c==='name') color = '#71717a'
                    if (f==='percent_change' && typeof v==='number') color = v > 0 ? '#4ade80' : v < 0 ? '#f87171' : '#d4d4d8'
                    return (
                      <td key={c} style={{
                        padding:'8px 16px', borderBottom:'1px solid rgba(39,39,42,0.4)', whiteSpace:'nowrap',
                        color, fontWeight: c==='ticker' ? '700' : '400',
                        maxWidth: c==='name' ? '180px' : 'none', overflow:'hidden', textOverflow:'ellipsis',
                      }}>{fmt(v, f)}</td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', padding:'14px', borderTop:'1px solid #27272a' }}>
          <button style={{ padding:'6px 14px', backgroundColor:'transparent', color:'#71717a', border:'1px solid #27272a', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'500', opacity:page<=1?.3:1 }}
            onClick={() => onPageChange(offset-limit)} disabled={page<=1}>Prev</button>
          <span style={{ color:'#3f3f46', fontSize:'12px', fontWeight:'500' }}>{page} / {pages}</span>
          <button style={{ padding:'6px 14px', backgroundColor:'transparent', color:'#71717a', border:'1px solid #27272a', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'500', opacity:page>=pages?.3:1 }}
            onClick={() => onPageChange(offset+limit)} disabled={page>=pages}>Next</button>
        </div>
      )}
    </div>
  )
}
