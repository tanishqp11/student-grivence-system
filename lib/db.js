'use strict';

const { Pool } = require('pg');
const { hashPassword } = require('./auth');
const SCHEMA_SQL = require('./schema');

let pool = null;
let initialised = null;

function isSslRequired(url) {
  return (
    /sslmode=(require|verify-ca|verify-full)/i.test(url) ||
    /neon\.tech|supabase\.co|amazonaws\.com|render\.com|railway\.app|aivencloud\.com/i.test(url)
  );
}

function createPool() {
  const url = process.env.DATABASE_URL;

  if (url && url.trim()) {
    return new Pool({
      connectionString: url.trim(),
      ssl: isSslRequired(url) ? { rejectUnauthorized: false } : undefined,
      max: 3,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  }

  // A deployed instance without DATABASE_URL is a configuration mistake, not a
  // demo: fail with a clear message instead of serving an empty in-memory copy.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is not set. Add it in Vercel under Project -> Settings -> Environment Variables.'
    );
  }

  // No database configured: use an in-memory Postgres emulator so the project
  // can be demoed locally without signing up for anything. Data resets on restart.
  const { newDb } = require('pg-mem');
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  console.warn(
    '\n[db] DATABASE_URL is not set - using an in-memory demo database.\n' +
      '     Data will be lost when the server restarts. Set DATABASE_URL in .env\n' +
      '     (see .env.example) to use a real Postgres database.\n'
  );
  return new adapter.Pool();
}

function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

async function seedAdmin(client) {
  const email = (process.env.ADMIN_EMAIL || 'admin@university.edu').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return;

  await client.query(
    `INSERT INTO users (id, role, name, email, roll_no, department, password_hash)
     VALUES ($1, 'admin', $2, $3, NULL, $4, $5)`,
    [
      require('node:crypto').randomUUID(),
      'Grievance Cell Administrator',
      email,
      'Administration',
      hashPassword(password),
    ]
  );
  console.log(`[db] Seeded administrator account: ${email}`);
}

async function ensureSchema() {
  if (!initialised) {
    initialised = (async () => {
      const client = getPool();
      const statements = SCHEMA_SQL.split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await client.query(statement);
      }
      await seedAdmin(client);

      // In-memory demo mode: load sample students and tickets so the portal can
      // be shown locally without any database setup. Never runs when
      // DATABASE_URL is configured, and tests disable it with UGP_SEED_DEMO=0.
      if (!process.env.DATABASE_URL && process.env.UGP_SEED_DEMO !== '0') {
        const { seedDemo } = require('../scripts/seed-demo');
        await seedDemo((sql, params) => client.query(sql, params), {
          log: (message) => console.log(`[db] ${message}`),
        });
      }
    })().catch((error) => {
      initialised = null;
      throw error;
    });
  }
  return initialised;
}

async function query(sql, params = []) {
  await ensureSchema();
  return getPool().query(sql, params);
}

module.exports = { getPool, query, ensureSchema };
