import { API_BASE, nav, centsToAUD, formatDateTime, renderError } from './common.js';

document.getElementById('top').innerHTML = nav();

const form = document.getElementById('f');
const catSel = document.getElementById('category');
const results = document.getElementById('results');
const msg = document.getElementById('msg');

async function loadCategories() {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  const cats = await res.json();
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c.slug;
    opt.textContent = c.name;
    catSel.appendChild(opt);
  }
}

function toQuery(o) {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p.toString();
}

function renderRows(rows) {
  if (!rows.length) {
    results.innerHTML = `<div class="muted">No events match your filters.</div>`;
    return;
  }
  results.innerHTML = rows.map(e => `
    <article class="card">
      <img src="${e.image_url || 'https://picsum.photos/seed/fallback/400/200'}" alt="">
      <div class="row">
        <span class="badge">${e.category}</span>
        <span class="badge">${centsToAUD(e.price_cents)}</span>
      </div>
      <h3>${e.title}</h3>
      <div class="muted">${e.location_city || ''}${e.location_venue ? ' · ' + e.location_venue : ''}</div>
      <div class="muted">${formatDateTime(e.start_datetime)} → ${formatDateTime(e.end_datetime)}</div>
      <p><a class="btn-primary" href="/event.html?id=${e.id}">View details</a></p>
    </article>
  `).join('');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.innerHTML = '';
  results.innerHTML = '';
  const start = form.start.value;
  const end = form.end.value;
  const city = form.city.value.trim();
  const category = form.category.value;

  // simple validation: end >= start
  if (start && end && end < start) {
    renderError(msg, 'End date must be on/after start date.');
    return;
  }

  try {
    const qs = toQuery({ start, end, city, category });
    const res = await fetch(`${API_BASE}/api/events/search?${qs}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    msg.innerHTML = `<div class="muted">Found ${data.count} event(s).</div>`;
    renderRows(data.results);
  } catch (err) {
    renderError(msg, err.message);
  }
});

document.getElementById('clear').addEventListener('click', () => {
  form.reset(); // resets all fields via DOM
  msg.innerHTML = '';
  results.innerHTML = '';
});

(async () => {
  try { await loadCategories(); }
  catch (e) { renderError(msg, e.message); }
})();
