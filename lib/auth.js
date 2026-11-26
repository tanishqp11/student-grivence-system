'use strict';

const crypto = require('node:crypto');

const KEY_LENGTH = 64;
const SESSION_COOKIE = 'ugp_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let cachedSecret = null;

function secret() {
  if (cachedSecret) return cachedSecret;

  const configured = (process.env.AUTH_SECRET || '').trim();
  if (configured) {
    cachedSecret = configured;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    // Never fall back to a published secret in production: use a random
    // per-process value so a missing AUTH_SECRET cannot be exploited.
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.error('[auth] AUTH_SECRET is not set - using an ephemeral secret. Sessions reset on cold start.');
    return cachedSecret;
  }

  cachedSecret = 'dev-only-secret-please-set-AUTH_SECRET';
  return cachedSecret;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function signToken(payload, ttlSeconds = SESSION_TTL_SECONDS) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function expiredCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function readSession(req) {
  const cookies = parseCookies(req.headers ? req.headers.cookie : '');
  const token = cookies[SESSION_COOKIE];
  return token ? verifyToken(token) : null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  readSession,
  sessionCookie,
  expiredCookie,
};
