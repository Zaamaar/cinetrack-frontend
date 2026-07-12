// Shared across index.html, register.html (auth.js) and dashboard.html (dashboard.js)

function getToken() {
  return localStorage.getItem('cinetrack_token');
}

function getUser() {
  const raw = localStorage.getItem('cinetrack_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('cinetrack_token', token);
  localStorage.setItem('cinetrack_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('cinetrack_token');
  localStorage.removeItem('cinetrack_user');
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

function showToast(message, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { el.className = 'toast'; }, 2600);
}

// Deterministic poster gradient from a movie title
function posterStyle(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `background: linear-gradient(155deg, hsl(${hue} 58% 24%) 0%, hsl(${(hue + 35) % 360} 45% 10%) 100%);`;
}

function initials(title) {
  return title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
