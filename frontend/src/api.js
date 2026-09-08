const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : `${window.location.origin}/api`;

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return;
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  get: (url) => fetch(`${API_URL}${url}`, { headers: getHeaders() }).then(async r => {
    if (r.status === 401) { localStorage.removeItem('token'); window.location.reload(); return { data: [] }; }
    const data = await r.json();
    return { data };
  }),
  post: (url, body) => fetch(`${API_URL}${url}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw { response: { data } };
    return { data };
  }),
  put: (url, body) => fetch(`${API_URL}${url}`, { method: 'PUT', headers: getHeaders(), body: body ? JSON.stringify(body) : undefined }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw { response: { data } };
    return { data };
  }),
  delete: (url) => fetch(`${API_URL}${url}`, { method: 'DELETE', headers: getHeaders() }).then(async r => {
    const data = await r.json();
    return { data };
  }),
};
