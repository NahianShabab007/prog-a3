import { API_BASE, nav, renderError, renderSuccess, formatDateTime } from './common.js';

document.getElementById('top').innerHTML = nav();

const params = new URLSearchParams(location.search);
const eventId = Number(params.get('id'));
const form = document.getElementById('f');
const msg = document.getElementById('msg');
const info = document.getElementById('eventInfo');

document.getElementById('back').href = `/event.html?id=${eventId}`;

(async function loadEvent() {
  try {
    const res = await fetch(`${API_BASE}/api/events/${eventId}`);
    if (!res.ok) throw new Error('Failed to load event');
    const e = await res.json();
    info.innerHTML = `
      <strong>${e.title}</strong><br>
      ${e.location_city || ''}${e.location_venue ? ' · ' + e.location_venue : ''}<br>
      ${formatDateTime(e.start_datetime)} → ${formatDateTime(e.end_datetime)}
    `;
  } catch (err) {
    renderError(msg, err.message);
    form.style.display = 'none';
  }
})();

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  msg.innerHTML = '';
  const data = Object.fromEntries(new FormData(form).entries());
  data.tickets = Number(data.tickets);

  try {
    const res = await fetch(`${API_BASE}/api/events/${eventId}/registrations`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(body.error || 'Registration failed');

    renderSuccess(msg, 'Thanks! You’re registered.');
    form.reset();
  } catch (err) {
    renderError(msg, err.message);
  }
});
