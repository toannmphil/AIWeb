require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// ============================================================
// Auth
// ============================================================

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

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

// ============================================================
// Helpers
// ============================================================

async function getDefaultProjectId() {
  let result = await pool.query('SELECT id FROM projects WHERE is_default = TRUE LIMIT 1');
  if (result.rows.length === 0) {
    result = await pool.query('SELECT id FROM projects ORDER BY id LIMIT 1');
  }
  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function getProjectData(id) {
  const result = await pool.query('SELECT data, version FROM projects WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

async function saveProjectData(id, data, version, username) {
  const proj = await pool.query('SELECT version FROM projects WHERE id = $1', [id]);
  if (proj.rows.length === 0) return { error: 'Project not found', status: 404 };
  const serverVersion = proj.rows[0].version || 1;
  if (version && version < serverVersion) {
    return { error: 'Version conflict', serverVersion, clientVersion: version, status: 409 };
  }
  const newVersion = serverVersion + 1;
  const savedAt = new Date().toISOString();
  const saveData = { ...data, version: newVersion, savedAt };
  await pool.query(
    'UPDATE projects SET data = $1, version = $2, updated_by = $3, updated_at = NOW() WHERE id = $4',
    [JSON.stringify(saveData), newVersion, username, id]
  );
  return { ok: true, version: newVersion, savedAt };
}

// Flatten epic/children structure to flat task list
function flattenTasks(tasks) {
  const flat = [];
  for (const t of (tasks || [])) {
    if (t.isEpic && t.children) {
      for (const c of t.children) flat.push({ ...c, epicId: t.id, epicName: t.name, phase: t.phase });
    } else {
      flat.push(t);
    }
  }
  return flat;
}

// Find a task by id within the nested epic/children structure
function findTask(tasks, taskId) {
  for (const epic of (tasks || [])) {
    if (epic.id === taskId) return { task: epic, epic: null, isEpic: true };
    if (epic.isEpic && epic.children) {
      const child = epic.children.find(c => c.id === taskId);
      if (child) return { task: child, epic, isEpic: false };
    }
  }
  return null;
}

// ============================================================
// Projects CRUD
// ============================================================

// GET /api/projects
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, is_default, updated_at FROM projects ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    const result = await pool.query(
      'INSERT INTO projects (name, data, version, updated_by, is_default) VALUES ($1, $2, 1, $3, FALSE) RETURNING id, name, is_default',
      [name.trim(), JSON.stringify({ tasks: [], phaseColors: {} }), req.user.username]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const { name, is_default } = req.body;
    if (is_default === true) {
      await pool.query('UPDATE projects SET is_default = FALSE WHERE is_default = TRUE');
      await pool.query('UPDATE projects SET is_default = TRUE WHERE id = $1', [id]);
    }
    if (name && name.trim()) {
      await pool.query('UPDATE projects SET name = $1 WHERE id = $2', [name.trim(), id]);
    }
    const updated = await pool.query('SELECT id, name, is_default FROM projects WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const count = await pool.query('SELECT COUNT(*) as cnt FROM projects');
    if (parseInt(count.rows[0].cnt, 10) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only project' });
    }
    const existing = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Project Data (full blob)
// ============================================================

// GET /api/project/:id - load full project data
app.get('/api/project/:id', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: row.data || {}, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/project/:id - save full project data
app.put('/api/project/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, version } = req.body;
    const result = await saveProjectData(id, data, version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/:id/version
app.get('/api/project/:id/version', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query('SELECT version, updated_by, updated_at FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const row = result.rows[0];
    res.json({ version: row.version || 1, updated_by: row.updated_by, updated_at: row.updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Tasks API (granular CRUD within JSONB)
// ============================================================

// GET /api/project/:id/tasks - list all tasks (flat)
app.get('/api/project/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const flat = flattenTasks(data.tasks);

    // Optional filters via query params
    const { status, team, assignee, priority, epicId } = req.query;
    let filtered = flat;
    if (status) filtered = filtered.filter(t => t.status === status);
    if (team) filtered = filtered.filter(t => t.team === team);
    if (assignee) filtered = filtered.filter(t => t.assignee === assignee);
    if (priority) filtered = filtered.filter(t => t.priority === priority);
    if (epicId) filtered = filtered.filter(t => t.epicId === parseInt(epicId, 10));

    res.json({ tasks: filtered, total: filtered.length, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/:id/tasks/:taskId - get single task
app.get('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const taskId = parseInt(req.params.taskId, 10);
    const found = findTask(row.data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });
    const task = { ...found.task };
    if (!found.isEpic && found.epic) {
      task.epicId = found.epic.id;
      task.epicName = found.epic.name;
      task.phase = found.epic.phase;
    }
    res.json({ task, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/tasks - create a new task under an epic
app.post('/api/project/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const tasks = data.tasks || [];

    const { epicId, name, team, assignee, priority, status, start, end, pct, deps, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Task name is required' });
    if (!epicId) return res.status(400).json({ error: 'epicId is required' });

    const epic = tasks.find(t => t.id === epicId && t.isEpic);
    if (!epic) return res.status(404).json({ error: 'Epic not found' });

    // Generate next task id
    const allIds = flattenTasks(tasks).map(t => t.id);
    tasks.forEach(t => allIds.push(t.id));
    const newId = Math.max(0, ...allIds) + 1;

    const newTask = {
      id: newId,
      name,
      team: team || '',
      assignee: assignee || '',
      priority: priority || 'Medium',
      status: status || 'To Do',
      start: start || '',
      end: end || '',
      pct: pct || 0,
      deps: deps || [],
      notes: notes || '',
    };

    if (!epic.children) epic.children = [];
    epic.children.push(newTask);

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.status(201).json({ task: { ...newTask, epicId, epicName: epic.name, phase: epic.phase }, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/project/:id/tasks/:taskId - update a task
app.put('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    // Only update provided fields (partial update)
    const allowedFields = ['name', 'team', 'assignee', 'priority', 'status', 'start', 'end', 'pct', 'deps', 'notes'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        found.task[field] = req.body[field];
      }
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: found.task, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/project/:id/tasks/:taskId/status - quick status update
app.patch('/api/project/:id/tasks/:taskId/status', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const { status, pct } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const validStatuses = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    found.task.status = status;
    if (pct !== undefined) found.task.pct = pct;
    if (status === 'Done') found.task.pct = 100;

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: found.task, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/:id/tasks/:taskId - delete a task
app.delete('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    if (found.isEpic) {
      data.tasks = data.tasks.filter(t => t.id !== taskId);
    } else {
      found.epic.children = found.epic.children.filter(c => c.id !== taskId);
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ ok: true, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Epics API
// ============================================================

// GET /api/project/:id/epics - list all epics
app.get('/api/project/:id/epics', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const epics = (row.data.tasks || [])
      .filter(t => t.isEpic)
      .map(e => ({ id: e.id, name: e.name, phase: e.phase, taskCount: (e.children || []).length }));
    res.json({ epics, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/epics - create epic
app.post('/api/project/:id/epics', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const tasks = data.tasks || [];

    const { name, phase } = req.body;
    if (!name) return res.status(400).json({ error: 'Epic name is required' });

    const allIds = [];
    tasks.forEach(t => { allIds.push(t.id); if (t.children) t.children.forEach(c => allIds.push(c.id)); });
    const newId = Math.max(0, ...allIds) + 1;

    const newEpic = { id: newId, name, isEpic: true, phase: phase || name, expanded: true, children: [] };
    tasks.push(newEpic);
    data.tasks = tasks;

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.status(201).json({ epic: newEpic, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Members API
// ============================================================

// GET /api/project/:id/members - list members from project data
app.get('/api/project/:id/members', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    res.json({ members: data.members || [], teamColors: data.teamColors || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Summary / Stats API (for bot dashboards)
// ============================================================

// GET /api/project/:id/summary - project stats
app.get('/api/project/:id/summary', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const flat = flattenTasks(data.tasks);

    const byStatus = {};
    const byTeam = {};
    const byAssignee = {};
    let totalPct = 0;

    for (const t of flat) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byTeam[t.team] = (byTeam[t.team] || 0) + 1;
      byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
      totalPct += (t.pct || 0);
    }

    res.json({
      totalTasks: flat.length,
      avgProgress: flat.length > 0 ? Math.round(totalPct / flat.length) : 0,
      byStatus,
      byTeam,
      byAssignee,
      epicCount: (data.tasks || []).filter(t => t.isEpic).length,
      version: row.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Shared Settings
// ============================================================

// GET /api/settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM settings LIMIT 1');
    if (result.rows.length === 0) return res.json({ members: {}, teamColors: {} });
    const data = result.rows[0].data || {};
    res.json({ members: data.members || {}, teamColors: data.teamColors || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    const existing = await pool.query('SELECT id FROM settings LIMIT 1');
    if (existing.rows.length > 0) {
      await pool.query('UPDATE settings SET data = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(data), existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO settings (data) VALUES ($1)', [JSON.stringify(data)]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Backward Compatibility (old API → default project)
// ============================================================

// GET /api/data
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    const defaultId = await getDefaultProjectId();
    if (!defaultId) return res.status(404).json({ error: 'No data found' });
    const result = await pool.query('SELECT data, version FROM projects WHERE id = $1', [defaultId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No data found' });
    const data = result.rows[0].data || {};
    data.version = result.rows[0].version;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data
app.post('/api/data', authMiddleware, async (req, res) => {
  try {
    const defaultId = await getDefaultProjectId();
    const { tasks, members, teamColors, phaseColors, version } = req.body;
    if (defaultId) {
      const result = await saveProjectData(defaultId, { tasks, members, teamColors, phaseColors }, version, req.user.username);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    } else {
      const savedAt = new Date().toISOString();
      const data = { tasks, members, teamColors, phaseColors, version: 1, savedAt };
      await pool.query(
        'INSERT INTO projects (name, data, version, updated_by, is_default) VALUES ($1, $2, 1, $3, TRUE)',
        ['Poker Texas Build Plan', JSON.stringify(data), req.user.username]
      );
      res.json({ ok: true, version: 1, savedAt });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/version
app.get('/api/version', authMiddleware, async (req, res) => {
  try {
    const defaultId = await getDefaultProjectId();
    if (!defaultId) return res.status(404).json({ error: 'No data found' });
    const result = await pool.query('SELECT version, updated_by, updated_at FROM projects WHERE id = $1', [defaultId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No data found' });
    res.json({ version: result.rows[0].version || 1, savedAt: result.rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Poker Plan v2 running on port ${PORT}`);
});
