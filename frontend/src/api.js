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
