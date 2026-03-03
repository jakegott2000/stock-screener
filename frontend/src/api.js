const API_BASE = '/api';

function getToken() { return localStorage.getItem('screener_token'); }
function setToken(token) { localStorage.setItem('screener_token', token); }
function clearToken() { localStorage.removeItem('screener_token'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (resp.status === 401) { clearToken(); window.location.reload(); return null; }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return resp.json();
}

export async function login(password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
  if (data?.access_token) { setToken(data.access_token); return true; }
  return false;
}
export async function verifyToken() {
  try { if (!getToken()) return false; await apiFetch('/auth/verify'); return true; } catch { return false; }
}
export async function runScreen(filters, sortBy = 'market_cap', sortDir = 'desc', limit = 100, offset = 0) {
  return apiFetch('/screen', { method: 'POST', body: JSON.stringify({ filters, sort_by: sortBy, sort_dir: sortDir, limit, offset }) });
}
export async function getFields() { return apiFetch('/fields'); }
export async function getStats() { return apiFetch('/admin/stats'); }
export async function triggerIngestion() { return apiFetch('/admin/ingest', { method: 'POST' }); }
export async function triggerQuoteUpdate() { return apiFetch('/admin/update-quotes', { method: 'POST' }); }
export async function getWatchlist() { return apiFetch('/watchlist'); }
export async function getWatchlistTickers() { return apiFetch('/watchlist/tickers'); }
export async function addToWatchlist(ticker, notes = '') {
  return apiFetch('/watchlist', { method: 'POST', body: JSON.stringify({ ticker, notes }) });
}
export async function removeFromWatchlist(ticker) {
  return apiFetch(`/watchlist/${ticker}`, { method: 'DELETE' });
}
export async function getIngestionProgress() { return apiFetch('/admin/progress'); }
export async function searchStocks(query) { return apiFetch(`/search?q=${encodeURIComponent(query)}`); }
export async function getSavedScreens() { return apiFetch('/screens'); }
export async function saveScreen(name, filters) { return apiFetch('/screens', { method: 'POST', body: JSON.stringify({ name, filters }) }); }
export async function updateScreen(id, data) { return apiFetch(`/screens/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteScreen(id) { return apiFetch(`/screens/${id}`, { method: 'DELETE' }); }
export function logout() { clearToken(); window.location.reload(); }
