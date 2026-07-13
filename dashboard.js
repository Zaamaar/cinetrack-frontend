if (!getToken()) {
  window.location.href = 'index.html';
}

let movies = [];
let watchlist = [];
let activeDetailMovie = null;
let currentView = 'home';

const els = {
  navUser: document.getElementById('navUser'),
  banner: document.getElementById('banner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerMeta: document.getElementById('bannerMeta'),
  bannerAddBtn: document.getElementById('bannerAddBtn'),
  homeView: document.getElementById('homeView'),
  homeRows: document.getElementById('homeRows'),
  emptyHome: document.getElementById('emptyHome'),
  browseView: document.getElementById('browseView'),
  mylistView: document.getElementById('mylistView'),
  movieGrid: document.getElementById('movieGrid'),
  emptyMovies: document.getElementById('emptyMovies'),
  watchlistGrid: document.getElementById('watchlistGrid'),
  emptyWatchlist: document.getElementById('emptyWatchlist'),
};

const user = getUser();
if (user) els.navUser.textContent = user.email;

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html';
});

document.querySelectorAll('.nav-link[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-link[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  els.homeView.hidden = view !== 'home';
  els.browseView.hidden = view !== 'browse';
  els.mylistView.hidden = view !== 'mylist';
  els.banner.hidden = view !== 'home' || !movies.length;
}

const addMovieModal = document.getElementById('addMovieModal');
document.getElementById('addMovieBtn').addEventListener('click', () => { addMovieModal.hidden = false; });
document.getElementById('closeAddMovie').addEventListener('click', () => { addMovieModal.hidden = true; });
addMovieModal.addEventListener('click', (e) => { if (e.target === addMovieModal) addMovieModal.hidden = true; });

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
    addMovieModal.hidden = true;
    showToast('Movie added');
    await loadMovies();
  } catch (err) {
    showToast(err.message, true);
  }
});

const detailModal = document.getElementById('detailModal');
document.getElementById('closeDetail').addEventListener('click', () => { detailModal.hidden = true; });
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.hidden = true; });

function openDetail(movie) {
  activeDetailMovie = movie;
  const watchlistEntry = watchlist.find(w => w.movie_id === movie.id);

  document.getElementById('detailTitle').textContent = movie.title;
  document.getElementById('detailPoster').setAttribute('style', posterStyle(movie.title));
  document.getElementById('detailPoster').textContent = initials(movie.title);
  document.getElementById('detailMeta').textContent =
    `${movie.genre || 'Unspecified'}${movie.release_year ? ' · ' + movie.release_year : ''}`;

  const inListPanel = document.getElementById('detailInList');
  const addBtn = document.getElementById('detailAddBtn');

  if (watchlistEntry) {
    inListPanel.hidden = false;
    addBtn.hidden = true;
    document.getElementById('detailStatus').value = watchlistEntry.status;
    renderStars(watchlistEntry.rating || 0);
  } else {
    inListPanel.hidden = true;
    addBtn.hidden = false;
  }

  detailModal.hidden = false;
}

function renderStars(rating) {
  const container = document.getElementById('detailStars');
  container.innerHTML = [1, 2, 3, 4, 5].map(n => {
    const value = n * 2;
    return `<button type="button" class="star-btn ${rating >= value ? 'filled' : ''}" data-value="${value}">★</button>`;
  }).join('');

  container.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('click', async () => {
      const rating = Number(star.dataset.value);
      const entry = watchlist.find(w => w.movie_id === activeDetailMovie.id);
      if (!entry) return;
      try {
        await api(`/api/watchlist/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ rating }) });
        entry.rating = rating;
        renderStars(rating);
        renderWatchlistGrid();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

document.getElementById('detailStatus').addEventListener('change', async (e) => {
  const entry = watchlist.find(w => w.movie_id === activeDetailMovie.id);
  if (!entry) return;
  try {
    await api(`/api/watchlist/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
    entry.status = e.target.value;
    showToast('Status updated');
    renderWatchlistGrid();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('detailAddBtn').addEventListener('click', () => addToWatchlist(activeDetailMovie));
document.getElementById('bannerAddBtn').addEventListener('click', () => {
  if (movies.length) addToWatchlist(movies[0]);
});

document.getElementById('detailRemoveBtn').addEventListener('click', async () => {
  const entry = watchlist.find(w => w.movie_id === activeDetailMovie.id);
  if (!entry) return;
  try {
    await api(`/api/watchlist/${entry.id}`, { method: 'DELETE' });
    showToast('Removed from your list');
    detailModal.hidden = true;
    await loadWatchlist();
    renderMovieGrid();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function addToWatchlist(movie) {
  try {
    await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ movie_id: movie.id }) });
    showToast(`Added "${movie.title}" to your list`);
    detailModal.hidden = true;
    await loadWatchlist();
    renderMovieGrid();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadMovies() {
  try {
    movies = await api('/api/movies');
    renderMovieGrid();
    renderBanner();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadWatchlist() {
  try {
    watchlist = await api('/api/watchlist');
    renderWatchlistGrid();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderBanner() {
  if (!movies.length) { els.banner.hidden = true; return; }
  const featured = movies[0];
  els.banner.hidden = currentView !== 'home';
  els.banner.setAttribute('style', posterStyle(featured.title).replace('linear-gradient(155deg,', 'linear-gradient(90deg, rgba(11,12,14,0.55) 0%, rgba(11,12,14,0.15) 55%,'));
  els.bannerTitle.textContent = featured.title;
  els.bannerMeta.textContent = `${featured.genre || 'Unspecified'}${featured.release_year ? ' · ' + featured.release_year : ''}`;
  const inList = watchlist.some(w => w.movie_id === featured.id);
  els.bannerAddBtn.textContent = inList ? 'Already in your list' : '+ Add to my list';
  els.bannerAddBtn.disabled = inList;
}

function renderHome() {
  els.homeRows.innerHTML = '';
  els.emptyHome.hidden = movies.length > 0;
  if (!movies.length) return;

  const groups = new Map();
  movies.forEach(movie => {
    const key = movie.genre || 'Unsorted';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(movie);
  });

  groups.forEach((groupMovies, genre) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<h3 class="row-title">${escapeHtml(genre)}</h3>`;
    const strip = document.createElement('div');
    strip.className = 'poster-row';
    groupMovies.forEach(movie => {
      const inList = watchlist.some(w => w.movie_id === movie.id);
      strip.appendChild(posterCard(movie, { showBadge: inList ? '✓ In list' : null, size: 'row-card' }));
    });
    row.appendChild(strip);
    els.homeRows.appendChild(row);
  });
}

function posterCard(movie, { showBadge, size } = {}) {
  const card = document.createElement('div');
  card.className = size ? `poster-card ${size}` : 'poster-card';
  const badge = showBadge ? `<span class="poster-badge">${showBadge}</span>` : '';
  card.innerHTML = `
    <div class="poster-art" style="${posterStyle(movie.title)}">
      <span class="poster-initials">${initials(movie.title)}</span>
      ${badge}
      <div class="poster-scrim">
        <p class="poster-title">${escapeHtml(movie.title)}</p>
        <p class="poster-meta">${escapeHtml(movie.genre || 'Unspecified')}${movie.release_year ? ' · ' + movie.release_year : ''}</p>
      </div>
    </div>
  `;
  card.addEventListener('click', () => openDetail(movie));
  return card;
}

function renderMovieGrid() {
  els.movieGrid.innerHTML = '';
  els.emptyMovies.hidden = movies.length > 0;
  movies.forEach(movie => {
    const inList = watchlist.some(w => w.movie_id === movie.id);
    els.movieGrid.appendChild(posterCard(movie, { showBadge: inList ? '✓ In list' : null }));
  });
  renderHome();
}

function renderWatchlistGrid() {
  els.watchlistGrid.innerHTML = '';
  els.emptyWatchlist.hidden = watchlist.length > 0;
  watchlist.forEach(item => {
    const movie = { id: item.movie_id, title: item.title, genre: item.genre, release_year: item.release_year };
    const badge = item.status === 'completed' ? '✓ Completed' : item.status === 'watching' ? '▶ Watching' : '☐ Planned';
    els.watchlistGrid.appendChild(posterCard(movie, { showBadge: badge }));
  });
  renderHome();
}

(async function init() {
  await loadWatchlist();
  await loadMovies();
})();
