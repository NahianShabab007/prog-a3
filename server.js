// server.js  (A3-ready, CommonJS)
// Keeps your existing event_db.js (exports { pool, selfTest })
// Adds: highlights, registrations, admin CRUD, inclusive search end date.

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool, selfTest } = require('./event_db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the client site
app.use(express.static(path.join(__dirname, 'public')));

// --- Health ---
app.get('/health', async (_req, res) => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: r[0].ok === 1 ? 'up' : 'unknown' });
  } catch (e) {
    console.error('health error:', e);
    res.status(500).json({ status: 'error', error: String(e) });
  }
});

// --- Categories (for search filter) ---
app.get('/api/categories', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, slug FROM categories ORDER BY name ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('categories error:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// --- Home feed: active + upcoming (exclude non-active) ---
app.get('/api/events/home', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.start_datetime, e.end_datetime,
              e.location_city, e.location_venue, e.image_url,
              e.is_free, e.price_cents, c.name AS category
         FROM events e
         JOIN categories c ON c.id = e.category_id
        WHERE e.status = 'active'
          AND e.end_datetime > NOW()
        ORDER BY e.start_datetime ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('home error:', e);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// --- Past events: active but ended (for "Show past" toggle) ---
app.get('/api/events/past', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.start_datetime, e.end_datetime,
              e.location_city, e.location_venue, e.image_url,
              e.is_free, e.price_cents, c.name AS category
         FROM events e
         JOIN categories c ON c.id = e.category_id
        WHERE e.status = 'active'
          AND e.end_datetime <= NOW()
        ORDER BY e.end_datetime DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('past error:', e);
    res.status(500).json({ error: 'Failed to fetch past events' });
  }
});

// --- Highlights (Extra feature): earliest 3 upcoming active events ---
app.get('/api/events/highlights', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.location_city, e.location_venue, e.start_datetime
         FROM events e
        WHERE e.status = 'active'
          AND e.end_datetime > NOW()
        ORDER BY e.start_datetime ASC
        LIMIT 3`
    );
    res.json(rows);
  } catch (e) {
    console.error('highlights error:', e);
    res.status(500).json({ error: 'Failed to load highlights' });
  }
});

// --- Search: date (start/end), city, category (any combo) ---
// NOTE: end date is now INCLUSIVE (<= 23:59:59)
app.get('/api/events/search', async (req, res) => {
  try {
    const { start, end, city, category } = req.query;

    const where = [`e.status = 'active'`];
    const params = [];

    if (start) {
      where.push(`e.start_datetime >= ?`);
      params.push(`${start} 00:00:00`);
    }
    if (end) {
      where.push(`e.end_datetime <= ?`); // inclusive end-of-day
      params.push(`${end} 23:59:59`);
    }
    if (city) {
      where.push(`e.location_city LIKE ?`);
      params.push(`%${city}%`);
    }
    if (category) {
      where.push(`c.slug = ?`);
      params.push(category);
    }

    const sql = `
      SELECT e.id, e.title, e.start_datetime, e.end_datetime,
             e.location_city, e.location_venue, e.image_url,
             e.is_free, e.price_cents, c.name AS category
        FROM events e
        JOIN categories c ON c.id = e.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.start_datetime ASC`;

    const [rows] = await pool.query(sql, params);
    res.json({ count: rows.length, results: rows });
  } catch (e) {
    console.error('search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- Event details (+ registrations, latest first) ---
app.get('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const [rows] = await pool.query(
      `SELECT e.*, c.name AS category_name,
              o.name AS org_name, o.mission AS org_mission, o.website AS org_website
         FROM events e
         JOIN categories c ON c.id = e.category_id
         JOIN organisations o ON o.id = e.org_id
        WHERE e.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const [regs] = await pool.query(
      `SELECT purchaser_name, email, phone, tickets, purchase_datetime
         FROM registrations
        WHERE event_id = ?
        ORDER BY purchase_datetime DESC`,
      [id]
    );

    res.json({ ...rows[0], registrations: regs });
  } catch (e) {
    console.error('event details error:', e);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// --- Create a registration for an event ---
app.post('/api/events/:id/registrations', async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const { purchaser_name, email, phone, tickets } = req.body || {};

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }
    if (!purchaser_name || !email || !tickets) {
      return res.status(400).json({ error: 'purchaser_name, email, tickets are required' });
    }

    const [[ev]] = await pool.query('SELECT id FROM events WHERE id = ?', [eventId]);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    await pool.query(
      `INSERT INTO registrations(event_id, purchaser_name, email, phone, tickets)
       VALUES (?,?,?,?,?)`,
      [eventId, purchaser_name, email, phone || null, Number(tickets)]
    );

    res.status(201).json({ message: 'Registered successfully' });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You are already registered for this event' });
    }
    console.error('registration error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// =================== ADMIN (events) ===================

// CREATE event
app.post('/api/events', async (req, res) => {
  try {
    const e = req.body || {};
    const cols = [
      'title','description','image_url',
      'location_city','location_venue',
      'start_datetime','end_datetime',
      'is_free','price_cents',
      'goal_amount_cents','raised_amount_cents',
      'status','org_id','category_id'
    ];
    const vals = cols.map(k => e[k] ?? null);
    const sql = `INSERT INTO events (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    const [r] = await pool.query(sql, vals);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error('admin create error:', e);
    res.status(500).json({ error: 'Create failed' });
  }
});

// UPDATE event
app.put('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const e = req.body || {};
    const cols = [
      'title','description','image_url',
      'location_city','location_venue',
      'start_datetime','end_datetime',
      'is_free','price_cents',
      'goal_amount_cents','raised_amount_cents',
      'status','org_id','category_id'
    ];
    const set = cols.map(c => `${c} = ?`).join(', ');
    const vals = cols.map(k => e[k] ?? null);
    vals.push(id);

    const [r1] = await pool.query(`UPDATE events SET ${set} WHERE id = ?`, vals);
    if (!r1.affectedRows) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Updated' });
  } catch (e) {
    console.error('admin update error:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE event (guard if registrations exist)
app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [[hasReg]] = await pool.query(
      'SELECT 1 AS exists_reg FROM registrations WHERE event_id = ? LIMIT 1',
      [id]
    );
    if (hasReg) {
      return res.status(409).json({ error: 'Cannot delete: registrations exist for this event' });
    }

    const [r1] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
    if (!r1.affectedRows) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('admin delete error:', e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// =================== Fallback to SPA pages ===================
// Use a regex fallback so it also works if you ever move to Express v5
app.get(/^\/(?!api|health).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- Start server after DB self-test --------------------
const PORT = Number(process.env.PORT || 3001);
selfTest()
  .then(() => app.listen(PORT, () => console.log(`running: http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('[Startup] DB connection failed:', err);
    process.exit(1);
  });
