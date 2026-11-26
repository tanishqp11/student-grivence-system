'use strict';

const { query } = require('./db');
const { readSession } = require('./auth');
const { HttpError } = require('./http');

/** Returns the signed-in user row, or null when there is no valid session. */
async function currentUser(req) {
  const session = readSession(req);
  if (!session || !session.sub) return null;

  const { rows } = await query(
    'SELECT id, role, name, email, roll_no, department, created_at FROM users WHERE id = $1',
    [session.sub]
  );
  return rows[0] || null;
}

async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'You need to sign in to continue.');
  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
  return user;
}

module.exports = { currentUser, requireUser, requireAdmin };
