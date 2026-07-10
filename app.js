let currentUser = null;
let currentToken = localStorage.getItem('cinetrack_token') || null;
let movies = [];
let watchlist = [];

const els = {
  hero: document.getElementById('hero'),
  auth: document.getElementById('auth'),
  app: document.getElementById('app'),
  navLinks: document.getElementById('navLinks'),
  toast: document.getElementById('toast'),
  browseView: document.getElementById('browseView'),
  mylistView: document.getElementById('mylistView'),
  movieGrid: document.getElementById('movieGrid'),
  emptyMovies: document.getElementById('emptyMovies'),
  watchlistItems: document.getElementById('watchlistItems'),
  emptyWatchlist: document.getElementById('emptyWatchlist'),
};

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { els.toast.className = 'toast'; }, 2600);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

// Deterministic poster color from a movie title
function posterStyle(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `background: linear-gradient(160deg, hsl(${hue} 55% 22%) 0%, hsl(${(hue + 40) % 360} 45% 12%) 100%);`;
}

function initials(title) {
  return title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// --- View switching ---
function showAuthenticatedApp() {
  els.hero.hidden = true;
  els.auth.hidden = true;
  els.app.hidden = false;
  els.navLinks.hidden = false;
  loadMovies();
  loadWatchlist();
}

function showLoggedOut() {
  els.hero.hidden = false;
  els.auth.hidden = true;
  els.app.hidden = true;
  els.navLinks.hidden = true;
}

function switchView(view) {
  document.querySelectorAll('.nav-link[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  els.browseView.hidden = view !== 'browse';
  els.mylistView.hidden = view !== 'mylist';
}

// --- Auth ---
document.getElementById('getStartedBtn').addEventListener('click', () => {
  els.hero.hidden = true;
  els.auth.hidden = false;
});

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('loginForm').hidden = !isLogin;
    document.getElementById('registerForm').hidden = isLogin;
  });
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    onAuthSuccess(data);
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    onAuthSuccess(data);
  } catch (err) {
    showToast(err.message, true);
  }
});

function onAuthSuccess(data) {
  currentToken = data.token;
  currentUser = data.user;
  localStorage.setItem('cinetrack_token', currentToken);
  showToast(`Welcome, ${currentUser.email}`);
  showAuthenticatedApp();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem('cinetrack_token');
  showLoggedOut();
  showToast('Logged out');
});

document.querySelectorAll('.nav-link[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// --- Movies ---
document.getElementById('addMovieBtn').addEventListener('click', () => {
  document.getElementById('addMovieForm').hidden = false;
});
document.getElementById('cancelAddMovie').addEventListener('click', () => {
  document.getElementById('addMovieForm').hidden = true;
});

document.getElementById('addMovieForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await api('/api/movies', {
      method: 'POST',
      body: JSON.stringify({
        title: form.get('title'),
        genre: form.get('genre') || null,
        release_year: form.get('release_year') ? Number(form.get('release_year')) : null,
      }),
    });
    e.target.reset();
    document.getElementById('addMovieForm').hidden = true;
    showToast('Movie added');
    loadMovies();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function loadMovies() {
  try {
    movies = await api('/api/movies');
    renderMovies();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderMovies() {
  els.movieGrid.innerHTML = '';
  els.emptyMovies.hidden = movies.length > 0;

  movies.forEach(movie => {
    const inWatchlist = watchlist.some(w => w.movie_id === movie.id);
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div class="movie-poster" style="${posterStyle(movie.title)}">${initials(movie.title)}</div>
      <div class="movie-body">
        <p class="movie-title">${escapeHtml(movie.title)}</p>
        <p class="movie-meta">${escapeHtml(movie.genre || 'Unspecified')}${movie.release_year ? ' · ' + movie.release_year : ''}</p>
        <button class="movie-add-btn" ${inWatchlist ? 'disabled' : ''}>${inWatchlist ? 'In your list' : '+ Add to list'}</button>
      </div>
    `;
    const btn = card.querySelector('.movie-add-btn');
    if (!inWatchlist) {
      btn.addEventListener('click', async () => {
        try {
          await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ movie_id: movie.id }) });
          showToast(`Added "${movie.title}" to your list`);
          await loadWatchlist();
          renderMovies();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }
    els.movieGrid.appendChild(card);
  });
}

// --- Watchlist ---
async function loadWatchlist() {
  try {
    watchlist = await api('/api/watchlist');
    renderWatchlist();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderWatchlist() {
  els.watchlistItems.innerHTML = '';
  els.emptyWatchlist.hidden = watchlist.length > 0;

  watchlist.forEach(item => {
    const row = document.createElement('div');
    row.className = 'watchlist-row';
    row.innerHTML = `
      <div class="watchlist-poster" style="${posterStyle(item.title)}">${initials(item.title)}</div>
      <div class="watchlist-info">
        <p class="title">${escapeHtml(item.title)}</p>
        <p class="meta">${escapeHtml(item.genre || 'Unspecified')}${item.release_year ? ' · ' + item.release_year : ''}</p>
      </div>
      <select class="status-select">
        <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>Planned</option>
        <option value="watching" ${item.status === 'watching' ? 'selected' : ''}>Watching</option>
        <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
      </select>
      <div class="stars">
        ${[1,2,3,4,5].map(n => `<button class="star-btn ${item.rating >= n * 2 ? 'filled' : ''}" data-value="${n * 2}">★</button>`).join('')}
      </div>
      <button class="remove-btn">Remove</button>
    `;

    row.querySelector('.status-select').addEventListener('change', async (e) => {
      try {
        await api(`/api/watchlist/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
        showToast('Status updated');
      } catch (err) {
        showToast(err.message, true);
      }
    });

    row.querySelectorAll('.star-btn').forEach(star => {
      star.addEventListener('click', async () => {
        const rating = Number(star.dataset.value);
        try {
          await api(`/api/watchlist/${item.id}`, { method: 'PATCH', body: JSON.stringify({ rating }) });
          item.rating = rating;
          renderWatchlist();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    row.querySelector('.remove-btn').addEventListener('click', async () => {
      try {
        await api(`/api/watchlist/${item.id}`, { method: 'DELETE' });
        showToast('Removed from your list');
        await loadWatchlist();
        renderMovies();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    els.watchlistItems.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Boot ---
if (currentToken) {
  showAuthenticatedApp();
} else {
  showLoggedOut();
}
