import React, { useState, useEffect, useRef } from 'react'
import FilterBuilder from './FilterBuilder'
import ResultsTable from './ResultsTable'
import Watchlist from './Watchlist'
import { runScreen, getFields, getStats, triggerIngestion, triggerQuoteUpdate, getWatchlistTickers, addToWatchlist, removeFromWatchlist, getIngestionProgress, searchStocks, getSavedScreens, saveScreen, deleteScreen } from '../api'

function formatCompact(v) {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `$${(v/1e12).toFixed(1)}T`
  if (a >= 1e9) return `$${(v/1e9).toFixed(1)}B`
  if (a >= 1e6) return `$${(v/1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}
function formatPct(v) { return v != null ? `${(v*100).toFixed(1)}%` : '—' }
function formatDec(v) { return v != null ? v.toFixed(2) : '—' }

function StockDetail({ stock, fields, onAddWatchlist, isWatched }) {
  if (!stock) return null
  const metrics = [
    ['Market Cap', formatCompact(stock.market_cap)],
    ['Fwd P/E', formatDec(stock.forward_pe)],
    ['EV/EBITDA', formatDec(stock.ev_to_ebitda)],
    ['P/S', formatDec(stock.price_to_sales)],
    ['Gross Margin', formatPct(stock.gross_margin)],
    ['Op Margin', formatPct(stock.operating_margin)],
    ['Net Margin', formatPct(stock.net_margin)],
    ['ROIC', formatPct(stock.roic)],
    ['ROE', formatPct(stock.roe)],
    ['Rev Growth YoY', formatPct(stock.revenue_growth_yoy)],
    ['Rev Growth 3yr', formatPct(stock.revenue_growth_3yr_cagr)],
    ['Debt/Equity', formatDec(stock.debt_to_equity)],
    ['Current Ratio', formatDec(stock.current_ratio)],
    ['Fwd PE vs 5yr', formatPct(stock.forward_pe_vs_5yr_pct)],
    ['Gross Margin vs 5yr', formatPct(stock.gross_margin_vs_5yr_pct)],
  ]
  return (
    <div style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'20px', marginBottom:'20px', animation:'fadeIn 0.2s ease-out', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            <span style={{ fontSize:'22px', fontWeight:'800', color:'#0f172a' }}>{stock.ticker}</span>
            <span style={{ fontSize:'11px', fontWeight:'600', color:'#8b5cf6', padding:'2px 8px', background:'rgba(139,92,246,0.08)', borderRadius:'4px' }}>{stock.sector || 'N/A'}</span>
          </div>
          <div style={{ fontSize:'14px', color:'#94a3b8' }}>{stock.name}</div>
        </div>
        <button onClick={() => onAddWatchlist(stock.ticker)} style={{
          padding:'7px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', transition:'all 0.15s',
          border:'none', background: isWatched ? 'rgba(139,92,246,0.1)' : 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: isWatched ? '#8b5cf6' : '#fff',
        }}>{isWatched ? '★ Watching' : '+ Watchlist'}</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'8px' }}>
        {metrics.map(([label, val]) => (
          <div key={label} style={{ padding:'10px 12px', backgroundColor:'#f8fafc', borderRadius:'8px', border:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'500', marginBottom:'4px' }}>{label}</div>
            <div style={{ fontSize:'14px', fontWeight:'700', color: val === '—' ? '#cbd5e1' : '#0f172a' }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIChatPanel({ isOpen, onClose }) {
  const [msg, setMsg] = useState('')
  if (!isOpen) return null
  return (
    <div style={{
      position:'fixed', right:'24px', bottom:'24px', width:'380px', maxHeight:'520px',
      backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'16px',
      boxShadow:'0 20px 60px rgba(0,0,0,0.12)', zIndex:200, display:'flex', flexDirection:'column',
      animation:'fadeIn 0.2s ease-out', overflow:'hidden',
    }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px' }}>✨</span>
          <span style={{ fontSize:'14px', fontWeight:'700', background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>IQ Assistant</span>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'18px', padding:'2px' }}>✕</button>
      </div>
      <div style={{ flex:1, padding:'20px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', minHeight:'300px' }}>
        <div style={{ fontSize:'40px', marginBottom:'16px' }}>🚀</div>
        <div style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a', marginBottom:'8px', textAlign:'center' }}>Coming Soon</div>
        <div style={{ fontSize:'13px', color:'#94a3b8', textAlign:'center', lineHeight:'1.6', maxWidth:'280px' }}>
          Ask AI to run custom screens like "find stocks with high short interest that are expensive vs peers" — powered by your screening data.
        </div>
      </div>
      <div style={{ padding:'12px 16px', borderTop:'1px solid #f1f5f9', display:'flex', gap:'8px' }}>
        <input style={{ flex:1, padding:'10px 14px', backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#94a3b8', fontSize:'13px', outline:'none' }}
          placeholder="Ask anything about stocks..." value={msg} onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key==='Enter') setMsg('') }} />
        <button style={{ padding:'10px 16px', background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', opacity:0.5 }}>Send</button>
      </div>
    </div>
  )
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
  const [hoveredAdmin, setHoveredAdmin] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)
  const searchTimeout = useRef(null)

  const [chatOpen, setChatOpen] = useState(false)

  const [savedScreens, setSavedScreens] = useState([])
  const [showSavedMenu, setShowSavedMenu] = useState(false)
  const [hoveredSaved, setHoveredSaved] = useState(null)
  const savedMenuRef = useRef(null)

  useEffect(() => {
    getFields().then(setFields).catch(() => {})
    getStats().then(setStats).catch(() => {})
    fetchWatchlistTickers()
    fetchSavedScreens()
    const interval = setInterval(() => { getStats().then(setStats).catch(() => {}) }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([])
      if (savedMenuRef.current && !savedMenuRef.current.contains(e.target)) setShowSavedMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchWatchlistTickers = async () => {
    try { const t = await getWatchlistTickers(); const s = new Set(t || []); setWatchedTickers(s); setWatchlistCount(s.size) } catch {}
  }
  const fetchSavedScreens = async () => {
    try { const s = await getSavedScreens(); setSavedScreens(s || []) } catch {}
  }

  const handleSearch = (q) => {
    setSearchQuery(q); setSelectedStock(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 1) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      try { const r = await searchStocks(q); setSearchResults(r || []) } catch { setSearchResults([]) }
    }, 250)
  }

  const selectStock = (stock) => { setSelectedStock(stock); setSearchQuery(stock.ticker); setSearchResults([]) }

  const handleScreen = async (filters, sort = sortBy, dir = sortDir, offset = 0) => {
    setLoading(true); setLastFilters(filters)
    try { const result = await runScreen(filters, sort, dir, 100, offset); setData(result) }
    catch (err) { console.error('Screen failed:', err) }
    finally { setLoading(false) }
  }

  const handleSort = (field) => {
    const newDir = sortBy === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortBy(field); setSortDir(newDir)
    if (lastFilters.length > 0) handleScreen(lastFilters, field, newDir)
  }

  const handlePageChange = (newOffset) => { if (newOffset >= 0) handleScreen(lastFilters, sortBy, sortDir, newOffset) }

  const handleToggleWatch = async (ticker) => {
    try {
      if (watchedTickers.has(ticker)) {
        await removeFromWatchlist(ticker); const s = new Set(watchedTickers); s.delete(ticker); setWatchedTickers(s); setWatchlistCount(s.size)
      } else {
        await addToWatchlist(ticker); const s = new Set(watchedTickers); s.add(ticker); setWatchedTickers(s); setWatchlistCount(s.size)
      }
    } catch {}
  }

  const handleIngest = async () => {
    try { await triggerIngestion(); setMessage('Full data sync started.'); setTimeout(() => setMessage(''), 6000) }
    catch (err) { setMessage('Failed: ' + err.message) }
  }
  const handleUpdateQuotes = async () => {
    try { await triggerQuoteUpdate(); setMessage('Quote refresh started.'); setTimeout(() => setMessage(''), 4000) }
    catch (err) { setMessage('Failed: ' + err.message) }
  }

  const handleLoadScreen = (screen) => { setShowSavedMenu(false); handleScreen(screen.filters) }
  const handleDeleteScreen = async (e, id) => { e.stopPropagation(); try { await deleteScreen(id); fetchSavedScreens() } catch {} }

  const syncRunning = stats?.sync_running
  const syncPct = stats?.sync_total > 0 ? ((stats.sync_current / stats.sync_total) * 100).toFixed(1) : 0

  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'0 24px', paddingBottom:'80px' }}>
      <div style={{ width:'100%', maxWidth:'1440px', paddingTop:'24px' }}>

        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <span style={{ fontSize:'13px', color:'#94a3b8', fontWeight:'500' }}>
              {stats ? `${stats.synced_with_data?.toLocaleString() || 0} synced` : 'Loading...'}
              <span style={{ color:'#cbd5e1' }}> / {stats?.total_companies?.toLocaleString() || '?'} total</span>
            </span>
            {syncRunning && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#8b5cf6', animation:'pulse 1.5s infinite' }} />
                <span style={{ fontSize:'12px', color:'#8b5cf6', fontWeight:'600' }}>Syncing {stats?.sync_current_ticker} ({syncPct}%)</span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {['Refresh Quotes', 'Full Data Sync'].map((label, i) => (
              <button key={label} style={{
                padding:'7px 14px', backgroundColor:'transparent', color:'#94a3b8',
                border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer',
                fontSize:'12px', fontWeight:'500', transition:'all 0.15s',
                ...(hoveredAdmin === i ? { borderColor:'#cbd5e1', color:'#64748b', backgroundColor:'#f1f5f9' } : {}),
              }} onClick={i === 0 ? handleUpdateQuotes : handleIngest}
                onMouseEnter={() => setHoveredAdmin(i)} onMouseLeave={() => setHoveredAdmin(null)}
              >{label}</button>
            ))}
          </div>
        </div>

        {syncRunning && (
          <div style={{ marginBottom:'20px' }}>
            <div style={{ width:'100%', height:'3px', backgroundColor:'#f1f5f9', borderRadius:'2px', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:'2px', transition:'width 0.5s ease', background:'linear-gradient(90deg,#8b5cf6,#06b6d4)', width:`${syncPct}%` }} />
            </div>
          </div>
        )}

        {message && (
          <div style={{ padding:'10px 16px', backgroundColor:'rgba(34,197,94,0.06)', color:'#16a34a', borderRadius:'8px', fontSize:'13px', marginBottom:'16px', border:'1px solid rgba(34,197,94,0.15)', fontWeight:'500' }}>{message}</div>
        )}

        {/* Search */}
        <div ref={searchRef} style={{ position:'relative', marginBottom:'24px' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'16px', pointerEvents:'none' }}>🔍</span>
            <input style={{
              width:'100%', padding:'12px 14px 12px 42px', backgroundColor:'#fff',
              border:'1px solid #e2e8f0', borderRadius:'12px', color:'#0f172a',
              fontSize:'14px', outline:'none', transition:'all 0.15s', boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
              ...(searchFocused ? { borderColor:'#8b5cf6', boxShadow:'0 0 0 3px rgba(139,92,246,0.08)' } : {}),
            }} placeholder="Search by ticker or company name..." value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:'4px', backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', maxHeight:'320px', overflowY:'auto', zIndex:50, boxShadow:'0 12px 40px rgba(0,0,0,0.1)' }}>
              {searchResults.map((r, i) => (
                <div key={r.ticker+i} style={{ padding:'10px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: i < searchResults.length-1 ? '1px solid #f1f5f9':'none', transition:'background 0.1s' }}
                  onMouseDown={() => selectStock(r)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor='#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor='transparent'}>
                  <div>
                    <span style={{ fontWeight:'700', color:'#0f172a', marginRight:'8px' }}>{r.ticker}</span>
                    <span style={{ color:'#94a3b8', fontSize:'13px' }}>{r.name}</span>
                  </div>
                  <span style={{ color:'#64748b', fontSize:'12px' }}>{formatCompact(r.market_cap)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStock && <StockDetail stock={selectedStock} fields={fields} onAddWatchlist={handleToggleWatch} isWatched={watchedTickers.has(selectedStock.ticker)} />}

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'24px', backgroundColor:'#f1f5f9', borderRadius:'10px', padding:'4px', width:'fit-content' }}>
          {[['screener','Screener'],['watchlist','Watchlist']].map(([key,label]) => (
            <button key={key} style={{
              padding:'8px 20px', backgroundColor: activeTab===key?'#fff':'transparent',
              border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500',
              color: activeTab===key?'#0f172a':'#94a3b8', borderRadius:'7px', transition:'all 0.15s',
              boxShadow: activeTab===key?'0 1px 3px rgba(0,0,0,0.06)':'none',
            }} onClick={() => setActiveTab(key)}>
              {label}
              {key==='watchlist' && watchlistCount > 0 && (
                <span style={{ marginLeft:'6px', display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:'18px', height:'18px', padding:'0 5px', borderRadius:'9px', fontSize:'11px', fontWeight:'600', background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', color:'#fff' }}>{watchlistCount}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'screener' && (
          <>
            {/* Saved Screens dropdown */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
              <div ref={savedMenuRef} style={{ position:'relative' }}>
                <button style={{
                  padding:'6px 14px', backgroundColor:'#fff', color:'#64748b',
                  border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer',
                  fontSize:'12px', fontWeight:'600', transition:'all 0.15s', boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
                }} onClick={() => setShowSavedMenu(!showSavedMenu)}>
                  📋 Saved Screens {savedScreens.length > 0 && `(${savedScreens.length})`}
                </button>
                {showSavedMenu && (
                  <div style={{ position:'absolute', top:'100%', left:0, marginTop:'4px', backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', minWidth:'260px', zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,0.08)', overflow:'hidden' }}>
                    {savedScreens.length === 0 ? (
                      <div style={{ padding:'16px 14px', color:'#94a3b8', fontSize:'13px', textAlign:'center' }}>No saved screens yet. Build a filter and save it!</div>
                    ) : savedScreens.map((s, i) => (
                      <div key={s.id} style={{
                        padding:'10px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
                        borderBottom: i < savedScreens.length-1 ? '1px solid #f1f5f9':'none', transition:'background 0.1s',
                        backgroundColor: hoveredSaved===s.id ? '#f8fafc' : 'transparent',
                      }} onMouseEnter={() => setHoveredSaved(s.id)} onMouseLeave={() => setHoveredSaved(null)} onClick={() => handleLoadScreen(s)}>
                        <div>
                          <div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a' }}>{s.name}</div>
                          <div style={{ fontSize:'11px', color:'#94a3b8' }}>{s.filters.length} filter{s.filters.length!==1?'s':''}</div>
                        </div>
                        <button onClick={(e) => handleDeleteScreen(e, s.id)} style={{ background:'none', border:'none', color:'#cbd5e1', cursor:'pointer', fontSize:'12px', padding:'4px 6px', borderRadius:'4px', transition:'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.backgroundColor='rgba(239,68,68,0.06)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color='#cbd5e1'; e.currentTarget.style.backgroundColor='transparent' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FilterBuilder onRunScreen={handleScreen} loading={loading} onSaveScreen={fetchSavedScreens} />
            <ResultsTable data={data} fields={fields} onSort={handleSort} sortBy={sortBy} sortDir={sortDir}
              onPageChange={handlePageChange} watchedTickers={watchedTickers} onToggleWatch={handleToggleWatch} />
          </>
        )}

        {activeTab === 'watchlist' && <Watchlist />}

        <button onClick={() => setChatOpen(!chatOpen)} style={{
          position:'fixed', bottom:'24px', right:'24px', width:'52px', height:'52px',
          borderRadius:'50%', border:'none', cursor:'pointer', zIndex:150,
          background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', color:'#fff',
          fontSize:'22px', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 24px rgba(139,92,246,0.25)', transition:'all 0.15s',
        }}>{chatOpen ? '✕' : '✨'}</button>
        <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  )
}
