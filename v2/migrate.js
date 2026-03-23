/**
 * migrate.js — One-time migration: old format (epic/summary/phase) → unified task model
 *
 * Run: node migrate.js
 *
 * Changes per project:
 * - Remove type, isEpic, isSummary, phase from all tasks
 * - Remove phaseColors from project.data
 * - Convert deps from [number] to [{id, type:"FS", lag:0}]
 * - Convert status: To Do→Not Started, Done→Completed, Blocked→On Hold, Review→In Progress
 * - Convert priority: Medium→Normal
 * - Bump version
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

const STATUS_MAP = {
  'To Do': 'Not Started',
  'In Progress': 'In Progress',
  'Review': 'In Progress',
  'Done': 'Completed',
  'Blocked': 'On Hold',
};

const PRIORITY_MAP = {
  'High': 'High',
  'Medium': 'Normal',
  'Low': 'Low',
};

function normalizeDep(dep) {
  if (typeof dep === 'number') return { id: dep, type: 'FS', lag: 0 };
  if (typeof dep === 'object' && dep !== null && dep.id) return { id: dep.id, type: dep.type || 'FS', lag: dep.lag || 0 };
  return null;
}

function migrateTask(task) {
  // Remove old type fields
  delete task.type;
  delete task.isEpic;
  delete task.isSummary;
  delete task.phase;

  // Convert status
  if (task.status && STATUS_MAP[task.status]) {
    task.status = STATUS_MAP[task.status];
  }

  // Convert priority
  if (task.priority && PRIORITY_MAP[task.priority]) {
    task.priority = PRIORITY_MAP[task.priority];
  }

  // Convert deps
  if (Array.isArray(task.deps)) {
    task.deps = task.deps.map(normalizeDep).filter(Boolean);
  }

  // Ensure expanded field for tasks with children
  if (task.children && task.children.length > 0) {
    if (task.expanded === undefined) task.expanded = true;
    // Recursively migrate children
    task.children.forEach(migrateTask);
  }

  return task;
}

function countTasks(tasks) {
  let count = 0;
  for (const t of (tasks || [])) {
    count++;
    if (t.children) count += countTasks(t.children);
  }
  return count;
}

async function main() {
  console.log('Starting migration: old format → unified task model...');

  const { rows } = await pool.query('SELECT id, name, data, version FROM projects');
  console.log(`Found ${rows.length} projects to migrate.`);

  let totalTasks = 0;

  for (const row of rows) {
    const data = row.data || {};
    const tasks = data.tasks || [];

    // Migrate all tasks recursively
    tasks.forEach(migrateTask);

    // Remove phaseColors
    delete data.phaseColors;

    // Count
    const taskCount = countTasks(tasks);
    totalTasks += taskCount;

    // Save back
    const newVersion = (row.version || 1) + 1;
    await pool.query(
      'UPDATE projects SET data = $1, version = $2, updated_by = $3, updated_at = NOW() WHERE id = $4',
      [JSON.stringify(data), newVersion, 'migration', row.id]
    );

    console.log(`  ✓ Project "${row.name}" (id=${row.id}): ${taskCount} tasks migrated, version ${row.version} → ${newVersion}`);
  }

  console.log(`\nMigration complete: ${rows.length} projects, ${totalTasks} total tasks migrated.`);
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
