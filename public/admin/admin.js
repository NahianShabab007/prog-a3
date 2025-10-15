import { API_BASE, nav, formatDateTime, centsToAUD, renderError } from '../js/common.js';

document.getElementById('top').innerHTML = nav();
const msg = document.getElementById('msg');
const up = document.getElementById('upcoming');
const past = document.getElementById('past');

function card(e) {
  return `
    <article class="card">
      <h3>${e.title}</h3>
      <div class="muted">${formatDateTime(e.start_datetime)} → ${formatDateTime(e.end_datetime)}</div>
      <div class="muted">${e.location_city || ''}${e.location_venue ? ' · ' + e.location_venue : ''}</div>
      <div class="muted">${centsToAUD(e.price_cents)}</div>
      <div class="row" style="margin-top:8px">
        <a class="btn" href="/admin/edit.html?id=${e.id}">Edit</a>
        <button data-id="${e.id}" class="btn danger">Delete</button>
      </div>
    </article>`;
}

async function load() {
  try {
    const [uRes, pRes] = await Promise.all([
      fetch(`${API_BASE}/api/events/home`),
      fetch(`${API_BASE}/api/events/past`)
    ]);
    const [uRows, pRows] = await Promise.all([uRes.json(), pRes.json()]);
    up.innerHTML = uRows.length ? uRows.map(card).join('') : `<div class="muted">No upcoming events.</div>`;
    past.innerHTML = pRows.length ? pRows.map(card).join('') : `<div class="muted">No past events.</div>`;
  } catch (e) {
    renderError(msg, 'Failed to load events');
  }
}

document.addEventListener('click', async (ev) => {
  const id = ev.target?.dataset?.id;
  if (!id) return;
  if (!confirm('Delete this event?')) return;
  const res = await fetch(`${API_BASE}/api/events/${id}`, { method: 'DELETE' });
  const body = await res.json().catch(()=>({}));
  if (!res.ok) return renderError(msg, body.error || 'Delete failed');
  await load();
});

load();
