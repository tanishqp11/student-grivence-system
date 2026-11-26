'use strict';

/** Registration, sign-in, sign-out and the current-user endpoint. */

const crypto = require('node:crypto');
const { query } = require('../lib/db');
const auth = require('../lib/auth');
const { HttpError, sendJson, readJsonBody } = require('../lib/http');
const { DEPARTMENTS } = require('../lib/constants');
const { text, matchOption, assert, isEmail, isRollNumber } = require('../lib/validation');
const { publicUser } = require('../lib/serializers');
const { currentUser } = require('../lib/session');

async function register(req, res) {
  const body = await readJsonBody(req);

  const name = text(body.name, 80);
  const email = text(body.email, 120).toLowerCase();
  const rollNo = text(body.rollNo, 20).toUpperCase();
  const department = matchOption(body.department, DEPARTMENTS);
  const password = typeof body.password === 'string' ? body.password : '';

  assert(name.length >= 3, 'Please enter your full name.');
  assert(isEmail(email), 'Please enter a valid email address.');
  assert(isRollNumber(rollNo), 'Roll number must be 4-20 characters (letters, numbers, - or /).');
  assert(department, 'Please choose your department.');
  assert(password.length >= 8, 'Password must be at least 8 characters long.');

  const existing = await query('SELECT id FROM users WHERE email = $1 OR roll_no = $2', [email, rollNo]);
  if (existing.rows.length) {
    throw new HttpError(409, 'An account with this email or roll number already exists.');
  }

  const id = crypto.randomUUID();
  const { rows } = await query(
    `INSERT INTO users (id, role, name, email, roll_no, department, password_hash)
     VALUES ($1, 'student', $2, $3, $4, $5, $6)
     RETURNING id, role, name, email, roll_no, department, created_at`,
    [id, name, email, rollNo, department, auth.hashPassword(password)]
  );

  res.setHeader('Set-Cookie', auth.sessionCookie(auth.signToken({ sub: id, role: 'student' })));
  sendJson(res, 201, { user: publicUser(rows[0]) });
}

async function login(req, res) {
  const body = await readJsonBody(req);
  const identifier = text(body.identifier || body.email, 120);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password) {
    throw new HttpError(400, 'Enter your email / roll number and password.');
  }

  // Students may sign in with either their roll number or their email address.
  const { rows } = await query('SELECT * FROM users WHERE email = $1 OR roll_no = $2', [
    identifier.toLowerCase(),
    identifier.toUpperCase(),
  ]);

  const user = rows[0];
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, 'Invalid email / roll number or password.');
  }

  res.setHeader('Set-Cookie', auth.sessionCookie(auth.signToken({ sub: user.id, role: user.role })));
  sendJson(res, 200, { user: publicUser(user) });
}

function logout(req, res) {
  res.setHeader('Set-Cookie', auth.expiredCookie());
  sendJson(res, 200, { ok: true });
}

async function me(req, res) {
  const user = await currentUser(req);
  sendJson(res, 200, { user: user ? publicUser(user) : null });
}

module.exports = { register, login, logout, me };
