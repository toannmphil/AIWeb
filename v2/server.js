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
app.use(express.static(path.join(__dirname, 'public')));

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
// Helpers — Unified Task Model
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

// T004: isParent — replaces isEpic
function isParent(task) {
  return task.children && task.children.length > 0;
}

// T005: flattenTasks — recursively flatten unified task tree
function flattenTasks(tasks, parentId, parentName) {
  const flat = [];
  for (const t of (tasks || [])) {
    const entry = { ...t, parentId: parentId || null, parentName: parentName || null };
    delete entry.children;
    flat.push(entry);
    if (t.children && t.children.length > 0) {
      flat.push(...flattenTasks(t.children, t.id, t.name));
    }
  }
  return flat;
}

// T006: findTask — recursive search, returns {task, parent, siblings, isParent}
function findTask(tasks, taskId, parent) {
  for (let i = 0; i < (tasks || []).length; i++) {
    const t = tasks[i];
    if (t.id === taskId) {
      return { task: t, parent: parent || null, siblings: tasks, index: i, isParent: isParent(t) };
    }
    if (t.children && t.children.length > 0) {
      const found = findTask(t.children, taskId, t);
      if (found) return found;
    }
  }
  return null;
}

// T007: findParentById — find any task by ID (any task can have children)
function findParentById(tasks, parentId) {
  for (const t of (tasks || [])) {
    if (t.id === parentId) return t;
    if (t.children) {
      const found = findParentById(t.children, parentId);
      if (found) return found;
    }
  }
  return null;
}

// T008: normalizeDep — convert legacy dep format
function normalizeDep(dep) {
  if (typeof dep === 'number') return { id: dep, type: 'FS', lag: 0 };
  if (typeof dep === 'object' && dep !== null && dep.id) {
    const validTypes = ['FS', 'SS', 'FF', 'SF'];
    return {
      id: dep.id,
      type: validTypes.includes(dep.type) ? dep.type : 'FS',
      lag: dep.lag || 0,
    };
  }
  return null;
}

function normalizeDeps(deps) {
  if (!Array.isArray(deps)) return [];
  return deps.map(normalizeDep).filter(Boolean);
}

// T009: countStats — totalTasks, totalLeafTasks, totalParentTasks, maxDepth
function countStats(tasks, depth) {
  let totalTasks = 0;
  let totalLeafTasks = 0;
  let totalParentTasks = 0;
  let maxDepth = depth || 1;

  for (const t of (tasks || [])) {
    totalTasks++;
    if (isParent(t)) {
      totalParentTasks++;
      const sub = countStats(t.children, (depth || 1) + 1);
      totalTasks += sub.totalTasks;
      totalLeafTasks += sub.totalLeafTasks;
      totalParentTasks += sub.totalParentTasks;
      maxDepth = Math.max(maxDepth, sub.maxDepth);
    } else {
      totalLeafTasks++;
    }
  }
  return { totalTasks, totalLeafTasks, totalParentTasks, maxDepth };
}

// Collect all IDs recursively
function collectAllIds(tasks) {
  const ids = [];
  for (const t of (tasks || [])) {
    ids.push(t.id);
    if (t.children) ids.push(...collectAllIds(t.children));
  }
  return ids;
}

// T081: Meeting helpers
function findMeeting(meetings, meetingId) {
  for (let i = 0; i < (meetings || []).length; i++) {
    if (meetings[i].id === meetingId) return { meeting: meetings[i], index: i };
  }
  return null;
}

function collectMeetingIds(meetings) {
  return (meetings || []).map(m => m.id);
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

// POST /api/projects — no phaseColors
app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    const result = await pool.query(
      'INSERT INTO projects (name, data, version, updated_by, is_default) VALUES ($1, $2, 1, $3, FALSE) RETURNING id, name, is_default',
      [name.trim(), JSON.stringify({ tasks: [], meetings: [] }), req.user.username]
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
// Project Data (full blob) — T022
// ============================================================

// GET /api/project/:id
app.get('/api/project/:id', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: row.data || {}, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/project/:id
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
// Tasks API — Unified Model (T010-T015)
// ============================================================

// T010: GET /api/project/:id/tasks — flat list with filters
app.get('/api/project/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    let flat = flattenTasks(data.tasks);

    const { status, team, assignee, priority, parentId, leaf } = req.query;
    if (status) flat = flat.filter(t => t.status === status);
    if (team) flat = flat.filter(t => t.team === team);
    if (assignee) flat = flat.filter(t => t.assignee === assignee);
    if (priority) flat = flat.filter(t => t.priority === priority);
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        flat = flat.filter(t => t.parentId === null);
      } else {
        flat = flat.filter(t => t.parentId === parseInt(parentId, 10));
      }
    }
    if (leaf !== undefined) {
      const wantLeaf = leaf === 'true';
      // Need to check original tasks tree for children info
      const allTasks = data.tasks || [];
      const parentIds = new Set();
      function collectParentIds(tasks) {
        for (const t of tasks) {
          if (t.children && t.children.length > 0) {
            parentIds.add(t.id);
            collectParentIds(t.children);
          }
        }
      }
      collectParentIds(allTasks);
      if (wantLeaf) {
        flat = flat.filter(t => !parentIds.has(t.id));
      } else {
        flat = flat.filter(t => parentIds.has(t.id));
      }
    }

    res.json({ tasks: flat, total: flat.length, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T011: GET /api/project/:id/tasks/:taskId
app.get('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const taskId = parseInt(req.params.taskId, 10);
    const found = findTask(row.data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });
    const task = { ...found.task };
    if (found.parent) {
      task.parentId = found.parent.id;
      task.parentName = found.parent.name;
    }
    res.json({ task, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T012: POST /api/project/:id/tasks — parentId=null for top-level
app.post('/api/project/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    if (!data.tasks) data.tasks = [];

    const { parentId, name, team, assignee, priority, status, start, end, pct, deps, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Task name is required' });

    const allIds = collectAllIds(data.tasks);
    const newId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;

    const newTask = {
      id: newId,
      name,
      team: team || '',
      assignee: assignee || '',
      priority: priority || 'Normal',
      status: status || 'Not Started',
      start: start || '',
      end: end || '',
      pct: pct || 0,
      deps: normalizeDeps(deps || []),
      notes: notes || '',
      children: [],
    };

    if (parentId === null || parentId === undefined) {
      // Top-level task
      data.tasks.push(newTask);
    } else {
      const parent = findParentById(data.tasks, parentId);
      if (!parent) return res.status(404).json({ error: 'Parent task not found' });
      if (!parent.children) parent.children = [];
      parent.children.push(newTask);
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.status(201).json({ task: newTask, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T013: PUT /api/project/:id/tasks/:taskId — partial update, restricted for parents
app.put('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    const parentTask = isParent(found.task);
    const allowedFields = parentTask
      ? ['name', 'notes', 'deps', 'expanded']
      : ['name', 'team', 'assignee', 'priority', 'status', 'start', 'end', 'pct', 'deps', 'notes'];

    // Check if trying to edit computed fields on parent
    if (parentTask) {
      const computedFields = ['team', 'assignee', 'priority', 'status', 'start', 'end', 'pct'];
      for (const field of computedFields) {
        if (req.body[field] !== undefined) {
          return res.status(400).json({ error: 'Cannot edit computed fields on parent task' });
        }
      }
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'deps') {
          found.task[field] = normalizeDeps(req.body[field]);
        } else {
          found.task[field] = req.body[field];
        }
      }
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: found.task, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T014: PATCH /api/project/:id/tasks/:taskId/status — quick status, not for parents
app.patch('/api/project/:id/tasks/:taskId/status', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const { status, pct } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const validStatuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    if (isParent(found.task)) {
      return res.status(400).json({ error: 'Cannot set status on parent task' });
    }

    found.task.status = status;
    if (pct !== undefined) found.task.pct = pct;
    if (status === 'Completed') found.task.pct = 100;

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: found.task, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T015: DELETE /api/project/:id/tasks/:taskId — recursive delete
app.delete('/api/project/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    // Remove from siblings array
    const idx = found.siblings.findIndex(t => t.id === taskId);
    if (idx !== -1) found.siblings.splice(idx, 1);

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ ok: true, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T016: GET /api/project/:id/summary — unified stats
app.get('/api/project/:id/summary', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const flat = flattenTasks(data.tasks);

    const stats = countStats(data.tasks);

    // Only count leaf tasks for stats
    const leafTasks = flat.filter(t => {
      const original = findTask(data.tasks, t.id);
      return original && !isParent(original.task);
    });

    const byStatus = {};
    const byTeam = {};
    const byAssignee = {};
    let totalPct = 0;
    for (const t of leafTasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.team) byTeam[t.team] = (byTeam[t.team] || 0) + 1;
      if (t.assignee) byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
      totalPct += (t.pct || 0);
    }

    res.json({
      totalTasks: stats.totalTasks,
      totalLeafTasks: stats.totalLeafTasks,
      totalParentTasks: stats.totalParentTasks,
      avgProgress: leafTasks.length > 0 ? Math.round(totalPct / leafTasks.length) : 0,
      byStatus,
      byTeam,
      byAssignee,
      maxDepth: stats.maxDepth,
      version: row.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// New Endpoints — T019, T020, T021
// ============================================================

// T019: POST /api/project/:id/tasks/:taskId/indent
app.post('/api/project/:id/tasks/:taskId/indent', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    if (found.index === 0) {
      return res.status(400).json({ error: 'Cannot indent: no sibling above' });
    }

    // Get sibling above
    const siblingAbove = found.siblings[found.index - 1];
    // Remove task from current position
    found.siblings.splice(found.index, 1);
    // Add to sibling above's children
    if (!siblingAbove.children) siblingAbove.children = [];
    siblingAbove.children.push(found.task);

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: { ...found.task, parentId: siblingAbove.id }, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T020: POST /api/project/:id/tasks/:taskId/outdent
app.post('/api/project/:id/tasks/:taskId/outdent', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    if (!found.parent) {
      return res.status(400).json({ error: 'Cannot outdent: already at top level' });
    }

    // Find parent's position in its siblings
    const grandparent = findTask(data.tasks, found.parent.id);
    if (!grandparent) return res.status(500).json({ error: 'Cannot find parent in tree' });

    // Remove task from parent's children
    const idx = found.parent.children.findIndex(t => t.id === taskId);
    if (idx !== -1) found.parent.children.splice(idx, 1);

    // Insert after parent in grandparent's siblings
    const parentIdx = grandparent.siblings.findIndex(t => t.id === found.parent.id);
    grandparent.siblings.splice(parentIdx + 1, 0, found.task);

    const newParentId = grandparent.parent ? grandparent.parent.id : null;
    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: { ...found.task, parentId: newParentId }, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/:id/tasks/:taskId/move — reparent task
app.post('/api/project/:id/tasks/:taskId/move', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const { parentId } = req.body; // null = top-level, number = target parent id
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findTask(data.tasks, taskId);
    if (!found) return res.status(404).json({ error: 'Task not found' });

    // Validate: can't move to self
    if (parentId === taskId) return res.status(400).json({ error: 'Cannot move task into itself' });

    // Validate: can't move into own descendant (circular)
    if (parentId != null) {
      function isDescendant(task, targetId) {
        if (!task.children) return false;
        for (const c of task.children) {
          if (c.id === targetId) return true;
          if (isDescendant(c, targetId)) return true;
        }
        return false;
      }
      if (isDescendant(found.task, parentId)) {
        return res.status(400).json({ error: 'Cannot move task into its own descendant' });
      }
      // Validate target exists
      const target = findParentById(data.tasks, parentId);
      if (!target) return res.status(404).json({ error: 'Target parent not found' });
    }

    // Check if already in the right place
    const currentParentId = found.parent ? found.parent.id : null;
    if (currentParentId === parentId) {
      return res.json({ task: found.task, message: 'Already under this parent', version: row.version });
    }

    // Remove from current position
    found.siblings.splice(found.index, 1);

    // Insert into new position
    if (parentId == null) {
      // Move to top-level
      data.tasks.push(found.task);
    } else {
      const target = findParentById(data.tasks, parentId);
      if (!target.children) target.children = [];
      target.children.push(found.task);
      if (target.expanded === undefined) target.expanded = true;
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ task: found.task, parentId: parentId, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T021: POST /api/migrate — run migration
app.post('/api/migrate', authMiddleware, async (req, res) => {
  try {
    const STATUS_MAP = {
      'To Do': 'Not Started', 'In Progress': 'In Progress',
      'Review': 'In Progress', 'Done': 'Completed', 'Blocked': 'On Hold',
    };
    const PRIORITY_MAP = { 'High': 'High', 'Medium': 'Normal', 'Low': 'Low' };

    function migrateTask(task) {
      delete task.type; delete task.isEpic; delete task.isSummary; delete task.phase;
      if (task.status && STATUS_MAP[task.status]) task.status = STATUS_MAP[task.status];
      if (task.priority && PRIORITY_MAP[task.priority]) task.priority = PRIORITY_MAP[task.priority];
      if (Array.isArray(task.deps)) task.deps = task.deps.map(normalizeDep).filter(Boolean);
      if (task.children && task.children.length > 0) {
        if (task.expanded === undefined) task.expanded = true;
        task.children.forEach(migrateTask);
      }
      return task;
    }

    const { rows } = await pool.query('SELECT id, name, data, version FROM projects');
    let totalTasksMigrated = 0;

    for (const row of rows) {
      const data = row.data || {};
      const tasks = data.tasks || [];
      tasks.forEach(migrateTask);
      delete data.phaseColors;

      function countTasks(tasks) {
        let c = 0;
        for (const t of (tasks || [])) { c++; if (t.children) c += countTasks(t.children); }
        return c;
      }
      totalTasksMigrated += countTasks(tasks);

      const newVersion = (row.version || 1) + 1;
      await pool.query(
        'UPDATE projects SET data = $1, version = $2, updated_by = $3, updated_at = NOW() WHERE id = $4',
        [JSON.stringify(data), newVersion, 'migration', row.id]
      );
    }

    res.json({ ok: true, migratedProjects: rows.length, totalTasksMigrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Members API — T023
// ============================================================

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
// Meetings API — T082-T085
// ============================================================

// Helper: parse DD/MM/YYYY to comparable number (YYYYMMDD)
function parseDateToNum(dateStr) {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  return parseInt(parts[2] + parts[1] + parts[0], 10);
}

// T082: GET /api/project/:id/meetings
app.get('/api/project/:id/meetings', authMiddleware, async (req, res) => {
  try {
    const row = await getProjectData(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    let meetings = (data.meetings || []).slice();

    const { from, to } = req.query;
    if (from) {
      const fromNum = parseDateToNum(from);
      meetings = meetings.filter(m => parseDateToNum(m.date) >= fromNum);
    }
    if (to) {
      const toNum = parseDateToNum(to);
      meetings = meetings.filter(m => parseDateToNum(m.date) <= toNum);
    }

    meetings.sort((a, b) => parseDateToNum(b.date) - parseDateToNum(a.date));
    res.json({ meetings, total: meetings.length, version: row.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T083: POST /api/project/:id/meetings
app.post('/api/project/:id/meetings', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    if (!data.meetings) data.meetings = [];

    const { title, date, content, attendees } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Meeting title is required' });
    if (!date || !date.trim()) return res.status(400).json({ error: 'Meeting date is required' });

    const ids = collectMeetingIds(data.meetings);
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

    const meeting = {
      id: newId,
      title: title.trim(),
      date: date.trim(),
      content: content || '',
      attendees: attendees || [],
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    data.meetings.push(meeting);
    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.status(201).json({ meeting, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T084: PUT /api/project/:id/meetings/:meetingId
app.put('/api/project/:id/meetings/:meetingId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const meetingId = parseInt(req.params.meetingId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findMeeting(data.meetings, meetingId);
    if (!found) return res.status(404).json({ error: 'Meeting not found' });

    const allowedFields = ['title', 'date', 'content', 'attendees'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        found.meeting[field] = field === 'title' || field === 'date'
          ? (req.body[field] || '').trim() || found.meeting[field]
          : req.body[field];
      }
    }

    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ meeting: found.meeting, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// T085: DELETE /api/project/:id/meetings/:meetingId
app.delete('/api/project/:id/meetings/:meetingId', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const meetingId = parseInt(req.params.meetingId, 10);
    const row = await getProjectData(id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const data = row.data || {};
    const found = findMeeting(data.meetings, meetingId);
    if (!found) return res.status(404).json({ error: 'Meeting not found' });

    data.meetings.splice(found.index, 1);
    const result = await saveProjectData(id, data, row.version, req.user.username);
    if (result.error) return res.status(result.status).json(result);
    res.json({ ok: true, version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Shared Settings
// ============================================================

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

app.post('/api/data', authMiddleware, async (req, res) => {
  try {
    const defaultId = await getDefaultProjectId();
    const { tasks, members, teamColors, version } = req.body;
    if (defaultId) {
      const result = await saveProjectData(defaultId, { tasks, members, teamColors }, version, req.user.username);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    } else {
      const savedAt = new Date().toISOString();
      const data = { tasks, members, teamColors, version: 1, savedAt };
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Poker Plan v2 running on port ${PORT}`);
});
