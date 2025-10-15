// public/js/event.js (A3)
// Shows event details + registrations (latest first) and links to registration page

import { API_BASE, nav, centsToAUD, formatDateTime, renderError } from './common.js';

document.getElementById('top').innerHTML = nav();

const box = document.getElementById('box');
const params = new URLSearchParams(location.search);
const id = Number(params.get('id'));

if (!Number.isInteger(id)) {
  renderError(box, 'Invalid event id.');
} else {
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`);
      if (res.status === 404) {
        renderError(box, 'Event not found.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load event');
      const e = await res.json();

      const regsRows = (e.registrations || []).map(r => `
        <tr>
          <td>${r.purchaser_name}</td>
          <td>${r.email}</td>
          <td>${r.tickets}</td>
          <td>${formatDateTime(r.purchase_datetime)}</td>
        </tr>
      `).join('');

      box.innerHTML = `
        <img src="${e.image_url || 'https://picsum.photos/seed/fallback/1000/400'}" alt=""
             style="width:100%;height:260px;object-fit:cover;border-radius:10px;margin-bottom:10px">
        <div class="row">
          <span class="badge">${e.category_name}</span>
          <span class="badge">${centsToAUD(e.price_cents)}</span>
        </div>
        <h2>${e.title}</h2>
        <div class="muted">
          ${e.location_city || ''}${e.location_venue ? ' · ' + e.location_venue : ''}
        </div>
        <div class="muted">
          ${formatDateTime(e.start_datetime)} → ${formatDateTime(e.end_datetime)}
        </div>
        <p>${e.description || ''}</p>

        <hr style="border-color:#1e2a42">
        <h3>Registrations</h3>
        ${(e.registrations?.length)
          ? `<table class="table">
               <thead><tr><th>Name</th><th>Email</th><th>Tickets</th><th>Purchased</th></tr></thead>
               <tbody>${regsRows}</tbody>
             </table>`
          : `<div class="muted">No registrations yet.</div>`}

        <p><a class="btn-primary" href="/registration.html?id=${id}">Register</a></p>

        <hr style="border-color:#1e2a42">
        <h3>Organiser</h3>
        <p>
          <strong>${e.org_name}</strong><br>
          ${e.org_mission || ''}<br>
          ${e.org_website ? `<a href="${e.org_website}" target="_blank" rel="noopener">${e.org_website}</a>` : ''}
        </p>
      `;
    } catch (err) {
      renderError(box, err.message);
    }
  })();
}
