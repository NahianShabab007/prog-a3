// public/js/home.js (A3)
// Adds "Event Highlights (Top 3 Upcoming)" + keeps Upcoming/Past logic

import { API_BASE, nav, centsToAUD, formatDateTime, renderError, eventStatus } from './common.js';

document.getElementById('top').innerHTML = nav();

const highlightsEl = document.getElementById('highlights');
const listUpcoming = document.getElementById('events');
const listPast = document.getElementById('past');
const pastTitle = document.getElementById('pastTitle');
const togglePast = document.getElementById('togglePast');

function card(e) {
  const status = eventStatus(e.start_datetime, e.end_datetime);
  return `
    <article class="card">
      <img src="${e.image_url || 'https://picsum.photos/seed/fallback/400/200'}" alt="">
      <div class="row">
        <span class="badge">${e.category}</span>
        <span class="badge">${centsToAUD(e.price_cents)}</span>
        <span class="badge">${status}</span>
      </div>
      <h3>${e.title}</h3>
      <div class="muted">${e.location_city || ''}${e.location_venue ? ' · ' + e.location_venue : ''}</div>
      <div class="muted">${formatDateTime(e.start_datetime)} → ${formatDateTime(e.end_datetime)}</div>
      <p><a class="btn-primary" href="/event.html?id=${e.id}">View details</a></p>
    </article>
  `;
}

async function loadHighlights() {
  try {
    const res = await fetch(`${API_BASE}/api/events/highlights`);
    if (!res.ok) throw new Error('Failed to load highlights');
    const rows = await res.json();
    highlightsEl.innerHTML = rows.length
      ? rows.map(x =>
          `<li>• <strong>${x.title}</strong> — ${formatDateTime(x.start_datetime)} — ${x.location_city || ''}${x.location_venue ? ' · ' + x.location_venue : ''}</li>`
        ).join('')
      : `<li class="muted">No upcoming events.</li>`;
  } catch (e) {
    highlightsEl.innerHTML = `<li class="muted">Failed to load highlights.</li>`;
  }
}

async function loadUpcoming() {
  const res = await fetch(`${API_BASE}/api/events/home`);
  if (!res.ok) throw new Error('Failed to load upcoming events');
  const rows = await res.json();
  listUpcoming.innerHTML = rows.length
    ? rows.map(card).join('')
    : `<div class="muted">No upcoming events found.</div>`;
}

async function loadPast() {
  const res = await fetch(`${API_BASE}/api/events/past`);
  if (!res.ok) throw new Error('Failed to load past events');
  const rows = await res.json();
  listPast.innerHTML = rows.length
    ? rows.map(card).join('')
    : `<div class="muted">No past events.</div>`;
}

togglePast.addEventListener('change', async () => {
  pastTitle.style.display = togglePast.checked ? '' : 'none';
  listPast.innerHTML = '';
  if (togglePast.checked) {
    try { await loadPast(); } catch (e) { renderError(listPast, e.message); }
  }
});

// initial load
(async () => {
  try { await loadHighlights(); } catch {}
  try { await loadUpcoming(); } catch (e) { renderError(listUpcoming, e.message); }
})();
