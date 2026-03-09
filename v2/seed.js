require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function seed() {
  const client = await pool.connect();
  try {
    // Use v1-compatible schema (tables already exist on VPS)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL DEFAULT 'Poker Texas Build Plan',
        data JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_by VARCHAR(50),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_default BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Ensure settings row exists (singleton)
    const settingsExist = await client.query('SELECT id FROM settings LIMIT 1');
    if (settingsExist.rows.length === 0) {
      await client.query(`INSERT INTO settings (data) VALUES ('{"members":{},"teamColors":{}}')`);
      console.log('Settings row created');
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await client.query(`
      INSERT INTO users (username, password_hash, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO UPDATE SET password_hash = $2
    `, ['admin', hashedPassword, 'Admin']);

    const initialData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'initial-tasks.json'), 'utf8')
    );

    // Check if default project exists
    const existing = await client.query('SELECT id FROM projects WHERE is_default = TRUE LIMIT 1');
    if (existing.rows.length === 0) {
      // Check if any project exists
      const any = await client.query('SELECT id FROM projects ORDER BY id LIMIT 1');
      if (any.rows.length === 0) {
        await client.query(`
          INSERT INTO projects (name, data, version, updated_by, is_default)
          VALUES ($1, $2, 1, 'admin', TRUE)
        `, ['Poker Texas Build Plan', JSON.stringify(initialData)]);
        console.log('Seed completed: admin user + new default project');
      } else {
        console.log('Seed completed: admin user updated (project already exists)');
      }
    } else {
      console.log('Seed completed: admin user updated (default project already exists)');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
