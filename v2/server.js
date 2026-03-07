require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// JWT auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/data - load default project data
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT data, version FROM projects WHERE is_default = TRUE LIMIT 1'
    );
    if (result.rows.length === 0) {
      result = await pool.query('SELECT data, version FROM projects ORDER BY id LIMIT 1');
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'No data found' });
    const row = result.rows[0];
    const data = row.data || {};
    data.version = row.version;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data - save default project data
app.post('/api/data', authMiddleware, async (req, res) => {
  try {
    const { tasks, members, teamColors, phaseColors, version } = req.body;
    // Find default project
    let proj = await pool.query('SELECT id, version FROM projects WHERE is_default = TRUE LIMIT 1');
    if (proj.rows.length === 0) {
      proj = await pool.query('SELECT id, version FROM projects ORDER BY id LIMIT 1');
    }
    if (proj.rows.length > 0) {
      const serverVersion = proj.rows[0].version || 1;
      if (version < serverVersion) {
        return res.status(409).json({ error: 'Version conflict', serverVersion, clientVersion: version });
      }
      const newVersion = serverVersion + 1;
      const savedAt = new Date().toISOString();
      const data = { tasks, members, teamColors, phaseColors, version: newVersion, savedAt };
      await pool.query(
        'UPDATE projects SET data = $1, version = $2, updated_by = $3, updated_at = NOW() WHERE id = $4',
        [JSON.stringify(data), newVersion, req.user.username, proj.rows[0].id]
      );
      res.json({ ok: true, version: newVersion, savedAt });
    } else {
      // No project exists, create one
      const newVersion = 1;
      const savedAt = new Date().toISOString();
      const data = { tasks, members, teamColors, phaseColors, version: newVersion, savedAt };
      await pool.query(
        'INSERT INTO projects (name, data, version, updated_by, is_default) VALUES ($1, $2, $3, $4, TRUE)',
        ['Poker Texas Build Plan', JSON.stringify(data), newVersion, req.user.username]
      );
      res.json({ ok: true, version: newVersion, savedAt });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/version
app.get('/api/version', authMiddleware, async (req, res) => {
  try {
    let result = await pool.query('SELECT version, updated_at FROM projects WHERE is_default = TRUE LIMIT 1');
    if (result.rows.length === 0) {
      result = await pool.query('SELECT version, updated_at FROM projects ORDER BY id LIMIT 1');
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'No data found' });
    res.json({ version: result.rows[0].version || 1, savedAt: result.rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Poker Plan v2 running on port ${PORT}`);
});
