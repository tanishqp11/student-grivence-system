'use strict';

/**
 * Creates the tables and loads demonstration data into the configured database.
 *
 *   npm run db:init
 *
 * Safe to re-run: tables use IF NOT EXISTS and demo rows are only inserted when
 * the grievances table is empty.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const envFile = path.join(ROOT, '.env');

if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

const { getPool, query, ensureSchema } = require('../lib/db');
const { seedDemo } = require('./seed-demo');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '\nDATABASE_URL is not set.\n' +
        'Add it to .env (see .env.example) - for example a free Neon Postgres connection string.\n'
    );
    process.exit(1);
  }

  await ensureSchema();
  console.log('[db:init] Schema is ready.');

  await seedDemo(query, { log: (message) => console.log(`[db:init] ${message}`) });

  console.log('\nDemo sign-in details');
  console.log(`  Admin   : ${process.env.ADMIN_EMAIL || 'admin@university.edu'} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log('  Student : priya.sharma@student.university.edu / Student@123');
  console.log('  Student : rahul.verma@student.university.edu / Student@123\n');

  await getPool().end();
}

main().catch((error) => {
  console.error('[db:init] Failed:', error.message);
  process.exit(1);
});
