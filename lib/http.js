'use strict';

/**
 * Small helpers shared by every route module: JSON responses, request body
 * parsing, query URLs and the error type used for 4xx responses.
 */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function sendText(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

/**
 * Vercel parses JSON bodies for us; the local dev server sets req.body too.
 * The stream fallback keeps the handler usable from plain Node as well.
 */
async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    try {
      const parsed = JSON.parse(String(req.body));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      throw new HttpError(400, 'Invalid JSON body.');
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

function parseUrl(req) {
  return new URL(req.url || '/', 'http://localhost');
}

module.exports = { HttpError, sendJson, sendText, readJsonBody, parseUrl };
