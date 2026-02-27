const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('screener_token');
}

function setToken(token) {
  localStorage.setItem('screener_token', token);
}

function clearToken() {
  localStorage.removeItem('screener_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    clearToken();
    window.location.reload();
    return null;
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  return resp.json();
}

export async function login(password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (data?.access_token) {
    setToken(data.access_token);
    return true;
  }
  return false;
}

export async function verifyToken() {
  try {
    const token = getToken();
    if (!token) return false;
    await apiFetch('/auth/verify');
    return true;
  } catch {
    return false;
  }
}

export async function runScreen(filters, sortBy = 'market_cap', sortDir = 'desc', limit = 100, offset = 0) {
  return apiFetch('/screen', {
    method: 'POST',
    body: JSON.stringify({
      filters,
      sort_by: sortBy,
      sort_dir: sortDir,
      limit,
      offset,
    }),
  });
}

export async function getFields() {
  return apiFetch('/fields');
}

export async function getStats() {
  return apiFetch('/admin/stats');
}

export async function triggerIngestion() {
  return apiFetch('/admin/ingest', { method: 'POST' });
}

export async function triggerQuoteUpdate() {
  return apiFetch('/admin/update-quotes', { method: 'POST' });
}

export function logout() {
  clearToken();
  window.location.reload();
}
