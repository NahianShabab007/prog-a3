import { API_BASE, nav, renderError, renderSuccess, formatDateTime } from '../js/common.js';

// Insert top navigation
document.getElementById('top').innerHTML = nav();

// DOM references
const params = new URLSearchParams(location.search);
const id = Number(params.get('id'));
const titleEl = document.getElementById('title');
const msg = document.getElementById('msg');
const form = document.getElementById('f');
const regsDiv = document.getElementById('regs');

// ---------------------- LOAD EVENT DATA ----------------------
async function loadEvent() {
  if (!id) return; // creating a new event
  titleEl.textContent = 'Edit Event';

  try {
    const res = await fetch(`${API_BASE}/api/events/${id}`);
    if (!res.ok) throw new Error('Failed to load event details');
    const e = await res.json();

    //  Safely fill the form without crashing
    for (const [key, value] of Object.entries(e)) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = value ?? '';
      }
    }

    //  Render registrations (read-only)
    if (Array.isArray(e.registrations) && e.registrations.length > 0) {
      regsDiv.innerHTML = e.registrations
        .map(r => `
          <div class="muted">
            ${formatDateTime(r.purchase_datetime)} —
            <strong>${r.purchaser_name}</strong> (${r.email})
            ×${r.tickets}
          </div>
        `)
        .join('');
    } else {
      regsDiv.textContent = 'No registrations found.';
    }
  } catch (err) {
    console.error('loadEvent error:', err);
    renderError(msg, err.message);
  }
}

// ---------------------- SAVE EVENT ----------------------
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  msg.innerHTML = '';

  const data = Object.fromEntries(new FormData(form).entries());

  // Convert numeric fields properly
  ['price_cents', 'goal_amount_cents', 'raised_amount_cents', 'org_id', 'category_id']
    .forEach(k => {
      if (data[k] !== undefined && data[k] !== '') data[k] = Number(data[k]);
    });

  // Convert is_free from string to number (0/1)
  if (data.is_free !== undefined) data.is_free = Number(data.is_free);

  try {
    const url = `${API_BASE}/api/events${id ? '/' + id : ''}`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Failed to save event');

    renderSuccess(msg, ' Event saved successfully.');
    if (!id && body.id) {
      // Redirect to edit page for new event
      location.href = `/admin/edit.html?id=${body.id}`;
    }
  } catch (err) {
    console.error('save error:', err);
    renderError(msg, err.message);
  }
});

// ---------------------- INIT ----------------------
loadEvent();
