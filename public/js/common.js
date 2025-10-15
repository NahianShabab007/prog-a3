// public/js/common.js (A3)
// Small quality-of-life additions: Admin link in nav, optional success renderer

export const API_BASE = '';

export function formatDateTime(dt) {
  const d = new Date((dt || '').replace(' ', 'T'));
  if (isNaN(d.getTime())) return dt ?? '';
  return d.toLocaleString();
}

export function centsToAUD(cents) {
  if (!cents || Number(cents) === 0) return 'Free';
  return `A$ ${(cents / 100).toFixed(2)}`;
}

export function nav() {
  return `
    <nav>
      <a href="/index.html">Home</a>
      <a href="/search.html">Search Events</a>
      <a href="/admin/index.html">Admin</a>
    </nav>
  `;
}

export function renderError(el, msg) {
  el.innerHTML = `<div class="error">${msg}</div>`;
}

export function renderSuccess(el, msg) {
  el.innerHTML = `<div class="success">${msg}</div>`;
}

/** Label events as Upcoming or Past by comparing end time with now */
export function eventStatus(_startDt, endDt) {
  const now = Date.now();
  const end = new Date((endDt || '').replace(' ', 'T')).getTime();
  return end > now ? 'Upcoming' : 'Past';
}
